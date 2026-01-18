import { SchemaRuleEntity } from '../../entities/schema-rule.entity';

export class SchemaRuleResponseDto {
  id!: number;
  schemaId!: number;
  fieldPath!: string;
  ruleType!: SchemaRuleEntity['ruleType'];
  ruleOperator!: SchemaRuleEntity['ruleOperator'];
  ruleConfig!: Record<string, unknown>;
  errorMessage!: string | null;
  priority!: number;
  enabled!: boolean;
  description!: string | null;
  createdAt!: Date;

  static fromEntity(rule: SchemaRuleEntity): SchemaRuleResponseDto {
    return {
      id: rule.id,
      schemaId: rule.schemaId,
      fieldPath: rule.fieldPath,
      ruleType: rule.ruleType,
      ruleOperator: rule.ruleOperator,
      ruleConfig: rule.ruleConfig,
      errorMessage: rule.errorMessage ?? null,
      priority: rule.priority,
      enabled: rule.enabled,
      description: rule.description ?? null,
      createdAt: rule.createdAt,
    };
  }
}
