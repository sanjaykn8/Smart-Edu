import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, inferProficiency, recommendCourse } from '@/lib/store';
import { TopNav } from '@/components/TopNav';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';

const EDUCATION_LEVELS = ['High School', 'Undergraduate', 'Postgraduate'];
const LEARNING_STYLES = ['Visual', 'Auditory', 'Kinesthetic', 'Reading/Writing'];

export default function AssessmentPage() {
  const { selectedCourse, selectedLevel, addAssessment, user } = useAppStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    age: '', educationLevel: '', learningStyle: '', timeSpent: '', quizScore: '', examScore: '',
  });

  useEffect(() => {
    if (!user || !selectedCourse) navigate('/courses');
  }, [user, selectedCourse, navigate]);

  if (!selectedCourse || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quiz = Number(form.quizScore);
    const exam = Number(form.examScore);
    const time = Number(form.timeSpent);
    const proficiency = inferProficiency(quiz, exam, time);
    const [rec, plan] = recommendCourse(selectedCourse, proficiency, quiz, exam, time);

    addAssessment({
      id: crypto.randomUUID(),
      course: selectedCourse,
      level: selectedLevel || 'Beginner',
      age: Number(form.age),
      educationLevel: form.educationLevel,
      learningStyle: form.learningStyle,
      timeSpent: time,
      quizScore: quiz,
      examScore: exam,
      proficiency,
      recommendedCourse: rec,
      studyPlan: plan,
      createdAt: new Date().toISOString(),
    });

    navigate('/recommendation');
  };

  const steps = [
    { label: 'Course', completed: true, active: false },
    { label: 'Assessment', completed: false, active: true },
    { label: 'Results', completed: false, active: false },
    { label: 'Dashboard', completed: false, active: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <div className="container max-w-2xl py-8">
        <div className="mb-8"><StepIndicator steps={steps} /></div>

        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold tracking-tight">Assessment</h1>
          <p className="mt-2 text-muted-foreground">
            <span className="font-medium text-foreground">{selectedCourse}</span> · {selectedLevel} · {user.username}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Enter your actual scores. We'll compute your proficiency and recommendation.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Age</Label>
              <Input type="number" min="10" max="100" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label>Education</Label>
              <Select value={form.educationLevel} onValueChange={(v) => setForm({ ...form, educationLevel: v })} required>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Learning style</Label>
              <Select value={form.learningStyle} onValueChange={(v) => setForm({ ...form, learningStyle: v })} required>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {LEARNING_STYLES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Time on videos (hrs)</Label>
              <Input type="number" step="0.1" min="0" value={form.timeSpent} onChange={(e) => setForm({ ...form, timeSpent: e.target.value })} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label>Quiz score</Label>
              <Input type="number" min="0" max="100" value={form.quizScore} onChange={(e) => setForm({ ...form, quizScore: e.target.value })} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label>Final exam score</Label>
              <Input type="number" min="0" max="100" value={form.examScore} onChange={(e) => setForm({ ...form, examScore: e.target.value })} className="h-11" required />
            </div>
          </div>

          <Button type="submit" className="h-11 gap-2 px-6">
            Save assessment <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
