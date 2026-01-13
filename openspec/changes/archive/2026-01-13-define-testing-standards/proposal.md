# Change: Testing Standards & Guidelines

## Why
To ensure long-term maintainability and prevent technical debt, application needs clear testing conventions with dependency injection preference (avoiding monkey patching) and well-structured test files.

## What Changes
- Configure Jest with NestJS testing utilities for backend
- Configure Jest with React Testing Library and Playwright for frontend
- Set up test coverage thresholds (70% backend, 60% frontend)
- Establish test file structure: `*.spec.ts` co-located with source files
- Create shared test utilities and mock factories
- Document testing best practices (DI over monkey patching)
- Create MSW configuration for API mocking in frontend

## Impact
- Affected specs: New testing capability
- Affected code: Test files, configuration files, utilities
