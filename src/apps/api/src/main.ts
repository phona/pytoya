import { BadRequestException, ValidationPipe, LogLevel, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import type { ValidationError } from "class-validator";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { SocketIoAdapter } from "./websocket/socket-io.adapter";
import { ERROR_CODES } from "./common/errors/error-codes";
import { enableBasePathRouting } from "./bootstrap/enable-base-path-routing";

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

  const flattenValidationErrors = (
    errors: ValidationError[],
    parentPath = '',
  ): Array<{ path: string; rule: string }> => {
    const details: Array<{ path: string; rule: string }> = [];
    for (const error of errors) {
      const currentPath = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        for (const rule of Object.keys(error.constraints)) {
          details.push({ path: currentPath, rule });
        }
      }

      if (error.children && error.children.length > 0) {
        details.push(...flattenValidationErrors(error.children, currentPath));
      }
    }
    return details;
  };

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) =>
        new BadRequestException({
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Validation failed',
          details: flattenValidationErrors(errors),
        }),
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter(configService));

  enableBasePathRouting(app, configService);

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
