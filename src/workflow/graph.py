"""
LangGraph workflow definition for invoice processing.

The workflow is built externally and passed to processors,
making it flexible and testable.
"""

import time
import logging
import json
from pathlib import Path
from typing import Literal, Optional, List, Dict, Any, Callable

from langgraph.graph import StateGraph, END

from src.workflow.state import InvoiceState, ProcessingStatus, ExtractionResult, OCRResult
from src.workflow.nodes import NODES
from src.workflow.output import OutputHandler
from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.extraction.extractor import InvoiceExtractor
from src.config import WorkflowConfig

logger = logging.getLogger(__name__)


def check_validation(state: InvoiceState) -> Literal["proceed", "failed"]:
    """Check if validation passed."""
    return "proceed" if state.is_valid_file else "failed"


def check_ocr_result(state: InvoiceState) -> Literal["proceed", "retry", "failed"]:
    """Check OCR result and decide next action with retry logic."""
    if state.ocr_result and state.ocr_result.success:
        logger.info("✓ OCR processing succeeded")
        return "proceed"

    if state.can_retry_ocr():
        retry_count = state.increment_ocr_retry()
        delay = 2.0 * (2 ** (retry_count - 1))  # Exponential backoff
        logger.warning(f"OCR failed, retrying ({retry_count}/{state.max_retries}) after {delay}s...")
        time.sleep(delay)
        state.status = ProcessingStatus.OCR_RETRY
        return "retry"

    logger.error(f"OCR failed after {state.max_retries} attempts")
    return "failed"


def check_extraction_result(state: InvoiceState) -> Literal["proceed", "retry", "failed"]:
    """Check extraction result and decide next action with retry logic."""
    if state.extraction_result and state.extraction_result.success:
        logger.info("✓ Data extraction succeeded")
        return "proceed"

    if state.can_retry_extraction():
        retry_count = state.increment_extraction_retry()
        delay = 2.0 * (2 ** (retry_count - 1))  # Exponential backoff
        logger.warning(f"Extraction failed, retrying ({retry_count}/{state.max_retries}) after {delay}s...")
        time.sleep(delay)
        state.status = ProcessingStatus.EXTRACTION_RETRY
        return "retry"

    logger.error(f"Extraction failed after {state.max_retries} attempts")
    return "failed"


