/**
 * Seed de Brindi: carga las preguntas de fallback del quiz de trivia.
 *
 * Idempotente: usa createMany + skipDuplicates apoyándose en la
 * restricción @@unique([category, question]) del schema, de modo que
 * puede ejecutarse en cada arranque del contenedor sin duplicar datos.
 *
 * Se ejecuta:
 *  - En desarrollo: `npm run prisma:seed` (ts-node) o automáticamente
 *    tras `prisma migrate dev`.
 *  - En el contenedor: `node dist/prisma/seed.js` (versión compilada),
 *    invocado por docker-entrypoint.sh.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma, QuizCategory, QuizLevel } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface SeedQuestion {
  category: keyof typeof QuizCategory;
  level: keyof typeof QuizLevel;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const MIN_QUESTIONS_PER_CATEGORY = 10;

function resolveSeedFile(fileName: string): string {
  // Soporta ejecución desde apps/api (dev), desde dist/prisma (compilado
  // dentro del contenedor) y desde rutas relativas al propio archivo.
  const candidates = [
    path.join(process.cwd(), 'prisma', 'seed-data', fileName),
    path.join(__dirname, 'seed-data', fileName),
    path.join(__dirname, '..', '..', 'prisma', 'seed-data', fileName),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error(`No se encontró el archivo de seed "${fileName}". Rutas probadas:\n${candidates.join('\n')}`);
  }
  return found;
}

function validate(questions: SeedQuestion[]): void {
  const perCategory = new Map<string, number>();
  for (const q of questions) {
    if (!(q.category in QuizCategory)) {
      throw new Error(`Categoría desconocida "${q.category}" en: ${q.question}`);
    }
    if (!(q.level in QuizLevel)) {
      throw new Error(`Nivel desconocido "${q.level}" en: ${q.question}`);
    }
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`La pregunta debe tener exactamente 4 opciones: ${q.question}`);
    }
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
      throw new Error(`correctIndex fuera de rango (0-3) en: ${q.question}`);
    }
    if (!q.explanation?.trim()) {
      throw new Error(`Falta la explicación en: ${q.question}`);
    }
    perCategory.set(q.category, (perCategory.get(q.category) ?? 0) + 1);
  }
  for (const category of Object.keys(QuizCategory)) {
    const count = perCategory.get(category) ?? 0;
    if (count < MIN_QUESTIONS_PER_CATEGORY) {
      throw new Error(
        `La categoría ${category} tiene ${count} preguntas; el mínimo requerido es ${MIN_QUESTIONS_PER_CATEGORY}.`,
      );
    }
  }
}

async function main(): Promise<void> {
  const file = resolveSeedFile('quiz-fallback.es.json');
  const questions = JSON.parse(fs.readFileSync(file, 'utf-8')) as SeedQuestion[];

  validate(questions);

  const result = await prisma.quizFallbackQuestion.createMany({
    data: questions.map((q) => ({
      category: QuizCategory[q.category],
      level: QuizLevel[q.level],
      locale: 'es',
      question: q.question,
      optionsJson: q.options as Prisma.InputJsonValue,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
    skipDuplicates: true,
  });

  const total = await prisma.quizFallbackQuestion.count();
  console.log(
    `[seed] Preguntas de fallback: ${result.count} insertadas en esta ejecución, ${total} en total (archivo: ${questions.length}).`,
  );
}

main()
  .catch((error) => {
    console.error('[seed] Error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
