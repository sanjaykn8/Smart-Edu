import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { fetchQuizQuestions, submitAssessment, type QuizQuestion } from '@/lib/api';
import { TopNav } from '@/components/TopNav';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, RefreshCcw, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AssessmentPage() {
  const { selectedCourse, selectedLevel, addAssessment, user, videoHoursWatched } = useAppStore();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!selectedCourse) {
      navigate('/courses');
      return;
    }
  }, [user, selectedCourse, navigate]);

  useEffect(() => {
    let alive = true;

    async function loadQuiz() {
      if (!selectedCourse || !selectedLevel) return;
      setLoading(true);
      setError('');
      setAnswers({});
      try {
        const data = await fetchQuizQuestions(selectedCourse, selectedLevel);
        if (alive) {
          setQuestions(data);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Could not load quiz questions.');
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadQuiz();
    return () => {
      alive = false;
    };
  }, [selectedCourse, selectedLevel]);

  const allAnswered = useMemo(
    () => questions.length > 0 && questions.every((q) => answers[q.id]),
    [answers, questions]
  );

  if (!selectedCourse || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questions.length || !allAnswered) {
      setError('Answer all 5 questions before submitting.');
      return;
    }

    const quizAnswers = questions.map((q) => ({
      questionId: q.id,
      selectedOption: answers[q.id],
    }));

    setSubmitting(true);
    setError('');

    try {
      const result = await submitAssessment({
        userEmail: user.email,
        username: user.username,
        course: selectedCourse,
        level: selectedLevel || 'Beginner',
        videoHours: videoHoursWatched, // auto-tracked from YouTube videos
        answers: quizAnswers,
      });

      addAssessment(result.assessment);
      navigate('/recommendation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { label: 'Course', completed: true, active: false },
    { label: 'Videos', completed: true, active: false },
    { label: 'Quiz', completed: false, active: true },
    { label: 'Results', completed: false, active: false },
    { label: 'Dashboard', completed: false, active: false },
  ];

  const answeredCount = Object.keys(answers).length;
  const watchedHoursDisplay = videoHoursWatched.toFixed(2);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container max-w-4xl py-8">
        <div className="mb-8"><StepIndicator steps={steps} /></div>

        <div className="animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Quiz</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{selectedCourse}</h1>
          <p className="mt-2 text-muted-foreground">
            {selectedLevel} · {user.username}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer all 5 questions. Your video watch time has already been recorded automatically.
          </p>
        </div>

        {/* Auto-tracked video hours info banner */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border bg-card px-5 py-3 shadow-soft">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm">
            <span className="text-muted-foreground">Video watch time banked: </span>
            <span className="font-semibold">{watchedHoursDisplay}h</span>
            {videoHoursWatched === 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                (no videos watched — <button
                  type="button"
                  onClick={() => navigate('/videos')}
                  className="underline hover:text-foreground"
                >
                  go back to watch
                </button>)
              </span>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="flex justify-end text-sm text-muted-foreground">
            {answeredCount}/{questions.length || 5} answered
          </div>

          {loading ? (
            <div className="rounded-xl border bg-card p-8 text-center shadow-soft">
              <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading quiz questions...</p>
            </div>
          ) : error && questions.length === 0 ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => {
                const selected = answers[q.id];
                const options = [
                  ['A', q.option_a],
                  ['B', q.option_b],
                  ['C', q.option_c],
                  ['D', q.option_d],
                ] as const;

                return (
                  <div key={q.id} className="rounded-xl border bg-card p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Question {index + 1}
                        </p>
                        <h2 className="mt-2 text-base font-semibold leading-relaxed">{q.question}</h2>
                      </div>
                      {selected ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" />
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-2">
                      {options.map(([key, label]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: key }))}
                          className={cn(
                            'flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all duration-200',
                            selected === key
                              ? 'border-primary bg-primary/5 shadow-sm'
                              : 'border-border bg-background hover:border-primary/40 hover:bg-accent/40'
                          )}
                        >
                          <span className="pr-4 leading-relaxed">{label}</span>
                          <span
                            className={cn(
                              'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                              selected === key
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground'
                            )}
                          >
                            {key}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {error && questions.length > 0 ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="h-11 gap-2 px-6" disabled={submitting || loading || !allAnswered}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Submit assessment
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 px-6"
              onClick={() => {
                setAnswers({});
                setError('');
                if (selectedCourse && selectedLevel) {
                  setLoading(true);
                  fetchQuizQuestions(selectedCourse, selectedLevel)
                    .then(setQuestions)
                    .catch((err) => setError(err instanceof Error ? err.message : 'Could not reload quiz.'))
                    .finally(() => setLoading(false));
                }
              }}
            >
              <RefreshCcw className="h-4 w-4" />
              Reload quiz
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
