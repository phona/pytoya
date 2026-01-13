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
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptsService } from './prompts.service';

@UseGuards(JwtAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  async create(@Body() createPromptDto: CreatePromptDto) {
    return this.promptsService.create(createPromptDto);
  }

  @Get()
  async findAll() {
    return this.promptsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promptsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromptDto: UpdatePromptDto,
  ) {
    return this.promptsService.update(id, updatePromptDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.promptsService.remove(id);
  }
}
