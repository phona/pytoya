export const INVOICE_JSON_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "department": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "code": { "type": "string" }
      },
      "required": ["name", "code"]
    },
    "invoice": {
      "type": "object",
      "properties": {
        "po_no": { "type": "string" },
        "invoice_no": { "type": "string" },
        "invoice_date": { "type": "string", "format": "date" },
        "tax_no": { "type": "string" }
      },
      "required": ["po_no", "invoice_date"]
    },
    "vendor": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "tax_no": { "type": "string" },
        "address": { "type": "string" }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unit": { "type": "string" },
          "unit_price": { "type": "number" },
          "total_price": { "type": "number" }
        },
        "required": ["description", "quantity", "unit_price", "total_price"]
      }
    },
    "_extraction_info": {
      "type": "object",
      "properties": {
        "confidence": { "type": "number" },
        "extraction_method": { "type": "string" },
        "notes": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "required": ["department", "invoice", "items", "_extraction_info"]
};
