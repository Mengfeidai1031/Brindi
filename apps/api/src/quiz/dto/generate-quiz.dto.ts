import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

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

export const QUIZ_LEVELS = ['FACIL', 'MEDIO', 'DIFICIL', 'IMPOSIBLE'] as const;

export class GenerateQuizDto {
  @ApiProperty({ enum: QUIZ_CATEGORIES })
  @IsIn(QUIZ_CATEGORIES)
  category!: (typeof QUIZ_CATEGORIES)[number];

  @ApiProperty({ enum: QUIZ_LEVELS })
  @IsIn(QUIZ_LEVELS)
  level!: (typeof QUIZ_LEVELS)[number];

  @ApiProperty({ minimum: 3, maximum: 20, example: 5 })
  @IsInt()
  @Min(3)
  @Max(20)
  count!: number;

  @ApiProperty({ enum: ['es', 'en'], default: 'es' })
  @IsIn(['es', 'en'])
  locale!: string;

  // Tema libre: obligatorio solo cuando category === 'OTROS' (trivia generada por IA).
  @ApiPropertyOptional({ maxLength: 100, description: 'Tema libre, obligatorio si category=OTROS' })
  @ValidateIf((o: GenerateQuizDto) => o.category === 'OTROS')
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  topic?: string;
}
