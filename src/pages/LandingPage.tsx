import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GraduationCap, ArrowRight, Brain, BarChart3, Target } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Smart Edu</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign in</Button>
            <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-4xl py-20 text-center animate-fade-in">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-6">
          <Brain className="h-3 w-3" /> AI-Powered Learning
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
          Learn smarter with<br />personalized paths
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Intelligent assessments, adaptive recommendations, and clear progress tracking — all in one calm, focused workspace.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={() => navigate('/register')} className="h-12 px-6 gap-2 text-sm">
            Start Learning <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/login')} className="h-12 px-6 text-sm">
            Sign In
          </Button>
        </div>

        <div className="mt-20 grid sm:grid-cols-3 gap-6 text-left stagger-children">
          {[
            { icon: Target, title: 'Smart Assessment', desc: 'Evaluate your skills with data-driven assessments that adapt to your level.' },
            { icon: Brain, title: 'AI Recommendations', desc: 'Receive subtle, intelligent guidance on what to learn next based on your performance.' },
            { icon: BarChart3, title: 'Progress Dashboard', desc: 'Track your growth with visual progress meters, streaks, and detailed breakdowns.' },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6 shadow-soft transition-all duration-200 hover:shadow-medium hover:-translate-y-0.5">
              <div className="rounded-lg bg-primary/10 p-2.5 w-fit">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Smart Education · Built for smarter learning paths
      </footer>
    </div>
  );
}
