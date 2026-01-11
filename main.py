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
from src.workflow.output import TaskLister
from src.ocr.paddle_vl_client import PaddleOCRVLClient
from src.extraction.extractor import InvoiceExtractor
from src.config import AppConfig
from src.commands.audit import cmd_audit
from src.commands.csv_aggregator import cmd_csv_aggregate
from tabulate import tabulate


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


def cmd_process(args):
    """Process invoices (default command)."""
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
    reuse_ocr = not args.no_reuse_ocr
    if reuse_ocr:
        logger.info("Mode: Reusing existing OCR results (skipping OCR)")
    else:
        logger.info("Mode: Force re-processing with OCR")
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
        reuse_ocr=reuse_ocr
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


def cmd_tasks(args):
    """List tasks with optional filtering."""
    # Load config
    try:
        raw_config = load_config(args.config)
        config_dict = raw_config  # Keep as dict for TaskLister
    except FileNotFoundError:
        print(f"Error: Configuration file '{args.config}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    # Override paths if provided
    if args.input:
        config_dict['processing']['input_dir'] = args.input
    if args.output:
        config_dict['processing']['output_dir'] = args.output

    # Create task lister
    lister = TaskLister(config_dict)

    # Get filtered tasks
    results = lister.list_tasks(args.filter)

    # Sort results
    if args.sort == "po":
        results.sort(key=lambda x: x['po_no'])
    elif args.sort == "date":
        results.sort(key=lambda x: x['invoice_date'])
    elif args.sort == "path":
        results.sort(key=lambda x: x['path'])
    elif args.sort == "status":
        results.sort(key=lambda x: x['status'])

    summary = lister.get_summary(results, args.filter)

    # Build title
    if args.filter == "unprocessed":
        title = "TASKS (Unprocessed)"
    elif args.filter == "all":
        title = "TASKS (All)"
    else:  # unchecked
        title = "TASKS (Unchecked)"

    # Prepare table data
    if args.filter == "unprocessed":
        headers = ["File Path"]
        rows = [[r['path']] for r in results]
    else:
        headers = ["Status", "PO NO", "Invoice Date", "File Path"]
        rows = []
        for r in results:
            # Don't truncate path - show full path
            rows.append([r['status'], r['po_no'], r['invoice_date'], r['path']])

    # Print table with tabulate
    print(f"\n{title}")
    print(tabulate(rows, headers=headers, tablefmt="grid"))

    # Print summary
    if args.filter == "all":
        print(f"Total: {summary['total']} results ({summary['checked']} checked, {summary['unchecked']} unchecked)")
    elif args.filter == "unchecked":
        print(f"Total: {summary['total']} unchecked")
    else:  # unprocessed
        print(f"Total: {summary['total']} unprocessed files")
    print()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Process invoices with PaddleOCR-VL + LLM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--config",
        default="config.yaml",
        help="Path to configuration file (default: config.yaml)"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Process command (default)
    process_parser = subparsers.add_parser(
        "process",
        help="Process invoices (default command)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py process                               # Process all PDFs
  python main.py process --no-reuse-ocr                # Force re-processing with OCR
  python main.py process invoice1.pdf invoice2.pdf     # Process specific files
        """
    )
    process_parser.add_argument(
        "--input",
        help="Override input directory"
    )
    process_parser.add_argument(
        "--output",
        help="Override output directory"
    )
    process_parser.add_argument(
        "--workers",
        type=int,
        help="Override number of parallel workers"
    )
    process_parser.add_argument(
        "--no-reuse-ocr",
        action="store_true",
        help="Do not reuse existing OCR results (force re-processing with OCR)"
    )
    process_parser.add_argument(
        "files",
        nargs="*",
        help="Specific PDF filenames to process (relative to input directory)"
    )

    # Tasks command
    tasks_parser = subparsers.add_parser(
        "tasks",
        help="List tasks with optional filtering",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py tasks                              # List unchecked (default)
  python main.py tasks --filter unchecked           # List unchecked results
  python main.py tasks --filter all                 # List all results
  python main.py tasks --filter unprocessed         # List unprocessed PDFs
  python main.py tasks --sort po                    # Sort by PO number
  python main.py tasks --sort date                  # Sort by invoice date
        """
    )
    tasks_parser.add_argument(
        "--filter",
        choices=["unchecked", "unprocessed", "all"],
        default="unchecked",
        help="Filter type (default: unchecked)"
    )
    tasks_parser.add_argument(
        "--sort",
        choices=["po", "date", "path", "status"],
        default="po",
        help="Sort by field (default: po)"
    )
    tasks_parser.add_argument(
        "--input",
        help="Override input directory"
    )
    tasks_parser.add_argument(
        "--output",
        help="Override output directory"
    )

    # Audit command
    audit_parser = subparsers.add_parser(
        "audit",
        help="Start audit dashboard web server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py audit                           # Start audit server on port 8080
  python main.py audit --port 9000              # Start on custom port
        """
    )
    audit_parser.add_argument(
        "--port",
        type=int,
        default=8080,
        help="Port to run the server on (default: 8080)"
    )
    audit_parser.add_argument(
        "--output",
        help="Override output directory (results directory)"
    )

    # CSV command
    csv_parser = subparsers.add_parser(
        "csv",
        help="Generate CSV aggregation of processed invoices",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py csv                          # Generate CSV in output directory
  python main.py csv --csv report.csv         # Specify output CSV file
  python main.py csv --batch 默隆2026.01      # Filter by specific batch folder
        """
    )
    csv_parser.add_argument(
        "--csv",
        help="Output CSV file path (default: invoices_aggregated.csv in project root)"
    )
    csv_parser.add_argument(
        "--batch",
        help="Filter by specific batch folder name"
    )
    csv_parser.add_argument(
        "--output",
        help="Override output directory (results directory)"
    )

    args = parser.parse_args()

    # Default to 'process' command if no subcommand specified
    if args.command is None:
        args.command = "process"
        # Re-parse with process command
        args = process_parser.parse_args()
        args.config = "config.yaml"

    # Dispatch to command handler
    if args.command == "process":
        cmd_process(args)
    elif args.command == "tasks":
        cmd_tasks(args)
    elif args.command == "audit":
        cmd_audit(args)
    elif args.command == "csv":
        # Load config for CSV command
        try:
            raw_config = load_config(args.config)
            cmd_csv_aggregate(args, raw_config)
        except FileNotFoundError:
            print(f"Error: Configuration file '{args.config}' not found.")
            sys.exit(1)
        except Exception as e:
            print(f"Error loading configuration: {e}")
            sys.exit(1)


if __name__ == "__main__":
    main()
