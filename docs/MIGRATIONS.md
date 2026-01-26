# Migration Notes

## Split Credentials from Config

### Upgrade Steps
1. Update `src/apps/api/config.yaml` to use environment placeholders (e.g., `{{DB_PASSWORD}}`, `{{JWT_SECRET}}`).
2. Set required environment variables:
   - `DB_PASSWORD`
   - `JWT_SECRET`
3. For Helm deployments, set:
   - `secrets.dbPassword`
   - `secrets.jwtSecret`
4. Deploy and verify the API boots without configuration errors.

### Rollback
- Redeploy the previous application version and restore the prior config file.
- Remove placeholder-based config and re-apply static secrets if needed.

## Security Hardening

### Upgrade Steps
1. Inform users of new password and username requirements for any new accounts.
2. Monitor failed login attempts; lockouts are enabled by default.
3. Use the admin unlock endpoint if a user gets locked:
   - `POST /api/auth/users/:id/unlock`

### Existing Users
- Existing users are not forced to reset passwords automatically.
- Recommend a reset policy if passwords are known to be weak.
- From `src/apps/api`, run `npm run cli -- audit-passwords` to flag users matching a common weak password list.

### Rollback
- Disable `security.accountLockout` and `security.rateLimit` in `src/apps/api/config.yaml` if lockouts/rate limits must be paused.
- For full rollback of password/username policy, deploy the previous release.
