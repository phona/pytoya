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
import { CreatePromptDto } from './dto/create-prompt.dto';
import { PromptResponseDto } from './dto/prompt-response.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptsService } from './prompts.service';

@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  async create(@Body() createPromptDto: CreatePromptDto) {
    const prompt = await this.promptsService.create(createPromptDto);
    return PromptResponseDto.fromEntity(prompt);
  }

  @Get()
  async findAll() {
    const prompts = await this.promptsService.findAll();
    return prompts.map(PromptResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const prompt = await this.promptsService.findOne(id);
    return PromptResponseDto.fromEntity(prompt);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromptDto: UpdatePromptDto,
  ) {
    const prompt = await this.promptsService.update(id, updatePromptDto);
    return PromptResponseDto.fromEntity(prompt);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const prompt = await this.promptsService.remove(id);
    return PromptResponseDto.fromEntity(prompt);
  }
}
