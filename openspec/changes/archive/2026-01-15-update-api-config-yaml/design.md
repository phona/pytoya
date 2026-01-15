## Context
The API currently loads configuration exclusively from `.env` via `ConfigModule.forRoot`, while helper scripts and Helm manage values elsewhere. We need a single API config file at `src/apps/api/config.yaml` that can be mounted in Kubernetes and used by CLI/migration jobs, while retaining `.env` as a fallback for existing workflows.

## Goals / Non-Goals
- Goals:
  - Prefer `src/apps/api/config.yaml` for API runtime configuration.
  - Keep `.env` as a fallback when `config.yaml` is missing.
  - Keep CLI/migration jobs aligned with the same config source.
  - Update dev k8s dependency helper to write configuration into `config.yaml`.
- Non-Goals:
  - Replace frontend configuration or add a global config system across apps.
  - Remove `.env` entirely or change secret management strategies.

## Decisions
- Decision: Add a YAML loader that feeds `ConfigModule` with config values, with precedence over `.env`.
- Decision: Use the same loader for the TypeORM CLI data source so migration jobs read the same values.
- Decision: Render `src/apps/api/config.yaml` from Helm values into a ConfigMap and mount it into the API deployment.
- Alternatives considered:
  - Use only `.env` (rejected; does not meet requirement).
  - Replace `.env` entirely (rejected; breaking and not requested).

## Risks / Trade-offs
- Risk: Divergence between `config.yaml` and `.env` values.
  - Mitigation: Define precedence order clearly and update scripts to target `config.yaml`.

## Migration Plan
1. Introduce YAML config loader and update precedence order.
2. Update env validation to include YAML-loaded values.
3. Update TypeORM CLI data source to read from the same config loader.
4. Render `config.yaml` from Helm values into a ConfigMap.
5. Mount the ConfigMap into the API deployment.
6. Update dev k8s helper script to write values into `config.yaml`.

## Open Questions
- None.
