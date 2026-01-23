import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserEntity, UserRole } from '../entities/user.entity';
import { adapterRegistry } from './adapters/adapter-registry';
import { AdapterCategory } from './adapters/adapter.interface';
import { CreateModelDto } from './dto/create-model.dto';
import { ModelResponseDto } from './dto/model-response.dto';
import { TestModelResponseDto } from './dto/test-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { UpdateModelPricingDto } from './dto/update-model-pricing.dto';
import { ModelsService } from './models.service';

@ApiTags('models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get('adapters')
  @ApiOperation({ summary: 'List available model adapters' })
  @ApiOkResponse({ description: 'Adapter schemas' })
  async listAdapters() {
    return adapterRegistry.listAdapters();
  }

  @Get()
  @ApiOperation({ summary: 'List models' })
  @ApiQuery({ name: 'category', required: false, enum: ['ocr', 'llm'] })
  @ApiQuery({ name: 'adapterType', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiOkResponse({ type: ModelResponseDto, isArray: true })
  async findAll(
    @Query('category') category?: AdapterCategory,
    @Query('adapterType') adapterType?: string,
    @Query('isActive') isActive?: string,
  ) {
    const parsedIsActive =
      isActive === undefined ? undefined : isActive === 'true';
    const models = await this.modelsService.findAll({
      category,
      adapterType,
      isActive: parsedIsActive,
    });
    return models.map(ModelResponseDto.fromEntity);
  }

  @Post()
  @ApiOperation({ summary: 'Create a model' })
  @ApiCreatedResponse({ type: ModelResponseDto })
  async create(@Body() body: CreateModelDto) {
    const model = await this.modelsService.create(body);
    return ModelResponseDto.fromEntity(model);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a model by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ModelResponseDto })
  async findOne(@Param('id') id: string) {
    const model = await this.modelsService.findOne(id);
    return ModelResponseDto.fromEntity(model);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a model' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ModelResponseDto })
  async update(
    @CurrentUser() user: UserEntity | undefined,
    @Param('id') id: string,
    @Body() body: UpdateModelDto,
  ) {
    if (body.pricing && user?.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update model pricing');
    }
    const model = await this.modelsService.update(id, body);
    return ModelResponseDto.fromEntity(model);
  }

  @Patch(':id/pricing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update model pricing' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ModelResponseDto })
  async updatePricing(
    @Param('id') id: string,
    @Body() body: UpdateModelPricingDto,
  ) {
    const model = await this.modelsService.update(id, {
      pricing: body.pricing,
    });
    return ModelResponseDto.fromEntity(model);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a model' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: ModelResponseDto })
  async remove(@Param('id') id: string) {
    const model = await this.modelsService.remove(id);
    return ModelResponseDto.fromEntity(model);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test model connection' })
  @ApiParam({ name: 'id', type: String })
  @ApiOkResponse({ type: TestModelResponseDto })
  async testConnection(@Param('id') id: string) {
    return this.modelsService.testConnection(id);
  }
}
