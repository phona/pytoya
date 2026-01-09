"""
Workflow state definitions for invoice processing.
"""

from typing import Optional, List, Dict, Any, Literal
from dataclasses import dataclass, field
from enum import Enum


class ProcessingStatus(Enum):
    """Processing status enum."""
    PENDING = "pending"
    VALIDATING = "validating"
    OCR_PROCESSING = "ocr_processing"
    OCR_RETRY = "ocr_retry"
    EXTRACTING = "extracting"
    EXTRACTION_RETRY = "extraction_retry"
    SAVING = "saving"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class OCRResult:
    """OCR processing result."""
    raw_text: str
    markdown: str
    layout: Dict[str, Any]
    success: bool
    error: Optional[str] = None
    retry_count: int = 0


@dataclass
class ExtractionResult:
    """Extraction result."""
    data: Dict[str, Any]
    success: bool
    error: Optional[str] = None
    retry_count: int = 0


@dataclass
class SaveResult:
    """Save result."""
    output_path: str
    success: bool
    error: Optional[str] = None


@dataclass
class InvoiceState:
    """
    State for invoice processing workflow.

    This state is passed through LangGraph nodes and tracks:
    - Input file path
    - Processing status
    - OCR and extraction results
    - Retry counts and error information
    - Final output path
    """
    # Input
    pdf_path: str

    # Processing status
    status: ProcessingStatus = ProcessingStatus.PENDING

    # Configuration
    config: Dict[str, Any] = field(default_factory=dict)

    # OCR results
    ocr_result: Optional[OCRResult] = None

    # Extraction results
    extraction_result: Optional[ExtractionResult] = None

    # Save results
    save_result: Optional[SaveResult] = None

    # Error handling
    errors: List[str] = field(default_factory=list)
    current_error: Optional[str] = None

    # Retry configuration
    max_retries: int = 3
    ocr_retry_count: int = 0
    extraction_retry_count: int = 0

    # Validation results
    is_valid_file: bool = True
    validation_errors: List[str] = field(default_factory=list)

    # Output
    output_path: Optional[str] = None

    def add_error(self, error: str) -> None:
        """Add error to state."""
        self.errors.append(error)
        self.current_error = error

    def increment_ocr_retry(self) -> bool:
        """Increment OCR retry count, return True if can retry."""
        self.ocr_retry_count += 1
        return self.ocr_retry_count <= self.max_retries

    def increment_extraction_retry(self) -> bool:
        """Increment extraction retry count, return True if can retry."""
        self.extraction_retry_count += 1
        return self.extraction_retry_count <= self.max_retries

    def can_retry_ocr(self) -> bool:
        """Check if OCR can be retried."""
        return self.ocr_retry_count < self.max_retries

    def can_retry_extraction(self) -> bool:
        """Check if extraction can be retried."""
        return self.extraction_retry_count < self.max_retries

    def is_terminal_state(self) -> bool:
        """Check if in terminal state (completed or failed)."""
        return self.status in (ProcessingStatus.COMPLETED, ProcessingStatus.FAILED)
