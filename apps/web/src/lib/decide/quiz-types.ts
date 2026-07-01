/** Tipos compartidos del quiz/trivia en el frontend (contrato camelCase con la API). */

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const QUIZ_CATEGORIES = [
  'FUTBOL',
  'PELICULAS_SERIES',
  'MUSICA',
  'GEOGRAFIA',
  'HISTORIA',
  'CIENCIA',
  'RANDOM',
] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

export const QUIZ_LEVELS = ['FACIL', 'MEDIO', 'DIFICIL', 'IMPOSIBLE'] as const;
export type QuizLevel = (typeof QUIZ_LEVELS)[number];

/** Origen de las preguntas: IA, banco del servidor, o banco local offline. */
export type QuizSource = 'ai' | 'fallback' | 'offline';
