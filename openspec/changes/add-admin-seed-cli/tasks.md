## 1. Implementation
- [ ] 1.1 Add `nest-commander` dependency to the API workspace
- [ ] 1.2 Create CLI bootstrap entrypoint and module for command execution
- [ ] 1.3 Add `serve` command to start the API service using the existing bootstrap flow
- [ ] 1.4 Add `newadmin` command that uses `ConfigService` and `UsersService` to create admin if missing
- [ ] 1.5 Remove startup seeding from API bootstrap once CLI is available
- [ ] 1.6 Update env/docs usage notes for running the CLI commands

## 2. Validation
- [ ] 2.1 Add unit tests for the seed command (create-only behavior)
- [ ] 2.2 Update or add a smoke test (manual or scripted) describing the CLI invocation
