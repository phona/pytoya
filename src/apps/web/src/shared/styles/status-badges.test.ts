import { describe, expect, it } from 'vitest';
import type { Manifest } from '@/api/manifests';
import { getGroupStatusBadgeClasses, getStatusBadgeClasses } from './status-badges';

describe('getStatusBadgeClasses', () => {
  it('returns expected classes for each manifest status', () => {
    expect(getStatusBadgeClasses('completed' as Manifest['status'])).toContain('--status-completed-bg');
    expect(getStatusBadgeClasses('completed' as Manifest['status'])).toContain('--status-completed-text');
    expect(getStatusBadgeClasses('pending' as Manifest['status'])).toContain('--status-pending-bg');
    expect(getStatusBadgeClasses('pending' as Manifest['status'])).toContain('--status-pending-text');
    expect(getStatusBadgeClasses('processing' as Manifest['status'])).toContain('--status-processing-bg');
    expect(getStatusBadgeClasses('processing' as Manifest['status'])).toContain('--status-processing-text');
    expect(getStatusBadgeClasses('failed' as Manifest['status'])).toContain('--status-failed-bg');
    expect(getStatusBadgeClasses('failed' as Manifest['status'])).toContain('--status-failed-text');
  });

  it('returns expected classes for group status counts', () => {
    expect(getGroupStatusBadgeClasses('pending')).toContain('--status-pending-bg');
    expect(getGroupStatusBadgeClasses('failed')).toContain('--status-failed-text');
    expect(getGroupStatusBadgeClasses('verified')).toContain('--status-verified-bg');
  });
});