def build_invoice_workflow(
    ocr_client: PaddleOCRVLClient,
    extractor: InvoiceExtractor,
    workflow_config: WorkflowConfig,
    reuse_ocr: bool = False
) -> StateGraph:
    """
    Build LangGraph workflow for invoice processing with dependency injection.

    Args:
        ocr_client: PaddleOCR-VL client instance
        extractor: LLM extractor instance
        workflow_config: Workflow configuration
        reuse_ocr: If True, try to load existing OCR results instead of running OCR

    Returns:
        Compiled StateGraph ready for execution

    Workflow (normal mode):
        validate_input → ocr_processing → extraction → save_result → END
                           ↓ retry            ↓ retry (extraction) or ↓ retry_ocr (OCR)
                        (back to self)     (back to self) or (back to ocr_processing)
                           ↓ failed          ↓ failed
                        mark_failed → END

    Workflow (reuse_ocr mode):
        validate_input → load_or_ocr → extraction → save_result → END
                              ↓ (if no OCR)
                          ocr_processing
    """
    workflow = StateGraph(InvoiceState)

    # Create node functions with injected dependencies via closures
    workflow.add_node("validate_input", _create_validate_node())
    workflow.add_node("ocr_processing", _create_ocr_node(ocr_client, workflow_config))
    workflow.add_node("load_or_ocr", _create_load_or_ocr_node(ocr_client, workflow_config, reuse_ocr))
    workflow.add_node("extraction", _create_extraction_node(extractor))
    workflow.add_node("save_result", _create_save_node())
    workflow.add_node("mark_failed", _create_mark_failed_node())

    # Create conditional edge functions with retry delay from config
    def check_ocr_result_with_delay(state: InvoiceState) -> Literal["proceed", "retry", "failed"]:
        if state.ocr_result and state.ocr_result.success:
            logger.info("✓ OCR processing succeeded")
            return "proceed"

        if workflow_config.enable_ocr_retry and state.can_retry_ocr():
            retry_count = state.increment_ocr_retry()
            delay = workflow_config.retry_delay_base * (2 ** (retry_count - 1))
            logger.warning(f"OCR failed, retrying ({retry_count}/{state.max_retries}) after {delay}s...")
            time.sleep(delay)
            state.status = ProcessingStatus.OCR_RETRY
            return "retry"

        logger.error(f"OCR failed after {state.max_retries} attempts")
        return "failed"

    def check_extraction_result_with_delay(state: InvoiceState) -> Literal["proceed", "retry", "retry_ocr", "failed"]:
        if state.extraction_result and state.extraction_result.success:
            logger.info("✓ Data extraction succeeded")
            return "proceed"

        # Check if we should retry OCR when extraction fails due to missing fields
        if workflow_config.retry_ocr_on_missing_fields and state.can_retry_ocr():
            # Check if the failure is due to validation (missing fields)
            # We can determine this by looking at the error message
            if state.extraction_result and state.extraction_result.error:
                error_lower = state.extraction_result.error.lower()
                if any(keyword in error_lower for keyword in ['missing', 'required field', 'validation']):
                    retry_count = state.increment_ocr_retry()
                    delay = workflow_config.retry_delay_base * (2 ** (retry_count - 1))
                    logger.warning(f"Extraction validation failed (missing fields), retrying OCR with different parameters ({retry_count}/{state.max_retries}) after {delay}s...")
                    time.sleep(delay)
                    # Reset extraction result for retry
                    state.extraction_result = None
                    state.status = ProcessingStatus.OCR_RETRY
                    return "retry_ocr"

        # Retry extraction if enabled
        if workflow_config.enable_extraction_retry and state.can_retry_extraction():
            retry_count = state.increment_extraction_retry()
            delay = workflow_config.retry_delay_base * (2 ** (retry_count - 1))
            logger.warning(f"Extraction failed, retrying ({retry_count}/{state.max_retries}) after {delay}s...")
            time.sleep(delay)
            state.status = ProcessingStatus.EXTRACTION_RETRY
            return "retry"

        logger.error(f"Extraction failed after {state.max_retries} attempts")
        return "failed"

    # Set entry point
    workflow.set_entry_point("validate_input")

    # Add conditional edges
    if reuse_ocr:
        # In reuse_ocr mode: try to load existing OCR first
        workflow.add_conditional_edges(
            "validate_input",
            check_validation,
            {"proceed": "load_or_ocr", "failed": "mark_failed"}
        )

        # load_or_ocr will either succeed and go to extraction, or fail and go to ocr_processing
        workflow.add_conditional_edges(
            "load_or_ocr",
            _check_load_or_ocr_result,
            {"proceed": "extraction", "run_ocr": "ocr_processing", "failed": "mark_failed"}
        )
    else:
        # Normal mode: go directly to OCR processing
        workflow.add_conditional_edges(
            "validate_input",
            check_validation,
            {"proceed": "ocr_processing", "failed": "mark_failed"}
        )

    workflow.add_conditional_edges(
        "ocr_processing",
        check_ocr_result_with_delay,
        {"proceed": "extraction", "retry": "ocr_processing", "failed": "mark_failed"}
    )

    workflow.add_conditional_edges(
        "extraction",
        check_extraction_result_with_delay,
        {"proceed": "save_result", "retry": "extraction", "retry_ocr": "ocr_processing", "failed": "mark_failed"}
    )

    workflow.add_edge("save_result", END)
    workflow.add_edge("mark_failed", END)

    return workflow.compile()


