"""
CSV Aggregator command - Export processed invoice results to CSV format.
"""

import csv
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import yaml


logger = logging.getLogger(__name__)


def flatten_invoice_data(data: Dict[str, Any], task_path: str) -> List[Dict[str, Any]]:
    """
    Flatten invoice data into a list of row dictionaries (one per item).

    Args:
        data: Invoice data from output.yaml
        task_path: Relative path to the task

    Returns:
        List of dictionaries, one per invoice item
    """
    rows = []

    # Extract common fields
    invoice = data.get('invoice', {})
    department = data.get('department', {})
    summary = data.get('summary', {})
    extraction_info = data.get('_extraction_info', {})
    items = data.get('items', [])

    # Common values for all rows
    common = {
        'task_path': task_path,
        'po_no': invoice.get('po_no', ''),
        'invoice_date': invoice.get('invoice_date', ''),
        'department_code': department.get('code', ''),
        'usage': invoice.get('usage', ''),
    }

    # If no items, create a single summary row
    if not items:
        rows.append({
            **common,
            'item_name': '',
            'quantity': '',
            'unit': '',
            'unit_price_ex_tax': '',
            'unit_price_inc_tax': '',
            'total_amount_inc_tax': '',
            'cost': '',
        })
    else:
        # Create one row per item
        for item in items:
            rows.append({
                **common,
                'item_name': item.get('name', ''),
                'quantity': item.get('quantity', ''),
                'unit': item.get('unit', ''),
                'unit_price_ex_tax': item.get('unit_price_ex_tax', ''),
                'unit_price_inc_tax': item.get('unit_price_inc_tax', ''),
                'total_amount_inc_tax': item.get('total_amount_inc_tax', ''),
                'cost': item.get('cost', ''),
            })

    return rows


def collect_invoice_data(
    results_dir: Path,
    batch_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Collect all invoice data from output.yaml files.

    Args:
        results_dir: Base results directory
        batch_filter: Optional batch folder name to filter by

    Returns:
        List of flattened row dictionaries
    """
    all_rows = []

    if not results_dir.exists():
        logger.warning(f"Results directory not found: {results_dir}")
        return all_rows

    # Iterate through batch folders
    for batch_folder in sorted(results_dir.iterdir()):
        if not batch_folder.is_dir():
            continue

        # Apply batch filter if specified
        if batch_filter and batch_folder.name != batch_filter:
            continue

        # Find all output.yaml files in this batch
        for yaml_file in batch_folder.rglob("output.yaml"):
            try:
                with open(yaml_file, 'r', encoding='utf-8') as f:
                    data = yaml.safe_load(f)

                if data is None:
                    continue

                # Get relative path from results_dir
                rel_path = yaml_file.relative_to(results_dir)
                task_path = str(rel_path.parent)

                # Flatten and add rows
                rows = flatten_invoice_data(data, task_path)
                all_rows.extend(rows)

            except Exception as e:
                logger.warning(f"Failed to read {yaml_file}: {e}")
                continue

    return all_rows


def write_csv(rows: List[Dict[str, Any]], output_path: Path) -> None:
    """
    Write invoice data to CSV file.

    Args:
        rows: List of row dictionaries
        output_path: Output CSV file path
    """
    if not rows:
        logger.warning("No data to write to CSV")
        # Still create file with headers
        rows = [{}]

    # Define column order
    fieldnames = [
        'task_path',
        'po_no',
        'invoice_date',
        'department_code',
        'usage',
        'item_name',
        'quantity',
        'unit',
        'unit_price_ex_tax',
        'unit_price_inc_tax',
        'total_amount_inc_tax',
        'cost',
    ]

    # Ensure all keys exist in rows (for empty data case)
    for row in rows:
        for key in fieldnames:
            row.setdefault(key, '')

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(rows)

    logger.info(f"CSV written to: {output_path}")


def cmd_csv_aggregate(args, config_dict: Dict[str, Any]) -> None:
    """
    Aggregate invoice results into CSV format.

    Args:
        args: Parsed command-line arguments
        config_dict: Configuration dictionary
    """
    # Get output directory from config or args
    output_dir_str = args.output if args.output else config_dict.get('processing', {}).get('output_dir', './results')
    output_dir = Path(output_dir_str)
    if not output_dir.is_absolute():
        output_dir = Path(__file__).parent.parent.parent / output_dir

    # Determine CSV output path
    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.is_absolute():
            csv_path = output_dir.parent / csv_path
    else:
        csv_path = output_dir.parent / "invoices_aggregated.csv"

    # Collect data
    rows = collect_invoice_data(output_dir, args.batch)

    # Write CSV
    write_csv(rows, csv_path)

    # Print summary
    print(f"\n{'=' * 60}")
    print("CSV AGGREGATION SUMMARY")
    print(f"{'=' * 60}")
    print(f"Results directory: {output_dir}")
    if args.batch:
        print(f"Batch filter: {args.batch}")
    print(f"Total rows: {len(rows)}")
    print(f"Output file: {csv_path}")
    print(f"{'=' * 60}")
