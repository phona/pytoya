# Change: Cleanup Deprecated Python Code

## Why
After completing the migration to TypeScript (NestJS + Next.js), the legacy Python codebase and associated files should be removed to maintain code cleanliness and prevent confusion.

## What Changes
- Remove all Python source files from `src/` directory
- Remove old YAML results directory (`results/`)
- Remove CLI entry point (`main.py`)
- Remove old static audit page (`audit_page/`)
- Remove Python configuration (`config.yaml`)
- Remove Python requirements (`requirements.txt`)
- Remove Python virtual environment (`.venv`)
- Update README.md to reflect new web-based architecture
- Add deprecation notice pointing to new repository or migration guide

## Impact
- Affected specs: N/A (cleanup only, no new capabilities)
- Affected code: Complete removal of Python codebase
- **BREAKING**: All Python CLI functionality is removed
