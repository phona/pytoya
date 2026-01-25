import { CommandFactory } from 'nest-commander';

import { CliModule } from './cli.module';

async function bootstrap() {
  process.on('unhandledRejection', (reason) => {
    process.stderr.write(`${String(reason)}\n`);
    process.exitCode = 1;
  });

  process.on('uncaughtException', (error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });

  try {
    await CommandFactory.run(CliModule, {
      abortOnError: false,
      logger: ['error', 'warn', 'log'],
      errorHandler: (error) => {
        const message =
          error instanceof Error ? error.stack ?? error.message : String(error);
        process.stderr.write(`${message}\n`);
        process.exitCode = 1;
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

void bootstrap();
