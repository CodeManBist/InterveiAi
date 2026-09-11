import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {title}
        </h1>

        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>

      {action}
    </div>
  );
}