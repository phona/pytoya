export const RECEIPT_JSON_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "merchant": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "address": { "type": "string" },
        "phone": { "type": "string" }
      }
    },
    "receipt": {
      "type": "object",
      "properties": {
        "receipt_number": { "type": "string" },
        "receipt_date": { "type": "string", "format": "date" },
        "receipt_time": { "type": "string" },
        "payment_method": { "type": "string" },
        "card_last_four": { "type": "string" }
      }
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "description": { "type": "string" },
          "quantity": { "type": "number" },
          "unit_price": { "type": "number" },
          "total_price": { "type": "number" },
          "category": { "type": "string" }
        },
        "required": ["description", "quantity", "unit_price", "total_price"]
      }
    },
    "totals": {
      "type": "object",
      "properties": {
        "subtotal": { "type": "number" },
        "tax": { "type": "number" },
        "tip": { "type": "number" },
        "total": { "type": "number" },
        "currency": { "type": "string" }
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
  "required": ["merchant", "receipt", "items", "totals"]
};
