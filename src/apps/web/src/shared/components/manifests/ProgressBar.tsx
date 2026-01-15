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

  const getColor = () => {
    if (error) return 'bg-red-500';
    if (status === 'completed' || progress === 100) return 'bg-green-500';
    if (status === 'failed') return 'bg-red-500';
    if (status === 'processing') return 'bg-indigo-500';
    return 'bg-gray-300';
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
          <span className="text-xs font-medium text-gray-700">Progress</span>
        )}
        {showStatus && (
          <span className="text-xs text-gray-600">{getStatusText()}</span>
        )}
      </div>
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${height}`}>
        <div
          className={`${height} ${getColor()} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
