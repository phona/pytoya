## 1. Backend (API)
- [x] 1.1 Add `ChangePasswordDto` with validation (currentPassword, newPassword)
- [x] 1.2 Add `AuthService.changePassword(currentUser, dto)` (verify current password, hash new password, persist)
- [x] 1.3 Add `POST /api/auth/change-password` (JWT-protected) endpoint
- [x] 1.4 Add Jest tests for success + wrong current password + weak new password

## 2. Frontend (Web)
- [x] 2.1 Add API client helper for `POST /auth/change-password`
- [x] 2.2 Add `ProfilePage` route under dashboard/protected layout
- [x] 2.3 Add “Change password” form with confirm field + i18n strings
- [x] 2.4 Add navigation entry for Profile page
- [x] 2.5 Update MSW handlers + add Vitest page test

## 3. Validation
- [x] 3.1 Run `npm run test`
- [x] 3.2 Run `npm run lint`
- [x] 3.3 Run `npm run type-check`
