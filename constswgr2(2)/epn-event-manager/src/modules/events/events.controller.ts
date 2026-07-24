import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventFiltersDto } from './dto/event-filters.dto';

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Post()
  registerEvent(@Body() dto: CreateEventDto) {
    this.logger.log(
      JSON.stringify({
        context: EventsController.name,
        operation: 'registerEvent',
        action: dto.action,
        source: dto.source,
        entity: dto.entity,
        status: 'received',
        message: 'Event registration request received',
      }),
    );
    return this.eventsService.registerEvent(dto);
  }

  @Get()
  findAll(@Query() filters: EventFiltersDto = {}) {
    this.logger.log(
      JSON.stringify({
        context: EventsController.name,
        operation: 'findAll',
        filters,
        status: 'received',
        message: 'Find all events request received',
      }),
    );
    return this.eventsService.findAll(filters);
  }

  @Get('source/:source')
  findBySource(@Param('source') source: string) {
    this.logger.log(
      JSON.stringify({
        context: EventsController.name,
        operation: 'findBySource',
        source,
        status: 'received',
        message: 'Find events by source request received',
      }),
    );
    return this.eventsService.findBySource(source);
  }

  @Get('entity/:entity')
  findByEntity(@Param('entity') entity: string) {
    this.logger.log(
      JSON.stringify({
        context: EventsController.name,
        operation: 'findByEntity',
        entity,
        status: 'received',
        message: 'Find events by entity request received',
      }),
    );
    return this.eventsService.findByEntity(entity);
  }
}
