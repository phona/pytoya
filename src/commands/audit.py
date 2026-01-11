"""
Audit command - Start web server for reviewing parsed invoices (Flask version)
"""

from flask import Flask, send_from_directory, send_file, jsonify, request
import yaml
import webbrowser
import threading
import time
from pathlib import Path
from typing import Any, Dict, List


# Workspace root (parent of src directory)
WORKSPACE_ROOT = Path(__file__).parent.parent.parent


def create_app(results_dir: Path, audit_dir: Path) -> Flask:
    """Create Flask app for audit dashboard"""

    app = Flask(__name__, static_folder=None)

    # Redirect root to audit page
    @app.route('/')
    def index():
        from flask import redirect
        return redirect('/audit/')

    # Serve audit page files
    @app.route('/audit/')
    @app.route('/audit/<path:filename>')
    def serve_audit(filename='index.html'):
        return send_from_directory(audit_dir, filename)

    # Serve results files (PDFs, YAMLs)
    @app.route('/results/<path:filepath>')
    def serve_results(filepath):
        file_path = results_dir / filepath
        if not file_path.exists():
            return f"File not found: {filepath}", 404
        return send_file(file_path)

    # API: List all tasks
    @app.route('/api/tasks')
    def list_tasks():
        tasks = []

        if not results_dir.exists():
            return jsonify(tasks)

        for folder in results_dir.iterdir():
            if not folder.is_dir():
                continue

            for task_dir in folder.iterdir():
                if not task_dir.is_dir():
                    continue

                yaml_file = task_dir / 'output.yaml'
                if not yaml_file.exists():
                    continue

                with open(yaml_file, 'r', encoding='utf-8') as f:
                    try:
                        data = yaml.safe_load(f) or {}
                    except:
                        data = {}

                rel_path = task_dir.relative_to(results_dir)
                # Convert path to use forward slashes for URLs
                rel_path_str = rel_path.as_posix()
                tasks.append({
                    'id': task_dir.name,
                    'name': task_dir.name,
                    'folder': folder.name,
                    'path': str(rel_path),
                    'pdfPath': f"/results/{rel_path_str}/input.pdf",
                    'status': 'success' if yaml_file.exists() else 'failed',
                    'data': data
                })

        return jsonify(tasks)

    # API: Save task data
    @app.route('/api/task/<path:task_path>/save', methods=['PUT'])
    def save_task(task_path):
        data = request.json

        yaml_file = results_dir / task_path / 'output.yaml'
        with open(yaml_file, 'w', encoding='utf-8') as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)

        return jsonify({'success': True, 'path': str(yaml_file)})

    return app


def cmd_audit(args):
    """Start audit dashboard web server"""
    from src.config import AppConfig

    # Load config
    with open(args.config, 'r', encoding='utf-8') as f:
        config_dict = yaml.safe_load(f)
    config = AppConfig.from_dict(config_dict)

    # Resolve output directory (use args.output if provided, else from config)
    output_dir = Path(args.output) if args.output else Path(config.processing.output_dir)
    if not output_dir.is_absolute():
        output_dir = WORKSPACE_ROOT / output_dir

    audit_dir = WORKSPACE_ROOT / 'audit_page'

    # Validate required directories
    if not audit_dir.exists():
        raise FileNotFoundError(f"Audit page not found at {audit_dir}")
    if not output_dir.exists():
        raise FileNotFoundError(f"Results folder not found at {output_dir}")

    port = args.port

    print(f"""
    ╔════════════════════════════════════════╗
    ║   PyToYa Audit Dashboard               ║
    ╠════════════════════════════════════════╣
    ║  URL: http://localhost:{port}           ║
    ║  Press Ctrl+C to stop                  ║
    ╚════════════════════════════════════════╝
    """)

    folders = len(list(output_dir.iterdir()))
    print(f"📁 Scanning {folders} result folder(s)...")

    # Create app
    app = create_app(output_dir, audit_dir)

    # Open browser after a short delay
    url = f"http://localhost:{port}"
    def open_browser():
        time.sleep(1)
        webbrowser.open(url)

    threading.Thread(target=open_browser, daemon=True).start()

    # Run Flask app
    app.run(host='0.0.0.0', port=port, use_reloader=False)
