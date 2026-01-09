"""
Typed configuration dataclasses for the invoice processing system.

Provides type-safe configuration instead of raw dict access.
"""

import os
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


@dataclass
class WorkflowConfig:
    """LangGraph workflow configuration."""

    max_retries: int = 3
    retry_delay_base: float = 2.0
    enable_ocr_retry: bool = True
    enable_extraction_retry: bool = True
    retry_ocr_on_missing_fields: bool = True  # Retry OCR when extraction validation fails

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'WorkflowConfig':
        """Create from raw dict (for backward compatibility)."""
        return cls(
            max_retries=config.get('max_retries', 3),
            retry_delay_base=config.get('retry_delay_base', 2.0),
            enable_ocr_retry=config.get('enable_ocr_retry', True),
            enable_extraction_retry=config.get('enable_extraction_retry', True),
            retry_ocr_on_missing_fields=config.get('retry_ocr_on_missing_fields', True),
        )


@dataclass
class PaddleOCRConfig:
    """PaddleOCR-VL remote service configuration."""

    base_url: str
    endpoint: str = "/layout-parsing"
    timeout: int = 120
    max_retries: int = 3

    # OCR processing parameters
    use_doc_orientation_classify: bool = False
    use_doc_unwarping: bool = False
    use_layout_detection: bool = True
    use_chart_recognition: bool = False
    format_block_content: bool = False

    # Optional: Visual output
    visualize: bool = False

    # Optional: Markdown output
    prettify_markdown: bool = True
    show_formula_number: bool = False

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'PaddleOCRConfig':
        """Create from raw dict (for backward compatibility)."""
        return cls(
            base_url=config['base_url'],
            endpoint=config.get('endpoint', '/layout-parsing'),
            timeout=config.get('timeout', 120),
            max_retries=config.get('max_retries', 3),
            use_doc_orientation_classify=config.get('use_doc_orientation_classify', False),
            use_doc_unwarping=config.get('use_doc_unwarping', False),
            use_layout_detection=config.get('use_layout_detection', True),
            use_chart_recognition=config.get('use_chart_recognition', False),
            format_block_content=config.get('format_block_content', False),
            visualize=config.get('visualize', False),
            prettify_markdown=config.get('prettify_markdown', True),
            show_formula_number=config.get('show_formula_number', False),
        )


@dataclass
class LLMConfig:
    """LLM configuration for extraction."""

    provider: str = "openai"
    model: str = "gpt-4o"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    temperature: float = 0.1
    max_tokens: int = 2000
    timeout: int = 30
    required_fields: list = field(default_factory=lambda: [
        "department.code",
        "invoice.po_no",
        "invoice.invoice_no",
        "invoice.invoice_date",
        "items",
        "summary.subtotal_ex_tax",
        "summary.total_inc_tax",
    ])

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'LLMConfig':
        """Create from raw dict (for backward compatibility)."""
        # Handle environment variable expansion
        api_key = config.get('api_key')
        if api_key and isinstance(api_key, str) and api_key.startswith("${"):
            env_var = api_key[2:-1]
            api_key = os.getenv(env_var)

        return cls(
            provider=config.get('provider', 'openai'),
            model=config.get('model', 'gpt-4o'),
            api_key=api_key,
            base_url=config.get('base_url'),
            temperature=config.get('temperature', 0.1),
            max_tokens=config.get('max_tokens', 2000),
            timeout=config.get('timeout', 30),
            required_fields=config.get('required_fields', [
                "department.code",
                "invoice.po_no",
                "invoice.invoice_no",
                "invoice.invoice_date",
                "items",
                "summary.subtotal_ex_tax",
                "summary.total_inc_tax",
            ]),
        )


