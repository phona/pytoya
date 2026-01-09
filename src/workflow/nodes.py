"""
LangGraph nodes for invoice processing workflow.

Each node represents a step in the processing pipeline with built-in
error handling and logging.
"""

import yaml
import logging
from pathlib import Path
from typing import Dict, Any

from src.workflow.state import (
    InvoiceState,
    ProcessingStatus,
    OCRResult,
    ExtractionResult,
    SaveResult,
)
from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.extraction.extractor import InvoiceExtractor

logger = logging.getLogger(__name__)


# ============================================================================
# Workflow Nodes
# ============================================================================

def validate_input_node(state: InvoiceState) -> InvoiceState:
    """
    Validate input PDF file.

    Checks:
    - File exists
    - File is readable
    - File has .pdf extension

    Args:
        state: Current workflow state

    Returns:
        Updated state with validation results
    """
    logger.info(f"Validating input file: {state.pdf_path}")
    state.status = ProcessingStatus.VALIDATING

    pdf_path = Path(state.pdf_path)

    # Check if file exists
    if not pdf_path.exists():
        error = f"File not found: {state.pdf_path}"
        state.add_error(error)
        state.validation_errors.append(error)
        state.is_valid_file = False
        state.status = ProcessingStatus.FAILED
        return state

    # Check if file is readable
    try:
        if not pdf_path.is_file():
            error = f"Path is not a file: {state.pdf_path}"
            state.add_error(error)
            state.validation_errors.append(error)
            state.is_valid_file = False
            state.status = ProcessingStatus.FAILED
            return state
    except Exception as e:
        error = f"Cannot access file: {e}"
        state.add_error(error)
        state.validation_errors.append(error)
        state.is_valid_file = False
        state.status = ProcessingStatus.FAILED
        return state

    # Check file extension
    if pdf_path.suffix.lower() != '.pdf':
        error = f"File is not a PDF: {state.pdf_path}"
        state.add_error(error)
        state.validation_errors.append(error)
        state.is_valid_file = False
        state.status = ProcessingStatus.FAILED
        return state

    logger.info("✓ Input validation passed")
    return state


def ocr_processing_node(state: InvoiceState) -> InvoiceState:
    """
    Process OCR using PaddleOCR-VL remote service.

    Handles:
    - API request to PaddleOCR-VL
    - Network errors
    - API errors
    - Retry logic (managed by workflow)

    Args:
        state: Current workflow state

    Returns:
        Updated state with OCR results
    """
    logger.info(f"Processing OCR for: {state.pdf_path}")
    state.status = ProcessingStatus.OCR_PROCESSING

    try:
        # Initialize OCR client from config
        ocr_config = state.config.get('paddleocr_vl', {})
        client = PaddleOCRVLClient(ocr_config)

        # Perform OCR
        ocr_data = client.extract_text(state.pdf_path)

        # Create successful result
        state.ocr_result = OCRResult(
            raw_text=ocr_data['raw_text'],
            markdown=ocr_data['markdown'],
            layout=ocr_data['layout'],
            success=True,
            retry_count=state.ocr_retry_count
        )

        logger.info("✓ OCR processing completed")
        return state

    except Exception as e:
        error_msg = f"OCR processing failed: {str(e)}"
        logger.error(error_msg)
        state.add_error(error_msg)

        # Create failed result
        state.ocr_result = OCRResult(
            raw_text="",
            markdown="",
            layout={},
            success=False,
            error=error_msg,
            retry_count=state.ocr_retry_count
        )

        return state


def extraction_node(state: InvoiceState) -> InvoiceState:
    """
    Extract structured data using LLM.

    Handles:
    - LLM API calls
    - Prompt construction
    - Response parsing
    - Retry logic (managed by workflow)

    Args:
        state: Current workflow state

    Returns:
        Updated state with extraction results
    """
    logger.info(f"Extracting structured data for: {state.pdf_path}")
    state.status = ProcessingStatus.EXTRACTING

    # Check if OCR result is available
    if not state.ocr_result or not state.ocr_result.success:
        error = "Cannot extract data: OCR processing failed"
        state.add_error(error)
        state.extraction_result = ExtractionResult(
            data={},
            success=False,
            error=error,
            retry_count=state.extraction_retry_count
        )
        return state

    try:
        # Initialize extractor from config
        llm_config = state.config.get('llm', {})
        extractor = InvoiceExtractor(llm_config)

        # Prepare OCR data for extraction
        ocr_data = {
            'raw_text': state.ocr_result.raw_text,
            'markdown': state.ocr_result.markdown,
            'layout': state.ocr_result.layout
        }

        # Perform extraction
        extracted_data = extractor.extract(ocr_data)

        # Validate extracted data
        if not extracted_data or not isinstance(extracted_data, dict):
            raise ValueError("Invalid extraction result: empty or not a dict")

        # Create successful result
        state.extraction_result = ExtractionResult(
            data=extracted_data,
            success=True,
            retry_count=state.extraction_retry_count
        )

        logger.info("✓ Data extraction completed")
        return state

    except Exception as e:
        error_msg = f"Data extraction failed: {str(e)}"
        logger.error(error_msg)
        state.add_error(error_msg)

        # Create failed result
        state.extraction_result = ExtractionResult(
            data={},
            success=False,
            error=error_msg,
            retry_count=state.extraction_retry_count
        )

        return state


def save_result_node(state: InvoiceState) -> InvoiceState:
    """
    Save extracted data to YAML file.

    Handles:
    - File I/O
    - YAML serialization
    - Output directory creation

    Args:
        state: Current workflow state

    Returns:
        Updated state with save results
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
        # Determine output path
        output_dir = Path(state.config.get('processing', {}).get('output_dir', './results'))
        output_dir.mkdir(parents=True, exist_ok=True)

        input_name = Path(state.pdf_path).stem
        output_path = output_dir / f"{input_name}.yaml"

        # Save to YAML
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(
                state.extraction_result.data,
                f,
                allow_unicode=True,
                sort_keys=False
            )

        # Create successful result
        state.save_result = SaveResult(
            output_path=str(output_path),
            success=True
        )
        state.output_path = str(output_path)
        state.status = ProcessingStatus.COMPLETED

        logger.info(f"✓ Results saved to: {output_path}")
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


def mark_failed_node(state: InvoiceState) -> InvoiceState:
    """
    Mark workflow as failed.

    Args:
        state: Current workflow state

    Returns:
        Updated state in failed status
    """
    logger.error(f"Workflow failed for: {state.pdf_path}")
    state.status = ProcessingStatus.FAILED
    return state


# ============================================================================
# Node Registry
# ============================================================================

NODES = {
    "validate_input": validate_input_node,
    "ocr_processing": ocr_processing_node,
    "extraction": extraction_node,
    "save_result": save_result_node,
    "mark_failed": mark_failed_node,
}
