export const CONTRACT_JSON_SCHEMA = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "contract": {
      "type": "object",
      "properties": {
        "contract_number": { "type": "string" },
        "contract_type": { "type": "string" },
        "effective_date": { "type": "string", "format": "date" },
        "expiration_date": { "type": "string", "format": "date" },
        "contract_value": { "type": "number" }
      }
    },
    "parties": {
      "type": "object",
      "properties": {
        "first_party": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "role": { "type": "string" },
            "address": { "type": "string" }
          }
        },
        "second_party": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "role": { "type": "string" },
            "address": { "type": "string" }
          }
        }
      }
    },
    "terms": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "clause": { "type": "string" },
          "description": { "type": "string" },
          "value": { "type": "string" }
        }
      }
    },
    "key_dates": {
      "type": "object",
      "properties": {
        "start_date": { "type": "string", "format": "date" },
        "end_date": { "type": "string", "format": "date" },
        "renewal_date": { "type": "string", "format": "date" }
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
  "required": ["contract", "parties"]
};
