"""
Main CLI entry point for invoice processing.
"""

import argparse
import logging
import yaml
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.processing.batch import BatchProcessor


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
  python main.py                          # Use default config.yaml
  python main.py --config custom.yaml     # Use custom config
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

    args = parser.parse_args()

    # Load config
    try:
        config = load_config(args.config)
    except FileNotFoundError:
        print(f"Error: Configuration file '{args.config}' not found.")
        print("Please create a config.yaml file or specify --config.")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading configuration: {e}")
        sys.exit(1)

    # Override paths if provided
    if args.input:
        config['processing']['input_dir'] = args.input
    if args.output:
        config['processing']['output_dir'] = args.output
    if args.workers:
        config['processing']['max_workers'] = args.workers

    # Setup logging
    log_level = config['processing'].get('log_level', 'INFO')
    setup_logging(log_level)
    logger = logging.getLogger(__name__)

    # Print configuration
    logger.info("=" * 60)
    logger.info("PyToYa - Invoice Processing System")
    logger.info("=" * 60)
    logger.info(f"Input directory: {config['processing']['input_dir']}")
    logger.info(f"Output directory: {config['processing']['output_dir']}")
    logger.info(f"PaddleOCR-VL service: {config['paddleocr_vl']['base_url']}")
    logger.info(f"LLM provider: {config['llm']['provider']}")
    logger.info(f"Max workers: {config['processing']['max_workers']}")
    logger.info("=" * 60)

    # Process
    try:
        processor = BatchProcessor(config)
        results = processor.process_all()

        # Print summary
        print("\n" + "=" * 60)
        print("PROCESSING SUMMARY")
        print("=" * 60)
        for result in results:
            status = "✓" if result['status'] == 'success' else "✗"
            input_name = Path(result['input']).name
            if result['status'] == 'success':
                output_name = Path(result['output']).name
                print(f"{status} {input_name} -> {output_name}")
            else:
                print(f"{status} {input_name}: {result.get('error', 'Unknown error')}")

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
