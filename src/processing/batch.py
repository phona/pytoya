"""
Batch processing for multiple invoice PDFs.
"""

import os
import yaml
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Any, List
import logging

from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.extraction.extractor import InvoiceExtractor

logger = logging.getLogger(__name__)


class BatchProcessor:
    """Process multiple invoice PDFs in parallel."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize batch processor.

        Args:
            config: Full configuration dict
        """
        self.config = config
        self.ocr = PaddleOCRVLClient(config['paddleocr_vl'])
        self.extractor = InvoiceExtractor(config['llm'])
        self.input_dir = Path(config['processing']['input_dir'])
        self.output_dir = Path(config['processing']['output_dir'])
        self.max_workers = config['processing']['max_workers']

        # Create output directory
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def process_file(self, pdf_path: Path) -> Dict[str, Any]:
        """
        Process a single PDF file.

        Args:
            pdf_path: Path to PDF file

        Returns:
            Result dict with status and output path
        """
        try:
            logger.info(f"Processing: {pdf_path.name}")

            # Step 1: OCR extraction
            ocr_result = self.ocr.extract_text(str(pdf_path))

            # Step 2: LLM structured extraction
            data = self.extractor.extract(ocr_result)

            # Step 3: Save YAML
            output_path = self.output_dir / f"{pdf_path.stem}.yaml"
            with open(output_path, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, allow_unicode=True, sort_keys=False)

            logger.info(f"✓ Completed: {pdf_path.name} -> {output_path.name}")

            return {
                "status": "success",
                "input": str(pdf_path),
                "output": str(output_path),
                "data": data
            }

        except Exception as e:
            logger.error(f"✗ Failed: {pdf_path.name} - {e}")
            return {
                "status": "error",
                "input": str(pdf_path),
                "error": str(e)
            }

    def process_all(self) -> List[Dict[str, Any]]:
        """
        Process all PDFs in input directory.

        Returns:
            List of result dictionaries
        """
        # Find all PDFs
        pdf_files = list(self.input_dir.glob("*.pdf"))

        if not pdf_files:
            logger.warning(f"No PDF files found in {self.input_dir}")
            return []

        logger.info(f"Found {len(pdf_files)} PDF files to process")

        # Process in parallel
        results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.process_file, pdf): pdf
                      for pdf in pdf_files}

            for future in as_completed(futures):
                result = future.result()
                results.append(result)

        # Summary
        success_count = sum(1 for r in results if r['status'] == 'success')
        logger.info(f"Processing complete: {success_count}/{len(results)} successful")

        return results
