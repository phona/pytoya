import { Progress } from '@/shared/components/ui/progress';
import { cn } from '@/shared/lib/utils';

interface ProgressBarProps {
  progress: number;
  status?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showStatus?: boolean;
}

export function ProgressBar({
  progress,
  status,
  error,
  size = 'md',
  showLabel = true,
  showStatus = true,
}: ProgressBarProps) {
  const height = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const getIndicatorColor = () => {
    if (error || status === 'failed') return 'bg-[color:var(--status-failed-text)]';
    if (status === 'completed' || progress === 100) return 'bg-[color:var(--status-completed-text)]';
    if (status === 'processing') return 'bg-[color:var(--status-processing-text)]';
    if (status === 'pending') return 'bg-[color:var(--status-pending-text)]';
    return 'bg-[color:var(--status-pending-text)]';
  };

  const getStatusText = () => {
    if (error) return error;
    if (status === 'completed' || progress === 100) return 'Completed';
    if (status === 'failed') return 'Failed';
    if (status === 'processing') return `Processing... ${progress}%`;
    if (progress > 0) return `${progress}%`;
    return 'Pending';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className="text-xs font-medium text-foreground">Progress</span>
        )}
        {showStatus && (
          <span className="text-xs text-muted-foreground">{getStatusText()}</span>
        )}
      </div>
      <Progress
        value={Math.min(100, Math.max(0, progress))}
        className={cn(height, 'bg-muted')}
        indicatorClassName={getIndicatorColor()}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      />
      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}




