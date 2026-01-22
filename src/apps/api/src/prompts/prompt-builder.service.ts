import { Injectable } from '@nestjs/common';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { ExtractedData } from './types/prompts.types';

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
  ): ExtractionPromptParts {
    const header = [
      'You extract structured data from OCR text provided by the user.',
      'Use the JSON Schema, validation rules, validation settings, and extraction hints as the contract.',
      'If OCR likely contains mistakes, correct them using the project prompt rules (Markdown) provided in the system prompt.',
      'Do not invent values: use null when unknown.',
    ].join('\n');

    const schemaBlock = this.formatSchema(schema);
    const requiredBlock = this.formatRequiredFields(requiredFields ?? schema.requiredFields ?? []);
    const rulesBlock = this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);

    const systemContext = [header, schemaBlock, requiredBlock, rulesBlock, settingsBlock]
      .filter(Boolean)
      .join('\n\n');

    const userInput = [
      'Target:',
      '- Extract all fields required by the contract.',
      '',
      'OCR Text (Markdown):',
      ocrMarkdown,
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
  ): ExtractionPromptParts {
    const header = [
      'You are re-extracting data to fix validation issues.',
      'Use the OCR text, the JSON Schema contract, and the validation rules/settings to correct the result.',
      'Prefer minimal diffs: only change what is needed to satisfy the contract.',
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

    const schemaBlock = this.formatSchema(schema);
    const requiredBlock = this.formatRequiredFields(requiredFields ?? schema.requiredFields ?? []);
    const rulesBlock = this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);

    const systemContext = [
      header,
      errorBlock,
      'Previous result:',
      previousBlock,
      schemaBlock,
      requiredBlock,
      rulesBlock,
      settingsBlock,
    ]
      .filter(Boolean)
      .join('\n\n');

    const userInput = [
      'Target:',
      missing ? `- Re-extract ONLY these fields:\n${missing}` : '- Fix the data to satisfy the contract.',
      '',
      'OCR Text (Markdown):',
      ocrMarkdown,
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

  private formatSchema(schema: SchemaEntity): string {
    const jsonSchema = JSON.stringify(schema.jsonSchema, null, 2);
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
    const { promptRulesMarkdown: _promptRulesMarkdown, ...rest } = raw;
    if (Object.keys(rest).length === 0) {
      return '';
    }

    const settings = JSON.stringify(rest, null, 2);
    return `Validation Settings:\n${settings}`;
  }
}
