import { describe, expect, it } from 'vitest';
import { joinBasePath, normalizeBasePath, stripBasePath } from './base-path';

describe('base-path utils', () => {
  it('normalizes base paths', () => {
    expect(normalizeBasePath('')).toBe('');
    expect(normalizeBasePath('/')).toBe('');
    expect(normalizeBasePath('pytoya')).toBe('/pytoya');
    expect(normalizeBasePath('/pytoya/')).toBe('/pytoya');
  });

  it('joins base paths', () => {
    expect(joinBasePath('', '/login')).toBe('/login');
    expect(joinBasePath('/pytoya', '/login')).toBe('/pytoya/login');
    expect(joinBasePath('/pytoya/', 'login')).toBe('/pytoya/login');
  });

  it('strips base path prefix from pathname', () => {
    expect(stripBasePath('', '/projects')).toBe('/projects');
    expect(stripBasePath('/pytoya', '/pytoya/projects')).toBe('/projects');
    expect(stripBasePath('/pytoya', '/pytoya')).toBe('/');
    expect(stripBasePath('/pytoya', '/other')).toBe('/other');
    expect(stripBasePath('/pytoya', 'projects')).toBe('/projects');
  });
});

