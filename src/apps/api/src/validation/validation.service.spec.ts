import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScriptExecutorService } from './script-executor.service';
import { ValidationService } from './validation.service';
import { ValidationScriptEntity, ValidationSeverity } from '../entities/validation-script.entity';
import { ManifestEntity, ManifestStatus } from '../entities/manifest.entity';
import { ProjectEntity } from '../entities/project.entity';
import { ProviderEntity } from '../entities/provider.entity';
import { UserEntity, UserRole } from '../entities/user.entity';
import { GroupEntity } from '../entities/group.entity';
import { LlmService } from '../llm/llm.service';
import { ValidationScriptNotFoundException } from './exceptions/validation-script-not-found.exception';
import { ManifestNotFoundException } from '../manifests/exceptions/manifest-not-found.exception';

describe('ScriptExecutorService', () => {
  let service: ScriptExecutorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScriptExecutorService],
    }).compile();

    service = module.get<ScriptExecutorService>(ScriptExecutorService);
  });

  describe('validateSyntax', () => {
    it('should validate a correct validation function', () => {
      const validScript = `function validate(extractedData) {
        return [];
      }`;

      const result = service.validateSyntax(validScript);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject a script without a validate function', () => {
      const invalidScript = `function notValidate(extractedData) {
        return [];
      }`;

      const result = service.validateSyntax(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must contain a function named');
    });

    it('should reject a script with syntax errors', () => {
      const invalidScript = `function validate(extractedData) {
        return [;
      }`;

      const result = service.validateSyntax(invalidScript);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept a complex valid script', () => {
      const complexScript = `function validate(extractedData) {
        const issues = [];
        const items = extractedData.items || [];

        for (const [i, item] of items.entries()) {
          if (!item.price) {
            issues.push({
              field: \`items[\${i}].price\`,
              message: 'Price is required',
              severity: 'error',
            });
          }
        }

        return issues;
      }`;

      const result = service.validateSyntax(complexScript);

      expect(result.valid).toBe(true);
    });
  });

  describe('executeScript', () => {
    it('should execute a simple validation script', async () => {
      const script = `function validate(extractedData) {
        const issues = [];

        if (!extractedData.name) {
          issues.push({
            field: 'name',
            message: 'Name is required',
            severity: 'error',
          });
        }

        return issues;
      }`;

      const result = await service.executeScript(script, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        field: 'name',
        message: 'Name is required',
        severity: 'error',
      });
    });

    it('should return empty array when validation passes', async () => {
      const script = `function validate(extractedData) {
        if (extractedData.value > 100) {
          return [{
            field: 'value',
            message: 'Value too large',
            severity: 'warning',
          }];
        }
        return [];
      }`;

      const result = await service.executeScript(script, { value: 50 });

      expect(result).toEqual([]);
    });

    it('should handle complex extracted data structures', async () => {
      const script = `function validate(extractedData) {
        const issues = [];
        const items = extractedData.items || [];

        for (const [i, item] of items.entries()) {
          if (!item.price || item.price <= 0) {
            issues.push({
              field: \`items[\${i}].price\`,
              message: 'Price must be positive',
              severity: 'error',
              actual: item.price,
            });
          }
        }

        return issues;
      }`;

      const data = {
        items: [
          { price: 10, name: 'Item 1' },
          { price: 0, name: 'Item 2' },
          { price: -5, name: 'Item 3' },
        ],
      };

      const result = await service.executeScript(script, data);

      expect(result).toHaveLength(2);
      expect(result[0].field).toBe('items[1].price');
      expect(result[1].field).toBe('items[2].price');
    });

    it('should validate severity values', async () => {
      const invalidScript = `function validate(extractedData) {
        return [{
          field: 'test',
          message: 'test',
          severity: 'invalid',
        }];
      }`;

      await expect(service.executeScript(invalidScript, {})).rejects.toThrow();
    });

    it('should enforce timeout on long-running scripts', async () => {
      const infiniteScript = `function validate(extractedData) {
        while (true) {
          // Infinite loop
        }
        return [];
      }`;

      // The script should timeout after 5 seconds
      // In tests, we want to verify it doesn't hang forever
      const startTime = Date.now();

      try {
        await service.executeScript(infiniteScript, {});
        // If we get here, the timeout didn't work
        expect(true).toBe(false);
      } catch (error) {
        // Expected - timeout or error
        expect(Date.now() - startTime).toBeLessThan(10000); // Should be much less than 10s
      }
    }, 15000);
  });
});

