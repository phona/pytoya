"""
Batch processor that accepts a StateGraph instance.

The workflow graph is built externally and injected into the processor,
making it flexible, testable, and decoupled from workflow construction.
"""

from pathlib import Path
from typing import Dict, Any, List, Union
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

from langgraph.graph import StateGraph

from src.workflow.state import InvoiceState, ProcessingStatus
from src.config import AppConfig, ProcessingConfig

logger = logging.getLogger(__name__)


class WorkflowBatchProcessor:
    """
    Batch processor using an injected StateGraph instance.

    The processor accepts a compiled StateGraph, making it:
    - Flexible: Can use any workflow graph implementation
    - Testable: Easy to inject mock graphs for testing
    - Decoupled: Processor doesn't depend on workflow construction logic
    """

    def __init__(self, graph: StateGraph, config: Union[AppConfig, Dict[str, Any]]):
        """
        Initialize batch processor with StateGraph instance.

        Args:
            graph: Compiled StateGraph (built externally)
            config: AppConfig or dict with configuration
        """
        # Support both typed config and dict for backward compatibility
        if isinstance(config, dict):
            self._config = AppConfig.from_dict(config)
        else:
            self._config = config

        self.graph = graph
        self.input_dir = Path(self._config.processing.input_dir)
        self.output_dir = Path(self._config.processing.output_dir)
        self.max_workers = self._config.processing.max_workers

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initialized workflow batch processor")
        logger.info(f"  Input: {self.input_dir}")
        logger.info(f"  Output: {self.output_dir}")
        logger.info(f"  Max workers: {self.max_workers}")

    def process_file(self, pdf_path: Path) -> Dict[str, Any]:
        """
        Process a single PDF file using the injected StateGraph.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Result dict with status and details
        """
        try:
            logger.info(f"Processing: {pdf_path.name}")

            # Create initial state
            initial_state = InvoiceState(
                pdf_path=str(pdf_path),
                config=self._config.to_dict(),
                max_retries=self._config.processing.retry_attempts
            )

            # Invoke the injected graph
            final_state = self.graph.invoke(initial_state)

            # LangGraph returns a dict, use it directly
            result = {
                "status": "success" if final_state.get("status") == ProcessingStatus.COMPLETED else "failed",
                "input": str(pdf_path),
                "output": final_state.get("output_path"),
                "state": final_state.get("status").value if hasattr(final_state.get("status"), "value") else final_state.get("status"),
                "errors": final_state.get("errors", []),
                "retry_counts": {
                    "ocr": final_state.get("ocr_retry_count", 0),
                    "extraction": final_state.get("extraction_retry_count", 0)
                }
            }

            if final_state.get("status") == ProcessingStatus.COMPLETED:
                logger.info(f"✓ Completed: {pdf_path.name}")
            else:
                logger.warning(f"✗ Failed: {pdf_path.name}")

            return result

        except Exception as e:
            logger.error(f"✗ Exception processing {pdf_path.name}: {e}")
            return {
                "status": "error",
                "input": str(pdf_path),
                "error": str(e),
                "state": ProcessingStatus.FAILED.value
            }

    def process_all(self) -> List[Dict[str, Any]]:
        """
        Process all PDFs in input directory using parallel workers.

        Returns:
            List of result dictionaries
        """
        # Find all PDFs
        pdf_files = list(self.input_dir.glob("*.pdf"))

        if not pdf_files:
            logger.warning(f"No PDF files found in {self.input_dir}")
            return []

        logger.info(f"Found {len(pdf_files)} PDF files to process")
        logger.info(f"Using {self.max_workers} parallel workers")

        # Process in parallel
        results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.process_file, pdf): pdf
                      for pdf in pdf_files}

            for future in as_completed(futures):
                result = future.result()
                results.append(result)

        # Print summary
        self._print_summary(results)

        return results

    def process_files(self, filenames: List[str]) -> List[Dict[str, Any]]:
        """
        Process specific PDF files by filename (relative to input_dir).

        Only processes files that exist within the input directory.

        Args:
            filenames: List of PDF filenames to process (must be in input_dir)

        Returns:
            List of result dictionaries
        """
        logger.info(f"Processing {len(filenames)} specific file(s)")

        results = []
        pdf_paths = []

        # Convert filenames to full paths within input_dir
        for filename in filenames:
            pdf_path = self.input_dir / filename
            if not pdf_path.exists():
                logger.error(f"File not found in input directory: {filename}")
                results.append({
                    "status": "error",
                    "input": str(pdf_path),
                    "error": f"File not found in input directory: {filename}",
                    "state": ProcessingStatus.FAILED.value
                })
                continue
            pdf_paths.append(pdf_path)

        # Process files one by one
        for pdf_path in pdf_paths:
            result = self.process_file(pdf_path)
            results.append(result)

        # Print summary
        self._print_summary(results)

        return results

    def process_stream(self, pdf_path: Path):
        """
        Process a single PDF with streaming output.

        Args:
            pdf_path: Path to PDF file

        Yields:
            Workflow state updates during processing
        """
        logger.info(f"Processing (streaming): {pdf_path.name}")

        try:
            # Create initial state
            initial_state = InvoiceState(
                pdf_path=str(pdf_path),
                config=self._config.to_dict(),
                max_retries=self._config.processing.retry_attempts
            )

            # Stream from the injected graph
            for event in self.graph.stream(initial_state):
                yield event

        except Exception as e:
            logger.error(f"Error in stream processing: {e}")
            yield {
                "error": str(e),
                "pdf_path": str(pdf_path)
            }

    def _print_summary(self, results: List[Dict[str, Any]]) -> None:
        """
        Print processing summary.

        Args:
            results: List of processing results
        """
        success_count = sum(1 for r in results if r['status'] == 'success')
        failed_count = len(results) - success_count

        total_retries = sum(
            r.get('retry_counts', {}).get('ocr', 0) +
            r.get('retry_counts', {}).get('extraction', 0)
            for r in results
        )

        logger.info("=" * 60)
        logger.info("PROCESSING SUMMARY")
        logger.info("=" * 60)
        logger.info(f"Total files: {len(results)}")
        logger.info(f"Successful: {success_count}")
        logger.info(f"Failed: {failed_count}")
        logger.info(f"Total retries: {total_retries}")
        logger.info("=" * 60)

        # Log failed files
        failed_results = [r for r in results if r['status'] != 'success']
        if failed_results:
            logger.warning("Failed files:")
            for result in failed_results:
                logger.warning(f"  - {Path(result['input']).name}: {result.get('error', 'Unknown error')}")
