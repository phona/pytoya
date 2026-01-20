import { useMemo } from 'react';
import { Pause, Play, Square, X, Zap, FileText, DollarSign } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

interface ExtractionJob {
  id: string;
  manifestId: number;
  manifestName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  cost?: {
    text: number;
    llm: number;
    total: number;
  };
}

interface ExtractionProgressViewProps {
  jobs: ExtractionJob[];
  totalJobs: number;
  onComplete?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  isPaused?: boolean;
  onRunInBackground?: () => void;
  budget?: number;
}

interface SpeedCalculation {
  documentsPerMinute: number;
  eta: string;
  averageTime: number;
}

export function ExtractionProgressView({
  jobs,
  totalJobs,
  onComplete,
  onPause,
  onStop,
  isPaused = false,
  onRunInBackground,
  budget,
}: ExtractionProgressViewProps) {
  // Calculate progress stats
  const stats = useMemo(() => {
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;
    const running = jobs.filter((j) => j.status === 'running').length;
    const pending = jobs.filter((j) => j.status === 'pending').length;

    // Average progress across all jobs
    const totalProgress = jobs.reduce((sum, job) => sum + job.progress, 0);
    const averageProgress = jobs.length > 0 ? totalProgress / jobs.length : 0;

    // Find current job being processed
    const currentJob = jobs.find((j) => j.status === 'running');
    const previousCompleted = jobs.filter((j) => j.status === 'completed').length;

    return {
      completed,
      failed,
      running,
      pending,
      averageProgress,
      currentJob,
      totalCompleted: completed,
      previousCompleted,
    };
  }, [jobs]);

  // Calculate speed and ETA
  const speedInfo = useMemo<SpeedCalculation | null>(() => {
    const completedJobs = jobs.filter((j) => j.status === 'completed' && j.completedAt && j.startedAt);
    if (completedJobs.length < 2) return null;

    // Calculate average time per document
    const totalTime = Date.now() - (completedJobs[0].startedAt?.getTime() || Date.now());
    const averageTime = totalTime / completedJobs.length;

    // Documents per minute
    const documentsPerMinute = (60 * 1000) / averageTime;

    // Estimate time remaining
    const remaining = totalJobs - stats.totalCompleted;
    const eta = remaining * averageTime;

    return {
      documentsPerMinute: Math.round(documentsPerMinute * 10) / 10,
      eta: eta > 0 ? `${Math.ceil(eta / 1000 / 60)}m ${Math.ceil((eta / 1000) % 60)}s` : 'Almost done',
      averageTime: Math.round(averageTime / 1000),
    };
  }, [jobs, totalJobs, stats.totalCompleted]);

  // Accumulated cost from jobs
  const accumulatedCost = useMemo(() => {
    const textCost = jobs.reduce((sum, job) => sum + (job.cost?.text || 0), 0);
    const llmCost = jobs.reduce((sum, job) => sum + (job.cost?.llm || 0), 0);
    return {
      text: textCost,
      llm: llmCost,
      total: textCost + llmCost,
    };
  }, [jobs]);

  // Project total cost
  const projectedTotal = useMemo(() => {
    if (stats.totalCompleted === 0) return null;
    const avgCost = accumulatedCost.total / stats.totalCompleted;
    const projected = avgCost * totalJobs;
    return {
      min: projected * 0.9, // Assume 10% variance
      max: projected * 1.1,
      avg: projected,
    };
  }, [accumulatedCost.total, stats.totalCompleted, totalJobs]);

  // Get currently processed document
  const currentDocument = stats.currentJob?.manifestName || 'Processing...';
  const currentProgress = stats.currentJob?.progress || 0;

  // Calculate percentage complete
  const percentageComplete = Math.round((stats.totalCompleted / totalJobs) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Bulk Extraction in Progress
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onComplete}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {stats.totalCompleted} / {totalJobs} documents ({percentageComplete}%)
            </span>
          </div>
          <Progress value={percentageComplete} className="h-3" />
        </div>

        {/* Current Document */}
        <div className="flex items-center justify-between rounded-md border border-border bg-muted px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Current:</span>
            <span className="ml-2 text-muted-foreground truncate max-w-[200px]">
              {currentDocument}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentProgress.toFixed(0)}%
          </span>
          <Progress value={currentProgress} className="w-24 h-2" />
        </div>

        {/* Speed and ETA */}
        {speedInfo && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Speed:</span>
              <span className="font-medium">{speedInfo.documentsPerMinute} docs/min</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ETA:</span>
              <span className="font-medium">{speedInfo.eta}</span>
            </div>
          </div>
        )}

        {/* Cost Tracker */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Cost Tracker</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Spent so far
            </Badge>
          </div>

          {/* Budget Progress */}
          {budget && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Budget:</span>
                <span className="text-xs font-medium">
                  ${accumulatedCost.total.toFixed(2)} / ${budget.toFixed(2)}
                </span>
              </div>
              <Progress
                value={(accumulatedCost.total / budget) * 100}
                className="h-2"
              />
            </div>
          )}

          {/* Cost Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
            <div className="text-xs text-muted-foreground mb-1">Text</div>
            <div className="font-semibold">${accumulatedCost.text.toFixed(4)}</div>
          </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">LLM</div>
              <div className="font-semibold">${accumulatedCost.llm.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total</div>
              <div className="font-semibold text-lg">${accumulatedCost.total.toFixed(4)}</div>
            </div>
          </div>

          {/* Projected Total */}
          {projectedTotal && (
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Projected total:</span>
                <span className="font-medium">
                  ${projectedTotal.min.toFixed(2)} - ${projectedTotal.max.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Queue */}
        <div>
          <h4 className="text-sm font-medium mb-2">Live Queue</h4>
          <div className="flex flex-wrap gap-2">
            {/* Show recent completed jobs */}
            {jobs.slice(-5).filter((j) => j.status === 'completed').map((job) => (
              <Badge key={job.id} variant="outline" className="bg-emerald-100 text-emerald-800 text-xs">
                ✓ {job.manifestName.slice(0, 15)}...
              </Badge>
            ))}
            {jobs.filter((j) => j.status === 'running').map((job) => (
              <Badge key={job.id} variant="secondary" className="animate-pulse text-xs">
                ⏳ {job.manifestName.slice(0, 15)}...
              </Badge>
            ))}
          </div>
          {jobs.filter((j) => j.status === 'running').length === 0 && (
            <p className="text-xs text-muted-foreground">
              Waiting for jobs to start...
            </p>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            {stats.completed} complete, {stats.failed} failed, {stats.pending} pending
          </div>
          <div className="flex items-center gap-2">
            {onRunInBackground && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRunInBackground}
              >
                Run in Background
              </Button>
            )}
            {isPaused ? (
              <Button size="sm" onClick={onPause}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={onPause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={onStop}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
