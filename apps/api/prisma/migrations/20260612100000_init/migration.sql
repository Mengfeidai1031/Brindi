-- CreateEnum
CREATE TYPE "AiService" AS ENUM ('OCR_RECEIPT', 'GENERATE_QUIZ', 'GENERATE_PLAN');

-- CreateEnum
CREATE TYPE "QuizCategory" AS ENUM ('FUTBOL', 'PELICULAS_SERIES', 'MUSICA', 'GEOGRAFIA', 'HISTORIA', 'CIENCIA', 'RANDOM');

-- CreateEnum
CREATE TYPE "QuizLevel" AS ENUM ('FACIL', 'MEDIO', 'DIFICIL', 'IMPOSIBLE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "payment_link" TEXT,
    "google_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "service" "AiService" NOT NULL,
    "model_used" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_fallback_questions" (
    "id" TEXT NOT NULL,
    "category" "QuizCategory" NOT NULL,
    "level" "QuizLevel" NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'es',
    "question" TEXT NOT NULL,
    "options_json" JSONB NOT NULL,
    "correct_index" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,

    CONSTRAINT "quiz_fallback_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "ai_usage_service_created_at_idx" ON "ai_usage"("service", "created_at");

-- CreateIndex
CREATE INDEX "quiz_fallback_questions_category_level_locale_idx" ON "quiz_fallback_questions"("category", "level", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_fallback_questions_category_question_key" ON "quiz_fallback_questions"("category", "question");
