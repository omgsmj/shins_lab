export interface Question {
  id: number;
  session: number;
  number: number;
  subject: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface ExamResult {
  score: number;
  isPassed: boolean;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  subjectScores: Record<string, { total: number; correct: number }>;
}