import { useParams } from 'react-router-dom';
import { CorrectionPanel } from '@/shared/components/manifests/CorrectionPanel';

export function CorrectionPage() {
  const { id, groupId, manifestId } = useParams();

  const projectId = Number(id);
  const groupIdNum = Number(groupId);
  const manifestIdNum = Number(manifestId);

  if (!Number.isFinite(projectId) || !Number.isFinite(groupIdNum) || !Number.isFinite(manifestIdNum)) {
    return null;
  }

  return (
    <div className="h-full min-h-0 w-full bg-background overflow-hidden">
      <CorrectionPanel
        projectId={projectId}
        groupId={groupIdNum}
        manifestId={manifestIdNum}
      />
    </div>
  );
}
