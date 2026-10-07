import { AlertCircle, RotateCw } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface ErrorStateProps {
  error?: unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

/** A friendly failure with a way forward. Never shows raw error output. */
export function ErrorState({
  error,
  title = 'We couldn’t load this',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center rounded-card border border-line bg-surface px-6 py-12 text-center',
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertCircle className="size-5" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onRetry}
          icon={<RotateCw className="size-3.5" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
