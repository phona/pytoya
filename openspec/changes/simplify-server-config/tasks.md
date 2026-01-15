# Tasks: Simplify Server Configuration

- [ ] Update `app.config.ts` default config structure
- [ ] Update `env.validation.ts` ServerConfig class to include logLevel
- [ ] Remove LoggingConfig class from env.validation.ts
- [ ] Update main.ts to read server.logLevel instead of logging.levels
- [ ] Update main.ts bootstrap to read server.port and pass to app.listen()
- [ ] Remove nodeEnv usage from data-source.ts
- [ ] Update Helm configmap.yaml template
- [ ] Update config.yaml example file
- [ ] Test API startup with new config structure
- [ ] Run tests to ensure no regressions
