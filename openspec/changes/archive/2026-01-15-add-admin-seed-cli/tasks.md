## 1. Implementation
- [x] 1.1 Add `nest-commander` dependency to the API workspace
- [x] 1.2 Create CLI bootstrap entrypoint and module for command execution
- [x] 1.3 Add `serve` command to start the API service using the existing bootstrap flow
- [x] 1.4 Add `newadmin` command that uses `ConfigService` and `UsersService` to create admin if missing
- [x] 1.5 Remove startup seeding from API bootstrap once CLI is available
- [x] 1.6 Update env/docs usage notes for running the CLI commands

## 2. Validation
- [x] 2.1 Add unit tests for the seed command (create-only behavior)
- [x] 2.2 Update or add a smoke test (manual or scripted) describing the CLI invocation
  - Example: `npm run cli -- newadmin` (requires `ADMIN_USERNAME`/`ADMIN_PASSWORD`)
  - Example: `npm run cli -- serve`
