import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  @ApiOkResponse({ description: 'API y base de datos operativas' })
  @ApiServiceUnavailableResponse({ description: 'La base de datos no responde' })
  async check(): Promise<{ status: string; db: string; uptimeSeconds: number }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // Sin detalles internos en la respuesta (no filtrar información).
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
    return { status: 'ok', db: 'up', uptimeSeconds: Math.round(process.uptime()) };
  }
}
