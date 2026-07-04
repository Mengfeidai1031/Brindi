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
  'OTROS',
] as const;
export type QuizCategory = (typeof QUIZ_CATEGORIES)[number];

/** Categorías que se sirven del banco local (todas menos el tema libre "Otros"). */
export const QUIZ_PREDEFINED_CATEGORIES = QUIZ_CATEGORIES.filter((c) => c !== 'OTROS');

export const QUIZ_LEVELS = ['FACIL', 'MEDIO', 'DIFICIL', 'IMPOSIBLE'] as const;
export type QuizLevel = (typeof QUIZ_LEVELS)[number];

/** Origen de las preguntas: IA, banco local del servidor, respaldo de IA, o banco offline. */
export type QuizSource = 'ai' | 'local' | 'fallback' | 'offline';
