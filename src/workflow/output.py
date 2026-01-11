"""
Output handler for invoice processing results.

Creates structured output directories with standardized filenames.
"""

from pathlib import Path
from typing import Dict, Any, List
import logging
import yaml
import json
import shutil

from src.workflow.state import InvoiceState, ProcessingStatus, SaveResult

logger = logging.getLogger(__name__)


class TaskLister:
    """List and filter processed invoice results."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize task lister.

        Args:
            config: Processing configuration dict
        """
        self.config = config
        proc_config = config.get('processing', {})

        self.base_dir = Path(proc_config.get('output_dir', './results'))
        self.input_dir = Path(proc_config.get('input_dir', './invoices'))
        self.preserve_structure = proc_config.get('preserve_source_structure', True)

    def list_tasks(self, filter_type: str = "unchecked") -> List[Dict[str, Any]]:
        """
        List tasks based on filter type.

        Args:
            filter_type: One of 'unchecked', 'unprocessed', 'all'

        Returns:
            List of task dictionaries
        """
        if filter_type == "unprocessed":
            return self._list_unprocessed()
        else:
            return self._list_results(filter_type)

    def _list_results(self, filter_type: str) -> List[Dict[str, Any]]:
        """List processed results with optional filtering."""
        results = []

        if not self.base_dir.exists():
            return results

        for yaml_file in self.base_dir.rglob("output.yaml"):
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)

                if data is None:
                    continue

                human_checked = data.get('human_checked', False)
                po_no = data.get('invoice', {}).get('po_no') or 'UNKNOWN'
                invoice_date = data.get('invoice', {}).get('invoice_date') or 'UNKNOWN'
                rel_path = yaml_file.relative_to(self.base_dir)

                status = "[OK]" if human_checked else "[TODO]"

                # Normalize PO number to string for consistent sorting
                po_no_str = str(po_no) if po_no != 'UNKNOWN' else 'UNKNOWN'

                results.append({
                    'status': status,
                    'po_no': po_no_str,
                    'invoice_date': str(invoice_date),
                    'path': str(rel_path),
                    'human_checked': human_checked
                })
            except Exception:
                pass

        # Sort by PO number (as string for consistency)
        results.sort(key=lambda x: x['po_no'])

        if filter_type == "unchecked":
            return [r for r in results if not r['human_checked']]
        else:  # "all"
            return results

    def _list_unprocessed(self) -> List[Dict[str, Any]]:
        """List PDF files in input dir that don't have corresponding output."""
        processed_pdfs = set()

        if self.base_dir.exists():
            # Find all output directories (each contains output.yaml)
            for yaml_file in self.base_dir.rglob("output.yaml"):
                # Get the parent directory name (matches original PDF filename)
                output_dir = yaml_file.parent
                processed_pdfs.add(output_dir.name)

        unprocessed = []
        for pdf_file in self.input_dir.rglob("*.pdf"):
            if pdf_file.stem not in processed_pdfs:
                rel_path = pdf_file.relative_to(self.input_dir)
                unprocessed.append({
                    'status': '[MISSING]',
                    'po_no': '-',
                    'invoice_date': '-',
                    'path': str(rel_path),
                    'human_checked': False
                })

        return sorted(unprocessed, key=lambda x: x['path'])

    def get_summary(self, results: List[Dict[str, Any]], filter_type: str) -> Dict[str, int]:
        """
        Get summary statistics for results.

        Args:
            results: List of task dictionaries
            filter_type: Filter type used

        Returns:
            Dict with counts
        """
        if filter_type == "unprocessed":
            return {'total': len(results), 'unchecked': 0, 'checked': 0}

        checked = sum(1 for r in results if r['human_checked'])
        unchecked = len(results) - checked

        return {
            'total': len(results),
            'checked': checked,
            'unchecked': unchecked
        }


