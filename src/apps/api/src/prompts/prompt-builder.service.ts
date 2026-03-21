import { Injectable } from '@nestjs/common';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { canonicalizeJsonSchemaForStringify } from '../schemas/utils/canonicalize-json-schema';
import { ExtractedData, ExtractionPromptEnhancements, FewShotExample, OcrDomainHints, OcrTableData } from './types/prompts.types';

export type ExtractionPromptParts = {
  systemContext: string;
  userInput: string;
};

@Injectable()
export class PromptBuilderService {
  buildExtractionPrompt(
    ocrMarkdown: string,
    schema: SchemaEntity,
    rules: SchemaRuleEntity[],
    requiredFields?: string[],
    enhancements?: ExtractionPromptEnhancements,
  ): ExtractionPromptParts {
    const header = [
      'You extract structured data from OCR text provided by the user.',
      'Use the JSON Schema, validation rules, validation settings, and extraction hints as the contract.',
      'If OCR likely contains mistakes, correct them using the project prompt rules (Markdown) provided in the system prompt.',
      'Do not invent values: use null when unknown.',
      '',
      'Include a "_extraction_info" object in your response with:',
      '- "confidence": overall confidence score (0.0 to 1.0)',
      '- "field_confidences": object mapping each top-level field path to its confidence (0.0 to 1.0)',
      '- "ocr_issues": array of detected OCR problems (empty array if none)',
      '- "uncertain_fields": array of field paths where you are less than 70% confident',
    ].join('\n');

    const schemaBlock = this.formatSchema(schema);
    const requiredBlock = this.formatRequiredFields(requiredFields ?? schema.requiredFields ?? []);
    const rulesBlock = this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);
    const ocrQualityBlock = this.formatOcrQuality(enhancements?.ocrQualityScore, enhancements?.ocrDomainHints);
    const fewShotBlock = this.formatFewShotExamples(enhancements?.fewShotExamples);

    const systemContext = [header, schemaBlock, requiredBlock, rulesBlock, settingsBlock, ocrQualityBlock, fewShotBlock]
      .filter(Boolean)
      .join('\n\n');

    const tableBlock = this.formatStructuredTables(enhancements?.structuredTables);
    const userInput = [
      'Target:',
      '- Extract all fields required by the contract.',
      '',
      'OCR Text (Markdown):',
      ocrMarkdown,
      tableBlock,
    ]
      .filter(Boolean)
      .join('\n');

