# Design: AI-Assisted Schema-Based Extraction System

## Context

The current system requires users to manually construct JSON Schemas using a visual builder or raw JSON editor. This presents a high barrier to entry for users who are not familiar with JSON Schema syntax. Additionally, validation rules are currently hardcoded in the extraction service, making them difficult to customize per schema.

We want to leverage the existing LLM integration to:
1. Generate valid JSON Schema from natural language descriptions
2. Generate domain-specific validation rules (e.g., OCR corrections, PO number patterns)
3. Build context-aware extraction prompts that include rules

## Goals / Non-Goals

**Goals:**
- Reduce time-to-first-extraction by enabling AI-assisted schema creation
- Support domain-specific validation rules (PO number patterns, OCR corrections, unit validation)
- Simplify the project creation wizard flow

**Non-Goals:**
- General-purpose prompt engineering (focus on schema-based extraction only)
- Prompt-based extraction strategy (removing this option)
- Schema template library (replaced by AI generation)

## Decisions

### Decision 1: Schema Rules Entity

**Choice**: Create a new `SchemaRuleEntity` with a flexible JSONB `ruleConfig` column.

**Rationale**:
- JSONB allows extensible rule configurations without schema migrations
- Priority-based ordering enables rule importance (shown first to LLM)
- Enabled/disabled flag allows temporary rule exclusion without deletion
- Separate rule types (verification vs restriction) clarify intent

**Alternatives considered**:
- Store rules in schema JSONB → Rejected: Harder to query and manage individual rules
- Use validation-script pattern → Rejected: Scripts are code-based, rules are declarative

### Decision 2: LLM for Schema Generation

**Choice**: Use OpenAI-compatible structured output (`response_format: { type: "json_object" }`).

**Rationale**:
- Existing LLM service already supports this format
- JSON Schema generation is well-suited for structured output
- Users get immediate feedback on generated schema before saving

**Alternatives considered**:
- Fine-tuned model → Rejected: Overkill, added complexity
- Template-based generation → Rejected: Less flexible than LLM

### Decision 3: Rule Operators

**Choice**: Fixed set of operators (pattern, enum, range_min/max, length_min/max, ocr_correction).

**Rationale**:
- Covers common validation needs for invoice extraction
- Each operator has well-defined config structure
- Easy to extend later if needed

**Alternatives considered**:
- Arbitrary JavaScript expressions → Rejected: Security risk, harder to validate
- JSON Schema validation keywords → Rejected: Doesn't cover OCR corrections

### Decision 4: Prompt Builder Service

**Choice**: Create dedicated service to build extraction prompts from schema + rules.

**Rationale**:
- Separates prompt construction logic from extraction workflow
- Enables consistent prompt formatting across different extraction modes
- Makes testing easier (can verify prompt output independently)

**Alternatives considered**:
- Inline prompt construction in extraction service → Rejected: Harder to test and maintain
- Template-based prompts → Rejected: Less flexible for dynamic rules

### Decision 5: Wizard Flow Simplification

**Choice**: Remove strategy selection, move models to Step 2, add dedicated Rules step.

**Rationale**:
- Schema-based extraction is the recommended path (prompt-based is legacy)
- Early model selection enables AI assistance in later steps
- Dedicated Rules step emphasizes their importance

**Alternatives considered**:
- Keep strategy selection → Rejected: Adds complexity without clear benefit
- Keep models in Step 4 → Rejected: Prevents AI assistance in schema/rules steps

## Data Model

### SchemaRuleEntity

```typescript
{
  id: number
  schemaId: number
  fieldPath: string              // Dot notation: "invoice.po_no", "items[].unit"
  ruleType: 'verification' | 'restriction'
  ruleOperator: 'pattern' | 'enum' | 'range_min' | 'range_max' | 'length_min' | 'length_max' | 'ocr_correction'
  ruleConfig: Record<string, unknown>
  errorMessage: string | null
  priority: number               // 0-10, higher = more important
  enabled: boolean
  description: string | null
  createdAt: Date
}
```

### SchemaEntity Extensions

```typescript
{
  // ... existing fields
  systemPromptTemplate: string | null
  validationSettings: {
    strictMode?: boolean
    ocrCorrectionLevel?: 'strict' | 'moderate' | 'minimal'
    crossValidation?: boolean
  } | null
}
```

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SchemasController                           │
│  - POST /schemas/generate         → SchemaGeneratorService      │
│  - POST /schemas/:id/generate-rules → RuleGeneratorService     │
│  - GET  /schemas/:id/rules        → SchemaRulesController      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SchemasModule (Global)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ SchemaGenerator  │  │ RuleGenerator    │  │ PromptBuilder│ │
│  │ Service          │  │ Service          │  │ Service      │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────┐                                            │
│  │ SchemaRules      │                                            │
│  │ Service          │                                            │
│  └──────────────────┘                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Existing Services                            │
│  ┌──────────────────┐  ┌──────────────┐                         │
│  │ LlmService       │  │ ModelEntity  │                         │
│  └──────────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

