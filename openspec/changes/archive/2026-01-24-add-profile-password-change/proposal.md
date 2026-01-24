## Why

Users need a self-service way to update their password without admin intervention.

Today:
- The API supports login and profile fetch, but has no authenticated password-change endpoint.
- The web app has no profile page or password-change form.

## What Changes

- Add an authenticated API endpoint for changing the current user’s password (requires current password).
- Add a web “Profile” page with a “Change password” form.
- Add navigation entry to reach the Profile page from the dashboard.

## UX Flow

Entry points:
- Sidebar navigation includes a `Profile` item.
- Direct navigation to `/profile` is supported (protected route).

Happy path:
1) User navigates to `/profile`
2) Page shows current `username` + `role` (read-only)
3) User fills Change Password form:
   - current password
   - new password
   - confirm new password
4) User clicks Save
5) UI shows success feedback and clears password fields (user remains signed in)

Error handling:
- Wrong current password → show inline error on current password field (no password details echoed).
- New password fails policy → show inline error on new password field (policy hint text).
- Network/server error → show user-friendly generic error + allow retry.

## Non-Goals

- Password reset via email/OTP
- Admin changing other users’ passwords
- Forcing logout on password change

## Impact

- **Security**: Reduces password sharing and encourages rotation; endpoint validates current password and enforces password policy.
- **UX**: Users can update password without leaving the app.
- **Compatibility**: No breaking changes to existing endpoints; new routes only.
