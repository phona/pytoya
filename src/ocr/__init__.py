"""
OCR module for PaddleOCR-VL remote service integration.
"""

from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.ocr.types import (
    LayoutParsingRequest,
    ClientConfig,
    ExtractionResult,
    LayoutParsingResponseData,
    BlockContent,
    APIResponse,
    MarkdownImages,
)

__all__ = [
    "PaddleOCRVLClient",
    "LayoutParsingRequest",
    "ClientConfig",
    "ExtractionResult",
    "LayoutParsingResponseData",
    "BlockContent",
    "APIResponse",
    "MarkdownImages",
]
