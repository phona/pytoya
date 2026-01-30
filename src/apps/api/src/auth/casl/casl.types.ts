import type { MongoAbility } from '@casl/ability';

export const APP_ACTIONS = {
  MANAGE: 'manage',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type AppAction = (typeof APP_ACTIONS)[keyof typeof APP_ACTIONS];

export const APP_SUBJECTS = {
  ALL: 'all',
  QUEUE: 'Queue',
  JOB: 'Job',
  EXTRACTOR: 'Extractor',
  SCHEMA: 'Schema',
  VALIDATION_SCRIPT: 'ValidationScript',
} as const;

export type AppSubject = (typeof APP_SUBJECTS)[keyof typeof APP_SUBJECTS];

// Intentionally permissive: we mix string subjects ("Queue") and `subject(...)` objects with conditions.
export type AppAbility = MongoAbility<[AppAction, any]>;
