import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JobNotFoundException } from '../queue/exceptions/job-not-found.exception';
import { QueueController } from '../queue/queue.controller';
import { QueueService } from '../queue/queue.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('Jobs routing', () => {
  let app: INestApplication;

  const jobsService = {
    getJobById: jest.fn(),
    listJobs: jest.fn(),
    getJobStats: jest.fn(),
  };

  const queueService = {
    getJobHistory: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [JobsController, QueueController],
      providers: [
        { provide: JobsService, useValue: jobsService },
        { provide: QueueService, useValue: queueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes GET /jobs/history to history handler (not /jobs/:id)', async () => {
    jobsService.getJobById.mockImplementation((id: string) => {
      throw new JobNotFoundException(id);
    });

    queueService.getJobHistory.mockResolvedValue([
      {
        id: 1,
        manifestId: 1,
        status: 'completed',
        llmModelId: null,
        promptId: null,
        queueJobId: '123',
        progress: 100,
        estimatedCost: null,
        actualCost: null,
        currency: null,
        error: null,
        attemptCount: 1,
        startedAt: null,
        completedAt: null,
        createdAt: new Date('2026-01-23T00:00:00.000Z'),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get('/jobs/history?limit=100')
      .expect(200);

    expect(queueService.getJobHistory).toHaveBeenCalledWith(undefined, 100);
    expect(jobsService.getJobById).not.toHaveBeenCalled();
    expect(response.body).toHaveLength(1);
  });

  it('routes GET /jobs/:id to JobsController when id is numeric', async () => {
    jobsService.getJobById.mockResolvedValue({
      id: '123',
      status: 'completed',
      progress: 100,
      data: { manifestId: 1 },
      result: undefined,
    });

    const response = await request(app.getHttpServer())
      .get('/jobs/123')
      .expect(200);

    expect(jobsService.getJobById).toHaveBeenCalledWith('123');
    expect(queueService.getJobHistory).not.toHaveBeenCalled();
    expect(response.body.id).toBe('123');
  });
});
