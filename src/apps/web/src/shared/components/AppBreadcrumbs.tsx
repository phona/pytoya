import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/shared/components/ui/breadcrumb';

export type AppBreadcrumbItem = {
  label: string;
  to?: string;
};

export type AppBreadcrumbsProps = {
  items: AppBreadcrumbItem[];
  className?: string;
};

export function AppBreadcrumbs({ items, className }: AppBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;

  return (
    <Breadcrumb className={cn('flex', className)}>
      <BreadcrumbList>
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {index === lastIndex || !item.to ? (
                <BreadcrumbPage className="max-w-[18rem] truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild className="max-w-[18rem] truncate">
                  <Link to={item.to}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < lastIndex ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

