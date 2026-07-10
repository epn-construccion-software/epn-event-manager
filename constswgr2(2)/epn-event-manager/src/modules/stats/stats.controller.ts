import { Controller, Get, Logger } from '@nestjs/common';
import { EventsService } from '../events/events.service';

@Controller('stats')
export class StatsController {
  private readonly logger = new Logger(StatsController.name);

  constructor(private readonly eventsService: EventsService) {}

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
    return this.eventsService.getStats();
  }
}
