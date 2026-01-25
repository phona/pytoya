# Change: Add backend DI smoke tests for Nest modules

## Why
We hit runtime-only NestJS DI failures (e.g., missing `TypeOrmModule.forFeature([Entity])` entries) that unit tests did not catch because they mock repository providers or don’t compile the real module graph.

This change adds fast “DI smoke tests” that compile the real Nest modules in Jest and fail immediately when a provider token is missing.

## What Changes
- Add backend DI smoke tests that compile critical Nest modules (starting with `SchemasModule` and `ValidationModule`) and assert their key services can be resolved.
- Keep these tests DB-less by stubbing the TypeORM `DataSource` token used by `@nestjs/typeorm` repository providers.
- Add a small shared test helper so adding new module smoke tests is trivial.
- Run these tests in the normal backend Jest run (and optionally via a dedicated `test:di` script).

## Root Cause (what we’re preventing)
When a service constructor injects a repository…

```ts
constructor(@InjectRepository(SchemaEntity) repo: Repository<SchemaEntity>) {}
```

…Nest can only resolve it if the module context registers the repository token:

```ts
imports: [TypeOrmModule.forFeature([SchemaEntity])]
```

If the entity is missing, the app fails during bootstrap with `UnknownDependenciesException`, but unit tests that override `getRepositoryToken(SchemaEntity)` won’t see the misconfiguration.

## How It Works (high level)

ASCII flow:
```
Runtime: NestFactory.create(AppModule)
  -> resolve module graph
  -> instantiate providers
  -> FAIL if any @InjectRepository token missing

DI smoke test: Test.createTestingModule({ imports: [TargetModule] }).compile()
  -> same provider instantiation step
  -> FAIL early in CI/PR
```

Mermaid:
```mermaid
flowchart TD
  A[Runtime bootstrap] --> B[Resolve module graph]
  B --> C[Instantiate providers]
  C --> D{Missing provider token?}
  D -->|yes| E[UnknownDependenciesException]
  D -->|no| F[App starts]

  T[DI smoke test] --> U[Test.createTestingModule(imports:[TargetModule])]
  U --> V[compile()]
  V --> C
```

## Pseudocode (DB-less compile)
```ts
const fakeDataSource = { getRepository: () => ({}) };

const moduleRef = await Test.createTestingModule({
  imports: [ValidationModule],
  providers: [{ provide: getDataSourceToken(), useValue: fakeDataSource }],
}).compile();

expect(moduleRef.get(ValidationService)).toBeDefined();
```

## Acceptance Criteria
- A missing `TypeOrmModule.forFeature([Entity])` entry for any `@InjectRepository(Entity)` used by `SchemasModule` or `ValidationModule` fails the backend test suite with a clear error.
- DI smoke tests do not connect to Postgres and do not require external services (Redis, OCR, LLM).
- Running DI smoke tests adds minimal runtime (target: < 1s locally).

## Impact
- Affected specs: `testing` (adds a requirement for DI smoke tests).
- Affected code areas (implementation phase): `src/apps/api/src/**` tests and test helpers.
- Risk: Some modules may require env/config during construction; mitigation is to provide test overrides/stubs for those tokens in the smoke-test helper.

## Non-Goals
- Full end-to-end “app boots with real database”.
- Validating query correctness or migrations.
- Replacing existing unit tests.

