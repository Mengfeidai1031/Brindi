import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, Max, Min } from 'class-validator';

export const QUIZ_CATEGORIES = [
  'FUTBOL',
  'PELICULAS_SERIES',
  'MUSICA',
  'GEOGRAFIA',
  'HISTORIA',
  'CIENCIA',
  'RANDOM',
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
}
