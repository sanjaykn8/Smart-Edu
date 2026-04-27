import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { fetchAssessments } from '@/lib/api';
import { TopNav } from '@/components/TopNav';
import { MetricCard } from '@/components/MetricCard';
import { ProgressBar } from '@/components/ProgressBar';
import { ProgressRing } from '@/components/ProgressRing';
import { Hash, Award, Clock, TrendingUp, Sparkles, BookOpen, ArrowRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user, assessments, setAssessments } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    let alive = true;
    fetchAssessments(user.email)
      .then((rows) => {
        if (alive && rows.length > 0) {
          setAssessments(rows);
        }
      })
      .catch(() => {
        // Keep the local persisted state if the API is unavailable.
      });

    return () => {
      alive = false;
    };
  }, [user, navigate, setAssessments]);

  if (!user) return null;

  const attempts = assessments.length;
  const avgQuiz = attempts ? Math.round(assessments.reduce((s, a) => s + a.quizScore, 0) / attempts) : 0;
  const avgOverall = attempts ? Math.round(assessments.reduce((s, a) => s + a.examScore, 0) / attempts) : 0;
  const avgHours = attempts ? (assessments.reduce((s, a) => s + a.timeSpent, 0) / attempts).toFixed(1) : '0';

  const profCounts = assessments.reduce((acc, a) => {
    acc[a.proficiency] = (acc[a.proficiency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dominant = Object.entries(profCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const latest = assessments[assessments.length - 1];
  const streak = Math.min(attempts, 7);

  const courseBreakdown = assessments.reduce((acc, a) => {
    if (!acc[a.course]) acc[a.course] = { total: 0, quizSum: 0, overallSum: 0 };
    acc[a.course].total++;
    acc[a.course].quizSum += a.quizScore;
    acc[a.course].overallSum += a.examScore;
    return acc;
  }, {} as Record<string, { total: number; quizSum: number; overallSum: number }>);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container max-w-6xl py-8">
        <div className="animate-fade-in rounded-2xl border bg-card p-6 sm:p-8 shadow-soft">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Learning Dashboard</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight">
                Good to see you, {user.username}.
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">Your quiz performance and video study time, updated in one place.</p>
            </div>
            <Button onClick={() => navigate('/courses')} className="h-10 gap-2 shrink-0">
              New Assessment <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <MetricCard icon={Hash} label="Attempts" value={attempts} subtitle="Total assessments" />
          <MetricCard icon={Award} label="Avg Quiz" value={avgQuiz} subtitle="Out of 100" />
          <MetricCard icon={Clock} label="Avg Hours" value={avgHours} subtitle="Auto-tracked hours" />
          <MetricCard icon={Flame} label="Streak" value={`${streak} day${streak !== 1 ? 's' : ''}`} subtitle="Keep it up!" />
        </div>

        {latest && (
          <div className="mt-6 animate-slide-up rounded-xl border border-success/20 bg-success/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-success shrink-0" />
              <p className="text-sm">
                Latest: <span className="font-semibold">{latest.proficiency}</span> · Next recommended: <span className="font-semibold">{latest.recommendedCourse}</span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-soft animate-fade-in">
            <h3 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> Latest Assessment
            </h3>
            {latest ? (
              <div className="mt-4 space-y-3 text-sm">
                {[
                  ['Course', latest.course],
                  ['Level', latest.level],
                  ['Quiz Score', `${latest.quizScore}`],
                  ['Overall Score', `${latest.examScore}`],
                  ['Recommended', latest.recommendedCourse],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={cn(
                      'font-medium',
                      label === 'Overall Score' && latest.examScore >= 80 && 'text-success',
                      label === 'Overall Score' && latest.examScore >= 60 && latest.examScore < 80 && 'text-warning',
                      label === 'Overall Score' && latest.examScore < 60 && 'text-primary',
                    )}>{value}</span>
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-muted-foreground text-xs mb-1">Study Plan</p>
                  <p className="text-sm leading-relaxed">{latest.studyPlan}</p>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No assessment yet. Complete one to generate a record.
              </div>
            )}
          </div>

          <div className="lg:col-span-3 rounded-xl border bg-card p-6 shadow-soft animate-fade-in">
            <h3 className="font-semibold mb-4">Progress by Course</h3>
            {Object.keys(courseBreakdown).length > 0 ? (
              <div className="space-y-5">
                {Object.entries(courseBreakdown).map(([course, data]) => {
                  const avgScore = Math.round((data.quizSum + data.overallSum) / (data.total * 2));
                  return (
                    <div key={course}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">{course}</span>
                        <span className="text-muted-foreground">{avgScore}% avg · {data.total} attempt{data.total > 1 ? 's' : ''}</span>
                      </div>
                      <ProgressBar value={avgScore} variant={avgScore >= 75 ? 'success' : avgScore >= 50 ? 'warning' : 'primary'} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Complete assessments to see your course progress.
              </div>
            )}
          </div>
        </div>

        {assessments.length > 0 && (
          <div className="mt-6 rounded-xl border bg-card p-6 shadow-soft animate-fade-in">
            <h3 className="font-semibold mb-4">Assessment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Course</th>
                    <th className="pb-3 font-medium text-muted-foreground">Level</th>
                    <th className="pb-3 font-medium text-muted-foreground">Quiz</th>
                    <th className="pb-3 font-medium text-muted-foreground">Hours</th>
                    <th className="pb-3 font-medium text-muted-foreground">Overall</th>
                    <th className="pb-3 font-medium text-muted-foreground">Proficiency</th>
                    <th className="pb-3 font-medium text-muted-foreground">Recommended</th>
                  </tr>
                </thead>
                <tbody>
                  {[...assessments].reverse().map((a) => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                      <td className="py-3 font-medium">{a.course}</td>
                      <td className="py-3">{a.level}</td>
                      <td className="py-3">{a.quizScore}</td>
                      <td className="py-3">{Number(a.timeSpent).toFixed(2)}</td>
                      <td className="py-3">{a.examScore}</td>
                      <td className="py-3">
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                          a.proficiency === 'Advanced' && 'bg-success/10 text-success',
                          a.proficiency === 'Intermediate' && 'bg-warning/10 text-warning',
                          a.proficiency === 'Beginner' && 'bg-primary/10 text-primary',
                        )}>
                          {a.proficiency}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">{a.recommendedCourse}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 grid sm:grid-cols-3 gap-4 stagger-children">
          <div className="rounded-xl border bg-card p-5 shadow-soft text-center">
            <ProgressRing value={avgQuiz} size={72} strokeWidth={6} label="Quiz Avg" />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-soft text-center">
            <ProgressRing value={avgOverall} size={72} strokeWidth={6} color="hsl(var(--success))" label="Overall Avg" />
          </div>
          <div className="rounded-xl border bg-card p-5 shadow-soft text-center">
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Dominant Level</p>
              <p className="mt-2 text-2xl font-bold">{dominant}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
