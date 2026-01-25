# Testing Guide

This document describes the testing conventions and best practices for the PyToYa project.

## Table of Contents

- [Overview](#overview)
- [Backend Testing (NestJS)](#backend-testing-nestjs)
- [Frontend Testing (Web)](#frontend-testing-web)
- [Coverage Thresholds](#coverage-thresholds)
- [Running Tests](#running-tests)

## Overview

The project uses **Jest** for backend tests and **Vitest** for frontend tests:

- **Backend**: NestJS Testing Utilities + TypeORM mocks
- **Frontend**: Vitest + React Testing Library + MSW (Mock Service Worker)

This repo also uses **journey-style tests** (SPA flows without a browser):
- They run in Vitest + React Testing Library (jsdom), not Playwright.
- They cover end-to-end UX flows inside the SPA using MSW stubs.
- They are optimized for “business workflows with minimal clicking”.

### Key Principles

1. **Dependency Injection over Monkey Patching**
   - Use NestJS's `overrideProvider()` to mock dependencies
   - Avoid `jest.mock()` for services and repositories

2. **Test User Behavior, Not Implementation Details**
   - Focus on what users see and interact with
   - Avoid testing internal state or implementation specifics

3. **Co-locate Tests with Source**
   - Use `*.spec.ts` suffix for test files
   - Place test files next to the source they test

## Backend Testing (NestJS)

### Test Structure

```
src/
  auth/
    auth.service.ts
    auth.service.spec.ts  <-- Co-located test
    auth.controller.ts
    auth.controller.spec.ts
```

### Workflow/Use-Case Style Tests (No DB / No Queue)

For “business workflow” confidence without real Postgres/BullMQ:
- Use service/controller tests with DI and in-memory/mocked ports.
- Prefer naming these tests with `*.workflow.spec.ts` to make intent obvious.
- Focus assertions on business invariants (duplicate detection, status transitions, cancel semantics, validation gating).

For API “use-case boundary” tests (thin orchestration layer):
- Use-cases live under `src/apps/api/src/usecases/` and are tested with Jest.
- Prefer using test fakes under `src/apps/api/src/test/usecases/` (e.g., `InMemoryJobQueue`) rather than BullMQ/Redis.

### Example: Service Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMockUser, createMockRepository } from '../../test/mocks/factories';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      const registerDto = { email: 'test@example.com', password: 'password123' };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue({
        save: jest.fn().mockResolvedValue({ id: 1, email: registerDto.email }),
      });

      const result = await service.register(registerDto.email, registerDto.password);

      expect(result.email).toBe(registerDto.email);
      expect(result.password).not.toBe(registerDto.password);
    });
  });
});
```

### Example: Controller Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('should register a new user', async () => {
    const registerDto = { email: 'test@example.com', password: 'password123' };

    service.register = jest.fn().mockResolvedValue({
      id: 1,
      email: registerDto.email,
      role: 'user',
    });

    const result = await controller.register(registerDto);

    expect(result).toHaveProperty('user');
    expect(service.register).toHaveBeenCalledWith(registerDto.email, registerDto.password);
  });
});
```

### Test Utilities

Located in `src/apps/api/test/`:

- `helpers.ts` - Module creation helpers, database mocks
- `mocks/factories.ts` - Factory functions for test data

```typescript
import { createMockUser, createMockProject } from '../../test/mocks/factories';

// Create test data with overrides
const user = createMockUser({ email: 'custom@example.com' });
const project = createMockProject({ userId: user.id });
```

## Frontend Testing (Web)

### Test Structure

```
src/routes/
  auth/
    LoginPage.tsx
    LoginPage.test.tsx  <-- Co-located test
src/shared/components/
  Button.tsx
  Button.test.tsx  <-- Co-located test
src/e2e/
  journeys.*.e2e.spec.tsx  <-- SPA journey tests (RTL + MSW)
```

### Journey Tests (SPA flows with MSW)

- Journey tests live under `src/apps/web/src/e2e/` and use the `*.e2e.spec.tsx` suffix.
- Prefer rendering the full router for route/guard coverage via `src/apps/web/src/tests/journey/render-app.tsx`.
- Start MSW with strict unhandled-request behavior using `src/apps/web/src/tests/journey/msw.ts` so missing stubs fail fast.
- Prefer simulating extraction progress via polling endpoints (MSW state machine) and keep websocket mocked except for 1–2 focused tests.
- For multipart uploads, prefer stubbing the API client method (e.g. `manifestsApi.uploadManifestsBatch`) inside the journey test (MSW + jsdom + FormData can be brittle).

### Example: Component Test

```typescript
import { renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('should render login form', () => {
    renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should show validation errors for empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    await user.click(submitButton);

    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
  });

  it('should call login API on form submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });
});
```

### Example: Hook Test

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { server } from '@/tests/mocks/server';
import { http } from 'msw';
import { useProjects } from './use-projects';

describe('useProjects', () => {
  it('should fetch projects', async () => {
    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects.data).toHaveLength(1);
    });
  });

  it('should handle API errors', async () => {
    server.use(
      http.get('/api/projects', () => {
        return new Response(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useProjects());

    await waitFor(() => {
      expect(result.current.projects.error).toBeDefined();
    });
  });
});
```

### Test Utilities

Located in `src/apps/web/src/tests/`:

- `utils.tsx` - Custom render with providers, re-exports RTL
- `setup.ts` - MSW server setup, global polyfills
- `mocks/handlers.ts` - MSW handlers for API endpoints

```typescript
import { renderWithProviders, screen, userEvent } from '@/tests/utils';

// Automatically wraps with QueryClientProvider
renderWithProviders(<MyComponent />);

// Re-exports all React Testing Library methods
screen.getByText('Hello');
screen.findByRole('button', { name: 'Submit' });
```

### MSW (Mock Service Worker)

MSW handlers are defined in `src/apps/web/src/tests/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/projects', () => {
    return HttpResponse.json([
      { id: 1, name: 'Test Project' },
    ]);
  }),
];
```

Override handlers for specific tests:

```typescript
import { server } from '@/tests/mocks/server';

beforeEach(() => {
  server.use(
    http.get('/api/projects', () => {
      return HttpResponse.json([], { status: 404 });
    })
  );
});
```

## Coverage Thresholds

### Backend (NestJS)
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Frontend (Web)
- Branches: 60%
- Functions: 60%
- Lines: 60%
- Statements: 60%

## Running Tests

### Backend

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.service.spec.ts
```

### Frontend

```bash
# Run all tests
npm run test -w @pytoya/web

# Run in watch mode
npm run test:watch -w @pytoya/web

# Run with coverage
npm run test:coverage -w @pytoya/web

# Run specific test file
npm run test -w @pytoya/web -- LoginPage.test.tsx
```

## Best Practices

### DO

- Use dependency injection for mocking services
- Test user behavior and interactions
- Keep tests simple and focused
- Use descriptive test names
- Clean up mocks in `afterEach`

### DON'T

- Use `jest.mock()` for services
- Test implementation details
- Over-mock (only mock external dependencies)
- Write brittle tests that break on refactoring
- Ignore test coverage warnings
