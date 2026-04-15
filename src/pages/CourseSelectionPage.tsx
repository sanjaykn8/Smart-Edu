import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { TopNav } from '@/components/TopNav';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/ui/button';
import { Code2, Globe, BarChart3, Brain, Shield, ArrowRight, Users, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const COURSES = [
  { name: 'Python Basics', icon: Code2, color: 'text-blue-500', bg: 'bg-blue-500/10', students: 2840, hours: 24, level: 'Beginner-friendly' },
  { name: 'Web Development', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10', students: 1920, hours: 36, level: 'All levels' },
  { name: 'Data Science', icon: BarChart3, color: 'text-amber-500', bg: 'bg-amber-500/10', students: 1560, hours: 40, level: 'Intermediate+' },
  { name: 'Machine Learning', icon: Brain, color: 'text-violet-500', bg: 'bg-violet-500/10', students: 980, hours: 48, level: 'Advanced' },
  { name: 'Cybersecurity', icon: Shield, color: 'text-rose-500', bg: 'bg-rose-500/10', students: 1240, hours: 32, level: 'Intermediate+' },
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export default function CourseSelectionPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [level, setLevel] = useState<string>('Beginner');
  const { user, selectCourse } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const handleContinue = () => {
    if (selected) {
      selectCourse(selected, level);
      navigate('/assessment');
    }
  };

  const steps = [
    { label: 'Course', completed: false, active: true },
    { label: 'Assessment', completed: false, active: false },
    { label: 'Results', completed: false, active: false },
    { label: 'Dashboard', completed: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <StepIndicator steps={steps} />
        </div>

        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Choose your course</h1>
          <p className="mt-2 text-muted-foreground">Select a subject and difficulty level to begin your assessment.</p>
        </div>

        <div className="mt-8 grid gap-3 stagger-children">
          {COURSES.map((course) => (
            <button
              key={course.name}
              onClick={() => setSelected(course.name)}
              className={cn(
                'flex items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200',
                'hover:shadow-medium hover:-translate-y-0.5',
                selected === course.name
                  ? 'border-primary bg-primary/5 shadow-medium'
                  : 'bg-card border-border'
              )}
            >
              <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', course.bg)}>
                <course.icon className={cn('h-5 w-5', course.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{course.name}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.students.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{course.hours}h</span>
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{course.level}</span>
                </div>
              </div>
              <div className={cn(
                'h-5 w-5 rounded-full border-2 transition-all duration-200',
                selected === course.name ? 'border-primary bg-primary' : 'border-border',
              )}>
                {selected === course.name && (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium mb-3">Difficulty level</p>
          <div className="flex gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200',
                  level === l
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-accent',
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={handleContinue}
            disabled={!selected}
            className="h-11 gap-2 px-6"
          >
            Continue to Assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
