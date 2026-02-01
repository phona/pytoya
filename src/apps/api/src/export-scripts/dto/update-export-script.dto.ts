import { PartialType } from '@nestjs/mapped-types';
import { CreateExportScriptDto } from './create-export-script.dto';

export class UpdateExportScriptDto extends PartialType(CreateExportScriptDto) {}

