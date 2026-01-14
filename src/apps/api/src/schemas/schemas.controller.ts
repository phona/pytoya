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
import { UpdateSchemaDto } from './dto/update-schema.dto';
import { ValidateSchemaDto } from './dto/validate-schema.dto';
import { SchemasService } from './schemas.service';

@UseGuards(JwtAuthGuard)
@Controller('schemas')
export class SchemasController {
  constructor(private readonly schemasService: SchemasService) {}

  @Post()
  async create(@Body() createSchemaDto: CreateSchemaDto) {
    return this.schemasService.create(createSchemaDto);
  }

  @Get()
  async findAll() {
    return this.schemasService.findAll();
  }

  @Get('templates')
  async findTemplates() {
    return this.schemasService.findTemplates();
  }

  @Get('project/:projectId')
  async findByProject(@Param('projectId', ParseIntPipe) projectId: number) {
    return this.schemasService.findByProject(projectId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.schemasService.findOne(id);
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
    return this.schemasService.update(id, updateSchemaDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.schemasService.remove(id);
  }
}
