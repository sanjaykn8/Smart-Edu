import type { Assessment } from './store';

export type QuizQuestion = {
  id: number;
  category: string;
  difficulty: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
};

export type QuizSubmissionAnswer = {
  questionId: number;
  selectedOption: string;
};

export type QuizSubmissionPayload = {
  userEmail: string;
  username: string;
  course: string;
  level: string;
  videoHours: number;
  answers: QuizSubmissionAnswer[];
};

export type QuizSubmissionResponse = {
  assessment: Assessment;
  correctCount: number;
  totalQuestions: number;
  quizScore: number;
  overallScore: number;
  videoScore: number;
};

function apiUrl(path: string): string {
  return path.startsWith('/api') ? path : `/api${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      if (typeof data?.error === 'string') message = data.error;
    } catch {
      // ignore body parsing failures
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function fetchQuizQuestions(course: string, level: string): Promise<QuizQuestion[]> {
  const qs = new URLSearchParams({ category: course, difficulty: level, limit: '5' });
  return request<QuizQuestion[]>(`/quizzes?${qs.toString()}`);
}

export async function submitAssessment(payload: QuizSubmissionPayload): Promise<QuizSubmissionResponse> {
  return request<QuizSubmissionResponse>('/assessments/submit', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAssessments(email: string): Promise<Assessment[]> {
  const qs = new URLSearchParams({ email });
  return request<Assessment[]>(`/assessments?${qs.toString()}`);
}
