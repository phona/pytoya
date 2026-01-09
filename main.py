"""
Main CLI entry point for invoice processing with LangGraph workflow.
"""

import argparse
import logging
import yaml
from pathlib import Path
import sys
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.workflow.graph import build_invoice_workflow
from src.workflow.batch import WorkflowBatchProcessor
from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.extraction.extractor import InvoiceExtractor
from src.config import AppConfig


def setup_logging(level: str = "INFO"):
    """Configure logging."""
    logging.basicConfig(
        level=getattr(logging, level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('processing.log', encoding='utf-8')
        ]
    )


def load_config(config_path: str = "config.yaml") -> dict:
    """Load configuration from YAML file."""
    with open(config_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Process invoices with PaddleOCR-VL + LLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py                                    # Process all PDFs in input directory
  python main.py invoice1.pdf invoice2.pdf          # Process specific files
  python main.py --config custom.yaml               # Use custom config
  python main.py --input ./invoices --output ./results  # Override paths
        """
    )
    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Path to configuration file (default: config.yaml)"
    )
    parser.add_argument(
        "--input",
        help="Override input directory"
    )
    parser.add_argument(
        "--output",
        help="Override output directory"
    )
    parser.add_argument(
        "--workers",
        type=int,
        help="Override number of parallel workers"
    )
    parser.add_argument(
        "--reuse-ocr",
        action="store_true",
        help="Reuse existing OCR results from output directory, skip OCR processing"
    )
    parser.add_argument(
        "files",
        nargs="*",
        help="Specific PDF filenames to process (relative to input directory)"
    )

    args = parser.parse_args()

    # Load config
    try:
        raw_config = load_config(args.config)
        config = AppConfig.from_dict(raw_config)
    except FileNotFoundError:
        print(f"Error: Configuration file '{args.config}' not found.")
        print("Please create a config.yaml file or specify --config.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    # Override paths if provided
    if args.input:
        config.processing.input_dir = args.input
    if args.output:
        config.processing.output_dir = args.output
    if args.workers:
        config.processing.max_workers = args.workers

    # Setup logging
    setup_logging(config.processing.log_level)
    logger = logging.getLogger(__name__)

    # Print configuration
    logger.info("=" * 60)
    logger.info("PyToYa - Invoice Processing System")
    logger.info("=" * 60)
    logger.info(f"Input directory: {config.processing.input_dir}")
    logger.info(f"Output directory: {config.processing.output_dir}")
    logger.info(f"PaddleOCR-VL service: {config.paddleocr_vl.base_url}")
    logger.info(f"LLM provider: {config.llm.provider}")
    logger.info(f"Max workers: {config.processing.max_workers}")
    logger.info(f"Workflow max retries: {config.workflow.max_retries}")
    if args.reuse_ocr:
        logger.info("Mode: Reusing existing OCR results (skipping OCR)")
    logger.info("=" * 60)

    # Build workflow graph externally with dependency injection
    logger.info("Building LangGraph workflow with dependency injection...")

    # Create OCR client with typed config
    ocr_client = PaddleOCRVLClient(config.paddleocr_vl)
    logger.info(f"✓ OCR client initialized: {config.paddleocr_vl.base_url}")

    # Create LLM extractor with typed config
    extractor = InvoiceExtractor(config.llm)
    logger.info(f"✓ LLM extractor initialized: {config.llm.model}")

    # Build workflow with injected dependencies
    workflow_graph = build_invoice_workflow(
        ocr_client=ocr_client,
        extractor=extractor,
        workflow_config=config.workflow,
        reuse_ocr=args.reuse_ocr
    )
    logger.info("✓ Workflow graph built with dependency injection")

    # Process with injected workflow
    try:
        # Create processor with injected graph and typed config
        processor = WorkflowBatchProcessor(workflow_graph, config)

        # Process specific files or all files
        if args.files:
            results = processor.process_files(args.files)
        else:
            results = processor.process_all()

        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING SUMMARY")
        print("=" * 60)
        for result in results:
            status_symbol = "[OK]" if result['status'] == 'success' else "[FAIL]"
            input_name = Path(result['input']).name
            if result['status'] == 'success':
                output_name = Path(result['output']).name
                print(f"{status_symbol} {input_name} -> {output_name}")
            else:
                print(f"{status_symbol} {input_name}: {result.get('error', 'Unknown error')}")

        success_count = sum(1 for r in results if r['status'] == 'success')
        print("=" * 60)
        print(f"Total: {success_count}/{len(results)} successful")
        print("=" * 60)

        # Exit with error code if any failures
        if success_count < len(results):
            sys.exit(1)

    except Exception as e:
        logger.error(f"Processing failed: {e}", exc_info=True)
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
