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
import { ProjectResponseDto } from './dto/project-response.dto';
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
    const project = await this.projectsService.create(
      user,
      createProjectDto,
    );
    return ProjectResponseDto.fromEntity(project);
  }

  @Get()
  async findAll(@CurrentUser() user: UserEntity) {
    const projects = await this.projectsService.findAll(user);
    return projects.map(ProjectResponseDto.fromEntity);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const project = await this.projectsService.findOne(user, id);
    return ProjectResponseDto.fromEntity(project);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    const project = await this.projectsService.update(
      user,
      id,
      updateProjectDto,
    );
    return ProjectResponseDto.fromEntity(project);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const project = await this.projectsService.remove(user, id);
    return ProjectResponseDto.fromEntity(project);
  }
}
