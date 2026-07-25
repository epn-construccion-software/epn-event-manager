import { Controller, Get, Logger } from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats() {
    this.logger.log(
      JSON.stringify({
        context: StatsController.name,
        operation: 'getStats',
        status: 'received',
        message: 'Statistics request received',
      }),
    );

    return this.statsService.getStats();
  }
}
