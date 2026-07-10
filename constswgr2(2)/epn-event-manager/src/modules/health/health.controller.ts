import { Controller, Get, Logger } from '@nestjs/common';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  @Get()
  check() {
    this.logger.log(
      JSON.stringify({
        context: HealthController.name,
        operation: 'check',
        status: 'received',
        message: 'Health check request received',
      }),
    );
    // Incidencia preventiva: siempre responde ok sin verificar conectividad real
    return { status: 'ok', timestamp: new Date().toLocaleString() };
  }
}
