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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @CurrentUser() user: UserEntity,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(user, createProjectDto);
  }

  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    return this.projectsService.findAll(user);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectsService.findOne(user, id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(user, id, updateProjectDto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.projectsService.remove(user, id);
  }
}
