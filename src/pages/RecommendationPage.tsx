import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { TopNav } from '@/components/TopNav';
import { StepIndicator } from '@/components/StepIndicator';
import { ProgressRing } from '@/components/ProgressRing';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, BookOpen, Target, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecommendationPage() {
  const { assessments, user } = useAppStore();
  const navigate = useNavigate();
  const latest = assessments[assessments.length - 1];

  useEffect(() => {
    if (!user || !latest) navigate('/courses');
  }, [user, latest, navigate]);

  if (!latest || !user) return null;

  const overallScore = latest.examScore;
  const proficiencyScore = latest.proficiency === 'Advanced' ? 90 : latest.proficiency === 'Intermediate' ? 68 : 35;
  const proficiencyColor = latest.proficiency === 'Advanced' ? 'hsl(142 71% 45%)' : latest.proficiency === 'Intermediate' ? 'hsl(38 92% 50%)' : 'hsl(230 65% 55%)';

  const steps = [
    { label: 'Course', completed: true, active: false },
    { label: 'Videos', completed: true, active: false },
    { label: 'Quiz', completed: true, active: false },
    { label: 'Results', completed: false, active: true },
    { label: 'Dashboard', completed: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container max-w-3xl py-8">
        <div className="mb-8"><StepIndicator steps={steps} /></div>

        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Your Results</h1>
          <p className="mt-2 text-muted-foreground">Your quiz score and auto-tracked video watch time are combined.</p>
        </div>

        <div className="mt-8 grid gap-6 stagger-children">
          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ProgressRing value={proficiencyScore} size={100} strokeWidth={8} color={proficiencyColor} label="Proficiency" />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{latest.course} · {latest.level}</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold">{latest.proficiency}</h2>
                <div className="mt-3 flex flex-wrap gap-4 justify-center sm:justify-start text-sm text-muted-foreground">
                  <span>Quiz: <span className="font-semibold text-foreground">{latest.quizScore}</span></span>
                  <span>Video hrs: <span className="font-semibold text-foreground">{Number(latest.timeSpent).toFixed(2)}</span></span>
                  <span>Overall: <span className="font-semibold text-foreground">{overallScore}</span></span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">AI Recommendation</p>
                <h3 className="mt-1 text-lg font-semibold">Next: {latest.recommendedCourse}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{latest.studyPlan}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Assessment Details</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              {[
                ['Education', latest.educationLevel],
                ['Learning Style', latest.learningStyle],
                ['Age', String(latest.age)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-muted-foreground">{label}</p>
                  <p className="mt-0.5 font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">What the score means</h3>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The dashboard uses your video hours and quiz result together. More watched content helps, but the quiz still controls most of the signal.
            </p>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <Button onClick={() => navigate('/dashboard')} className="h-11 gap-2 px-6">
            Go to Dashboard <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/courses')} className="h-11">
            Take Another
          </Button>
        </div>
      </div>
    </div>
  );
}
