import { type ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from '@/shared/components/ui/button';

type EmptyStateAction = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
};

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  action?: EmptyStateAction;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('text-center', className)}>
      {Icon ? (
        <Icon
          data-testid="empty-state-icon"
          className="mx-auto h-12 w-12 text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}
      <h3 className="mt-2 text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-6">
          <Button
            type="button"
            onClick={action.onClick}
            variant={action.variant ?? 'default'}
            size={action.size ?? 'default'}
          >
            {action.icon ? (
              <span className="mr-2 inline-flex" aria-hidden="true">
                {action.icon}
              </span>
            ) : null}
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  );
}




