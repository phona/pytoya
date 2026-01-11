"""
Regenerate output.yaml files with backup and merge.

Process:
1. Backup all output.yaml to output.bak.yaml (for all batches)
2. User runs batch processing to regenerate output.yaml (with new cost field)
3. Merge: use output.bak.yaml content but preserve the new 'cost' field from regenerated output.yaml
"""

import yaml
import shutil
from pathlib import Path
from typing import Dict, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def backup_all_output_files(results_dir: Path) -> int:
    """Backup all output.yaml to output.bak.yaml for all batches, then remove output.yaml to force regeneration"""
    count = 0
    for output_yaml in results_dir.rglob("output.yaml"):
        backup_path = output_yaml.parent / "output.bak.yaml"
        shutil.copy2(output_yaml, backup_path)
        # Remove output.yaml to force regeneration
        output_yaml.unlink()
        count += 1
        logger.info(f"Backed up and removed: {output_yaml.parent.relative_to(results_dir)}")
    return count


def merge_backup_to_output(results_dir: Path) -> tuple[int, int]:
    """
    Merge backup files back to output.yaml.
    Strategy:
    - Start with output.bak.yaml content (preserves all manual edits)
    - Add/overwrite with 'cost' field from new output.yaml if present in items
    """
    import shutil

    merged_count = 0
    skipped_count = 0

    for backup_yaml in results_dir.rglob("output.bak.yaml"):
        try:
            output_yaml = backup_yaml.parent / "output.yaml"

            # Read both files
            with open(backup_yaml, 'r', encoding='utf-8') as f:
                backup_data = yaml.safe_load(f) or {}

            with open(output_yaml, 'r', encoding='utf-8') as f:
                new_data = yaml.safe_load(f) or {}

            # Extract 'cost' field from new data items if present
            cost_values = []
            if 'items' in new_data and isinstance(new_data['items'], list):
                for item in new_data['items']:
                    if isinstance(item, dict) and 'cost' in item:
                        cost_values.append(item.get('cost'))

            # Start with backup data (preserves all manual edits)
            merged_data = backup_data

            # Add/overwrite 'cost' field in items if they exist in new data
            if cost_values:
                if 'items' not in merged_data:
                    merged_data['items'] = []
                if not isinstance(merged_data['items'], list):
                    merged_data['items'] = []

                # Merge cost values into existing items
                for i, item in enumerate(merged_data['items']):
                    if i < len(cost_values):
                        if not isinstance(item, dict):
                            item = {}
                        item['cost'] = cost_values[i]
                        merged_data['items'][i] = item

                merged_count += 1
                logger.info(f"Merged with cost: {output_yaml.parent.relative_to(results_dir)}")
            else:
                skipped_count += 1
                logger.debug(f"No cost field in new data: {output_yaml.parent.relative_to(results_dir)}")

            # Write merged data back to output.yaml
            with open(output_yaml, 'w', encoding='utf-8') as f:
                yaml.dump(merged_data, f, allow_unicode=True, sort_keys=False)

        except Exception as e:
            logger.warning(f"Failed to merge {backup_yaml}: {e}")

    return merged_count, skipped_count


def main():
    import sys
    import shutil

    results_dir = Path("results")

    if not results_dir.exists():
        logger.error(f"Results directory not found: {results_dir}")
        return

    # Check if user wants to backup or merge
    action = sys.argv[1] if len(sys.argv) > 1 else "backup"

    if action == "backup":
        # Step 1: Backup all output.yaml
        logger.info("=" * 60)
        logger.info("Step 1: Backing up all output.yaml files...")
        logger.info("=" * 60)
        backup_count = backup_all_output_files(results_dir)
        logger.info(f"\nBacked up {backup_count} files")
        logger.info("\nNext step: Run batch processing")
        logger.info("Command: python main.py batch")
        logger.info("\nThen run: python regenerate_with_backup.py merge")

    elif action == "merge":
        # Step 3: Merge backup data back
        logger.info("=" * 60)
        logger.info("Step 3: Merging backup files (adding new 'cost' field)...")
        logger.info("=" * 60)
        merged, skipped = merge_backup_to_output(results_dir)
        logger.info(f"\nMerged with cost: {merged} files")
        logger.info(f"No cost field: {skipped} files")

    else:
        logger.info("Usage:")
        logger.info("  python regenerate_with_backup.py backup  # Backup all output.yaml")
        logger.info("  python regenerate_with_backup.py merge   # Merge backup back")


if __name__ == "__main__":
    main()
