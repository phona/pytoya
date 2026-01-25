## Context
We need fast tests that catch NestJS dependency-injection wiring mistakes that only show up when compiling the real module graph (e.g., missing `TypeOrmModule.forFeature(...)` entries).

## Goals / Non-Goals
- Goals:
  - Compile real Nest modules in tests.
  - Fail when any injected provider token is missing.
  - Avoid Postgres/Redis/network dependencies in these tests.
- Non-Goals:
  - Validate database schema, migrations, or query correctness.
  - Run HTTP/e2e.

## Decision: DB-less TypeORM repository resolution
### Decision
Stub the TypeORM `DataSource` token so `@nestjs/typeorm` repository providers can be constructed without opening a real connection.

### Rationale
`TypeOrmModule.forFeature([Entity])` registers repository providers whose factory calls `dataSource.getRepository(Entity)`.
If we provide a fake `DataSource` with `getRepository`, Nest can build providers and therefore detect missing repository tokens, without connecting to a database.

### Alternatives considered
- Use a real SQLite/in-memory database:
  - Pros: “more realistic”
  - Cons: adds an external runtime dependency and slows tests; also doesn’t match Postgres behavior
- Use `TypeOrmModule.forRootAsync` with a dummy config:
  - Cons: still attempts to initialize a connection

## Test Architecture

### Structure
- Add a small helper (e.g., `createDiSmokeModule({ imports, overrides })`) that:
  - builds `Test.createTestingModule({ imports, providers: [fakeDataSource] })`
  - optionally applies `overrideProvider()` for modules requiring config tokens

### What gets asserted
- `compile()` succeeds
- `moduleRef.get(ServiceUnderTest)` succeeds

### Failure mode (desired)
If a service injects `@InjectRepository(Entity)` but the module forgets `TypeOrmModule.forFeature([Entity])`,
`compile()` fails with `UnknownDependenciesException`, making the problem obvious in CI.

## Risks / Trade-offs
- Some modules may execute code in constructors that requires env/config; mitigate with explicit provider overrides in the smoke test.
- Stubbing `DataSource` means tests won’t detect database-level failures (by design).

