import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { GenerateValidationScriptDto } from './dto/generate-validation-script.dto';
import { GeneratedValidationScriptResponseDto } from './dto/generated-validation-script-response.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../entities/user.entity';
import { CreateValidationScriptDto } from './dto/create-validation-script.dto';
import { UpdateValidationScriptDto } from './dto/update-validation-script.dto';
import { ValidateScriptSyntaxDto } from './dto/validate-script-syntax.dto';
import { RunValidationDto } from './dto/run-validation.dto';
import { BatchValidationDto } from './dto/batch-validation.dto';
import { ValidationScriptResponseDto } from './dto/validation-script-response.dto';
import { ValidationService } from './validation.service';

@UseGuards(JwtAuthGuard)
@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  // ========== Script CRUD ==========

  @Post('scripts')
  async createScript(
    @CurrentUser() user: UserEntity,
    @Body() createScriptDto: CreateValidationScriptDto,
  ) {
    const script = await this.validationService.create(user, createScriptDto);
    return ValidationScriptResponseDto.fromEntity(script);
  }

  @Get('scripts')
  async findAllScripts(@CurrentUser() user: UserEntity) {
    const scripts = await this.validationService.findAll(user);
    return scripts.map(ValidationScriptResponseDto.fromEntity);
  }

  @Get('scripts/project/:projectId')
  async findScriptsByProject(
    @CurrentUser() user: UserEntity,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    const scripts = await this.validationService.findByProject(
      user,
      projectId,
    );
    return scripts.map(ValidationScriptResponseDto.fromEntity);
  }

  @Get('scripts/:id')
  async findOneScript(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const script = await this.validationService.findOne(user, id);
    return ValidationScriptResponseDto.fromEntity(script);
  }

  @Post('scripts/:id')
  async updateScript(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateScriptDto: UpdateValidationScriptDto,
  ) {
    const script = await this.validationService.update(
      user,
      id,
      updateScriptDto,
    );
    return ValidationScriptResponseDto.fromEntity(script);
  }

  @Delete('scripts/:id')
  async removeScript(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const script = await this.validationService.remove(user, id);
    return ValidationScriptResponseDto.fromEntity(script);
  }

  // ========== Script Validation ==========

  @Post('scripts/validate-syntax')
  async validateScriptSyntax(@Body() validateDto: ValidateScriptSyntaxDto) {
    return this.validationService.validateScriptSyntax(validateDto.script);
  }

  @Post('scripts/generate')
  async generateScript(@Body() generateDto: GenerateValidationScriptDto) {
    const result = await this.validationService.generateScriptTemplate(generateDto);
    return GeneratedValidationScriptResponseDto.fromGenerated(result);
  }

  // ========== Validation Execution ==========

  @Post('run')
  async runValidation(
    @CurrentUser() user: UserEntity,
    @Body() runValidationDto: RunValidationDto,
  ) {
    return this.validationService.runValidation(user, runValidationDto);
  }

  @Post('batch')
  async runBatchValidation(
    @CurrentUser() user: UserEntity,
    @Body() batchValidationDto: BatchValidationDto,
  ) {
    const results = await this.validationService.runBatchValidation(
      user,
      batchValidationDto,
    );
    // Convert Map to object for JSON serialization
    return Object.fromEntries(results);
  }
}
