import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSchemaRuleDto } from './dto/create-schema-rule.dto';
import { SchemaRuleResponseDto } from './dto/schema-rule-response.dto';
import { UpdateSchemaRuleDto } from './dto/update-schema-rule.dto';
import { SchemaRulesService } from './schema-rules.service';

@UseGuards(JwtAuthGuard)
@Controller('schemas/:schemaId/rules')
export class SchemaRulesController {
  constructor(private readonly schemaRulesService: SchemaRulesService) {}

  @Get()
  async list(@Param('schemaId', ParseIntPipe) schemaId: number) {
    const rules = await this.schemaRulesService.findBySchema(schemaId);
    return rules.map(SchemaRuleResponseDto.fromEntity);
  }

  @Post()
  async create(
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Body() body: CreateSchemaRuleDto,
  ) {
    const rule = await this.schemaRulesService.create(schemaId, body);
    return SchemaRuleResponseDto.fromEntity(rule);
  }

  @Patch(':ruleId')
  async update(
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() body: UpdateSchemaRuleDto,
  ) {
    const rule = await this.schemaRulesService.update(schemaId, ruleId, body);
    return SchemaRuleResponseDto.fromEntity(rule);
  }

  @Delete(':ruleId')
  async remove(
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
  ) {
    const rule = await this.schemaRulesService.remove(schemaId, ruleId);
    return SchemaRuleResponseDto.fromEntity(rule);
  }
}
