## 1. Implementation
- [x] 1.1 Add API config loader to read `src/apps/api/config.yaml`.
- [x] 1.2 Update env validation to support YAML-derived config values.
- [x] 1.3 Update TypeORM CLI data source to read config via the same loader.
- [x] 1.4 Render `src/apps/api/config.yaml` from Helm values into a ConfigMap.
- [x] 1.5 Mount the ConfigMap into the API deployment and ensure the API reads it first.
- [x] 1.6 Update dev k8s helper script to write NodePort values into `config.yaml`.
- [x] 1.7 Update docs for API configuration precedence and file location.

## 2. Validation
- [x] 2.1 Run backend unit tests covering config load behavior.
- [x] 2.2 Run any script linting or smoke checks if defined.
- [x] 2.3 Validate Helm template rendering for config.yaml (e.g., helm template).
- [x] 2.4 Validate TypeORM migration job uses YAML-derived values.
