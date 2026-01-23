## 1. Implementation

- [x] 13.1 Update README.md to deprecate Python CLI and reference new web application
- [x] 13.2 Remove Python source under `src/` (keep TypeScript workspaces under `src/apps/` and `src/shared/`)
- [x] 13.3 Remove `main.py` CLI entry point
- [x] 13.4 Remove `config.yaml` (Python configuration)
- [x] 13.5 Remove `requirements.txt` (Python dependencies)
- [x] 13.6 Remove `.venv/` directory (Python virtual environment)
- [x] 13.7 Remove `results/` directory (YAML output files)
- [x] 13.8 Remove `audit_page/` directory (old HTML/JS static files)
- [x] 13.9 Remove `invoices/` directory (input files, unless needed for reference)
  - Note: `invoices/` is gitignored; this change ensures no tracked input files remain. Local PDFs may still exist in a developer workspace.
- [x] 13.10 Remove `processing.log` (old log files)
- [x] 13.11 Update any remaining references in documentation
- [x] 13.12 Verify project structure contains only new TypeScript code
