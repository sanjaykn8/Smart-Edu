import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/lib/store';
import { TopNav } from '@/components/TopNav';
import { StepIndicator } from '@/components/StepIndicator';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2, PlayCircle, Clock, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// YouTube IFrame API type shim
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  getDuration: () => number;
  destroy: () => void;
  stopVideo: () => void;
}

// ---------------------------------------------------------------------------
// Course video catalog
// Replace these demo video IDs with verified content for your courses.
// Durations shown here are display-only; actual watch time comes from
// player.getDuration() at video completion.
// ---------------------------------------------------------------------------
const COURSE_VIDEOS: Record<
  string,
  { id: string; title: string; channel: string; approxDuration: string }[]
> = {
  'Python Basics': [
    {
      id: 'rfscVS0vtbw',
      title: 'Python for Beginners – Full Course',
      channel: 'freeCodeCamp.org',
      approxDuration: '4h 27m',
    },
    {
      id: 'kqtD5dpn9C8',
      title: 'Python Tutorial for Beginners',
      channel: 'Programming with Mosh',
      approxDuration: '6h 14m',
    },
    {
      id: '_uQrJ0TkZlc',
      title: 'Learn Python – Full Course for Beginners',
      channel: 'freeCodeCamp.org',
      approxDuration: '4h 27m',
    },
  ],
  'Web Development': [
    {
      id: 'PkZNo7MFNFg',
      title: 'JavaScript for Beginners – Full Course',
      channel: 'freeCodeCamp.org',
      approxDuration: '3h 26m',
    },
    {
      id: 'G3e-cpL7ofc',
      title: 'HTML & CSS Full Course for Beginners',
      channel: 'Programming with Mosh',
      approxDuration: '1h 10m',
    },
    {
      id: 'mU6anWqZJcc',
      title: 'HTML & CSS Full Course – Beginner to Pro',
      channel: 'SuperSimpleDev',
      approxDuration: '6h 31m',
    },
  ],
  'Data Science': [
    {
      id: 'ua-CiDNNj30',
      title: 'Data Science Full Course',
      channel: 'Simplilearn',
      approxDuration: '4h',
    },
    {
      id: 'GPVsHOlRBBI',
      title: 'Matplotlib Tutorial (Python Plotting)',
      channel: 'Corey Schafer',
      approxDuration: '1h 2m',
    },
    {
      id: 'vmEHCJofslg',
      title: 'Python for Data Science – Course for Beginners',
      channel: 'freeCodeCamp.org',
      approxDuration: '12h',
    },
  ],
  'Machine Learning': [
    {
      id: 'Gv9_4yMHFhI',
      title: 'Machine Learning Zero to Hero (Part 1)',
      channel: 'TensorFlow',
      approxDuration: '17m',
    },
    {
      id: 'KNAWp2S3w94',
      title: 'Machine Learning for Everybody – Full Course',
      channel: 'freeCodeCamp.org',
      approxDuration: '3h 55m',
    },
    {
      id: 'i_LwzRVP7bg',
      title: 'Machine Learning Crash Course',
      channel: 'Google Developers',
      approxDuration: '15m',
    },
  ],
  Cybersecurity: [
    {
      id: 'aM4vezN9KWw',
      title: 'Cyber Security Tutorial for Beginners',
      channel: 'Simplilearn',
      approxDuration: '4h',
    },
    {
      id: 'hXSFdwIIsXc',
      title: 'Cybersecurity Full Course for Beginners',
      channel: 'Hacking Simplified',
      approxDuration: '5h',
    },
    {
      id: 'PlxWf493en4',
      title: 'Ethical Hacking Full Course',
      channel: 'freeCodeCamp.org',
      approxDuration: '15h',
    },
  ],
};

// ---------------------------------------------------------------------------
// Utility: format seconds as "Xh Ym" or "Ym Xs"
// ---------------------------------------------------------------------------
function formatSeconds(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---------------------------------------------------------------------------
// Ensure the YouTube IFrame API script is loaded exactly once
// ---------------------------------------------------------------------------
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = resolve;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  });
  return ytApiPromise;
}

// ---------------------------------------------------------------------------
// YouTubePlayer component
// Mounts an IFrame Player for a single videoId. Calls onEnded(durationSeconds)
// when the video reaches its natural end.
// ---------------------------------------------------------------------------
interface YouTubePlayerProps {
  videoId: string;
  onEnded: (durationSeconds: number) => void;
}

