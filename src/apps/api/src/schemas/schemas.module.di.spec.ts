import { LlmModule } from '../llm/llm.module';
import { compileDiSmokeTestingModule } from '../test/di-smoke/di-smoke.util';
import { SchemasModule } from './schemas.module';
import { SchemasService } from './schemas.service';

describe('SchemasModule DI smoke', () => {
  it('compiles and resolves SchemasService', async () => {
    const moduleRef = await compileDiSmokeTestingModule({
      imports: [LlmModule, SchemasModule],
    });

    expect(moduleRef.get(SchemasService)).toBeDefined();
  });
});

