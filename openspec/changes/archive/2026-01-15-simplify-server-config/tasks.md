# Tasks: Simplify Server Configuration

- [x] Update `app.config.ts` default config structure
- [x] Update `env.validation.ts` ServerConfig class to include logLevel
- [x] Remove LoggingConfig class from env.validation.ts
- [x] Update main.ts to read server.logLevel instead of logging.levels
- [x] Update main.ts bootstrap to read server.port and pass to app.listen()
- [x] Remove nodeEnv usage from data-source.ts
- [x] Update Helm configmap.yaml template
- [x] Update config.yaml example file
- [x] Test API startup with new config structure
- [x] Run tests to ensure no regressions
