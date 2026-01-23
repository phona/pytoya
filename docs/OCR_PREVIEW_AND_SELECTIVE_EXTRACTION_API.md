# OCR Result Preview and Selective Extraction API

## Overview

This API provides OCR result caching, selective field extraction, and detailed cost tracking for document processing operations. It allows you to preview OCR results before extraction, re-extract individual fields, and track costs with text/LLM breakdown.

---

## OCR Result Endpoints

### Get OCR Result

Retrieve the cached OCR result for a manifest.

**Request**
```http
GET /api/manifests/:id/ocr
Authorization: Bearer <token>
```

**Response**
```json
{
  "manifestId": 1,
  "ocrResult": {
    "document": {
      "type": "invoice",
      "language": ["zh"],
      "pages": 2
    },
    "pages": [
      {
        "pageNumber": 1,
        "text": "Invoice #001\nPO: 1234567\nDate: 2024-01-15",
        "markdown": "# Invoice\n\n**PO:** 1234567\n**Date:** 2024-01-15",
        "confidence": 0.92,
        "layout": {
          "elements": [
            {
              "type": "text",
              "confidence": 0.95,
              "position": { "x": 0, "y": 0, "width": 100, "height": 20 },
              "content": "Invoice"
            }
          ],
          "tables": []
        }
      }
    ],
    "metadata": {
      "processedAt": "2024-01-15T10:30:00Z",
      "modelVersion": "PaddleOCR-VL",
      "processingTimeMs": 1500
    }
  },
  "hasOcr": true,
  "ocrProcessedAt": "2024-01-15T10:30:00Z",
  "qualityScore": 90
}
```

**Status Codes**
- `200` - OCR result returned successfully
- `401` - Unauthorized
- `404` - Manifest not found

---

### Trigger OCR Processing

Triggering OCR independently is not supported. OCR results are generated during extraction after the user explicitly starts extraction.

**Request**
```http
N/A
```

**Response**
```json
{
  "error": "Not available"
}
```

**Status Codes**
- `404` - Not found

---

## Extraction Endpoints

### Extract Single Manifest

Extract data from a single manifest with cost tracking.

**Request**
```http
POST /api/manifests/:id/extract
Authorization: Bearer <token>

{
  "llmModelId": "gpt-4o",
  "promptId": 1
}
```

**Response**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Status Codes**
- `201` - Extraction job created successfully
- `400` - Invalid input
- `401` - Unauthorized
- `404` - Manifest not found

---

### Bulk Extract

Extract data from multiple manifests with aggregate cost tracking.

**Request**
```http
POST /api/manifests/extract-bulk
Authorization: Bearer <token>

{
  "manifestIds": [1, 2, 3],
  "llmModelId": "gpt-4o",
  "textExtractorId": "extractor-uuid"
}
```

**Response**
```json
{
  "jobId": "batch_1700000000000_3",
  "jobIds": [
    "550e8400-e29b-41d4-a716-446655440000",
    "660e8400-e29b-41d4-a716-446655440001",
    "770e8400-e29b-41d4-a716-446655440002"
  ],
  "jobs": [
    { "jobId": "550e8400-e29b-41d4-a716-446655440000", "manifestId": 1 },
    { "jobId": "660e8400-e29b-41d4-a716-446655440001", "manifestId": 2 },
    { "jobId": "770e8400-e29b-41d4-a716-446655440002", "manifestId": 3 }
  ],
  "manifestCount": 3
}
```

**Status Codes**
- `201` - Jobs created successfully
- `400` - Invalid input
- `401` - Unauthorized

---

### Re-extract Field

Re-extract a specific field from a manifest with preview.

**Request**
```http
POST /api/manifests/:id/re-extract-field
Authorization: Bearer <token>

{
  "fieldName": "invoice.po_no",
  "llmModelId": "gpt-4o",
  "customPrompt": "Extract the PO number from this document...",
  "previewOnly": false
}
```

**Parameters**
- `fieldName` (required) - Field path in dot notation (e.g., `invoice.po_no`)
- `llmModelId` (optional) - Override LLM model
- `customPrompt` (optional) - Custom extraction prompt
- `previewOnly` (optional) - If `true`, only returns preview without creating job

**Response**
```json
{
  "fieldName": "invoice.po_no",
  "ocrPreview": {
    "snippet": "Invoice #001\nPO: 1234567\nDate: 2024-01-15\n...",
    "context": "Full OCR context..."
  },
  "jobId": "880e8400-e29b-41d4-a716-446655440003"
}
```