## User Experience Flow

### Project Creation Wizard

The new wizard flow simplifies project creation from 5 steps to a focused 5-step flow with AI assistance:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Step 1: Basics                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Project Name: [_____________________________]              │ │
│  │  Description:  [_____________________________]              │ │
│  │                                                           │ │
│  │              [Cancel]           [Next: Models →]           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Step 2: Models                                │
├─────────────────────────────────────────────────────────────────┤
│  LLM Model *                                                  │
│    [GPT-4o ▼]                                                │
│                                                           │
│  [ ] Use OCR before LLM (optional)                             │
│    OCR Model: [PaddleOCR-Local ▼]                            │
│                                                           │
│  💡 LLM will help generate your schema and rules                 │
│                                                           │
│  [← Back]                [Next: Schema →]                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Step 3: Schema Creation                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Schema Name: [InvoiceData_________________________]        │ │
│  │                                                             │ │
│  │  Quick Actions:                                              │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │  ✨ Generate     │  │  📁 Import File  │                │ │
│  │  │  by LLM          │  │                  │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │                                                             │ │
│  │  ─────────────────────────────────────────────────────────  │ │
│  │                                                             │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │  [Format]  [Copy]  [Validate]                       │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ╔══════════════════════════════════════════════════════════════╗ │
│  ║  JSON Schema Editor                                          ║ │
│  ╠══════════════════════════════════════════════════════════════╣ │
│  ║  ┌───────────────────────────────────────────────────────┐  ║ │
│  ║  │ 1  {                                                   │  ║ │
│  ║  │ 2   "type": "object",                                  │  ║ │
│  ║  │ 3   "properties": {                                    │  ║ │
│  ║  │ 4     "po_no": {                                       │  ║ │
│  ║  │ 5       "type": "string",                              │  ║ │
│  ║  │ 6       "description": "Purchase Order number",         │  ║ │
│  ║  │ 7       "x-extraction-hint": "Located at top-right     │  ║ │
│  ║  │ 8          of invoice header, exactly 7 digits,        │  ║ │
│  ║  │ 9          zero-padded (e.g., 0000123)"                 │  ║ │
│  ║  │10     },                                                │  ║ │
│  ║  │11     "department": {                                   │  ║ │
│  ║  │12       "type": "object",                               │  ║ │
│  ║  │13       "properties": {                                 │  ║ │
│  ║  │14         "code": {                                    │  ║ │
│  ║  │15           "type": "string",                           │  ║ │
│  ║  │16           "x-extraction-hint": "3-letter code near   │  ║ │
│  ║  │17               company name"                           │  ║ │
│  ║  │18         }                                             │  ║ │
│  ║  │19       }                                               │  ║ │
│  ║  │20     },                                                │  ║ │
│  ║  │21     "invoice_date": {                                 │  ║ │
│  ║  │22       "type": "string"                                │  ║ │
│  ║  │23     },                                                │  ║ │
│  ║  │24     "items": {                                        │  ║ │
│  ║  │25       "type": "array",                                │  ║ │
│  ║  │26       "items": {                                      │  ║ │
│  ║  │27         "type": "object",                             │  ║ │
│  ║  │28         "properties": {                               │  ║ │
│  ║  │29           "name": {"type": "string"},                 │  ║ │
│  ║  │30           "quantity": {"type": "number"},             │  ║ │
│  ║  │31           "unit": {"type": "string"},                 │  ║ │
│  ║  │32           "price": {"type": "number"}                 │  ║ │
│  ║  │33         }                                             │  ║ │
│  ║  │34       }                                               │  ║ │
│  ║  │35     }                                                  │  ║ │
│  ║  │36   }                                                    │  ║ │
│  ║  │37 }                                                      │  ║ │
│  ║  │                                                          │  ║ │
│  ║  │                   (editable, syntax highlighted)          │  ║ │
│  ║  └───────────────────────────────────────────────────────┘  ║ │
│  ╚══════════════════════════════════════════════════════════════╝ │
│                                                                 │
│  [← Back]                           [Next: Rules →]             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Step 4: Rules (AI-Assisted)                   │
├─────────────────────────────────────────────────────────────────┤
│  ✨ AI-Assisted Rule Generation                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Describe validation requirements:                         │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │ PO number must be exactly 7 digits. Units should    │   │ │
│  │  │ only be KG, EA, or M. Apply OCR corrections for    │   │ │
│  │  │ common errors like 理→埋, 0→O, etc.               │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                           │ │
│  │  [✨ Generate Rules]  [Auto-Generate All]                 │ │
│  │                                                           │ │
│  │  Generated Rules (3):                                     │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │ 🔹 invoice.po_no - Pattern (priority: 8)             │   │ │
│  │  │    Regex: ^\d{7}$                                    │   │ │
│  │  │    [Edit] [Remove]                                   │   │ │
│  │  ├─────────────────────────────────────────────────────┤   │ │
│  │  │ 🔹 items[].unit - Enum (priority: 7)                 │   │ │
│  │  │    Values: KG, EA, M                                 │   │ │
│  │  │    [Edit] [Remove]                                   │   │ │
│  │  ├─────────────────────────────────────────────────────┤   │ │
│  │  │ 🔹 * - OCR Correction (priority: 9)                   │   │ │
│  │  │    理→埋, 0→O, 1→l, 5→S, 8→B                       │   │ │
│  │  │    [Edit] [Remove]                                   │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                           │ │
│  │  [+ Add Manual Rule]                                     │ │
│  │                                                           │ │
│  │  [← Back]                [Next: Review →]                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Step 5: Review & Create                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Project: "Q1 2026 Invoices"                               │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │ Models:                                              │   │ │
│  │  │  • OCR: PaddleOCR-Local                             │   │ │
│  │  │  • LLM: GPT-4o                                      │   │ │
│  │  ├─────────────────────────────────────────────────────┤   │ │
│  │  │ Schema: InvoiceData                                  │   │ │
│  │  │  • department.code (string)                         │   │ │
│  │  │  • po_no (string)                                    │   │ │
│  │  │  • invoice_date (string)                            │   │ │
│  │  │  • items: [...]                                     │   │ │
│  │  ├─────────────────────────────────────────────────────┤   │ │
│  │  │ Validation Rules: 3                                  │   │ │
│  │  │  • PO number pattern (7 digits)                      │   │ │
│  │  │  • Unit enum (KG, EA, M)                            │   │ │
│  │  │  • OCR corrections (5 mappings)                      │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                           │ │
│  │  [← Back]           [Create Project]                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Improvements