describe('ValidationService', () => {
  let service: ValidationService;
  let validationScriptRepository: jest.Mocked<Repository<ValidationScriptEntity>>;
  let manifestRepository: jest.Mocked<Repository<ManifestEntity>>;
  let projectRepository: jest.Mocked<Repository<ProjectEntity>>;
  let providerRepository: jest.Mocked<Repository<ProviderEntity>>;
  let llmService: jest.Mocked<LlmService>;

  const mockUser: UserEntity = {
    id: 1,
    username: 'test-user',
    password: 'hashed',
    role: UserRole.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    projects: [],
    toJSON() {
      return {
        id: this.id,
        username: this.username,
        role: this.role,
      };
    },
  };

  const mockProject: ProjectEntity = {
    id: 1,
    name: 'Test Project',
    description: null,
    ownerId: 1,
    defaultProviderId: null,
    defaultPromptId: null,
    defaultSchemaId: null,
    owner: mockUser,
    groups: [],
    schemas: [],
    validationScripts: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockManifest: ManifestEntity = {
    id: 1,
    filename: 'test.pdf',
    originalFilename: 'test.pdf',
    storagePath: '/path/to/test.pdf',
    fileSize: 12345,
    fileType: 'pdf' as any,
    status: ManifestStatus.COMPLETED,
    groupId: 1,
    extractedData: { invoice: { total_amount_inc_tax: 100 } },
    confidence: 0.95,
    purchaseOrder: '0000001',
    invoiceDate: new Date(),
    department: 'IT',
    humanVerified: false,
    validationResults: null,
    group: {
      id: 1,
      name: 'Test Group',
      projectId: 1,
      project: mockProject,
      manifests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    jobs: [],
    manifestItems: [],
    extractionHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    validationScriptRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<Repository<ValidationScriptEntity>>;

    manifestRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<Repository<ManifestEntity>>;

    projectRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProjectEntity>>;

    providerRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<ProviderEntity>>;

    llmService = {
      createChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LlmService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        ScriptExecutorService,
        {
          provide: getRepositoryToken(ValidationScriptEntity),
          useValue: validationScriptRepository,
        },
        {
          provide: getRepositoryToken(ManifestEntity),
          useValue: manifestRepository,
        },
        {
          provide: getRepositoryToken(ProjectEntity),
          useValue: projectRepository,
        },
        {
          provide: getRepositoryToken(ProviderEntity),
          useValue: providerRepository,
        },
        {
          provide: LlmService,
          useValue: llmService,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
  });

  describe('create', () => {
    it('should create a validation script', async () => {
      const createDto = {
        name: 'Test Script',
        projectId: '1',
        script: 'function validate(extractedData) { return []; }',
        severity: ValidationSeverity.WARNING,
        enabled: true,
      };

      projectRepository.findOne.mockResolvedValue(mockProject);
      validationScriptRepository.create.mockReturnValue({
        id: 1,
        ...createDto,
        projectId: 1,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      validationScriptRepository.save.mockResolvedValue({ id: 1 } as any);

      const result = await service.create(mockUser, createDto);

      expect(result).toBeDefined();
      expect(validationScriptRepository.create).toHaveBeenCalled();
    });

    it('should throw error if project not found', async () => {
      const createDto = {
        name: 'Test Script',
        projectId: '999',
        script: 'function validate(extractedData) { return []; }',
      };

      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUser, createDto)).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a validation script', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: 'Test',
        projectId: 1,
        script: 'function validate(extractedData) { return []; }',
        severity: ValidationSeverity.WARNING,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      validationScriptRepository.findOne.mockResolvedValue(mockScript);

      const result = await service.findOne(mockUser, 1);

      expect(result).toEqual(mockScript);
    });

    it('should throw ValidationScriptNotFoundException if not found', async () => {
      validationScriptRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUser, 999)).rejects.toThrow(
        ValidationScriptNotFoundException,
      );
    });
  });

  describe('runValidation', () => {
    it('should run validation and return results', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: `function validate(extractedData) {
          return [{
            field: 'test',
            message: 'Test issue',
            severity: 'warning',
          }];
        }`,
        severity: ValidationSeverity.WARNING,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manifestRepository.findOne.mockResolvedValue({
        ...mockManifest,
        group: {
          ...mockManifest.group,
          project: mockProject,
        },
      } as any);
      validationScriptRepository.find.mockResolvedValue([mockScript]);
      manifestRepository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.runValidation(mockUser, { manifestId: 1 });

      expect(result).toBeDefined();
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toMatchObject({
        field: 'test',
        message: 'Test issue',
        severity: 'warning',
      });
      expect(manifestRepository.update).toHaveBeenCalledWith(1, {
        validationResults: expect.any(Object),
      });
    });

    it('should throw error if manifest not found', async () => {
      manifestRepository.findOne.mockResolvedValue(null);

      await expect(
        service.runValidation(mockUser, { manifestId: 999 }),
      ).rejects.toThrow(ManifestNotFoundException);
    });

    it('should throw error if manifest is not completed', async () => {
      manifestRepository.findOne.mockResolvedValue({
        ...mockManifest,
        status: ManifestStatus.PENDING,
      } as any);

      await expect(
        service.runValidation(mockUser, { manifestId: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('runBatchValidation', () => {
    it('should run validation on multiple manifests', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: `function validate(extractedData) {
          const issues = [];
          if (!extractedData.invoice?.total_amount_inc_tax) {
            issues.push({
              field: 'invoice.total_amount_inc_tax',
              message: 'Total amount is required',
              severity: 'error',
            });
          }
          return issues;
        }`,
        severity: ValidationSeverity.ERROR,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockManifests: ManifestEntity[] = [
        {
          ...mockManifest,
          id: 1,
          extractedData: { invoice: { total_amount_inc_tax: 100 } },
        },
        {
          ...mockManifest,
          id: 2,
          extractedData: { invoice: {} },
        },
        {
          ...mockManifest,
          id: 3,
          extractedData: { invoice: { total_amount_inc_tax: 200 } },
        },
      ];

      manifestRepository.findOne.mockImplementation((arg: any) => {
        const id = typeof arg === 'number' ? arg : arg?.where?.id;
        const manifest = mockManifests.find((m) => m.id === id);
        return Promise.resolve(manifest ? {
          ...manifest,
          group: {
            ...mockManifest.group,
            project: mockProject,
          },
        } as any : null);
      });
      validationScriptRepository.find.mockResolvedValue([mockScript]);
      manifestRepository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.runBatchValidation(mockUser, {
        manifestIds: [1, 2, 3],
      });

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      const manifest1 = result.get(1);
      expect(manifest1).toBeDefined();
      expect(manifest1!.issues).toHaveLength(0); // Has total_amount

      const manifest2 = result.get(2);
      expect(manifest2).toBeDefined();
      expect(manifest2!.issues).toHaveLength(1); // Missing total_amount
      expect(manifest2!.issues[0].field).toBe('invoice.total_amount_inc_tax');

      const manifest3 = result.get(3);
      expect(manifest3).toBeDefined();
      expect(manifest3!.issues).toHaveLength(0); // Has total_amount
      expect(manifestRepository.update).toHaveBeenCalledTimes(3);
    });

    it('should continue if one manifest fails validation', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: `function validate(extractedData) {
          return [];
        }`,
        severity: ValidationSeverity.WARNING,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockManifest2 = {
        ...mockManifest,
        id: 2,
        status: ManifestStatus.FAILED, // This will cause validation to fail
      };

      manifestRepository.findOne.mockImplementation((arg: any) => {
        const id = typeof arg === 'number' ? arg : arg?.where?.id;
        if (id === 1) {
          return Promise.resolve({
            ...mockManifest,
            group: { ...mockManifest.group, project: mockProject },
          } as any);
        }
        if (id === 2) {
          return Promise.resolve({
            ...mockManifest2,
            group: { ...mockManifest.group, project: mockProject },
          } as any);
        }
        return Promise.resolve(null);
      });
      validationScriptRepository.find.mockResolvedValue([mockScript]);
      manifestRepository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.runBatchValidation(mockUser, {
        manifestIds: [1, 2],
      });

      // Manifest 1 should succeed, manifest 2 should fail but not crash the batch
      expect(result.size).toBe(1);
      expect(result.get(1)).toBeDefined();
      expect(result.get(2)).toBeUndefined();
    });
  });

  describe('validation results caching', () => {
    it('should cache validation results in manifest', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: `function validate(extractedData) {
          return [{
            field: 'test',
            message: 'Cached issue',
            severity: 'warning',
          }];
        }`,
        severity: ValidationSeverity.WARNING,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manifestRepository.findOne.mockResolvedValue({
        ...mockManifest,
        group: {
          ...mockManifest.group,
          project: mockProject,
        },
      } as any);
      validationScriptRepository.find.mockResolvedValue([mockScript]);
      manifestRepository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      const result = await service.runValidation(mockUser, { manifestId: 1 });

      expect(manifestRepository.update).toHaveBeenCalledWith(1, {
        validationResults: expect.objectContaining({
          issues: expect.any(Array),
          errorCount: expect.any(Number),
          warningCount: expect.any(Number),
          validatedAt: expect.any(String),
        }),
      });

      // Verify the cached result structure
      const cachedResult = manifestRepository.update.mock.calls[0][1]
        .validationResults as any;
      expect(cachedResult.issues).toHaveLength(1);
      expect(cachedResult.issues[0].message).toBe('Cached issue');
      expect(cachedResult.errorCount).toBe(0);
      expect(cachedResult.warningCount).toBe(1);
      expect(cachedResult.validatedAt).toBeDefined();
    });

    it('should overwrite existing cached results on re-validation', async () => {
      const mockScript: ValidationScriptEntity = {
        id: 1,
        name: 'Test Script',
        description: null,
        projectId: 1,
        script: `function validate(extractedData) {
          return [{
            field: 'test',
            message: 'New issue',
            severity: 'error',
          }];
        }`,
        severity: ValidationSeverity.ERROR,
        enabled: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      manifestRepository.findOne.mockResolvedValue({
        ...mockManifest,
        validationResults: {
          issues: [{ field: 'old', message: 'Old issue', severity: 'warning' }],
          errorCount: 0,
          warningCount: 1,
          validatedAt: '2024-01-01T00:00:00.000Z',
        },
        group: {
          ...mockManifest.group,
          project: mockProject,
        },
      } as any);
      validationScriptRepository.find.mockResolvedValue([mockScript]);
      manifestRepository.update.mockResolvedValue({ affected: 1, raw: {} } as any);

      await service.runValidation(mockUser, { manifestId: 1 });

      const newResult = manifestRepository.update.mock.calls[0][1]
        .validationResults as any;
      expect(newResult.issues[0].message).toBe('New issue');
      expect(newResult.issues[0].severity).toBe('error');
      expect(newResult.validatedAt).not.toBe('2024-01-01T00:00:00.000Z');
    });
  });

});