class OutputPathBuilder:
    """Build output directory structure for extraction results."""

    def __init__(self, base_dir: Path, preserve_structure: bool = True):
        """
        Initialize output path builder.

        Args:
            base_dir: Base output directory (e.g., ./results)
            preserve_structure: Whether to preserve source folder structure
        """
        self.base_dir = Path(base_dir)
        self.preserve_structure = preserve_structure

    def build_paths(
        self,
        pdf_path: str,
        extracted_data: Dict[str, Any],
        ocr_result: Dict[str, Any]
    ) -> Dict[str, Path]:
        """
        Build all output paths for a processed invoice.

        Args:
            pdf_path: Original PDF path
            extracted_data: Extracted invoice data (PO_NO stored in YAML, not dir name)
            ocr_result: OCR result data

        Returns:
            Dict with keys: input_pdf, output_yaml, ocr_markdown, ocr_json
        """
        pdf_path_obj = Path(pdf_path)
        original_filename = pdf_path_obj.stem  # filename without extension

        # Use only original filename for directory (PO_NO stored in YAML for tasks table)
        dir_name = original_filename

        # Preserve source folder structure
        if self.preserve_structure:
            # Get relative path from input dir to pdf
            # Assume input_dir is parent of pdf_path
            input_dir = pdf_path_obj.parent
            relative_path = pdf_path_obj.relative_to(input_dir.parent)
            source_folder = relative_path.parent
            target_dir = self.base_dir / source_folder / dir_name
        else:
            target_dir = self.base_dir / dir_name

        target_dir.mkdir(parents=True, exist_ok=True)

        logger.debug(f"Output directory: {target_dir}")

        return {
            "input_pdf": target_dir / "input.pdf",
            "output_yaml": target_dir / "output.yaml",
            "ocr_markdown": target_dir / "ocr_result.md",
            "ocr_json": target_dir / "ocr_result.json"
        }


class OutputHandler:
    """Handle saving of invoice processing results."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize output handler.

        Args:
            config: Processing configuration dict
        """
        self.config = config
        proc_config = config.get('processing', {})

        self.base_dir = Path(proc_config.get('output_dir', './results'))
        self.preserve_structure = proc_config.get('preserve_source_structure', True)
        self.copy_pdf = proc_config.get('copy_source_pdf', True)
        self.save_markdown = proc_config.get('save_ocr_markdown', True)
        self.save_json = proc_config.get('save_ocr_json', True)

        self.path_builder = OutputPathBuilder(
            base_dir=self.base_dir,
            preserve_structure=self.preserve_structure
        )

    def save_result(self, state: InvoiceState) -> InvoiceState:
        """
        Save extraction results to structured output directory.

        Args:
            state: InvoiceState with extraction results

        Returns:
            Updated InvoiceState with save results
        """
        logger.info(f"Saving results for: {state.pdf_path}")
        state.status = ProcessingStatus.SAVING

        # Check if extraction result is available
        if not state.extraction_result or not state.extraction_result.success:
            error = "Cannot save: extraction failed"
            state.add_error(error)
            state.save_result = SaveResult(
                output_path="",
                success=False,
                error=error
            )
            state.status = ProcessingStatus.FAILED
            return state

        try:
            # Build output paths
            paths = self.path_builder.build_paths(
                pdf_path=state.pdf_path,
                extracted_data=state.extraction_result.data,
                ocr_result={'layout': state.ocr_result.layout} if state.ocr_result else {}
            )

            # Save YAML (main output)
            # Add human_checked field (set to false by default)
            output_data = state.extraction_result.data.copy()
            output_data['human_checked'] = False

            with open(paths['output_yaml'], 'w', encoding='utf-8') as f:
                yaml.dump(
                    output_data,
                    f,
                    allow_unicode=True,
                    sort_keys=False
                )
            logger.debug(f"Saved YAML: {paths['output_yaml']}")

            # Save OCR markdown
            if self.save_markdown and state.ocr_result:
                with open(paths['ocr_markdown'], 'w', encoding='utf-8') as f:
                    f.write(state.ocr_result.markdown)
                logger.debug(f"Saved OCR markdown: {paths['ocr_markdown']}")

            # Save OCR JSON
            if self.save_json and state.ocr_result:
                ocr_json_data = {
                    'raw_text': state.ocr_result.raw_text,
                    'markdown': state.ocr_result.markdown,
                    'layout': state.ocr_result.layout,
                    'num_pages': state.ocr_result.layout.get('num_pages', 0),
                    'num_blocks': state.ocr_result.layout.get('num_blocks', 0)
                }
                with open(paths['ocr_json'], 'w', encoding='utf-8') as f:
                    json.dump(ocr_json_data, f, ensure_ascii=False, indent=2)
                logger.debug(f"Saved OCR JSON: {paths['ocr_json']}")

            # Copy source PDF
            if self.copy_pdf:
                shutil.copy2(state.pdf_path, paths['input_pdf'])
                logger.debug(f"Copied source PDF: {paths['input_pdf']}")

            # Create successful result (use yaml as primary output path)
            state.save_result = SaveResult(
                output_path=str(paths['output_yaml']),
                success=True
            )
            state.output_path = str(paths['output_yaml'])
            state.status = ProcessingStatus.COMPLETED

            logger.info(f"✓ Results saved to: {paths['output_yaml'].parent}")
            return state

        except Exception as e:
            error_msg = f"Failed to save results: {str(e)}"
            logger.error(error_msg)
            state.add_error(error_msg)

            # Create failed result
            state.save_result = SaveResult(
                output_path="",
                success=False,
                error=error_msg
            )
            state.status = ProcessingStatus.FAILED

            return state
