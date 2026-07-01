import { shuffle } from './random';
import type { QuizCategory, QuizQuestion } from './quiz-types';
import fallbackData from './quiz-fallback.es.json';

interface RawFallback {
  category: string;
  level: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Banco de preguntas de respaldo empaquetado en la app para funcionar sin
 * conexión (≥10 por categoría, en español, el mercado principal). Se usa cuando
 * la API no está disponible.
 */
export function getOfflineQuestions(category: QuizCategory, count: number): QuizQuestion[] {
  const pool = (fallbackData as RawFallback[]).filter((q) => q.category === category);
  return shuffle(pool)
    .slice(0, count)
    .map((q) => ({
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    }));
}
