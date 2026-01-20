import { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { useExtractionStore } from '@/shared/stores/extraction';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';

interface ExtractionCostTrackerProps {
  budget?: number;
  onViewDetails?: () => void;
}

interface CostLogEntry {
  timestamp: Date;
  manifestId: number;
  manifestName: string;
  model: string;
  textCost: number;
  llmCost: number;
  totalCost: number;
  status: 'success' | 'partial' | 'failed';
}

export function ExtractionCostTracker({ budget = 50, onViewDetails }: ExtractionCostTrackerProps) {
  const cost = useExtractionStore((state) => state.cost);

  const spent = cost.total;
  const remaining = budget - spent;
  const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;

  const isNearBudget = percentageUsed >= 80 && percentageUsed < 100;
  const isOverBudget = percentageUsed >= 100;

  // Mock cost log data (in production, this would come from a real API)
  const recentLogs = useMemo<CostLogEntry[]>(() => [
    {
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      manifestId: 1,
      manifestName: 'invoice_001.pdf',
      model: 'GPT-4o',
      textCost: 0.003,
      llmCost: 0.067,
      totalCost: 0.07,
      status: 'success',
    },
    {
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
      manifestId: 2,
      manifestName: 'invoice_002.pdf',
      model: 'GPT-4o',
      textCost: 0.003,
      llmCost: 0.047,
      totalCost: 0.05,
      status: 'success',
    },
    {
      timestamp: new Date(Date.now() - 4 * 60 * 1000),
      manifestId: 3,
      manifestName: 'invoice_003.pdf',
      model: 'GPT-4o',
      textCost: 0.003,
      llmCost: 0.087,
      totalCost: 0.09,
      status: 'partial',
    },
  ], []);

  const averageCost = spent > 0 ? spent / recentLogs.length : 0;

  const textPercentage = spent > 0 ? (cost.text / spent) * 100 : 0;
  const llmPercentage = spent > 0 ? (cost.llm / spent) * 100 : 0;

  return (
    <Card className={isOverBudget ? 'border-red-500' : isNearBudget ? 'border-yellow-500' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Tracker
          </CardTitle>
          {onViewDetails && (
            <Button variant="ghost" size="sm" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
        </div>
        <CardDescription>
          Budget: ${budget.toFixed(2)} | {isOverBudget ? 'Over budget' : isNearBudget ? 'Near budget' : 'On track'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Budget Used</span>
            <span className={`text-sm font-semibold ${
              isOverBudget ? 'text-red-600' : isNearBudget ? 'text-yellow-600' : ''
            }`}>
              ${spent.toFixed(2)} / ${budget.toFixed(2)}
            </span>
          </div>
          <Progress
            value={Math.min(percentageUsed, 100)}
            className="h-2"
            {...(isOverBudget ? { color: 'red' } : isNearBudget ? { color: 'yellow' } : {})}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {percentageUsed.toFixed(0)}% used
            </span>
            <span className={`text-xs font-medium ${
              isOverBudget ? 'text-red-600' : ''
            }`}>
              ${remaining.toFixed(2)} remaining
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Total</div>
            <div className="text-lg font-semibold">${spent.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Text</div>
            <div className="flex items-center gap-1">
              <div className="text-lg font-semibold">${cost.text.toFixed(2)}</div>
              <Badge variant="outline" className="text-xs">
                {textPercentage.toFixed(0)}%
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">LLM</div>
            <div className="flex items-center gap-1">
              <div className="text-lg font-semibold">${cost.llm.toFixed(2)}</div>
              <Badge variant="outline" className="text-xs">
                {llmPercentage.toFixed(0)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Average Cost */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">Average per document</span>
          <div className="flex items-center gap-2">
            {averageCost > 0.1 ? (
              <TrendingUp className="h-4 w-4 text-amber-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            )}
            <span className="text-sm font-medium">${averageCost.toFixed(4)}</span>
          </div>
        </div>

        {/* Recent Activity (brief) */}
        {recentLogs.length > 0 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-2">Recent Activity</div>
            <div className="space-y-1">
              {recentLogs.slice(0, 3).map((log) => (
                <div key={`${log.manifestId}-${log.timestamp.getTime()}`} className="flex items-center justify-between text-xs">
                  <span className="truncate flex-1">{log.manifestName}</span>
                  <span className="text-muted-foreground">{log.model}</span>
                  <span className="font-medium">${log.totalCost.toFixed(4)}</span>
                  <Badge
                    variant="outline"
                    className={
                      log.status === 'success'
                        ? 'bg-emerald-100 text-emerald-800 text-xs'
                        : log.status === 'partial'
                        ? 'bg-yellow-100 text-yellow-800 text-xs'
                        : 'bg-red-100 text-red-800 text-xs'
                    }
                  >
                    {log.status === 'success' && '✓'}
                    {log.status === 'partial' && '~'}
                    {log.status === 'failed' && '✗'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
