import { HttpException, HttpStatus, ValidationPipe, LogLevel, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as express from "express";
import * as path from "path";
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { JwtOrPublicGuard } from "./common/guards/jwt-or-public.guard";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { SocketIoAdapter } from "./websocket/socket-io.adapter";
import { ExecutionContextHost } from "@nestjs/core/helpers/execution-context-host";

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

type CorsConfig = {
  enabled?: boolean;
  allowedOrigins?: string[];
  credentials?: boolean;
  methods?: string[];
  allowedHeaders?: string[];
};

export const buildCorsOptions = (corsConfig?: CorsConfig) => {
  if (!corsConfig?.enabled) {
    return null;
  }

  const allowedOrigins = (corsConfig.allowedOrigins ?? []).filter(
    (origin) => typeof origin === "string" && origin.trim().length > 0,
  );

  return {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: corsConfig.credentials ?? true,
    methods: corsConfig.methods ?? ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: corsConfig.allowedHeaders ?? [
      "Content-Type",
      "Authorization",
    ],
  };
};

export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const logLevel = config.get<string>('server.logLevel') ?? "info";
  const logLevels = getLogLevels(logLevel);
  app.useLogger(logLevels);
  Logger.overrideLogger(logLevels);

  const configService = app.get(ConfigService);
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
      hidePoweredBy: true,
    }),
  );

  const corsConfig = configService.get<CorsConfig>('security.cors');
  const corsOptions = buildCorsOptions(corsConfig);
  if (corsOptions) {
    app.enableCors(corsOptions);
  }

  app.useWebSocketAdapter(new SocketIoAdapter(app, configService));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter(configService));

  // Set global prefix for all REST controllers
  app.setGlobalPrefix("api");

  // Serve static files outside of /api prefix (must be before any middleware)
  const uploadsPath = path.resolve(process.cwd(), "uploads");
  const uploadsGuard = app.get(JwtOrPublicGuard);
  app.use("/uploads", async (req: Request, res: Response, next: NextFunction) => {
    const context = new ExecutionContextHost([req, res]);
    try {
      const allowed = await uploadsGuard.canActivate(context);
      if (allowed) {
        return next();
      }
      return res.sendStatus(HttpStatus.FORBIDDEN);
    } catch (error) {
      const requestId =
        (req as Request & { id?: string }).id ??
        (typeof req.headers["x-request-id"] === "string"
          ? req.headers["x-request-id"]
          : "unknown");
      const status =
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      return res.status(status).json({
        error: {
          code: error instanceof HttpException ? error.name : "INTERNAL_SERVER_ERROR",
          message,
          requestId,
          timestamp: new Date().toISOString(),
          path: req.originalUrl ?? req.url,
        },
      });
    }
  });
  app.use("/uploads", express.static(uploadsPath));

  // Compatibility middleware: rewrite legacy non-/api paths to /api/*
  // Exclude /uploads and WebSocket paths (including namespaced socket.io paths)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isUploads = req.path.startsWith("/uploads");
    const isSocketIo = req.path.startsWith("/socket.io");
    if (isUploads || isSocketIo) {
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
