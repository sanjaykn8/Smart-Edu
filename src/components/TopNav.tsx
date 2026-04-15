import { GraduationCap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';

export function TopNav() {
  const { user, logout } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <div
          className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
          onClick={() => navigate(user ? '/dashboard' : '/')}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold tracking-tight">Smart Edu</span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user && (
            <>
              <span className="hidden sm:inline text-sm text-muted-foreground mr-2">{user.username}</span>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-lg hover:bg-destructive/10 hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
