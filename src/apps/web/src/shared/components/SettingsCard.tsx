import { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Card, CardHeader, CardDescription, CardTitle } from '@/shared/components/ui/card';

export type SettingsCardProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  meta?: string;
  onClick?: () => void;
};

export function SettingsCard({ title, description, icon, meta, onClick }: SettingsCardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <Card
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!isInteractive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        'transition-shadow',
        isInteractive && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                {icon}
              </div>
            ) : null}
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="mt-1">{description}</CardDescription>
            </div>
          </div>
          {isInteractive ? (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          ) : null}
        </div>
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </CardHeader>
    </Card>
  );
}




