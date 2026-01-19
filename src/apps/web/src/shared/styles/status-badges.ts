import type { Manifest } from '@/api/manifests';

const manifestStatusClasses = {
  completed: 'bg-[color:var(--status-completed-bg)] text-[color:var(--status-completed-text)]',
  pending: 'bg-[color:var(--status-pending-bg)] text-[color:var(--status-pending-text)]',
  processing: 'bg-[color:var(--status-processing-bg)] text-[color:var(--status-processing-text)]',
  failed: 'bg-[color:var(--status-failed-bg)] text-[color:var(--status-failed-text)]',
} as const;

type ManifestStatusKey = keyof typeof manifestStatusClasses;
type StatusBadgeStatus = Manifest['status'] | ManifestStatusKey;

export function getStatusBadgeClasses(status: StatusBadgeStatus): string {
  return manifestStatusClasses[status as ManifestStatusKey];
}

export function getGroupStatusBadgeClasses(status: 'pending' | 'failed' | 'verified'): string {
  const groupStatusClasses = {
    pending: 'bg-[color:var(--status-pending-bg)] text-[color:var(--status-pending-text)]',
    failed: 'bg-[color:var(--status-failed-bg)] text-[color:var(--status-failed-text)]',
    verified: 'bg-[color:var(--status-verified-bg)] text-[color:var(--status-verified-text)]',
  } as const;
  return groupStatusClasses[status];
}