@dataclass
class ProcessingConfig:
    """Batch processing configuration."""

    input_dir: str = "./invoices"
    output_dir: str = "./results"
    max_workers: int = 5
    batch_size: int = 1
    retry_attempts: int = 3
    retry_delay: float = 2.0
    log_level: str = "INFO"

    # Output structure options
    preserve_source_structure: bool = True
    copy_source_pdf: bool = True
    save_ocr_markdown: bool = True
    save_ocr_json: bool = True

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'ProcessingConfig':
        """Create from raw dict (for backward compatibility)."""
        return cls(
            input_dir=config.get('input_dir', './invoices'),
            output_dir=config.get('output_dir', './results'),
            max_workers=config.get('max_workers', 5),
            batch_size=config.get('batch_size', 1),
            retry_attempts=config.get('retry_attempts', 3),
            retry_delay=config.get('retry_delay', 2.0),
            log_level=config.get('log_level', 'INFO'),
            preserve_source_structure=config.get('preserve_source_structure', True),
            copy_source_pdf=config.get('copy_source_pdf', True),
            save_ocr_markdown=config.get('save_ocr_markdown', True),
            save_ocr_json=config.get('save_ocr_json', True),
        )


@dataclass
class AppConfig:
    """Main application configuration."""

    paddleocr_vl: PaddleOCRConfig
    llm: LLMConfig
    processing: ProcessingConfig
    workflow: WorkflowConfig = field(default_factory=WorkflowConfig)

    @classmethod
    def from_dict(cls, config: Dict[str, Any]) -> 'AppConfig':
        """Create from raw dict (loaded from YAML file)."""
        return cls(
            paddleocr_vl=PaddleOCRConfig.from_dict(config.get('paddleocr_vl', {})),
            llm=LLMConfig.from_dict(config.get('llm', {})),
            processing=ProcessingConfig.from_dict(config.get('processing', {})),
            workflow=WorkflowConfig.from_dict(config.get('workflow', {})),
        )

    def to_dict(self) -> Dict[str, Any]:
        """Convert back to raw dict (for backward compatibility)."""
        return {
            'paddleocr_vl': {
                'base_url': self.paddleocr_vl.base_url,
                'endpoint': self.paddleocr_vl.endpoint,
                'timeout': self.paddleocr_vl.timeout,
                'max_retries': self.paddleocr_vl.max_retries,
                'use_doc_orientation_classify': self.paddleocr_vl.use_doc_orientation_classify,
                'use_doc_unwarping': self.paddleocr_vl.use_doc_unwarping,
                'use_layout_detection': self.paddleocr_vl.use_layout_detection,
                'use_chart_recognition': self.paddleocr_vl.use_chart_recognition,
                'format_block_content': self.paddleocr_vl.format_block_content,
                'visualize': self.paddleocr_vl.visualize,
                'prettify_markdown': self.paddleocr_vl.prettify_markdown,
                'show_formula_number': self.paddleocr_vl.show_formula_number,
            },
            'llm': {
                'provider': self.llm.provider,
                'model': self.llm.model,
                'api_key': self.llm.api_key,
                'base_url': self.llm.base_url,
                'temperature': self.llm.temperature,
                'max_tokens': self.llm.max_tokens,
                'timeout': self.llm.timeout,
                'required_fields': self.llm.required_fields,
            },
            'processing': {
                'input_dir': self.processing.input_dir,
                'output_dir': self.processing.output_dir,
                'max_workers': self.processing.max_workers,
                'batch_size': self.processing.batch_size,
                'retry_attempts': self.processing.retry_attempts,
                'retry_delay': self.processing.retry_delay,
                'log_level': self.processing.log_level,
                'preserve_source_structure': self.processing.preserve_source_structure,
                'copy_source_pdf': self.processing.copy_source_pdf,
                'save_ocr_markdown': self.processing.save_ocr_markdown,
                'save_ocr_json': self.processing.save_ocr_json,
            },
            'workflow': {
                'max_retries': self.workflow.max_retries,
                'retry_delay_base': self.workflow.retry_delay_base,
                'enable_ocr_retry': self.workflow.enable_ocr_retry,
                'enable_extraction_retry': self.workflow.enable_extraction_retry,
                'retry_ocr_on_missing_fields': self.workflow.retry_ocr_on_missing_fields,
            },
        }
