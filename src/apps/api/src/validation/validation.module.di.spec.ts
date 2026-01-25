import { compileDiSmokeTestingModule } from '../test/di-smoke/di-smoke.util';
import { ValidationModule } from './validation.module';
import { ValidationService } from './validation.service';

describe('ValidationModule DI smoke', () => {
  it('compiles and resolves ValidationService', async () => {
    const moduleRef = await compileDiSmokeTestingModule({
      imports: [ValidationModule],
    });

    expect(moduleRef.get(ValidationService)).toBeDefined();
  });
});

