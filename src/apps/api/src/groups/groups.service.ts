import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GroupEntity } from '../entities/group.entity';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { UserEntity } from '../entities/user.entity';
import { ProjectOwnershipException } from '../projects/exceptions/project-ownership.exception';
import { ProjectsService } from '../projects/projects.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupCounts } from './dto/group-response.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupNotFoundException } from './exceptions/group-not-found.exception';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(ManifestEntity)
    private readonly manifestRepository: Repository<ManifestEntity>,
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

  async findByProjectWithCounts(
    user: UserEntity,
    projectId: number,
  ): Promise<Array<{ group: GroupEntity; counts: GroupCounts }>> {
    await this.projectsService.findOne(user, projectId);

    const groups = await this.groupRepository.find({
      where: { projectId },
    });

    if (groups.length === 0) {
      return [];
    }

    const groupIds = groups.map((group) => group.id);
    const rawCounts = await this.manifestRepository
      .createQueryBuilder('manifest')
      .select('manifest.groupId', 'groupId')
      .addSelect('COUNT(manifest.id)', 'totalCount')
      .addSelect(
        'SUM(CASE WHEN manifest.status = :pending THEN 1 ELSE 0 END)',
        'pendingCount',
      )
      .addSelect(
        'SUM(CASE WHEN manifest.status = :failed THEN 1 ELSE 0 END)',
        'failedCount',
      )
      .addSelect(
        'SUM(CASE WHEN manifest.humanVerified = true THEN 1 ELSE 0 END)',
        'verifiedCount',
      )
      .where('manifest.groupId IN (:...groupIds)', { groupIds })
      .setParameters({
        pending: ManifestStatus.PENDING,
        failed: ManifestStatus.FAILED,
      })
      .groupBy('manifest.groupId')
      .getRawMany<{
        groupId: string;
        totalCount: string;
        pendingCount: string;
        failedCount: string;
        verifiedCount: string;
      }>();

    const countsByGroupId = new Map<number, GroupCounts>();
    rawCounts.forEach((row) => {
      const groupId = Number(row.groupId);
      countsByGroupId.set(groupId, {
        manifests: Number(row.totalCount ?? 0),
        status: {
          pending: Number(row.pendingCount ?? 0),
          failed: Number(row.failedCount ?? 0),
          verified: Number(row.verifiedCount ?? 0),
        },
      });
    });

    return groups.map((group) => ({
      group,
      counts: countsByGroupId.get(group.id) ?? {
        manifests: 0,
        status: { pending: 0, failed: 0, verified: 0 },
      },
    }));
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
