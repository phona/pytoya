import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { GroupsService } from './groups.service';
import { ProjectsService } from '../projects/projects.service';
import { GroupEntity } from '../entities/group.entity';
import { ManifestEntity } from '../entities/manifest.entity';

describe('GroupsService', () => {
  let service: GroupsService;
  let groupRepository: jest.Mocked<Repository<GroupEntity>>;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let projectsService: { findOne: jest.Mock };

  beforeEach(async () => {
    groupRepository = {
      find: jest.fn(),
    } as any;

    manifestRepository = {
      createQueryBuilder: jest.fn(),
    } as any;

    projectsService = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: getRepositoryToken(GroupEntity), useValue: groupRepository },
        { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepository },
        { provide: ProjectsService, useValue: projectsService },
      ],
    }).compile();

    service = module.get(GroupsService);
  });

  it('includes completed manifest count per group', async () => {
    const user = { id: 1 } as any;
    projectsService.findOne.mockResolvedValue({ id: 7, ownerId: 1 });

    groupRepository.find.mockResolvedValue([
      { id: 10, projectId: 7 } as any,
      { id: 20, projectId: 7 } as any,
    ]);

    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          groupId: '10',
          totalCount: '5',
          pendingCount: '1',
          failedCount: '1',
          completedCount: '3',
          verifiedCount: '2',
        },
      ]),
    };
    (manifestRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

    const result = await service.findByProjectWithCounts(user, 7);

    expect(result).toHaveLength(2);
    const group10 = result.find((row) => row.group.id === 10);
    const group20 = result.find((row) => row.group.id === 20);
    expect(group10?.counts.status.completed).toBe(3);
    expect(group10?.counts.status.pending).toBe(1);
    expect(group10?.counts.status.failed).toBe(1);
    expect(group10?.counts.status.verified).toBe(2);

    expect(group20?.counts.status.completed).toBe(0);
    expect(group20?.counts.manifests).toBe(0);
  });
});

