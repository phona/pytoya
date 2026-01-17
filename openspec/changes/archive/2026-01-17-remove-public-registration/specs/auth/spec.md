## REMOVED Requirements
### Requirement: User Registration
**Reason**: Public web registration is being removed in favor of CLI-based user management by administrators. User accounts will be created via the CLI `newadmin` command or through the default admin bootstrap process.

**Migration**: Existing users will continue to work. New users must be created by an administrator using the CLI command `npm run cli -- newadmin`.
