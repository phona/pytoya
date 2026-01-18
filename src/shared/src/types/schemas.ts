export type { CreateSchemaDto } from '../../../apps/api/src/schemas/dto/create-schema.dto';
export type { CreateSchemaRuleDto } from '../../../apps/api/src/schemas/dto/create-schema-rule.dto';
export type { GenerateRulesDto } from '../../../apps/api/src/schemas/dto/generate-rules.dto';
export type { GenerateSchemaDto } from '../../../apps/api/src/schemas/dto/generate-schema.dto';
export type { ImportSchemaDto } from '../../../apps/api/src/schemas/dto/import-schema.dto';
export type { UpdateSchemaDto } from '../../../apps/api/src/schemas/dto/update-schema.dto';
export type { UpdateSchemaRuleDto } from '../../../apps/api/src/schemas/dto/update-schema-rule.dto';
export type { ValidateSchemaDto } from '../../../apps/api/src/schemas/dto/validate-schema.dto';
export type { SchemaRuleResponseDto } from '../../../apps/api/src/schemas/dto/schema-rule-response.dto';
export type { SchemaResponseDto } from '../../../apps/api/src/schemas/dto/schema-response.dto';

export enum SchemaRuleType {
  VERIFICATION = 'verification',
  RESTRICTION = 'restriction',
}

export enum SchemaRuleOperator {
  PATTERN = 'pattern',
  ENUM = 'enum',
  RANGE_MIN = 'range_min',
  RANGE_MAX = 'range_max',
  LENGTH_MIN = 'length_min',
  LENGTH_MAX = 'length_max',
  OCR_CORRECTION = 'ocr_correction',
}
