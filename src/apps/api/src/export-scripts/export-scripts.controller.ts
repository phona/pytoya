import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { CreateExportScriptDto } from './dto/create-export-script.dto';
import { ExportScriptResponseDto } from './dto/export-script-response.dto';
import { TestExportScriptDto } from './dto/test-export-script.dto';
import { UpdateExportScriptDto } from './dto/update-export-script.dto';
import { ValidateExportScriptSyntaxDto } from './dto/validate-export-script-syntax.dto';
import { ExportScriptsService } from './export-scripts.service';

@UseGuards(JwtAuthGuard)
@Controller('export-scripts')
export class ExportScriptsController {
  constructor(private readonly exportScriptsService: ExportScriptsService) {}

  @Post()
  async create(@CurrentUser() user: UserEntity, @Body() dto: CreateExportScriptDto) {
    const script = await this.exportScriptsService.create(user, dto);
    return ExportScriptResponseDto.fromEntity(script);
  }

  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    const scripts = await this.exportScriptsService.findAll(user);
    return scripts.map(ExportScriptResponseDto.fromEntity);
  }

  @Get('project/:projectId')
  async findByProject(@CurrentUser() user: UserEntity, @Param('projectId', ParseIntPipe) projectId: number) {
    const scripts = await this.exportScriptsService.findByProject(user, projectId);
    return scripts.map(ExportScriptResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: UserEntity, @Param('id', ParseIntPipe) id: number) {
    const script = await this.exportScriptsService.findOne(user, id);
    return ExportScriptResponseDto.fromEntity(script);
  }

  @Post('validate-syntax')
  async validateSyntax(@Body() dto: ValidateExportScriptSyntaxDto) {
    return this.exportScriptsService.validateScriptSyntax(dto.script);
  }

  @Post('test')
  async test(@Body() dto: TestExportScriptDto) {
    return this.exportScriptsService.testExportScript(dto);
  }

  @Post(':id')
  async update(@CurrentUser() user: UserEntity, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExportScriptDto) {
    const script = await this.exportScriptsService.update(user, id, dto);
    return ExportScriptResponseDto.fromEntity(script);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: UserEntity, @Param('id', ParseIntPipe) id: number) {
    const script = await this.exportScriptsService.remove(user, id);
    return ExportScriptResponseDto.fromEntity(script);
  }
}

