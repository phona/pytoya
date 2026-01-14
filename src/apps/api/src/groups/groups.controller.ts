import {
  BadRequestException,
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
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('projects/:projectId/groups')
  async create(
    @CurrentUser() user: UserEntity,
    @Param('projectId', ParseIntPipe) projectId: number,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    if (createGroupDto.projectId !== projectId) {
      throw new BadRequestException('projectId mismatch');
    }

    const group = await this.groupsService.create(user, createGroupDto);
    return GroupResponseDto.fromEntity(group);
  }

  @Get('projects/:projectId/groups')
  async findByProject(
    @CurrentUser() user: UserEntity,
    @Param('projectId', ParseIntPipe) projectId: number,
  ) {
    const groups = await this.groupsService.findByProject(user, projectId);
    return groups.map(GroupResponseDto.fromEntity);
  }

  @Get('groups/:id')
  async findOne(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const group = await this.groupsService.findOne(user, id);
    return GroupResponseDto.fromEntity(group);
  }

  @Patch('groups/:id')
  async update(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    const group = await this.groupsService.update(
      user,
      id,
      updateGroupDto,
    );
    return GroupResponseDto.fromEntity(group);
  }

  @Delete('groups/:id')
  async remove(
    @CurrentUser() user: UserEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const group = await this.groupsService.remove(user, id);
    return GroupResponseDto.fromEntity(group);
  }
}
