import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { PlanResult, PlanService } from './plan.service';

@ApiTags('plan')
@Controller('plan')
export class PlanController {
  constructor(private readonly plan: PlanService) {}

  @Post()
  // Generar un plan consume IA: límite estricto.
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({ summary: 'Genera un plan de actividades con IA a partir de ubicación y preferencias' })
  @ApiOkResponse({ description: 'Plan con introducción y 1-3 actividades' })
  @ApiServiceUnavailableResponse({ description: 'El generador de planes no está disponible' })
  generate(@Body() dto: GeneratePlanDto): Promise<PlanResult> {
    return this.plan.generate(dto);
  }
}
