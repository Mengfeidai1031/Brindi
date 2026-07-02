import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const PLAN_CATEGORIES = [
  'COMIDA',
  'COPAS',
  'CULTURA',
  'AIRE_LIBRE',
  'FIESTA',
  'TRANQUILO',
  'SORPRESA',
] as const;

export const PLAN_BUDGETS = ['BAJO', 'MEDIO', 'ALTO'] as const;
export const PLAN_DURATIONS = ['UN_RATO', 'MEDIA_JORNADA', 'DIA_COMPLETO', 'NOCHE'] as const;

export class GeneratePlanDto {
  @ApiPropertyOptional({ description: 'Ciudad o zona en texto libre' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  locationText?: string;

  @ApiPropertyOptional({ description: 'Latitud (geolocalización)' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitud (geolocalización)' })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiProperty({ minimum: 1, maximum: 50, example: 4 })
  @IsInt()
  @Min(1)
  @Max(50)
  partySize!: number;

  @ApiProperty({ enum: PLAN_CATEGORIES })
  @IsIn(PLAN_CATEGORIES)
  category!: (typeof PLAN_CATEGORIES)[number];

  @ApiProperty({ enum: PLAN_BUDGETS })
  @IsIn(PLAN_BUDGETS)
  budget!: (typeof PLAN_BUDGETS)[number];

  @ApiProperty({ enum: PLAN_DURATIONS })
  @IsIn(PLAN_DURATIONS)
  duration!: (typeof PLAN_DURATIONS)[number];

  @ApiProperty({ enum: ['es', 'en'], default: 'es' })
  @IsIn(['es', 'en'])
  locale!: string;
}
