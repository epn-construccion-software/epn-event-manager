import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(CreateEventEntity)
    private readonly createEventsRepository: Repository<CreateEventEntity>,

    @InjectRepository(UpdateEventEntity)
    private readonly updateEventsRepository: Repository<UpdateEventEntity>,

    @InjectRepository(DeleteEventEntity)
    private readonly deleteEventsRepository: Repository<DeleteEventEntity>,

    @InjectRepository(QueryEventEntity)
    private readonly queryEventsRepository: Repository<QueryEventEntity>,
  ) {}

  async getStats(): Promise<object> {
    this.logger.log(
      JSON.stringify({
        context: StatsService.name,
        operation: 'getStats',
        status: 'query',
        message: 'Retrieving event statistics',
      }),
    );

    const createCount = await this.createEventsRepository.count();
    const updateCount = await this.updateEventsRepository.count();
    const deleteCount = await this.deleteEventsRepository.count();
    const queryCount = await this.queryEventsRepository.count();

    return {
      create: createCount,
      update: updateCount,
      delete: deleteCount,
      query: queryCount,
      total: createCount + updateCount + deleteCount + queryCount,
    };
  }
}
