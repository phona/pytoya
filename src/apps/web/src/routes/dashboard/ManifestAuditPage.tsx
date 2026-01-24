import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuditPanel } from '@/shared/components/manifests/AuditPanel';
import {
  isAuditNavigationContext,
  loadAuditNavigationContext,
} from '@/shared/utils/audit-navigation';
import type { AuditNavigationContext } from '@/shared/utils/audit-navigation';

type LocationState = {
  auditNav?: AuditNavigationContext;
};

export function ManifestAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const manifestId = Number(params.manifestId);

  const state = (location.state ?? {}) as LocationState;
  const restoredNav = useMemo(() => {
    if (isAuditNavigationContext(state.auditNav)) {
      return state.auditNav;
    }
    return loadAuditNavigationContext(projectId, groupId);
  }, [groupId, projectId, state.auditNav]);

  const allManifestIds = useMemo(() => {
    if (restoredNav?.scope === 'selected' && Array.isArray(restoredNav.selectedIds) && restoredNav.selectedIds.length > 0) {
      return restoredNav.selectedIds;
    }
    if (Array.isArray(restoredNav?.pageIds) && restoredNav.pageIds.length > 0) {
      return restoredNav.pageIds;
    }
    return [manifestId];
  }, [manifestId, restoredNav]);

  if (!Number.isFinite(projectId) || !Number.isFinite(groupId) || !Number.isFinite(manifestId)) {
    return null;
  }

  return (
    <div className="h-full min-h-0 w-full bg-background overflow-hidden">
      <AuditPanel
        projectId={projectId}
        groupId={groupId}
        manifestId={manifestId}
        onClose={() => navigate(`/projects/${projectId}/groups/${groupId}/manifests`)}
        allManifestIds={allManifestIds}
        auditNav={restoredNav ?? undefined}
      />
    </div>
  );
}
