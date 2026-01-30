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

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserEntity } from '../entities/user.entity';
import { CreateSchemaRuleDto } from './dto/create-schema-rule.dto';
import { SchemaRuleResponseDto } from './dto/schema-rule-response.dto';
import { UpdateSchemaRuleDto } from './dto/update-schema-rule.dto';
import { SchemaRulesService } from './schema-rules.service';
import { SchemasService } from './schemas.service';

@UseGuards(JwtAuthGuard)
@Controller('schemas/:schemaId/rules')
export class SchemaRulesController {
  constructor(
    private readonly schemaRulesService: SchemaRulesService,
    private readonly schemasService: SchemasService,
  ) {}

  @Get()
  async list(@CurrentUser() user: UserEntity, @Param('schemaId', ParseIntPipe) schemaId: number) {
    await this.schemasService.findOne(user, schemaId);
    const rules = await this.schemaRulesService.findBySchema(schemaId);
    return rules.map(SchemaRuleResponseDto.fromEntity);
  }

  @Post()
  async create(
    @CurrentUser() user: UserEntity,
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Body() body: CreateSchemaRuleDto,
  ) {
    await this.schemasService.findOne(user, schemaId);
    const rule = await this.schemaRulesService.create(schemaId, body);
    return SchemaRuleResponseDto.fromEntity(rule);
  }

  @Patch(':ruleId')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
    @Body() body: UpdateSchemaRuleDto,
  ) {
    await this.schemasService.findOne(user, schemaId);
    const rule = await this.schemaRulesService.update(schemaId, ruleId, body);
    return SchemaRuleResponseDto.fromEntity(rule);
  }

  @Delete(':ruleId')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('schemaId', ParseIntPipe) schemaId: number,
    @Param('ruleId', ParseIntPipe) ruleId: number,
  ) {
    await this.schemasService.findOne(user, schemaId);
    const rule = await this.schemaRulesService.remove(schemaId, ruleId);
    return SchemaRuleResponseDto.fromEntity(rule);
  }
}