function YouTubePlayer({ videoId, onEnded }: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    let destroyed = false;

    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          fs: 1,
        },
        events: {
          onStateChange(e) {
            // YT.PlayerState.ENDED === 0
            if (e.data === 0) {
              const dur = playerRef.current?.getDuration() ?? 0;
              onEnded(dur);
            }
          },
        },
      });
    });

    return () => {
      destroyed = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // ignore
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div className="w-full overflow-hidden rounded-xl bg-black shadow-elevated">
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// VideosPage
// ---------------------------------------------------------------------------
export default function VideosPage() {
  const { selectedCourse, selectedLevel, user, addVideoHours } = useAppStore();
  const navigate = useNavigate();

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [watchedIds, setWatchedIds] = useState<Set<string>>(new Set());
  const [totalSeconds, setTotalSeconds] = useState(0);

  // Guard: must be logged in and have a course selected
  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (!selectedCourse) { navigate('/courses'); return; }
  }, [user, selectedCourse, navigate]);

  const videos = selectedCourse ? (COURSE_VIDEOS[selectedCourse] ?? []) : [];

  const handleVideoEnded = useCallback(
    (videoId: string, durationSeconds: number) => {
      setWatchedIds((prev) => {
        if (prev.has(videoId)) return prev;           // already counted
        const next = new Set(prev);
        next.add(videoId);
        return next;
      });
      setTotalSeconds((prev) => {
        // Only add time for a video the first time it ends
        if (!watchedIds.has(videoId)) {
          return prev + durationSeconds;
        }
        return prev;
      });
      // Close the player after completion so the user sees the ✓ badge
      setActiveVideoId(null);
    },
    [watchedIds]
  );

  const handleContinue = () => {
    // Persist accumulated watch time to the global store (hours, 4 dp)
    addVideoHours(totalSeconds);
    navigate('/assessment');
  };

  if (!selectedCourse || !user) return null;

  const watchedCount = watchedIds.size;
  const totalHours = totalSeconds / 3600;

  const steps = [
    { label: 'Course', completed: true, active: false },
    { label: 'Videos', completed: false, active: true },
    { label: 'Quiz', completed: false, active: false },
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

        {/* Header */}
        <div className="animate-fade-in">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Video Learning
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{selectedCourse}</h1>
          <p className="mt-2 text-muted-foreground">
            {selectedLevel} · {user.username}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Watch the videos below. Your watch time is recorded automatically when each video finishes.
            Then continue to the quiz.
          </p>
        </div>

        {/* Progress summary bar */}
        <div className="mt-6 flex items-center gap-6 rounded-xl border bg-card p-4 shadow-soft">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{watchedCount}</span>
            <span className="text-muted-foreground">/ {videos.length} watched</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{formatSeconds(totalSeconds)}</span>
            <span className="text-muted-foreground">recorded</span>
          </div>
          {watchedCount > 0 && (
            <span className="ml-auto text-xs font-medium text-success">
              {(totalHours).toFixed(2)}h banked ✓
            </span>
          )}
        </div>

        {/* Video list */}
        <div className="mt-6 space-y-4">
          {videos.map((video) => {
            const isWatched = watchedIds.has(video.id);
            const isActive = activeVideoId === video.id;

            return (
              <div
                key={video.id}
                className={cn(
                  'rounded-xl border bg-card shadow-soft transition-all duration-200',
                  isActive && 'border-primary/30 shadow-medium'
                )}
              >
                {/* Card header */}
                <div className="flex items-center gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                    {!isWatched && !isActive && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlayCircle className="h-8 w-8 text-white/90" />
                      </div>
                    )}
                    {isWatched && (
                      <div className="absolute inset-0 flex items-center justify-center bg-success/60">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold leading-snug line-clamp-2">{video.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{video.channel}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {video.approxDuration}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {isWatched ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Done
                      </span>
                    ) : isActive ? (
                      <button
                        onClick={() => setActiveVideoId(null)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
                      >
                        Close
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveVideoId(video.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <PlayCircle className="h-3.5 w-3.5" />
                        Watch
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline player (shown when this card is active) */}
                {isActive && (
                  <div className="px-4 pb-4">
                    <YouTubePlayer
                      videoId={video.id}
                      onEnded={(dur) => handleVideoEnded(video.id, dur)}
                    />
                    <p className="mt-3 text-xs text-muted-foreground text-center">
                      Watch until the end — your time is recorded automatically when the video finishes.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Continue button */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            onClick={handleContinue}
            className="h-11 gap-2 px-6"
          >
            Continue to Quiz
            <ArrowRight className="h-4 w-4" />
          </Button>
          {watchedCount === 0 && (
            <p className="text-sm text-muted-foreground">
              You can skip directly to the quiz, but watch time boosts your score.
            </p>
          )}
          {watchedCount > 0 && watchedCount < videos.length && (
            <p className="text-sm text-muted-foreground">
              {videos.length - watchedCount} more video{videos.length - watchedCount > 1 ? 's' : ''} available — each adds to your score.
            </p>
          )}
          {watchedCount === videos.length && (
            <p className="text-sm text-success font-medium">
              All videos completed! Your full watch time is banked.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
