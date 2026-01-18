import { Injectable } from '@nestjs/common';
import { SchemaEntity } from '../entities/schema.entity';
import { SchemaRuleEntity } from '../entities/schema-rule.entity';
import { ExtractedData } from './types/prompts.types';

@Injectable()
export class PromptBuilderService {
  buildExtractionPrompt(
    ocrMarkdown: string,
    schema: SchemaEntity,
    rules: SchemaRuleEntity[],
  ): string {
    const header = [
      'Extract structured data from the OCR text.',
      'Return ONLY valid JSON that matches the JSON Schema.',
      'Follow validation rules and extraction hints.',
    ].join('\n');

    const schemaBlock = this.formatSchema(schema);
    const rulesBlock = this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);

    return [
      header,
      schemaBlock,
      rulesBlock,
      settingsBlock,
      'OCR Text:',
      ocrMarkdown,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  buildReExtractPrompt(
    ocrMarkdown: string,
    previousResult: ExtractedData,
    missingFields: string[] | undefined,
    errorMessage: string | undefined,
    schema: SchemaEntity,
    rules: SchemaRuleEntity[],
  ): string {
    const header = [
      'Re-extract the missing or incorrect fields from the OCR text.',
      'Return ONLY valid JSON that matches the JSON Schema.',
    ].join('\n');

    const missing = (missingFields ?? [])
      .map((field) => `- ${field}`)
      .join('\n');
    const errorBlock = errorMessage ? `Error: ${errorMessage}` : '';
    const previousBlock = JSON.stringify(previousResult, null, 2);

    const schemaBlock = this.formatSchema(schema);
    const rulesBlock = this.formatRules(rules);
    const settingsBlock = this.formatValidationSettings(schema);

    return [
      header,
      errorBlock,
      missing ? `Missing fields:\n${missing}` : '',
      'Previous result:',
      previousBlock,
      schemaBlock,
      rulesBlock,
      settingsBlock,
      'OCR Text:',
      ocrMarkdown,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private formatSchema(schema: SchemaEntity): string {
    const jsonSchema = JSON.stringify(schema.jsonSchema, null, 2);
    return `JSON Schema:\n${jsonSchema}`;
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
    const settings = JSON.stringify(schema.validationSettings, null, 2);
    return `Validation Settings:\n${settings}`;
  }
}
