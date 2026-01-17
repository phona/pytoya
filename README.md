# PyToYa - PDF to YAML Invoice Processing System

Automated invoice processing system that combines **PaddleOCR-VL** for OCR, **LangGraph** for workflow orchestration, and **LLM** (OpenAI/litellm) for structured data extraction.

## Features

- ✅ Remote PaddleOCR-VL service integration with full TypedDict types
- ✅ **LangGraph workflow** with state management and conditional routing
- ✅ **Automatic retry logic** with exponential backoff
- ✅ **Error checking and recovery** at each workflow step
- ✅ LLM-based structured data extraction (OpenAI/litellm)
- ✅ Parallel batch processing with progress tracking
- ✅ YAML output format
- ✅ Configurable via YAML
- ✅ **Flexible architecture**: Workflow built externally, injected into processor

## Architecture

```
PDF Input → LangGraph Workflow → YAML Output
            ├─ validate_input
            ├─ ocr_processing (with retry)
            ├─ extraction (with retry)
            └─ save_result
```

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Workflow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  validate_input ──→ ocr_processing ──→ extraction ──→ save_result │
│       │                    │                  │                  │
│       ↓ (invalid)          │ (retry loop)      │ (retry loop)  │
│   mark_failed           ←───────←───────   ←───────────────  │
│                           │                  │                  │
│                           ↓ (max retries)   ↓ (max retries)   │
│                        mark_failed ←────────────────────────   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Installation

### 1. Create virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

## Configuration

Edit `config.yaml` to configure:

```yaml
# PaddleOCR-VL Remote Service
paddleocr_vl:
  base_url: "http://localhost:8080"  # Your PaddleOCR-VL service URL
  timeout: 120
  max_retries: 3

# LLM Configuration
llm:
  provider: "openai"
  model: "gpt-4o"
  api_key: "${OPENAI_API_KEY}"  # Set environment variable

# Processing
processing:
  input_dir: "./invoices"
  output_dir: "./results"
  max_workers: 5
```

## Web App (NestJS API) Configuration

The NestJS API uses `src/apps/api/config.yaml` as a Handlebars template and expects credentials via environment variables:

```bash
DB_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
LLM_API_KEY=your-llm-api-key
```

You can override the config path with `CONFIG_PATH` if you keep environment-specific templates.

## Security Defaults (Web App)

- CORS is enabled by default and controlled in `src/apps/api/config.yaml`.
- Passwords require uppercase, lowercase, number, and special character (8-128 chars).
- Accounts lock after repeated failed logins (configurable thresholds).

## PaddleOCR-VL Service Setup

### Option 1: Docker Compose (Recommended)

```bash
# Download compose.yaml and .env from PaddleOCR-VL documentation
docker compose up
```

Service will be available at `http://localhost:8080`

### Option 2: Manual Deployment

```bash
pip install "paddleocr[doc-parser]"
paddlex --install serving
paddlex --serve --pipeline PaddleOCR-VL
```

See [PaddleOCR-VL Documentation](https://www.paddleocr.ai/latest/version3.x/pipeline_usage/PaddleOCR-VL.html) for details.

## Usage

### Basic usage

```bash
# Set OpenAI API key
set OPENAI_API_KEY=your-api-key-here  # Windows
export OPENAI_API_KEY=your-api-key-here  # Linux/Mac

# Place PDF invoices in ./invoices directory

# Run processing with LangGraph workflow
python main.py
```

### Workflow Features

The LangGraph workflow provides:

- **Automatic Retry**: Failed OCR or extraction steps are automatically retried with exponential backoff
- **Error Checking**: Each step validates results before proceeding
- **State Management**: Full tracking of processing state through the workflow
- **Graceful Degradation**: Failed files are logged without stopping batch processing

### Advanced usage

```bash
# Custom configuration
python main.py --config custom.yaml

# Override input/output directories
python main.py --input ./my_invoices --output ./my_results

# Adjust parallel workers
python main.py --workers 10
```

## Output Format

For each input PDF, a YAML file is generated with structured invoice data:

```yaml
department:
  code: "20204"
  name: "Engineering Dept"

invoice:
  po_no: "PO 0000009"
  delivery_no: "70"
  invoice_no: "INV-001"
  invoice_date: "2024-01-15"

items:
  - name: "QGABOX 115 2.3A"
    quantity: 1
    unit: "PCS"
    unit_price_ex_tax: 384.96
    unit_price_inc_tax: 435.0
    tax_rate: 0.13
    tax_amount: 50.04
    total_amount_inc_tax: 435.0

summary:
  subtotal_ex_tax: 384.96
  total_tax: 50.04
  total_inc_tax: 435.0
  currency: "CNY"
```

## Project Structure

```
PyToYa/
├── invoices/                    # Input: PDF invoice files
├── results/                     # Output: YAML extracted data
├── src/
│   ├── ocr/                     # PaddleOCR-VL client
│   │   ├── types.py             # TypedDict type definitions
│   │   └── paddle_vl_client.py  # Remote HTTP client
│   ├── extraction/              # LLM extraction
│   │   └── extractor.py         # LLM extraction logic
│   ├── workflow/                # LangGraph workflow
│   │   ├── state.py             # Workflow state management
│   │   ├── nodes.py             # Workflow node implementations
│   │   ├── graph.py             # Workflow builder
│   │   └── config.py            # Workflow configuration
│   └── processing/              # Batch processing
│       ├── batch.py             # Original batch processor
│       └── workflow_batch.py    # LangGraph-based processor
├── config.yaml                 # Configuration
├── main.py                     # CLI entry point
└── requirements.txt
```

## API Reference

### PaddleOCR-VL Remote API

- **Endpoint**: `POST /layout-parsing`
- **Input**: Base64-encoded PDF/Image
- **Output**: Structured layout + Markdown text

See [Official Documentation](https://www.paddleocr.ai/latest/version3.x/pipeline_usage/PaddleOCR-VL.html#4-%E6%9C%8D%E5%8A%A1%E5%8C%96%E9%83%A8%E7%BD%B2)

## Troubleshooting

### PaddleOCR-VL service not reachable

```bash
# Check service status
curl http://localhost:8080/layout-parsing

# Verify configuration
# Ensure base_url in config.yaml matches your service URL
```

### OpenAI API errors

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check API quota and billing
```

### Processing errors

Check `processing.log` for detailed error messages.

## License

MIT License

## References

- [PaddleOCR-VL Documentation](https://www.paddleocr.ai/latest/version3.x/pipeline_usage/PaddleOCR-VL.html)
- [OpenAI API Documentation](https://platform.openai.com/docs)
