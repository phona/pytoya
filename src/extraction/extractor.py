"""
LLM-based structured data extraction from OCR text.
Supports OpenAI and litellm providers.
"""

import os
import yaml
from typing import Dict, Any, Optional
from openai import OpenAI
import logging

logger = logging.getLogger(__name__)


class InvoiceExtractor:
    """Extract structured data from invoice text using LLM."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize LLM extractor.

        Args:
            config: LLM configuration dict
        """
        self.provider = config.get("provider", "openai")
        self.model = config.get("model", "gpt-4o")
        self.temperature = config.get("temperature", 0.1)
        self.max_tokens = config.get("max_tokens", 2000)

        if self.provider == "openai":
            api_key = config.get("api_key")
            if api_key and api_key.startswith("${"):
                # Environment variable
                api_key = os.getenv(api_key[2:-1])

            self.client = OpenAI(
                api_key=api_key,
                base_url=config.get("base_url")
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
        prompt = self._build_prompt(ocr_result)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )

            content = response.choices[0].message.content

            # Parse YAML from response
            data = yaml.safe_load(content)
            return data

        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            raise

    def _get_system_prompt(self) -> str:
        """Get system prompt for the LLM."""
        return """You are an expert invoice data extraction system.
Extract all fields from the invoice text and return ONLY valid YAML.
If a field is not found, use null or appropriate default value.
Do not include explanations, only the YAML data."""

    def _build_prompt(self, ocr_result: Dict[str, Any]) -> str:
        """Build extraction prompt from OCR result."""
        # Use markdown for better structure preservation
        markdown_text = ocr_result.get('markdown', '')
        raw_text = ocr_result.get('raw_text', '')

        return f"""Extract structured data from this Chinese invoice:

OCR Text (Raw):
{raw_text}

Markdown Format:
{markdown_text}

Return a YAML object with this exact structure:
```yaml
department:
  code: string  # 部门代码
  name: string  # 部门名称 (optional)

invoice:
  po_no: string        # 订单号/PO号
  delivery_no: string  # 交货单号
  invoice_no: string   # 发票编号
  invoice_date: string # 发票日期 (YYYY-MM-DD)

items:
  - name: string                    # 货物描述/品名
    quantity: number                # 数量
    unit: string                    # 单位 (PCS, KG, etc)
    unit_price_ex_tax: number       # 不含税单价
    unit_price_inc_tax: number      # 含税单价
    tax_rate: number                # 税率 (e.g., 0.13 for 13%)
    tax_amount: number              # 税额
    total_amount_inc_tax: number    # 含税总价

summary:
  subtotal_ex_tax: number   # 不含税小计
  total_tax: number         # 税额合计
  total_inc_tax: number     # 含税总计
  currency: string          # 货币代码 (CNY, USD, etc)
```

Extract ALL items listed in the invoice. Return only the YAML, no markdown code blocks."""
