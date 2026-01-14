export const OCR_SECTION = '{markdown_text}';

export const RETURN_JSON_INSTRUCTION = [
  "Return the extracted data in JSON format following this schema:",
  "```json",
  "{schema}",
  "```",
  "",
  "Extract all items from the invoice. Return ONLY valid JSON, do not use markdown code blocks.",
].join('\n');

export const JSON_FEEDBACK_TEMPLATE = [
  "** Previous Error: {error}",
  "",
  "** Missing Fields:",
  "{missing_fields}",
  "",
  "** Instructions:",
  "- Carefully re-examine the invoice text",
  "- Ensure all required fields are present",
  "- Use accurate values from the invoice",
  "- Return ONLY valid JSON, do not use markdown code blocks",
  "",
  "",
].join('\n');

export const PREVIOUS_RESULT_TEMPLATE = [
  "Previous extraction result (for reference):",
  "```json",
  "{previous_json}",
  "```",
].join('\n');

export const RE_EXTRACT_RETURN_JSON_INSTRUCTION = [
  "Return the extracted data in JSON format following this schema:",
  "```json",
  "{schema}",
  "```",
  "",
  "Extract all items from the invoice. Ensure all required fields are present.",
  "Return ONLY valid JSON, do not use markdown code blocks.",
].join('\n');
