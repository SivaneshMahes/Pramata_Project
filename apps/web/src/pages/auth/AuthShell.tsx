import type { ReactNode } from 'react';
import { Card } from '@/components/common/Card';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 pt-10 pb-16 sm:pt-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-muted">{subtitle}</p>
      <Card className="mt-6 p-5 sm:p-6">{children}</Card>
      <p className="mt-5 text-center text-sm text-muted">{footer}</p>
    </div>
  );
}
