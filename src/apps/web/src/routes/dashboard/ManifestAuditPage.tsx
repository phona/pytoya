import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AuditPanel } from '@/shared/components/manifests/AuditPanel';

type LocationState = {
  allManifestIds?: number[];
};

export function ManifestAuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const projectId = Number(params.id);
  const groupId = Number(params.groupId);
  const manifestId = Number(params.manifestId);

  const state = (location.state ?? {}) as LocationState;
  const allManifestIds = Array.isArray(state.allManifestIds) && state.allManifestIds.length > 0
    ? state.allManifestIds
    : [manifestId];

  if (!Number.isFinite(projectId) || !Number.isFinite(groupId) || !Number.isFinite(manifestId)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AuditPanel
          projectId={projectId}
          manifestId={manifestId}
          onClose={() => navigate(`/projects/${projectId}/groups/${groupId}/manifests`)}
          allManifestIds={allManifestIds}
        />
      </div>
    </div>
  );
}
