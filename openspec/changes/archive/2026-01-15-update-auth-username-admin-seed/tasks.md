## 1. Implementation
- [x] 1.1 Add username column to User entity and create migration to replace email requirement (no user data migration)
- [x] 1.2 Update auth DTOs/services/controllers to use username for login and registration
- [x] 1.3 Update web auth forms, hooks, and auth store user model to use username
- [x] 1.4 Add startup admin seed using ADMIN_USERNAME and ADMIN_PASSWORD if no admin exists
- [x] 1.5 Document that admin seed runs on API startup and skips if admin exists
- [x] 1.6 Add validation and logs for missing admin env vars
- [x] 1.7 Note that admin seed uses create-only behavior (does not update existing admin)
- [x] 1.8 Update tests for auth flows and seeding
- [x] 1.9 Update docs/env examples for new auth credentials

## 2. Validation
- [x] 2.1 Run API unit tests for auth/users modules
- [x] 2.2 Run web unit tests for auth pages/hooks
