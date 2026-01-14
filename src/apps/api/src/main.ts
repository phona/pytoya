import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as path from 'path';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  // Set global prefix for all REST controllers
  app.setGlobalPrefix('api');

  // Serve static files outside of /api prefix (must be before any middleware)
  const uploadsPath = path.resolve(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Compatibility middleware: rewrite legacy non-/api paths to /api/*
  // Exclude /uploads and WebSocket paths
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/uploads') || req.path.startsWith('/socket.io/')) {
      return next();
    }
    // If path doesn't start with /api and doesn't have a file extension, rewrite it
    if (!req.path.startsWith('/api') && !path.extname(req.path)) {
      req.url = `/api${req.path}`;
    }
    next();
  });

  await app.listen(3000);
}

void bootstrap();