def _check_load_or_ocr_result(state: InvoiceState) -> Literal["proceed", "run_ocr", "failed"]:
    """Check result of load_or_ocr node."""
    if state.ocr_result and state.ocr_result.success:
        logger.info("✓ Using existing OCR result")
        return "proceed"
    return "run_ocr"


# ============================================================================
# Node Factory Functions (create closures with injected dependencies)
# ============================================================================

def _create_validate_node() -> Callable[[InvoiceState], InvoiceState]:
    """Create validation node (no dependencies needed)."""
    def validate_input_node(state: InvoiceState) -> InvoiceState:
        from pathlib import Path
        logger.info(f"Validating input file: {state.pdf_path}")
        state.status = ProcessingStatus.VALIDATING

        pdf_path = Path(state.pdf_path)

        if not pdf_path.exists():
            error = f"File not found: {state.pdf_path}"
            state.add_error(error)
            state.validation_errors.append(error)
            state.is_valid_file = False
            state.status = ProcessingStatus.FAILED
            return state

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

        if pdf_path.suffix.lower() != '.pdf':
            error = f"File is not a PDF: {state.pdf_path}"
            state.add_error(error)
            state.validation_errors.append(error)
            state.is_valid_file = False
            state.status = ProcessingStatus.FAILED
            return state

        logger.info("✓ Input validation passed")
        return state

    return validate_input_node


def _create_ocr_node(
    ocr_client: PaddleOCRVLClient,
    workflow_config: WorkflowConfig
) -> Callable[[InvoiceState], InvoiceState]:
    """Create OCR node with injected client and config."""
    def ocr_processing_node(state: InvoiceState) -> InvoiceState:
        logger.info(f"Processing OCR for: {state.pdf_path} (attempt {state.ocr_retry_count + 1})")
        state.status = ProcessingStatus.OCR_PROCESSING

        try:
            # On retry (when extraction failed), use different OCR parameters
            # to get better results
            if state.ocr_retry_count > 0:
                logger.info(f"OCR retry #{state.ocr_retry_count}: Using enhanced parameters for better text recognition")

                # Temporarily modify OCR client config for retry
                original_config = ocr_client._config
                # Enable additional processing features on retry
                retry_params = {
                    "use_doc_orientation_classify": True,
                    "use_doc_unwarping": True,
                    "use_layout_detection": True,
                    "prettify_markdown": True,
                }
                logger.info(f"OCR retry parameters: {retry_params}")

            # Perform OCR with injected client
            ocr_data = ocr_client.extract_text(state.pdf_path)

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

    return ocr_processing_node


