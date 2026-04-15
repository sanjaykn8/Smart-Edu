import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  variant?: 'primary' | 'success' | 'warning';
}

export function ProgressBar({ value, max = 100, className, variant = 'primary' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const colors = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
  };

  return (
    <div className={cn('h-2 w-full rounded-full bg-secondary', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-1000 ease-out animate-progress-fill', colors[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
