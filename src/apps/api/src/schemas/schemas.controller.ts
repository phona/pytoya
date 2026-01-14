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
import { CreateSchemaDto } from './dto/create-schema.dto';
import { SchemaResponseDto } from './dto/schema-response.dto';
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { ValidateSchemaDto } from './dto/validate-schema.dto';
import { SchemasService } from './schemas.service';

@UseGuards(JwtAuthGuard)
@Controller('schemas')
export class SchemasController {
  constructor(private readonly schemasService: SchemasService) {}

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

  @Get('templates')
  async findTemplates() {
    const schemas = await this.schemasService.findTemplates();
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
    return this.schemasService.validate(validateSchemaDto);
  }

  @Post('validate-with-required')
  async validateWithRequired(@Body() validateSchemaDto: ValidateSchemaDto) {
    return this.schemasService.validateWithRequiredFields(validateSchemaDto);
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