1. **Step 2 (Models) comes before Schema/Rules**
   - Users select LLM early, enabling AI assistance in later steps
   - Clear indication that selected LLM will help with generation
   - OCR is optional - checkbox "Use OCR before LLM (optional)"

2. **Step 3 (Schema) - JSON Editor with Quick Actions:**
   - **JSON Schema Editor**: Always visible, code editor with syntax highlighting and line numbers
   - **Generate by LLM**: Quick action that generates full JSON Schema with `x-extraction-hint` fields
   - **Import File**: Validates with ajv, populates editor with error details (line/position)
   - **Field Extraction Hints**: Custom `x-extraction-hint` field guides LLM on WHERE to find and WHAT format to expect
   - **Format/Copy/Validate**: Toolbar actions for JSON manipulation
   - User can edit JSON directly or use AI/Import to populate

3. **Step 4 (Rules) emphasizes AI assistance:**
   - "Generate Rules" for custom requirements
   - "Auto-Generate All" for automatic rule inference
   - Each rule is editable with priority slider
   - Manual rule creation always available

4. **No reusability complexity:**
   - No "select existing schema" option
   - No "import rules from schema" option
   - Each project gets its own schema and rules
   - Simpler mental model for users

### Error Handling

**AI Generation Failed:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    Generation Failed                             │
├─────────────────────────────────────────────────────────────────┤
│  ❌ Schema Generation Failed                                     │
│                                                                 │
│  The AI couldn't generate a valid schema. Please try:          │
│  • Rephrasing your description with more specific details       │
│  • Edit the JSON directly in the editor                         │
│                                                                 │
│  Error: Invalid JSON Schema - missing "type" property           │
│                                                                 │
│  [Try Again] [Edit JSON Manually]                               │
└─────────────────────────────────────────────────────────────────┘
```

**Import Schema Validation Failed:**
```
┌─────────────────────────────────────────────────────────────────┐
│                  Schema Validation Failed                       │
├─────────────────────────────────────────────────────────────────┤
│  ❌ invoice-schema.json has validation errors                   │
│                                                                 │
│  Line 15, Position 12: Required property "type" is missing      │
│  Line 28, Position 8:  Unknown property "additionalItems"       │
│                                                                 │
│  Please fix the errors in your JSON Schema and try again.       │
│  You can also edit the JSON directly in the editor.             │
│                                                                 │
│  [Upload Another File]  [Edit JSON Manually]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### Quick Action Modals

