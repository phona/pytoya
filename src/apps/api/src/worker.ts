import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

const getLogLevels = (level: string): LogLevel[] => {
  switch (level.toLowerCase()) {
    case 'error':
      return ['error'];
    case 'warn':
      return ['error', 'warn'];
    case 'info':
      return ['error', 'warn', 'log'];
    case 'debug':
      return ['error', 'warn', 'log', 'debug'];
    case 'verbose':
      return ['error', 'warn', 'log', 'debug', 'verbose'];
    default:
      return ['error', 'warn', 'log'];
  }
};

async function bootstrapWorker() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const config = app.get(ConfigService);

  const logLevel = config.get<string>('server.logLevel') ?? 'info';
  const logLevels = getLogLevels(logLevel);
  app.useLogger(logLevels);
  Logger.overrideLogger(logLevels);

  Logger.log('Worker started (no HTTP listener)', 'WorkerBootstrap');

  await new Promise<void>((resolve) => {
    process.on('SIGINT', resolve);
    process.on('SIGTERM', resolve);
  });

  await app.close();
}

if (require.main === module) {
  void bootstrapWorker();
}

