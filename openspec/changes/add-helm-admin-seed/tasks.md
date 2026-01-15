## 1. Implementation
- [x] 1.1 Add `admin.username`/`admin.password` values to Helm values files
- [x] 1.2 Extend chart secrets to include admin credentials when provided
- [x] 1.3 Add Helm hook Job that runs `node dist/cli newadmin` when admin values are set
- [x] 1.4 Document Helm usage for admin seeding

## 2. Validation
- [x] 2.1 `helm template` smoke check with admin values set
- [x] 2.2 Confirm Job renders only when admin values are provided