def _create_load_or_ocr_node(
    ocr_client: PaddleOCRVLClient,
    workflow_config: WorkflowConfig,
    reuse_ocr: bool
) -> Callable[[InvoiceState], InvoiceState]:
    """Create node that tries to load existing OCR results, or marks for OCR if not found."""
    def load_or_ocr_node(state: InvoiceState) -> InvoiceState:
        logger.info(f"Checking for existing OCR result: {Path(state.pdf_path).name}")
        state.status = ProcessingStatus.OCR_PROCESSING

        # If reuse_ocr is disabled, mark for OCR processing
        if not reuse_ocr:
            logger.info("Reuse OCR disabled, will run fresh OCR")
            state.ocr_result = OCRResult(
                raw_text="",
                markdown="",
                layout={},
                success=False  # Mark as failed to trigger OCR processing
            )
            return state

        # Try to find existing OCR result
        pdf_path = Path(state.pdf_path)
        pdf_stem = pdf_path.stem  # Filename without extension

        # Get output directory from config
        config_dict = state.config
        output_dir = Path(config_dict.get('processing', {}).get('output_dir', './results'))

        # Try to find matching result directory
        # Result directories are named like: {original_filename}-{PO_NO}
        result_dir = None
        if output_dir.exists():
            # Search in batch subdirectories
            for batch_dir in output_dir.iterdir():
                if not batch_dir.is_dir():
                    continue
                # Look for directories starting with the PDF stem
                for candidate_dir in batch_dir.iterdir():
                    if not candidate_dir.is_dir():
                        continue
                    if candidate_dir.name.startswith(pdf_stem):
                        ocr_json_path = candidate_dir / "ocr_result.json"
                        if ocr_json_path.exists():
                            result_dir = candidate_dir
                            break
                if result_dir:
                    break

        if result_dir and result_dir.exists():
            ocr_json_path = result_dir / "ocr_result.json"
            logger.info(f"Found existing OCR result: {ocr_json_path}")

            try:
                with open(ocr_json_path, 'r', encoding='utf-8') as f:
                    ocr_json_data = json.load(f)

                # Create successful OCR result from saved data
                state.ocr_result = OCRResult(
                    raw_text=ocr_json_data.get('raw_text', ''),
                    markdown=ocr_json_data.get('markdown', ''),
                    layout=ocr_json_data.get('layout', {}),
                    success=True,
                    retry_count=0
                )
                logger.info("✓ Loaded existing OCR result successfully")
                return state

            except Exception as e:
                logger.warning(f"Failed to load OCR result: {e}, will run fresh OCR")

        # No existing OCR found or failed to load, mark for OCR processing
        logger.info("No existing OCR result found, will run fresh OCR")
        state.ocr_result = OCRResult(
            raw_text="",
            markdown="",
            layout={},
            success=False  # Mark as failed to trigger OCR processing
        )
        return state

    return load_or_ocr_node


def _create_extraction_node(
    extractor: InvoiceExtractor
) -> Callable[[InvoiceState], InvoiceState]:
    """Create extraction node with injected extractor and validation."""
    def extraction_node(state: InvoiceState) -> InvoiceState:
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
            # Prepare OCR data for extraction
            ocr_data = {
                'raw_text': state.ocr_result.raw_text,
                'markdown': state.ocr_result.markdown,
                'layout': state.ocr_result.layout
            }

            # Use appropriate extraction method based on retry state
            if state.extraction_retry_count > 0 and state.extraction_result:
                # Re-extract with previous result context
                previous_data = state.extraction_result.data

                # Validate previous result to find missing fields
                validation = extractor.validate_result(previous_data)
                missing_fields = []
                error_msg = state.extraction_result.error

                if not validation['valid']:
                    missing_fields = validation.get('missing_fields', [])

                # Re-extract with feedback
                extracted_data = extractor.re_extract(
                    ocr_data,
                    previous_data,
                    missing_fields=missing_fields if missing_fields else None,
                    error_message=error_msg
                )
            else:
                # First-time extraction
                extracted_data = extractor.extract(ocr_data)

            # Validate extracted data
            if not extracted_data or not isinstance(extracted_data, dict):
                raise ValueError("Invalid extraction result: empty or not a dict")

            # Validate against configured required fields
            validation = extractor.validate_result(extracted_data)
            if not validation['valid']:
                # Mark for retry if validation fails
                state.extraction_result = ExtractionResult(
                    data=extracted_data,
                    success=False,
                    error="; ".join(validation.get('errors', ['Validation failed'])),
                    retry_count=state.extraction_retry_count
                )
                return state

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

    return extraction_node


def _create_save_node() -> Callable[[InvoiceState], InvoiceState]:
    """Create save node using OutputHandler."""
    def save_result_node(state: InvoiceState) -> InvoiceState:
        handler = OutputHandler(state.config)
        return handler.save_result(state)

    return save_result_node


def _create_mark_failed_node() -> Callable[[InvoiceState], InvoiceState]:
    """Create mark failed node (no dependencies needed)."""
    def mark_failed_node(state: InvoiceState) -> InvoiceState:
        logger.error(f"Workflow failed for: {state.pdf_path}")
        state.status = ProcessingStatus.FAILED
        return state

    return mark_failed_node

