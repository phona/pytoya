import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GroupEntity } from '../entities/group.entity';
import { UserEntity } from '../entities/user.entity';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { ProjectsService } from '../projects/projects.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupNotFoundException } from './exceptions/group-not-found.exception';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    private readonly projectsService: ProjectsService,
  ) {}

  async create(user: UserEntity, input: CreateGroupDto): Promise<GroupEntity> {
    await this.projectsService.findOne(user, input.projectId);
    const group = this.groupRepository.create({
      name: input.name,
      projectId: input.projectId,
    });

    return this.groupRepository.save(group);
  }

  async findByProject(
    user: UserEntity,
    projectId: number,
  ): Promise<GroupEntity[]> {
    await this.projectsService.findOne(user, projectId);

    return this.groupRepository.find({
      where: { projectId },
    });
  }

  async findOne(user: UserEntity, id: number): Promise<GroupEntity> {
    const group = await this.groupRepository.findOne({
      where: { id },
      relations: ['project'],
    });

    if (!group) {
      throw new GroupNotFoundException(id);
    }

    if (group.project.ownerId !== user.id) {
      throw new ProjectOwnershipException(group.projectId);
    }

    return group;
  }

  async update(
    user: UserEntity,
    id: number,
    input: UpdateGroupDto,
  ): Promise<GroupEntity> {
    const group = await this.findOne(user, id);
    Object.assign(group, input);

    return this.groupRepository.save(group);
  }

  async remove(user: UserEntity, id: number): Promise<GroupEntity> {
    const group = await this.findOne(user, id);
    return this.groupRepository.remove(group);
  }
}
