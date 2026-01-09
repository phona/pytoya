# PyToYa - PDF to YAML Invoice Processing System

Automated invoice processing system that combines **PaddleOCR-VL** for OCR and **LLM** (OpenAI/litellm) for structured data extraction.

## Features

- ✅ Remote PaddleOCR-VL service integration
- ✅ LLM-based structured data extraction (OpenAI/litellm)
- ✅ Parallel batch processing
- ✅ YAML output format
- ✅ Configurable via YAML
- ✅ Comprehensive error handling

## Architecture

```
PDF Input → PaddleOCR-VL (Remote) → OCR Text → LLM Extraction → YAML Output
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

# Run processing
python main.py
```

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
├── invoices/              # Input: PDF invoice files
├── results/               # Output: YAML extracted data
├── src/
│   ├── ocr/              # PaddleOCR-VL client
│   ├── extraction/       # LLM extraction
│   └── processing/       # Batch processing
├── config.yaml           # Configuration
├── main.py              # CLI entry point
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
