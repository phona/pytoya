"""
LLM-based structured data extraction from OCR text.
Supports OpenAI and litellm providers.
"""

from typing import Dict, Any, Optional
from openai import OpenAI
import logging
import time

import yaml
from src.config import LLMConfig
from src.extraction.prompts import (
    get_system_prompt,
    get_re_extract_system_prompt,
    build_extraction_prompt,
    build_re_extract_prompt,
)

logger = logging.getLogger(__name__)


class InvoiceExtractor:
    """Extract structured data from invoice text using LLM."""

    def __init__(self, config: LLMConfig):
        """
        Initialize LLM extractor.

        Args:
            config: LLMConfig with LLM configuration
        """
        self._config = config

        self.provider = self._config.provider
        self.model = self._config.model
        self.temperature = self._config.temperature
        self.max_tokens = self._config.max_tokens
        self.required_fields = self._config.required_fields

        if self.provider == "openai":
            self.client = OpenAI(
                api_key=self._config.api_key,
                base_url=self._config.base_url
            )
        else:
            # litellm support can be added here
            raise NotImplementedError(f"Provider {self.provider} not implemented")

        logger.info(f"Initialized {self.provider} extractor with model: {self.model}")

    def extract(self, ocr_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract structured data from OCR result.

        Args:
            ocr_result: OCR output with raw_text and markdown

        Returns:
            Structured data dictionary
        """
        start_time = time.time()
        markdown_text = ocr_result.get('markdown', '')
        raw_text = ocr_result.get('raw_text', '')
        prompt = build_extraction_prompt(markdown_text, raw_text)

        logger.info(f"[TIMING] Prompt built in {time.time() - start_time:.2f}s")
        logger.info(f"[TIMING] Markdown length: {len(markdown_text)}, Raw text length: {len(raw_text)}")
        logger.info(f"[TIMING] Prompt length: {len(prompt)} chars")

        api_start = time.time()
        try:
            logger.info(f"[TIMING] Calling LLM API: {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            api_duration = time.time() - api_start
            logger.info(f"[TIMING] LLM API call completed in {api_duration:.2f}s")

            content = response.choices[0].message.content
            logger.info(f"[TIMING] Response length: {len(content)} chars")

            # Parse YAML from response
            parse_start = time.time()
            data = yaml.safe_load(content)
            parse_duration = time.time() - parse_start
            logger.info(f"[TIMING] YAML parsing completed in {parse_duration:.2f}s")

            # Log extracted fields for debugging
            if isinstance(data, dict):
                logger.info(f"[DEBUG] Extracted keys: {list(data.keys())}")
                if 'department' in data:
                    logger.info(f"[DEBUG] Department: {data['department']}")
                if 'invoice' in data:
                    logger.info(f"[DEBUG] Invoice: {data['invoice']}")
                if 'items' in data:
                    logger.info(f"[DEBUG] Items count: {len(data.get('items', []))}")
                if 'summary' in data:
                    logger.info(f"[DEBUG] Summary: {data['summary']}")

            total_duration = time.time() - start_time
            logger.info(f"[TIMING] Total extract() time: {total_duration:.2f}s")
            return data

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            logger.error(f"[TIMING] Failed after {time.time() - api_start:.2f}s")
            raise

    def re_extract(
        self,
        ocr_result: Dict[str, Any],
        previous_result: Dict[str, Any],
        missing_fields: Optional[list] = None,
        error_message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Re-extract data with improved prompt based on previous attempt.

        Use this when:
        - YAML parsing failed
        - Required fields are missing
        - Previous extraction had errors

        Args:
            ocr_result: OCR output with raw_text and markdown
            previous_result: Previous extraction result (for context)
            missing_fields: List of field paths that were missing (e.g., ["department.code", "items[0].name"])
            error_message: Error from previous attempt (e.g., "YAML parse error")

        Returns:
            Improved structured data dictionary
        """
        start_time = time.time()
        logger.info(f"[RE-EXTRACT] Starting re-extraction. Missing fields: {missing_fields}, Error: {error_message}")

        markdown_text = ocr_result.get('markdown', '')
        raw_text = ocr_result.get('raw_text', '')
        prompt = build_re_extract_prompt(
            markdown_text,
            raw_text,
            previous_result,
            missing_fields,
            error_message
        )

        logger.info(f"[RE-EXTRACT] Prompt length: {len(prompt)} chars")

        api_start = time.time()
        try:
            logger.info(f"[RE-EXTRACT] Calling LLM API: {self.model}")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": get_re_extract_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            api_duration = time.time() - api_start
            logger.info(f"[RE-EXTRACT] LLM API call completed in {api_duration:.2f}s")

            content = response.choices[0].message.content
            logger.info(f"[RE-EXTRACT] Response length: {len(content)} chars")

            # Parse YAML from response
            parse_start = time.time()
            data = yaml.safe_load(content)
            parse_duration = time.time() - parse_start
            logger.info(f"[RE-EXTRACT] YAML parsing completed in {parse_duration:.2f}s")

            total_duration = time.time() - start_time
            logger.info(f"[RE-EXTRACT] Total re_extract() time: {total_duration:.2f}s")
            return data

        except Exception as e:
            logger.error(f"LLM re-extraction failed: {e}")
            logger.error(f"[RE-EXTRACT] Failed after {time.time() - api_start:.2f}s")
            raise

    def validate_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate extraction result against configured required fields.

        Args:
            data: Extracted data dictionary

        Returns:
            Validation result with:
                - valid (bool): Whether all required fields are present and valid
                - missing_fields (list): Fields that are missing
                - errors (list): Validation errors
        """
        logger.info(f"[VALIDATION] Starting validation. Required fields: {self.required_fields}")

        validation_result = {
            "valid": True,
            "missing_fields": [],
            "errors": []
        }

        for field_path in self.required_fields:
            # Check if field is nullable (ends with ?)
            nullable = field_path.endswith("?")
            actual_field_path = field_path.rstrip("?") if nullable else field_path

            field_exists, field_value = self._check_field_exists_with_value(data, actual_field_path)

            if nullable:
                # For nullable fields: field must exist but can be null
                if not field_exists:
                    logger.info(f"[VALIDATION] Checking field '{actual_field_path}': MISSING (nullable but not found)")
                    validation_result["valid"] = False
                    validation_result["missing_fields"].append(actual_field_path)
                    validation_result["errors"].append(f"Missing nullable field: {actual_field_path}")
                else:
                    status = "NULL" if field_value is None else "EXISTS"
                    logger.info(f"[VALIDATION] Checking field '{actual_field_path}': {status} (nullable)")
            else:
                # For non-nullable fields: field must exist and not be null/empty
                logger.info(f"[VALIDATION] Checking field '{actual_field_path}': {'EXISTS' if field_exists else 'MISSING'}")
                if not field_exists:
                    validation_result["valid"] = False
                    validation_result["missing_fields"].append(actual_field_path)
                    validation_result["errors"].append(f"Missing required field: {actual_field_path}")

        # Validate data types and values
        items_count = len(data.get("items", []))
        logger.info(f"[VALIDATION] Items count: {items_count}")
        if not data.get("items"):
            validation_result["valid"] = False
            validation_result["errors"].append("No items found in extraction")

        logger.info(f"[VALIDATION] Result: {'VALID' if validation_result['valid'] else 'INVALID'}, Missing: {validation_result['missing_fields']}, Errors: {validation_result['errors']}")
        return validation_result

    def _check_field_exists(self, data: Dict[str, Any], field_path: str) -> bool:
        """
        Check if a field exists in nested dictionary.

        Args:
            data: Data dictionary
            field_path: Dot-separated field path (e.g., "department.code")

        Returns:
            True if field exists and is not None/empty
        """
        exists, _ = self._check_field_exists_with_value(data, field_path)
        return exists

    def _check_field_exists_with_value(self, data: Dict[str, Any], field_path: str) -> tuple:
        """
        Check if a field exists in nested dictionary and return its value.

        Args:
            data: Data dictionary
            field_path: Dot-separated field path (e.g., "department.code")

        Returns:
            Tuple of (exists: bool, value: Any)
        """
        parts = field_path.split(".")
        current = data

        for part in parts:
            # Handle array indexing (e.g., "items[0].name")
            if "[" in part and part.endswith("]"):
                key, index = part.split("[")
                index = int(index.rstrip("]"))

                if key not in current or not isinstance(current[key], list):
                    return False, None

                if index >= len(current[key]):
                    return False, None

                current = current[key][index]
            else:
                if part not in current:
                    return False, None

                current = current[part]

        if current is None:
            return True, None  # Field exists but is None

        # For strings, check if not empty
        if isinstance(current, str) and not current.strip():
            return False, None

        return True, current
