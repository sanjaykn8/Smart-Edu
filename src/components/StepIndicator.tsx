import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  completed: boolean;
  active: boolean;
}

interface StepIndicatorProps {
  steps: Step[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300',
            step.completed && 'bg-primary text-primary-foreground',
            step.active && !step.completed && 'bg-primary/15 text-primary ring-2 ring-primary/30',
            !step.active && !step.completed && 'bg-secondary text-muted-foreground',
          )}>
            {step.completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span className={cn(
            'hidden sm:inline text-xs font-medium transition-colors',
            step.active ? 'text-foreground' : 'text-muted-foreground',
          )}>
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className={cn(
              'h-px w-8 transition-colors',
              step.completed ? 'bg-primary' : 'bg-border',
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
