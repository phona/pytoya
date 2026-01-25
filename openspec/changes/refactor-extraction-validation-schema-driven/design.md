# Design: Schema-Driven Extraction Validation (No Domain Defaults)

## Principles
- **Schema is the contract**: requiredness and array presence come from JSON Schema.
- **No invoice defaults**: the runtime must not invent required fields for the user.
- **Audit-first**: validation outcomes should be explainable from stored schema + rules + scripts.

## Pseudocode

```text
schema = getProjectActiveSchema(projectId)
rules = getEnabledSchemaRules(schema.id)

prompt = buildPrompt(
  ocrMarkdown,
  schema.jsonSchema,
  rules,
  schema.requiredFields   # may be empty -> omit
)

data = llmExtract(prompt)
ajvResult = validateWithAjv(schema.jsonSchema, data)

if ajvResult.invalid:
  return { success:false, errors: ajvResult.errors, missingFields: ajvResult.missingRequiredPaths }

# No special-case items checks:
# - If schema wants items required, it must express it (required + minItems).

return { success:true, data }
```

## Notes
- The existing platform already has a schema-first prompt builder (`PromptBuilderService`).
- This change removes invoice-shaped runtime fallbacks so schema-only behavior is the default.

