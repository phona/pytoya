"""
Remote PaddleOCR-VL service client for invoice OCR.
Uses HTTP API to call remote PaddleOCR-VL server.

Official API Reference:
https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html#43-client-side-invocation

API Endpoint: POST /layout-parsing
"""

import requests
import base64
from typing import Dict, Any, List
from pathlib import Path
import logging

from src.ocr.types import (
    LayoutParsingRequest,
    ClientConfig,
    ExtractionResult,
    LayoutParsingResponseData,
    BlockContent,
)

logger = logging.getLogger(__name__)


# ============================================================================
# PaddleOCR-VL Remote Client
# ============================================================================

class PaddleOCRVLClient:
    """
    Client for remote PaddleOCR-VL service.

    API Reference:
    https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html#43-client-side-invocation
    """

    def __init__(self, config: ClientConfig):
        """
        Initialize remote PaddleOCR-VL client.

        Args:
            config: Client configuration with:
                - base_url: Remote service URL (e.g., "http://localhost:8080")
                - endpoint: API endpoint path (default: "/layout-parsing")
                - timeout: Request timeout in seconds (default: 120)
                - max_retries: Max retry attempts (default: 3)
                - use_doc_orientation_classify: Enable document orientation classification
                - use_doc_unwarping: Enable document image unwarping
                - use_layout_detection: Enable layout detection (default: True)
                - use_chart_recognition: Enable chart recognition
                - format_block_content: Format block content as Markdown
                - visualize: Return visualization images
                - prettify_markdown: Beautify Markdown output (default: True)
                - show_formula_number: Include formula numbers in Markdown
        """
        self.base_url: str = config['base_url'].rstrip('/')
        self.endpoint: str = config.get('endpoint', '/layout-parsing')
        self.api_url: str = f"{self.base_url}{self.endpoint}"
        self.timeout: int = config.get('timeout', 120)
        self.max_retries: int = config.get('max_retries', 3)

        # OCR processing parameters
        self.use_doc_orientation_classify: bool = config.get('use_doc_orientation_classify', False)
        self.use_doc_unwarping: bool = config.get('use_doc_unwarping', False)
        self.use_layout_detection: bool = config.get('use_layout_detection', True)
        self.use_chart_recognition: bool = config.get('use_chart_recognition', False)
        self.format_block_content: bool = config.get('format_block_content', False)
        self.visualize: bool = config.get('visualize', False)
        self.prettify_markdown: bool = config.get('prettify_markdown', True)
        self.show_formula_number: bool = config.get('show_formula_number', False)

        logger.info(f"Initialized PaddleOCR-VL client: {self.api_url}")

    def extract_text(self, pdf_path: str) -> ExtractionResult:
        """
        Extract text from PDF using remote PaddleOCR-VL service.

        Args:
            pdf_path: Path to PDF file

        Returns:
            ExtractionResult containing:
                - raw_text: Concatenated text from all blocks
                - markdown: Full markdown output
                - layout: Structured layout information (num_pages, num_blocks, blocks)
                - ocr_result: Full API response data

        Raises:
            ValueError: If API returns error or invalid response
            TimeoutError: If request times out after max_retries
            requests.HTTPError: If HTTP error occurs
        """
        # Prepare request payload
        payload: LayoutParsingRequest = self._prepare_payload(pdf_path)

        # Send request with retries
        response_data: LayoutParsingResponseData = self._send_request(payload)

        # Parse response
        return self._parse_response(response_data)

    def _prepare_payload(self, pdf_path: str) -> LayoutParsingRequest:
        """
        Prepare API request payload according to official API spec.

        Reference:
        https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PaddleOCR-VL.html#43-client-side-invocation

        Args:
            pdf_path: Path to PDF file

        Returns:
            LayoutParsingRequest payload dict
        """
        # Read and encode file
        pdf_file = Path(pdf_path)
        with open(pdf_file, 'rb') as f:
            file_bytes = f.read()
            file_data = base64.b64encode(file_bytes).decode('ascii')

        # Build payload matching official API specification
        payload: LayoutParsingRequest = {
            "file": file_data,  # Base64 encoded file or URL
            "fileType": 0,  # 0=PDF, 1=Image (inferred from URL if null)
            "useDocOrientationClassify": self.use_doc_orientation_classify,
            "useDocUnwarping": self.use_doc_unwarping,
            "useLayoutDetection": self.use_layout_detection,
            "useChartRecognition": self.use_chart_recognition,
            "formatBlockContent": self.format_block_content,
            "prettifyMarkdown": self.prettify_markdown,
            "showFormulaNumber": self.show_formula_number,
            "visualize": self.visualize
        }

        return payload

    def _send_request(self, payload: LayoutParsingRequest) -> LayoutParsingResponseData:
        """
        Send HTTP POST request with retry logic.

        Args:
            payload: Request payload matching LayoutParsingRequest spec

        Returns:
            LayoutParsingResponseData from API response

        Raises:
            TimeoutError: If request times out after max_retries
            requests.HTTPError: If HTTP error occurs
            ValueError: If API returns error code
        """
        for attempt in range(self.max_retries):
            try:
                logger.debug(f"Sending OCR request (attempt {attempt + 1}/{self.max_retries})")

                response = requests.post(
                    self.api_url,
                    json=payload,
                    timeout=self.timeout
                )

                response.raise_for_status()
                api_response: APIResponse = response.json()

                # Check API response format
                # Successful response: errorCode=0, errorMsg="Success"
                if api_response.get('errorCode') != 0:
                    raise ValueError(
                        f"API error: {api_response.get('errorMsg', 'Unknown error')} "
                        f"(errorCode: {api_response.get('errorCode')})"
                    )

                result: LayoutParsingResponseData = api_response.get('result')
                if result is None:
                    raise ValueError("API response missing 'result' field")

                return result

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1}")
                if attempt == self.max_retries - 1:
                    raise TimeoutError(
                        f"Request timeout after {self.max_retries} attempts"
                    )

            except requests.exceptions.HTTPError as e:
                logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
                raise

            except Exception as e:
                logger.error(f"Request failed: {e}")
                if attempt == self.max_retries - 1:
                    raise

    def _parse_response(self, result: LayoutParsingResponseData) -> ExtractionResult:
        """
        Parse PaddleOCR-VL API response into extraction result.

        Expected response format from official docs:
        {
            "layoutParsingResults": [
                {
                    "prunedResult": {
                        "parsing_res_list": [
                            {
                                "block_bbox": [...],
                                "block_label": "text",
                                "block_content": "...",
                                "block_id": 0,
                                "block_order": 0
                            }
                        ]
                    },
                    "markdown": {
                        "text": "# Markdown content...",
                        "images": {...},
                        "isStart": true,
                        "isEnd": false
                    },
                    "outputImages": {...},  # Optional
                    "inputImage": "..."  # Optional
                }
            ],
            "dataInfo": {...}
        }

        Args:
            result: LayoutParsingResponseData from API

        Returns:
            ExtractionResult with processed text and layout info

        Raises:
            ValueError: If no layout parsing results in response
        """
        layout_results: List[LayoutParsingResult] = result.get('layoutParsingResults', [])

        if not layout_results:
            raise ValueError("No layout parsing results in response")

        # Combine all pages
        all_blocks: List[BlockContent] = []
        markdown_texts: List[str] = []

        for page_result in layout_results:
            pruned_result = page_result.get('prunedResult', {})
            parsing_res_list = pruned_result.get('parsing_res_list', [])
            all_blocks.extend(parsing_res_list)

            markdown = page_result.get('markdown', {})
            markdown_text = markdown.get('text', '')
            markdown_texts.append(markdown_text)

        # Extract raw text from blocks (preserving reading order)
        # Sort by block_order if available, otherwise maintain original order
        sorted_blocks = sorted(
            all_blocks,
            key=lambda b: b.get('block_order', 9999) if b.get('block_order') is not None else 9999
        )
        raw_text = '\n'.join([
            block.get('block_content', '')
            for block in sorted_blocks
        ])

        # Combine markdown from all pages
        full_markdown = '\n\n'.join(markdown_texts)

        # Extract layout info
        layout: Dict[str, Any] = {
            'num_pages': len(layout_results),
            'num_blocks': len(all_blocks),
            'blocks': all_blocks
        }

        extraction_result: ExtractionResult = {
            'raw_text': raw_text,
            'markdown': full_markdown,
            'layout': layout,
            'ocr_result': result
        }

        return extraction_result
