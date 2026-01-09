"""
Output handler for invoice processing results.

Creates structured output directories with standardized filenames.
"""

from pathlib import Path
from typing import Dict, Any
import logging
import yaml
import json
import shutil

from src.workflow.state import InvoiceState, ProcessingStatus, SaveResult

logger = logging.getLogger(__name__)


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
            extracted_data: Extracted invoice data
            ocr_result: OCR result data

        Returns:
            Dict with keys: input_pdf, output_yaml, ocr_markdown, ocr_json
        """
        pdf_path_obj = Path(pdf_path)
        original_filename = pdf_path_obj.stem  # filename without extension

        # Get PO_NO from extracted data
        po_no = extracted_data.get("invoice", {}).get("po_no", "UNKNOWN_PO")
        sanitized_po = self._sanitize_name(po_no)

        # Build directory name: {original_filename}-{PO_NO}
        dir_name = f"{original_filename}-{sanitized_po}"

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

    @staticmethod
    def _sanitize_name(name: str) -> str:
        """
        Sanitize filename/directory name.

        Args:
            name: Original name (PO_NO, folder name, etc.)

        Returns:
            Sanitized name safe for filesystem
        """
        # Handle None values (e.g., when po_no is null)
        if name is None:
            return "UNKNOWN_PO"

        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            name = name.replace(char, '_')
        return name.strip()


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
            with open(paths['output_yaml'], 'w', encoding='utf-8') as f:
                yaml.dump(
                    state.extraction_result.data,
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
