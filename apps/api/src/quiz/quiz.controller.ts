import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GenerateQuizDto } from './dto/generate-quiz.dto';
import { QuizResult, QuizService } from './quiz.service';

@ApiTags('quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Post()
  // Generar quiz consume IA: límite más estricto que el global.
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Genera preguntas de trivia (IA con fallback a banco local)' })
  @ApiOkResponse({ description: 'Lista de preguntas y origen (ai | fallback)' })
  @ApiServiceUnavailableResponse({ description: 'El servicio de IA no está disponible' })
  generate(@Body() dto: GenerateQuizDto): Promise<QuizResult> {
    return this.quiz.generate(dto);
  }
}
