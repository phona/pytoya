import { PartialType } from '@nestjs/mapped-types';
import { CreateValidationScriptDto } from './create-validation-script.dto';

export class UpdateValidationScriptDto extends PartialType(CreateValidationScriptDto) {}