    return { systemContext, userInput };
  }

  buildReExtractPrompt(
    ocrMarkdown: string,
    previousResult: ExtractedData,
    missingFields: string[] | undefined,
    errorMessage: string | undefined,
    schema: SchemaEntity,
    rules: SchemaRuleEntity[],
    requiredFields?: string[],
    enhancements?: ExtractionPromptEnhancements,
  ): ExtractionPromptParts {
    const header = [
      'You are re-extracting data to fix validation issues.',
      'Use the OCR text, the JSON Schema contract, and the validation rules/settings to correct the result.',
      'Prefer minimal diffs: only change what is needed to satisfy the contract.',
      '',
      'Include a "_extraction_info" object in your response with:',
      '- "confidence": overall confidence score (0.0 to 1.0)',
      '- "field_confidences": object mapping each top-level field path to its confidence (0.0 to 1.0)',
      '- "ocr_issues": array of detected OCR problems (empty array if none)',
      '- "uncertain_fields": array of field paths where you are less than 70% confident',
    ].join('\n');

    const missing = (missingFields ?? [])
      .map((field) => `- ${field}`)
      .join('\n');
    const errorBlock = errorMessage ? `Validation error:\n${errorMessage}` : '';
    const previousBlock = JSON.stringify(
      this.omitTargetFieldsFromPreviousResult(previousResult, missingFields),
      null,
      2,
    );

    const targets = (missingFields ?? []).filter(Boolean);
    const hasTargets = targets.length > 0;

    // Narrow scope when specific fields are targeted
    const schemaBlock = hasTargets
      ? this.formatSubSchema(schema, targets)
      : this.formatSchema(schema);
    const allRequired = requiredFields ?? schema.requiredFields ?? [];
    const requiredBlock = hasTargets
      ? this.formatRequiredFields(this.filterFieldList(allRequired, targets))
      : this.formatRequiredFields(allRequired);
    const rulesBlock = hasTargets
      ? this.formatRules(this.filterRulesForFields(rules, targets))
      : this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);
    const ocrQualityBlock = this.formatOcrQuality(enhancements?.ocrQualityScore, enhancements?.ocrDomainHints);
    const fewShotBlock = hasTargets
      ? this.formatFewShotExamples(this.trimFewShotForFields(enhancements?.fewShotExamples, targets))
      : this.formatFewShotExamples(enhancements?.fewShotExamples);

    const systemContext = [
      header,
      errorBlock,
      'Previous result:',
      previousBlock,
      schemaBlock,
      requiredBlock,
      rulesBlock,
      settingsBlock,
      ocrQualityBlock,
      fewShotBlock,
    ]
      .filter(Boolean)
      .join('\n\n');

    const tableBlock = this.formatStructuredTables(enhancements?.structuredTables);
    const userInput = [
      'Target:',
      missing ? `- Re-extract ONLY these fields:\n${missing}` : '- Fix the data to satisfy the contract.',
      '',
      'OCR Text (Markdown):',
      ocrMarkdown,
      tableBlock,
    ]
      .filter(Boolean)
      .join('\n');

    return { systemContext, userInput };
  }

  private omitTargetFieldsFromPreviousResult(
    previousResult: ExtractedData,
    missingFields: string[] | undefined,
  ): ExtractedData {
    const targets = (missingFields ?? []).map((field) => field.trim()).filter(Boolean);
    if (targets.length === 0) {
      return previousResult;
    }

    const cloned = JSON.parse(JSON.stringify(previousResult)) as ExtractedData;
    for (const fieldPath of targets) {
      this.deleteFieldPath(cloned as unknown, fieldPath);
    }
    return cloned;
  }

  private deleteFieldPath(container: unknown, fieldPath: string): void {
    const trimmed = fieldPath.trim();
    if (!trimmed) {
      return;
    }

    const parts = trimmed.split('.').filter(Boolean);
    if (parts.length === 0) {
      return;
    }

    const walk = (current: unknown, index: number): void => {
      if (current === null || typeof current !== 'object') {
        return;
      }
      if (index >= parts.length) {
        return;
      }

      const part = parts[index];
      const record = current as Record<string, unknown>;
      const isLast = index === parts.length - 1;

      const anyMatch = part.match(/(.+)\[\]$/);
      if (anyMatch) {
        const key = anyMatch[1];
        const next = record[key];
        if (isLast) {
          delete record[key];
          return;
        }
        if (!Array.isArray(next)) {
          return;
        }
        for (const entry of next) {
          walk(entry, index + 1);
        }
        return;
      }

      const arrayMatch = part.match(/(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const key = arrayMatch[1];
        const arrayIndex = Number.parseInt(arrayMatch[2], 10);
        const next = record[key];
        if (!Array.isArray(next) || !Number.isFinite(arrayIndex) || arrayIndex < 0 || arrayIndex >= next.length) {
          return;
        }
        if (isLast) {
          next[arrayIndex] = null;
          return;
        }
        walk(next[arrayIndex], index + 1);
        return;
      }

      if (isLast) {
        delete record[part];
        return;
      }
      if (!(part in record)) {
        return;
      }
      walk(record[part], index + 1);
    };

    walk(container, 0);
  }

  /**
   * Build a minimal sub-schema containing only the target fields.
   * Preserves parent structure for nested/array fields.
   */
  private formatSubSchema(schema: SchemaEntity, targetFields: string[]): string {
    const full = schema.jsonSchema as Record<string, unknown>;
    const sub = this.extractSubSchema(full, targetFields);
    const jsonSchema = JSON.stringify(
      canonicalizeJsonSchemaForStringify(sub),
      null,
      2,
    );
    return `JSON Schema (target fields only):\n${jsonSchema}`;
  }

  private extractSubSchema(
    fullSchema: Record<string, unknown>,
    targetFields: string[],
  ): Record<string, unknown> {
    const properties = fullSchema.properties as Record<string, unknown> | undefined;
    if (!properties) {
      return fullSchema;
    }

    // Normalize targets: "items[].unitPrice" → top-level key "items", nested "unitPrice"
    const topLevelKeys = new Set<string>();
    const nestedTargets = new Map<string, string[]>(); // parent → [child fields]

    for (const field of targetFields) {
      // Handle array notation: items[].foo, items.*.foo, items.0.foo
      const cleaned = field.replace(/\[\d*\]/g, '[]').replace(/\.\d+\./g, '.[].');
      const dotParts = cleaned.split('.');
      const topKey = dotParts[0].replace(/\[\]$/, '');
      topLevelKeys.add(topKey);

      if (dotParts.length > 1) {
        const rest = dotParts.slice(1).join('.').replace(/^\[\]\.?/, '');
        if (rest) {
          if (!nestedTargets.has(topKey)) {
            nestedTargets.set(topKey, []);
          }
          nestedTargets.get(topKey)!.push(rest);
        }
      }
    }

    const subProperties: Record<string, unknown> = {};
    for (const key of topLevelKeys) {
      if (!(key in properties)) continue;
      const propSchema = properties[key] as Record<string, unknown>;

      const nested = nestedTargets.get(key);
      if (nested && nested.length > 0) {
        // Narrow nested properties (e.g. array items)
        subProperties[key] = this.narrowPropertySchema(propSchema, nested);
      } else {
        subProperties[key] = propSchema;
      }
    }

    const sub: Record<string, unknown> = {
      ...fullSchema,
      properties: subProperties,
    };

    // Narrow required to only target top-level keys
    if (Array.isArray(fullSchema.required)) {
      sub.required = (fullSchema.required as string[]).filter((r) => topLevelKeys.has(r));
    }

    return sub;
  }

  private narrowPropertySchema(
    propSchema: Record<string, unknown>,
    nestedFields: string[],
  ): Record<string, unknown> {
    // Handle array type: { type: "array", items: { properties: {...} } }
    if (propSchema.type === 'array' && propSchema.items && typeof propSchema.items === 'object') {
      const items = propSchema.items as Record<string, unknown>;
      const narrowedItems = this.extractSubSchema(items, nestedFields);
      return { ...propSchema, items: narrowedItems };
    }

    // Handle object type with nested properties
    if (propSchema.properties && typeof propSchema.properties === 'object') {
      return this.extractSubSchema(propSchema, nestedFields);
    }

    // allOf/oneOf/anyOf — pass through (too complex to narrow safely)
    return propSchema;
  }

  /**
   * Filter validation rules to only those affecting target fields.
   */
  filterRulesForFields(rules: SchemaRuleEntity[], targetFields: string[]): SchemaRuleEntity[] {
    if (targetFields.length === 0) return rules;

    const normalized = targetFields.map((f) =>
      f.replace(/\[\d*\]/g, '.*').replace(/\.\d+\./g, '.*.').replace(/\.\d+$/, '.*'),
    );

    return rules.filter((rule) => {
      const rulePath = rule.fieldPath;
      return normalized.some((target) =>
        rulePath.startsWith(target) ||
        target.startsWith(rulePath) ||
        this.fieldPathOverlaps(rulePath, target),
      );
    });
  }

  private fieldPathOverlaps(a: string, b: string): boolean {
    // Normalize both to use * for wildcards
    const normA = a.replace(/\[\]/g, '.*');
    const normB = b.replace(/\[\]/g, '.*');
    const partsA = normA.split('.');
    const partsB = normB.split('.');
    const len = Math.min(partsA.length, partsB.length);

    for (let i = 0; i < len; i++) {
      if (partsA[i] === '*' || partsB[i] === '*') continue;
      if (partsA[i] !== partsB[i]) return false;
    }
    return true;
  }

  /**
   * Filter a list of field paths to only those matching target fields.
   */
  private filterFieldList(fields: string[], targetFields: string[]): string[] {
    const normalized = targetFields.map((f) =>
      f.replace(/\[\d*\]/g, '.*').replace(/\.\d+\./g, '.*.'),
    );
    return fields.filter((field) =>
      normalized.some((target) =>
        field.startsWith(target) || target.startsWith(field) || this.fieldPathOverlaps(field, target),
      ),
    );
  }

  /**
   * Trim few-shot examples to only include target fields in extractedData.
   */
  private trimFewShotForFields(
    examples: FewShotExample[] | undefined,
    targetFields: string[],
  ): FewShotExample[] | undefined {
    if (!examples || examples.length === 0 || targetFields.length === 0) {
      return examples;
    }

    // Get top-level keys from target fields
    const topKeys = new Set(
      targetFields.map((f) => f.replace(/\[\d*\]/g, '').split('.')[0]),
    );

    return examples.map((example) => {
      const trimmed: Record<string, unknown> = {};
      for (const key of topKeys) {
        if (key in example.extractedData) {
          trimmed[key] = (example.extractedData as Record<string, unknown>)[key];
        }
      }
      return {
        ...example,
        extractedData: trimmed as ExtractedData,
      };
    });
  }

  private formatSchema(schema: SchemaEntity): string {
    const jsonSchema = JSON.stringify(
      canonicalizeJsonSchemaForStringify(schema.jsonSchema as Record<string, unknown>),
      null,
      2,
    );
    return `JSON Schema:\n${jsonSchema}`;
  }

  private formatRequiredFields(requiredFields: string[]): string {
    const cleaned = [...new Set(requiredFields)].filter(Boolean);
    if (cleaned.length === 0) {
      return '';
    }
    const lines = cleaned.sort().map((field) => `- ${field}`);
    return `Required fields (dot paths):\n${lines.join('\n')}`;
  }

  private formatRules(rules: SchemaRuleEntity[]): string {
    if (!rules.length) {
      return 'Validation Rules: none';
    }

    const sorted = [...rules].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    const lines = sorted.map((rule) => {
      const config = JSON.stringify(rule.ruleConfig ?? {});
      const message = rule.errorMessage ? ` | ${rule.errorMessage}` : '';
      return `- [${rule.priority}] ${rule.ruleType}/${rule.ruleOperator} ${rule.fieldPath}: ${config}${message}`;
    });

    return `Validation Rules:\n${lines.join('\n')}`;
  }

  private formatValidationSettings(schema: SchemaEntity): string {
    if (!schema.validationSettings) {
      return '';
    }

    const raw = schema.validationSettings as Record<string, unknown>;
    const { promptRulesMarkdown: _promptRulesMarkdown, crossFieldRules: _crossFieldRules, ocrDomainHints: _ocrDomainHints, ...rest } = raw;

    const parts: string[] = [];

    if (Object.keys(rest).length > 0) {
      parts.push(`Validation Settings:\n${JSON.stringify(rest, null, 2)}`);
    }

    const crossFieldBlock = this.formatCrossFieldRules(raw.crossFieldRules);
    if (crossFieldBlock) {
      parts.push(crossFieldBlock);
    }

    return parts.join('\n\n');
  }

  private formatCrossFieldRules(rules: unknown): string {
    if (!Array.isArray(rules) || rules.length === 0) {
      return '';
    }

    const enabled = rules.filter(
      (r) => r && typeof r === 'object' && r.enabled !== false,
    );
    if (enabled.length === 0) {
      return '';
    }

    const lines = enabled.map((r) => {
      const name = r.name ? `${r.name}: ` : '';
      const severity = r.severity === 'warning' ? ' (warning)' : '';
      return `- ${name}${r.expression}${severity}${r.errorMessage ? ` | ${r.errorMessage}` : ''}`;
    });

    return `Cross-Field Validation Rules (ensure extracted data satisfies these constraints):\n${lines.join('\n')}`;
  }

  private formatOcrQuality(score: number | undefined, domainHints?: OcrDomainHints): string {
    const lines: string[] = [];

    // Domain context (always include if available, even without a score)
    if (domainHints?.documentType) {
      lines.push(`Document type: ${domainHints.documentType}`);
    }
    if (domainHints?.language) {
      lines.push(`Language: ${domainHints.language}`);
    }

    // Quality score
    if (score !== undefined && score !== null) {
      const level = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Poor';
      lines.push(`OCR Quality Score: ${score}/100 (${level})`);

      if (score < 90) {
        lines.push(
          'The OCR text may contain character-level errors. Pay extra attention to:',
          '  - Numeric fields (amounts, quantities, prices)',
          '  - Part numbers and model codes',
        );
      }
    }

    // Domain-specific known confusions (from config or auto-generated)
    const confusions = domainHints?.knownConfusions;
    if (confusions && confusions.length > 0) {
      lines.push('Known OCR confusions in this domain:');
      for (const c of confusions) {
        const ctx = c.context ? ` (${c.context})` : '';
        lines.push(`  - ${c.from} → ${c.to}${ctx}`);
      }
    } else if (score !== undefined && score < 70) {
      // Fallback: generic confusions only when no domain hints and poor quality
      lines.push(
        'Common OCR confusions:',
        '  - 0 ↔ O, 1 ↔ l, 5 ↔ S, 8 ↔ B',
        '  - Chinese characters with similar shapes (e.g. 理→埋, 又→叉)',
      );
    }

    // Field-specific hints
    if (domainHints?.fieldHints && domainHints.fieldHints.length > 0) {
      lines.push('Field-specific OCR hints:');
      for (const fh of domainHints.fieldHints) {
        lines.push(`  - ${fh.field}: ${fh.hint}`);
      }
    }

    // Custom instructions
    if (domainHints?.customInstructions) {
      lines.push(domainHints.customInstructions);
    }

    if (lines.length === 0) {
      return '';
    }

    return `OCR Domain Context:\n${lines.join('\n')}`;
  }

  private formatFewShotExamples(examples: FewShotExample[] | undefined): string {
    if (!examples || examples.length === 0) {
      return '';
    }

    const parts: string[] = [
      'Few-Shot Examples (from previously verified extractions):',
      'Use these examples to understand the expected output format and common extraction patterns.',
    ];

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      // Strip _extraction_info from the example output
      const { _extraction_info: _, ...cleanData } = example.extractedData;
      parts.push(
        '',
        `### Example ${i + 1}`,
        'OCR Input (excerpt):',
        example.ocrSnippet,
        '',
        'Expected Output:',
        '```json',
        JSON.stringify(cleanData, null, 2),
        '```',
      );
    }

    return parts.join('\n');
  }

  formatStructuredTables(tables: OcrTableData[] | undefined): string {
    if (!tables || tables.length === 0) {
      return '';
    }

    const parts: string[] = ['\nStructured Table Data (from OCR layout detection):'];

    for (const table of tables) {
      if (!table.cells || table.cells.length === 0) {
        continue;
      }

      parts.push(`\nTable (Page ${table.pageNumber}):`);

      const headerRow = table.cells[0];
      const colWidths = headerRow.map((_, colIdx) =>
        Math.max(...table.cells.map((row) => (row[colIdx] ?? '').length), 3),
      );

      const formatRow = (row: string[]) =>
        '| ' + row.map((cell, i) => (cell ?? '').padEnd(colWidths[i])).join(' | ') + ' |';

      parts.push(formatRow(headerRow));
      parts.push('| ' + colWidths.map((w) => '-'.repeat(w)).join(' | ') + ' |');

      for (let i = 1; i < table.cells.length; i++) {
        parts.push(formatRow(table.cells[i]));
      }
    }

    if (parts.length <= 1) {
      return '';
    }

    parts.push(
      '\nUse this structured table data for better accuracy when extracting items/line items.',
      'The table structure is more reliable than the raw OCR text for tabular data.',
    );

    return parts.join('\n');
  }
}
