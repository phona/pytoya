import { PartialType } from '@nestjs/mapped-types';
import { CreateSchemaRuleDto } from './create-schema-rule.dto';

export class UpdateSchemaRuleDto extends PartialType(CreateSchemaRuleDto) {}
