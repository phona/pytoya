"""
Type definitions for PaddleOCR-VL API.

Official API Reference:
https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html#43-client-side-invocation

API Endpoint: POST /layout-parsing
"""

from typing import Dict, Any, Optional, List, Union, TypedDict


# ============================================================================
# Request Types
# ============================================================================

class LayoutParsingRequest(TypedDict, total=False):
    """
    Request payload for POST /layout-parsing API.

    Fields:
        file: Base64 encoded file content or file URL
        fileType: 0=PDF, 1=Image. If null, inferred from URL
        useDocOrientationClassify: Enable document orientation classification
        useDocUnwarping: Enable document image unwarping
        useLayoutDetection: Enable layout detection
        useChartRecognition: Enable chart recognition
        layoutThreshold: Score threshold (0-1) or dict of class_id->threshold
        layoutNms: Whether to use NMS for layout detection
        layoutUnclipRatio: Bbox expansion ratio
        layoutMergeBboxesMode: Bbox merge mode ('large', 'small', 'union')
        promptLabel: VL model prompt type ('ocr', 'formula', 'table', 'chart')
        formatBlockContent: Format block content as Markdown
        repetitionPenalty: VL model repetition penalty
        temperature: VL model temperature parameter
        topP: VL model top-p parameter
        minPixels: Minimum pixels for image preprocessing
        maxPixels: Maximum pixels for image preprocessing
        prettifyMarkdown: Beautify Markdown output
        showFormulaNumber: Include formula numbers in Markdown
        visualize: Return visualization images
    """
    file: str
    fileType: Optional[int]
    useDocOrientationClassify: Optional[bool]
    useDocUnwarping: Optional[bool]
    useLayoutDetection: Optional[bool]
    useChartRecognition: Optional[bool]
    layoutThreshold: Optional[Union[float, Dict[int, float]]]
    layoutNms: Optional[bool]
    layoutUnclipRatio: Optional[Union[float, tuple, Dict[int, tuple]]]
    layoutMergeBboxesMode: Optional[Union[str, Dict[int, str]]]
    promptLabel: Optional[str]
    formatBlockContent: Optional[bool]
    repetitionPenalty: Optional[float]
    temperature: Optional[float]
    topP: Optional[float]
    minPixels: Optional[int]
    maxPixels: Optional[int]
    prettifyMarkdown: Optional[bool]
    showFormulaNumber: Optional[bool]
    visualize: Optional[bool]


class ClientConfig(TypedDict, total=False):
    """
    Client configuration.

    Fields:
        base_url: Remote service URL (e.g., "http://localhost:8080")
        endpoint: API endpoint path (default: "/layout-parsing")
        timeout: Request timeout in seconds (default: 120)
        max_retries: Max retry attempts (default: 3)
        use_doc_orientation_classify: Enable document orientation classification
        use_doc_unwarping: Enable document image unwarping
        use_layout_detection: Enable layout detection (default: True)
        use_chart_recognition: Enable chart recognition
        format_block_content: Format block content as Markdown
        visualize: Return visualization images
        prettify_markdown: Beautify Markdown output (default: True)
        show_formula_number: Include formula numbers in Markdown
    """
    base_url: str
    endpoint: str
    timeout: int
    max_retries: int
    use_doc_orientation_classify: bool
    use_doc_unwarping: bool
    use_layout_detection: bool
    use_chart_recognition: bool
    format_block_content: bool
    visualize: bool
    prettify_markdown: bool
    show_formula_number: bool


# ============================================================================
# Response Types
# ============================================================================

class BlockContent(TypedDict, total=False):
    """
    Block content from parsing results.

    Fields:
        block_bbox: Bounding box coordinates [x1, y1, x2, y2]
        block_label: Block type label ('text', 'table', 'image', etc.)
        block_content: Text/content within the block
        block_id: Block index for layout sorting
        block_order: Reading order (None for non-sorted blocks)
    """
    block_bbox: List[float]
    block_label: str
    block_content: str
    block_id: int
    block_order: Optional[int]


class PrunedResult(TypedDict):
    """
    Simplified parsing result (input_path and page_index removed).

    Fields:
        parsing_res_list: List of parsed blocks in reading order
    """
    parsing_res_list: List[BlockContent]


class MarkdownImages(TypedDict):
    """
    Markdown output with embedded images.

    Fields:
        text: Markdown text content
        images: Mapping of relative paths to base64-encoded images
        isStart: Whether first element on page is paragraph start
        isEnd: Whether last element on page is paragraph end
    """
    text: str
    images: Dict[str, str]
    isStart: bool
    isEnd: bool


class LayoutParsingResult(TypedDict):
    """
    Single page layout parsing result.

    Fields:
        prunedResult: Parsed layout blocks
        markdown: Markdown formatted output
        outputImages: Optional visualization images (base64 JPEG)
        inputImage: Optional input image (base64 JPEG)
    """
    prunedResult: PrunedResult
    markdown: MarkdownImages
    outputImages: Optional[Dict[str, str]]
    inputImage: Optional[str]


class DataInfo(TypedDict, total=False):
    """
    Input data information.

    Extended based on actual API response.
    """
    pass


class LayoutParsingResponseData(TypedDict):
    """
    Response result data.

    Fields:
        layoutParsingResults: Array of page results (1 for image, N for PDF)
        dataInfo: Input metadata information
    """
    layoutParsingResults: List[LayoutParsingResult]
    dataInfo: DataInfo


class APIResponse(TypedDict):
    """
    Full API response wrapper.

    Fields:
        logId: Request UUID
        errorCode: Error code (0 for success)
        errorMsg: Error description ("Success" for successful requests)
        result: Response data with layout parsing results
    """
    logId: str
    errorCode: int
    errorMsg: str
    result: LayoutParsingResponseData


# ============================================================================
# Output Types
# ============================================================================

class ExtractionResult(TypedDict):
    """
    Final extraction result returned to client.

    Fields:
        raw_text: Concatenated text from all blocks (reading order)
        markdown: Full markdown output from all pages
        layout: Structured layout info (num_pages, num_blocks, blocks)
        ocr_result: Full API response data for further processing
    """
    raw_text: str
    markdown: str
    layout: Dict[str, Any]
    ocr_result: LayoutParsingResponseData