**When `previewOnly: true`**
```json
{
  "fieldName": "invoice.po_no",
  "ocrPreview": { /* preview data */ }
}
```

**Status Codes**
- `200` - Field re-extraction successful
- `400` - Invalid field name or parameters
- `401` - Unauthorized
- `404` - Manifest not found

---

### Re-extract Manifest

Re-extract entire manifest (full document re-processing).

**Request**
```http
POST /api/manifests/:id/re-extract
Authorization: Bearer <token>

{
  "llmModelId": "gpt-4o",
  "promptId": 2
}
```

**Response**
```json
{
  "jobId": "990e8400-e29b-41d4-a716-446655440004"
}
```

**Status Codes**
- `200` - Re-extraction job created
- `400` - Invalid input
- `401` - Unauthorized
- `404` - Manifest not found

---

## Model Pricing Endpoints (LLM)

### Update Model Pricing (Admin)

Update pricing for LLM models.

**Request**
```http
PATCH /api/models/:id/pricing
Authorization: Bearer <token> (admin role required)

{
  "llm": {
    "inputPrice": 2.50,
    "outputPrice": 10.00,
    "currency": "USD",
    "minimumCharge": 0.05
  }
}
```

**Response**
```json
{
  "id": "model-123",
  "name": "GPT-4o",
  "pricing": {
    "llm": {
      "inputPrice": 2.50,
      "outputPrice": 10.00,
      "currency": "USD",
      "minimumCharge": 0.05,
      "effectiveDate": "2024-01-15T10:00:00Z"
    }
  },
  "pricingHistory": [
    {
      "effectiveDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-15T10:00:00Z",
      "llmInputPrice": 2.00,
      "llmOutputPrice": 8.00
    }
  ]
}
```

**Status Codes**
- `200` - Pricing updated successfully
- `400` - Invalid pricing data
- `401` - Unauthorized
- `403` - Forbidden (admin only)
- `404` - Model not found

---

## Cost Breakdown Structure

### Text Cost Calculation
```
Text Cost = (Number of Pages) × Price Per Page
If minimumCharge is set:
  Text Cost = max(calculated cost, minimumCharge)
```

### LLM Cost Calculation
```
Input Cost = (Input Tokens / 1,000,000) × Input Price
Output Cost = (Output Tokens / 1,000,000) × Output Price
LLM Cost = Input Cost + Output Cost
If minimumCharge is set:
  LLM Cost = max(calculated cost, minimumCharge)
```

### Total Extraction Cost
```
Total Cost = Text Cost + LLM Cost
```

---

## WebSocket Events

### OCR Completion Event
```json
{
  "event": "ocr-update",
  "data": {
    "manifestId": 1,
    "hasOcr": true,
    "qualityScore": 90,
    "processedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Job Progress Event (with Cost)
```json
{
  "event": "job-update",
  "data": {
    "manifestId": 1,
    "progress": 65,
    "status": "processing",
    "costBreakdown": {
      "text": 0.003,
      "llm": 0.042,
      "total": 0.045
    }
  }
}
```

---

## Error Responses

All endpoints may return these standard error responses:

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "No manifests provided for cost estimate"
}
```

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

```json
{
  "statusCode": 404,
  "message": "Manifest not found"
}
```

---

## Usage Examples

### Example 1: Preview OCR Before Extraction

```javascript
// 1. Get OCR result
const ocrResponse = await fetch('/api/manifests/1/ocr', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const ocrData = await ocrResponse.json();

if (!ocrData.hasOcr) {
  // OCR is generated during extraction after the user explicitly starts extraction.
  console.log('OCR not available (run extraction first).');
}

// 3. Preview quality score
console.log(`OCR Quality: ${ocrData.qualityScore}%`);
```

### Example 2: Re-extract Single Field

```javascript
const response = await fetch('/api/manifests/1/re-extract-field', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    fieldName: 'invoice.po_no',
    llmModelId: 'gpt-4o',
    previewOnly: false
  })
});

const data = await response.json();
console.log(`Field: ${data.fieldName}`);
console.log(`Job ID: ${data.jobId}`);
```

### Example 4: Update Model Pricing (Admin)

```javascript
const response = await fetch('/api/models/paddlex-ocr-123/pricing', {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ocr: {
      pricePerPage: 0.0015,
      currency: 'USD',
      minimumCharge: 0.02
    }
  })
});

const updatedModel = await response.json();
console.log(`New Price: $${updatedModel.pricing.ocr.pricePerPage} per page`);
```