**Generate by LLM Modal** (click "✨ Generate by LLM"):
```
┌─────────────────────────────────────────────────────────────────┐
│                    Generate Schema by LLM                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Describe the schema you want to create:                    │ │
│  │  ┌─────────────────────────────────────────────────────┐   │ │
│  │  │ Invoice with PO number at top-right (7 digits),     │   │ │
│  │  │ department code (3 letters), invoice date, and line │   │ │
│  │  │ items with name, quantity, unit, and price...       │   │ │
│  │  └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │  Options:                                                   │ │
│  │  ☑ Generate extraction hints (x-extraction-hint)           │ │
│  │  ☐ Replace existing schema (unchecked = merge)             │ │
│  │                                                             │ │
│  │  [Cancel]  [✨ Generate]                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⏳ Generating schema...                                       │
└─────────────────────────────────────────────────────────────────┘
```

After generation → replaces/populates the JSON Editor with generated schema.

**Import File Modal** (click "📁 Import File"):
```
┌─────────────────────────────────────────────────────────────────┐
│                    Import JSON Schema                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Drop .json file here or click to browse                    │ │
│  │  ┌─────────────────────────────────────────────────┐        │ │
│  │  │          📄 Drag & drop or click to upload      │        │ │
│  │  └─────────────────────────────────────────────────┘        │ │
│  │                                                             │ │
│  │  Options:                                                   │ │
│  │  ☐ Replace existing schema (unchecked = insert at cursor)   │ │
│  │                                                             │ │
│  │  [Cancel]  [Import]                                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ⏳ Validating and importing...                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Validate Action** (click "Validate"):
```
┌─────────────────────────────────────────────────────────────────┐
│                    ✓ Valid JSON Schema                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Properties: 4                                             │ │
│  │  Nested objects: 1 (department)                             │ │
│  │  Arrays: 1 (items)                                         │ │
│  │  Extraction hints: 2/4 fields                               │ │
│  │                                                             │ │
│  │  💡 Consider adding hints to 'invoice_date' and 'items'     │ │
│  │     for better extraction accuracy                          │ │
│  │                                                             │ │
│  │  [OK]                                                      │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Migration Plan

### Database Migration

**Additions:**
1. Create `schema_rules` table with foreign key to `schemas`
2. Add `system_prompt_template` column to `schemas` table (nullable)
3. Add `validation_settings` column to `schemas` table (nullable jsonb)

**Removals:**
1. Drop `is_template` column from `schemas` table
2. Make `llm_model_id` NOT NULL in `projects` table (required)
3. Drop `default_prompt_id` column from `projects` table
4. OCR model remains optional (NULL = vision-only extraction)

### Rollback Plan

1. Drop `schema_rules` table
2. Remove new columns from `schemas` table
3. Re-add `is_template` column to `schemas` table
4. Make `llm_model_id` nullable again in `projects` table
5. Re-add `default_prompt_id` column to `projects` table
6. Revert wizard changes (restore strategy selection, move models back)
7. Services are new, so no rollback needed for those

## Risks / Trade-offs

### Risk 1: LLM-generated schemas may be invalid

**Mitigation**:
- Validate generated schemas with ajv before returning
- Provide clear error messages if validation fails
- Allow manual schema editing as fallback

### Risk 2: AI generation may be slow

**Mitigation**:
- Show loading state during generation
- Set reasonable timeout (30 seconds)
- Allow cancellation

### Risk 3: Rule operators may not cover all use cases

**Mitigation**:
- Extensible design allows adding new operators later
- JSONB rule_config allows custom configurations
- Consider this MVP for rule system

### Risk 4: Prompt construction complexity

**Mitigation**:
- Write comprehensive tests for PromptBuilderService
- Document prompt format expectations
- Use template literals for readability

## Open Questions

1. Should we support rule inheritance from parent schemas?
   - **Decision**: No, out of scope for MVP

2. Should rules support cross-field validation (e.g., "quantity × price = total")?
   - **Decision**: No, out of scope for MVP (would require expression language)

3. Should we allow custom rule operators via plugin system?
   - **Decision**: No, hardcode operators for now, extend later if needed

4. How should we handle rule conflicts (e.g., two pattern rules on same field)?
   - **Decision**: Apply all enabled rules, order by priority

5. Should the wizard support editing AI-generated rules before saving?
   - **Decision**: Yes, provide rule editor for all generated rules
