import { Command, CommandRunner } from 'nest-commander';

import { createApp } from '../main';

@Command({ name: 'serve', description: 'Start the API service' })
export class ServeCommand extends CommandRunner {
  async run(): Promise<void> {
    const app = await createApp();
    await app.listen(3000);

    await new Promise<void>((resolve) => {
      process.on('SIGINT', resolve);
      process.on('SIGTERM', resolve);
    });

    await app.close();
  }
}
