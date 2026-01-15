## 1. Implementation
- [x] 1.1 Add Helm Job template for migrations with pre-install/pre-upgrade hooks
- [x] 1.2 Run the Job using the API image/tag and the TypeORM migration command
- [x] 1.3 Wire Job environment to use the same secrets/config as API
- [x] 1.4 Add values for enabling/disabling the migration Job, backoff limit, and TTL cleanup
- [x] 1.5 Update deployment docs to describe the migration Job flow and failure behavior
- [x] 1.6 Validate with a dry-run Helm render and ensure jobs appear before API deployment
