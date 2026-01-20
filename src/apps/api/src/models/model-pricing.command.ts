import { Command, CommandRunner } from 'nest-commander';
import { Logger } from '@nestjs/common';

import { ModelsService } from './models.service';

@Command({
  name: 'seed-model-pricing',
  description: 'Seed default pricing for existing models',
})
export class SeedModelPricingCommand extends CommandRunner {
  private readonly logger = new Logger(SeedModelPricingCommand.name);

  constructor(private readonly modelsService: ModelsService) {
    super();
  }

  async run(): Promise<void> {
    const result = await this.modelsService.seedDefaultPricing();
    this.logger.log(
      `Model pricing seed complete: ${result.updated} updated, ${result.skipped} skipped`,
    );
  }
}
