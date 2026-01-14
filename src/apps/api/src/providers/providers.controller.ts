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
import { CreateProviderDto } from './dto/create-provider.dto';
import { ProviderResponseDto } from './dto/provider-response.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@UseGuards(JwtAuthGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  async create(@Body() createProviderDto: CreateProviderDto) {
    const provider = await this.providersService.create(createProviderDto);
    return ProviderResponseDto.fromEntity(provider);
  }

  @Get()
  async findAll() {
    const providers = await this.providersService.findAll();
    return providers.map(ProviderResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const provider = await this.providersService.findOne(id);
    return ProviderResponseDto.fromEntity(provider);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProviderDto: UpdateProviderDto,
  ) {
    const provider = await this.providersService.update(id, updateProviderDto);
    return ProviderResponseDto.fromEntity(provider);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const provider = await this.providersService.remove(id);
    return ProviderResponseDto.fromEntity(provider);
  }

  @Post(':id/test')
  async testConnection(@Param('id', ParseIntPipe) id: number) {
    return this.providersService.testConnection(id);
  }
}
