import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSchemaDto } from './dto/create-schema.dto';
import { GenerateRulesDto } from './dto/generate-rules.dto';
import { GenerateSchemaDto } from './dto/generate-schema.dto';
import { GeneratePromptRulesDto } from './dto/generate-prompt-rules.dto';
import { ImportSchemaDto } from './dto/import-schema.dto';
import { SchemaResponseDto } from './dto/schema-response.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { ValidateSchemaDto } from './dto/validate-schema.dto';
import { PromptRulesGeneratorService } from './prompt-rules-generator.service';
import { RuleGeneratorService } from './rule-generator.service';
import { SchemaGeneratorService } from './schema-generator.service';
import { SchemasService } from './schemas.service';

@UseGuards(JwtAuthGuard)
@Controller('schemas')
export class SchemasController {
  constructor(
    private readonly schemasService: SchemasService,
    private readonly schemaGeneratorService: SchemaGeneratorService,
    private readonly ruleGeneratorService: RuleGeneratorService,
    private readonly promptRulesGeneratorService: PromptRulesGeneratorService,
  ) {}

  @Post()
  async create(@Body() createSchemaDto: CreateSchemaDto) {
    const schema = await this.schemasService.create(createSchemaDto);
    return SchemaResponseDto.fromEntity(schema);
  }

  @Get()
  async findAll() {
    const schemas = await this.schemasService.findAll();
    return schemas.map(SchemaResponseDto.fromEntity);
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    const schemas = await this.schemasService.findByProject(projectId);
    return schemas.map(SchemaResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const schema = await this.schemasService.findOne(id);
    return SchemaResponseDto.fromEntity(schema);
  }

  @Post('validate')
  async validate(@Body() validateSchemaDto: ValidateSchemaDto) {
    return this.schemasService.validateSchemaDefinition(validateSchemaDto.jsonSchema);
  }

  @Post('validate-with-required')
  async validateWithRequired(@Body() validateSchemaDto: ValidateSchemaDto) {
    return this.schemasService.validateWithRequiredFields(validateSchemaDto);
  }

  @Post('generate')
  async generateSchema(@Body() generateSchemaDto: GenerateSchemaDto) {
    const jsonSchema = await this.schemaGeneratorService.generate(generateSchemaDto);
    return { jsonSchema };
  }

  @Post('generate-rules')
  async generateRulesFromSchema(@Body() generateRulesDto: GenerateRulesDto) {
    if (!generateRulesDto.jsonSchema) {
      throw new BadRequestException('jsonSchema is required to generate rules');
    }
    const rules = await this.ruleGeneratorService.generate(
      { jsonSchema: generateRulesDto.jsonSchema },
      generateRulesDto,
    );
    return { rules };
  }

  @Post(':id/generate-rules')
  async generateRules(
    @Param('id', ParseIntPipe) id: number,
    @Body() generateRulesDto: GenerateRulesDto,
  ) {
    const schema = await this.schemasService.findOne(id);
    const rules = await this.ruleGeneratorService.generate(schema, generateRulesDto);
    return { rules };
  }

  @Post(':id/generate-prompt-rules')
  async generatePromptRulesMarkdown(
    @Param('id', ParseIntPipe) id: number,
    @Body() generatePromptRulesDto: GeneratePromptRulesDto,
  ) {
    const schema = await this.schemasService.findOne(id);
    const rulesMarkdown = await this.promptRulesGeneratorService.generate(schema, generatePromptRulesDto);
    return { rulesMarkdown };
  }

  @Post(':id/generate-prompt-rules/stream')
  async generatePromptRulesMarkdownStream(
    @Param('id', ParseIntPipe) id: number,
    @Body() generatePromptRulesDto: GeneratePromptRulesDto,
    @Res() res: Response,
  ) {
    const schema = await this.schemasService.findOne(id);

    res.status(200);
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    res.write(JSON.stringify({ type: 'start' }) + '\n');

    try {
      for await (const chunk of this.promptRulesGeneratorService.generateStream(schema, generatePromptRulesDto)) {
        res.write(JSON.stringify({ type: 'delta', content: chunk }) + '\n');
      }
      res.write(JSON.stringify({ type: 'done' }) + '\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? 'Unknown error');
      res.write(JSON.stringify({ type: 'error', message }) + '\n');
    } finally {
      res.end();
    }
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importSchema(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() _body: ImportSchemaDto,
  ) {
    void _body;
    if (!file) {
      throw new BadRequestException('Schema file is required');
    }

    const content = file.buffer.toString('utf-8');
    const parsed = this.schemasService.parseSchemaContent(content);
    if (!parsed.valid || !parsed.jsonSchema) {
      return { valid: false, errors: parsed.errors ?? [] };
    }

    const validation = this.schemasService.validateSchemaDefinition(parsed.jsonSchema);
    if (!validation.valid) {
      return { valid: false, errors: validation.errors ?? [] };
    }

    return { valid: true, jsonSchema: parsed.jsonSchema };
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSchemaDto: UpdateSchemaDto,
  ) {
    const schema = await this.schemasService.update(id, updateSchemaDto);
    return SchemaResponseDto.fromEntity(schema);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const schema = await this.schemasService.remove(id);
    return SchemaResponseDto.fromEntity(schema);
  }
}
