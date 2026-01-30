import { LlmModule } from '../llm/llm.module';
import { compileDiSmokeTestingModule } from '../test/di-smoke/di-smoke.util';
import { AbilityFactory } from '../auth/casl/ability.factory';
import { SchemasModule } from './schemas.module';
import { SchemasService } from './schemas.service';

describe('SchemasModule DI smoke', () => {
  it('compiles and resolves SchemasService', async () => {
    const moduleRef = await compileDiSmokeTestingModule({
      imports: [LlmModule, SchemasModule],
      providers: [
        {
          provide: AbilityFactory,
          useValue: {
            createForUser: () => ({ can: () => true }),
            subject: (_type: string, payload: Record<string, unknown>) => payload,
          },
        },
      ],
    });

    expect(moduleRef.get(SchemasService)).toBeDefined();
  });
});
