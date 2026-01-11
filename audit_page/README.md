# PyToYa Audit Dashboard

A standalone HTML audit page for reviewing parsed invoice data against original PDFs.

## Features

- **Side-by-side view**: PDF viewer on left, parsed data on right
- **Keyboard shortcuts**: Navigate quickly (←/→), approve (A), save (S), edit mode (E)
- **Confidence indicators**: Color-coded by extraction confidence
- **Edit mode**: Modify parsed data inline
- **Filter & sort**: View unchecked tasks, sort by PO/date/status
- **Extraction warnings**: Shows OCR issues and uncertain fields

## Important Limitations

**This is a frontend-only implementation.** Due to browser security restrictions, it cannot:

1. **Scan directories** - Browsers cannot list local folder contents
2. **Write files** - Cannot save edits back to YAML files

## Required: Simple HTTP Server

To serve the audit page and your results files, run a simple HTTP server:

### Option 1: Python (Recommended)
```bash
cd D:\Projects\PyToYa
python -m http.server 8080
```

### Option 2: Node.js
```bash
npx http-server -p 8080
```

### Option 3: VS Code Live Server
Right-click `index.html` → "Open with Live Server"

Then open: http://localhost:8080/audit_page/

## File Structure Required

```
PyToYa/
├── audit_page/
│   ├── index.html          # Main page
│   └── audit.js            # JavaScript logic
└── results/
    └── {batch_name}/       # e.g., 黔隆2026.01.batch1
        └── {task_id}/      # e.g., DocumentScanner_20260107_009506
            ├── input.pdf   # Original PDF
            └── output.yaml # Parsed data
```

## For Full Functionality (Save/Edit Support)

You have two options:

### Option A: Add a Simple Python Backend
Create `server.py` in the audit_page directory:

```python
from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import yaml
from pathlib import Path
import os
import urllib.parse

class APIHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/'):
            self.handle_api()
        else:
            super().do_GET()

    def do_PUT(self):
        if self.path.startswith('/api/'):
            self.handle_api()
        else:
            self.send_error(404)

    def handle_api(self):
        path = urllib.parse.urlparse(self.path).path
        results_dir = Path('../results')

        # List tasks
        if path == '/api/tasks':
            folders = [f.name for f in results_dir.iterdir() if f.is_dir()]
            self.send_json({'folders': folders})

        # Save task
        elif path.startswith('/api/task/') and path.endswith('/save'):
            task_path = path.split('/')[3]
            content_length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(content_length))

            yaml_file = results_dir / task_path / 'output.yaml'
            with open(yaml_file, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, allow_unicode=True)

            self.send_json({'success': True})

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

if __name__ == '__main__':
    server = HTTPServer(('localhost', 8080), APIHandler)
    print('Audit server running at http://localhost:8080/audit_page/')
    server.serve_forever()
```

### Option B: Use File System Access API (Chrome/Edge only)
Modern browsers support directory access via user gesture. This would require:
1. User selects the results folder via picker
2. Browser requests file handle permissions
3. Files can be read/written directly

This approach requires modifying `audit.js` to use the File System Access API.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← / → | Previous / Next task |
| A | Approve current task |
| S | Save changes |
| E | Toggle edit mode |

## Notes

- PDF viewing uses browser's native PDF viewer via `<object>` tag
- YAML parsing is a simple JS implementation - for production, use `js-yaml` library
- All changes are logged to console when saving (until backend is added)
