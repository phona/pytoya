import { ValidationPipe, LogLevel, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as express from "express";
import * as path from "path";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { SocketIoAdapter } from "./websocket/socket-io.adapter";

function getLogLevels(level: string): LogLevel[] {
  switch (level.toLowerCase()) {
    case "error":
      return ["error"];
    case "warn":
      return ["error", "warn"];
    case "info":
      return ["error", "warn", "log"];
    case "debug":
      return ["error", "warn", "log", "debug"];
    case "verbose":
      return ["error", "warn", "log", "debug", "verbose"];
    default:
      return ["error", "warn", "log"];
  }
}

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logLevel = config.get<string>('server.logLevel') ?? "info";
  const logLevels = getLogLevels(logLevel);
  app.useLogger(logLevels);
  Logger.overrideLogger(logLevels);

  const configService = app.get(ConfigService);
  app.useWebSocketAdapter(new SocketIoAdapter(app, configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  // Set global prefix for all REST controllers
  app.setGlobalPrefix("api");

  // Serve static files outside of /api prefix (must be before any middleware)
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Compatibility middleware: rewrite legacy non-/api paths to /api/*
  // Exclude /uploads and WebSocket paths
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/uploads") || req.path.startsWith("/socket.io/")) {
      return next();
    }
    // If path doesn't start with /api and doesn't have a file extension, rewrite it
    if (!req.path.startsWith("/api") && !path.extname(req.path)) {
      req.url = `/api${req.path}`;
    }
    next();
  });

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('server.port') ?? 3000;
  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
