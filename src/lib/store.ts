import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  email: string;
  username: string;
}

export interface Assessment {
  id: string;
  course: string;
  level: string;
  age: number;
  educationLevel: string;
  learningStyle: string;
  timeSpent: number; // video hours watched
  quizScore: number;
  examScore: number; // overall score derived from quiz + video hours
  proficiency: string;
  recommendedCourse: string;
  studyPlan: string;
  createdAt: string;
}

interface AppState {
  user: User | null;
  selectedCourse: string | null;
  selectedLevel: string | null;
  assessments: Assessment[];
  darkMode: boolean;
  login: (user: User) => void;
  logout: () => void;
  selectCourse: (course: string, level: string) => void;
  addAssessment: (assessment: Assessment) => void;
  setAssessments: (assessments: Assessment[]) => void;
  toggleDarkMode: () => void;
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function computeOverallScore(quizScore: number, videoHours: number): number {
  const videoScore = clamp(videoHours * 10, 0, 100);
  return Math.round(0.75 * clamp(quizScore, 0, 100) + 0.25 * videoScore);
}

export function inferProficiency(quizScore: number, videoHours: number): string {
  const overall = computeOverallScore(quizScore, videoHours);
  if (overall >= 80) return 'Advanced';
  if (overall >= 60) return 'Intermediate';
  return 'Beginner';
}

export function recommendCourse(course: string, proficiency: string, quizScore: number, videoHours: number): [string, string] {
  const overall = computeOverallScore(quizScore, videoHours);

  if (proficiency === 'Beginner') {
    if (course === 'Python Basics') {
      return ['Python Basics', 'Rebuild the fundamentals with short, deliberate practice. Focus on syntax, repetition, and one concept per session.'];
    }
    return ['Python Basics', 'Reset to fundamentals first. Weak foundations get expensive later.'];
  }

  if (proficiency === 'Intermediate') {
    if (course === 'Python Basics') {
      return ['Web Development', 'You are ready to move from syntax into building. Work through HTML, CSS, and JavaScript with tiny projects.'];
    }
    if (course === 'Web Development') {
      return ['Data Science', 'Move into structured analysis next. Start reading data, cleaning it, and turning it into useful signals.'];
    }
    if (course === 'Data Science') {
      return ['Machine Learning', 'Your next edge is modeling. Start with supervised learning, evaluation, and feature engineering.'];
    }
    return ['Cybersecurity', 'Strengthen practical defense skills while you keep sharpening your technical depth.'];
  }

  if (course === 'Machine Learning') {
    return ['Cybersecurity', 'Go wider and harder: security awareness, hardening, and attack surfaces matter at this stage.'];
  }

  if (course === 'Cybersecurity') {
    return ['Machine Learning', 'You are strong enough to branch into models, evaluation, and automation.'];
  }

  if (overall >= 85) {
    return ['Machine Learning', 'You have enough control to handle advanced model work and bigger technical systems.'];
  }

  return ['Cybersecurity', 'Your execution is strong, but security thinking will make it sharper and more complete.'];
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      selectedCourse: null,
      selectedLevel: null,
      assessments: [],
      darkMode: false,
      login: (user) => set({ user }),
      logout: () => set({ user: null, selectedCourse: null, selectedLevel: null, assessments: [] }),
      selectCourse: (course, level) => set({ selectedCourse: course, selectedLevel: level }),
      addAssessment: (assessment) => set((state) => ({ assessments: [...state.assessments, assessment] })),
      setAssessments: (assessments) => set({ assessments }),
      toggleDarkMode: () =>
        set((state) => {
          const next = !state.darkMode;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', next);
          }
          return { darkMode: next };
        }),
    }),
    {
      name: 'smart-edu-store',
      partialize: (state) => ({
        user: state.user,
        assessments: state.assessments,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.darkMode && typeof document !== 'undefined') {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
