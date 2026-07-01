import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenerateQuizDto } from './dto/generate-quiz.dto';

interface AiQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface AiQuizResponse {
  questions: AiQuestion[];
  source: 'ai' | 'fallback';
  model_used: string | null;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  source: 'ai' | 'fallback';
}

const AI_TIMEOUT_MS = 30_000;

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);
  private readonly aiUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.aiUrl = config.get<string>('AI_SERVICE_URL') ?? 'http://ai-service:5000';
    this.internalKey = config.get<string>('INTERNAL_API_KEY') ?? '';
  }

  async generate(dto: GenerateQuizDto): Promise<QuizResult> {
    if (!this.internalKey) {
      throw new ServiceUnavailableException('El servicio de IA no está configurado');
    }

    let response: Response;
    try {
      response = await fetch(`${this.aiUrl}/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': this.internalKey },
        body: JSON.stringify(dto),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`No se pudo contactar con el ai-service: ${String(error)}`);
      throw new ServiceUnavailableException('No se pudo contactar con el servicio de IA');
    }

    if (!response.ok) {
      throw new HttpException('No se pudieron generar las preguntas', HttpStatus.BAD_GATEWAY);
    }

    const data = (await response.json()) as AiQuizResponse;
    // Se traduce a camelCase para el frontend (contrato limpio).
    return {
      questions: data.questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation,
      })),
      source: data.source,
    };
  }
}
