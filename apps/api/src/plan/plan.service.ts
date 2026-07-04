import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GeneratePlanDto } from './dto/generate-plan.dto';

interface AiActivity {
  title: string;
  place_name: string;
  description: string;
  duration_label: string;
  cost_label: string;
  map_query: string;
}

interface AiPlanResponse {
  intro: string;
  activities: AiActivity[];
  source: 'ai';
  model_used: string | null;
}

export interface PlanActivity {
  title: string;
  placeName: string;
  description: string;
  durationLabel: string;
  costLabel: string;
  mapQuery: string;
}

export interface PlanResult {
  intro: string;
  activities: PlanActivity[];
  source: 'ai';
}

const AI_TIMEOUT_MS = 30_000;

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);
  private readonly aiUrl: string;
  private readonly internalKey: string;

  constructor(config: ConfigService) {
    this.aiUrl = config.get<string>('AI_SERVICE_URL') ?? 'http://ai-service:5000';
    this.internalKey = config.get<string>('INTERNAL_API_KEY') ?? '';
  }

  async generate(dto: GeneratePlanDto): Promise<PlanResult> {
    const hasText = Boolean(dto.locationText && dto.locationText.trim());
    const hasCoords = dto.lat !== undefined && dto.lng !== undefined;
    if (!hasText && !hasCoords) {
      throw new BadRequestException('Indica una ciudad o comparte tu ubicación');
    }
    if (!this.internalKey) {
      throw new ServiceUnavailableException('El servicio de IA no está configurado');
    }

    let response: Response;
    try {
      response = await fetch(`${this.aiUrl}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Key': this.internalKey },
        // El ai-service (Pydantic) usa snake_case: se traduce desde el DTO camelCase.
        body: JSON.stringify({
          location_text: dto.locationText,
          lat: dto.lat,
          lng: dto.lng,
          party_size: dto.partySize,
          category: dto.category,
          budget: dto.budget,
          duration: dto.duration,
          locale: dto.locale,
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.warn(`No se pudo contactar con el ai-service: ${String(error)}`);
      throw new ServiceUnavailableException('No se pudo contactar con el servicio de IA');
    }

    // El ai-service devuelve 503 cuando Gemini no está disponible: se propaga tal cual.
    if (response.status === HttpStatus.SERVICE_UNAVAILABLE) {
      throw new ServiceUnavailableException('El generador de planes no está disponible');
    }
    if (!response.ok) {
      throw new HttpException('No se pudo generar el plan', HttpStatus.BAD_GATEWAY);
    }

    const data = (await response.json()) as AiPlanResponse;
    return {
      intro: data.intro,
      activities: data.activities.map((a) => ({
        title: a.title,
        placeName: a.place_name,
        description: a.description,
        durationLabel: a.duration_label,
        costLabel: a.cost_label,
        mapQuery: a.map_query,
      })),
      source: data.source,
    };
  }
}
