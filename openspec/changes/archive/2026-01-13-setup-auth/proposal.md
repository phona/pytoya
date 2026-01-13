# Change: Authentication & Authorization

## Why
Application needs secure user authentication and role-based access control (Admin/User) to protect API endpoints and manage resource permissions.

## What Changes
- Create auth module in NestJS with JWT strategy
- Implement user registration and login APIs
- Create JWT guard for protected routes
- Implement role-based access control (admin/user)
- Create login page in Next.js frontend
- Implement auth hooks and state management in frontend

## Impact
- Affected specs: New authentication capability
- Affected code: API routes, frontend routes
