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
  timeSpent: number;
  quizScore: number;
  examScore: number;
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
  toggleDarkMode: () => void;
}

function inferProficiency(quiz: number, exam: number, time: number): string {
  const timeFactor = Math.min(Math.max(time / 5, 0), 20);
  const total = 0.45 * Math.min(Math.max(exam, 0), 100) + 0.40 * Math.min(Math.max(quiz, 0), 100) + 0.15 * timeFactor;
  if (total >= 78) return 'Advanced';
  if (total >= 52) return 'Intermediate';
  return 'Beginner';
}

function recommendCourse(course: string, proficiency: string, quiz: number, exam: number, time: number): [string, string] {
  let nextCourse: string;
  let plan: string;

  if (proficiency === 'Beginner') {
    nextCourse = course !== 'Python Basics' ? 'Python Basics' : 'Web Development';
    plan = 'Start with short practice loops, core syntax, and one concept per session.';
  } else if (proficiency === 'Intermediate') {
    nextCourse = exam >= quiz ? 'Data Science' : 'Web Development';
    if (course === 'Data Science') nextCourse = 'Machine Learning';
    plan = 'Push into project work: build, review mistakes, and repeat with tighter feedback.';
  } else {
    nextCourse = exam >= 80 ? 'Machine Learning' : 'Cybersecurity';
    if (course === 'Machine Learning') nextCourse = quiz < 85 ? 'Cybersecurity' : 'Machine Learning';
    plan = 'Work on capstone-level problems and stop studying passively. Build in public.';
  }

  if (time < 2) plan += ' Your study time is too thin — increase it for deeper results.';
  else if (time > 8) plan += ' Good volume, but structure matters more than raw hours.';

  return [nextCourse, plan];
}

export { inferProficiency, recommendCourse };

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
      toggleDarkMode: () => set((state) => {
        const next = !state.darkMode;
        document.documentElement.classList.toggle('dark', next);
        return { darkMode: next };
      }),
    }),
    {
      name: 'smart-edu-store',
      // Only persist user and assessments; selectedCourse/Level are transient
      partialize: (state) => ({
        user: state.user,
        assessments: state.assessments,
        darkMode: state.darkMode,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-apply dark mode class after hydration
        if (state?.darkMode) {
          document.documentElement.classList.add('dark');
        }
      },
    }
  )
);
