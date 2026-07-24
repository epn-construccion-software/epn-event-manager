import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import { EventFiltersDto } from './dto/event-filters.dto';
import { LatestEventsQueryDto } from './dto/latest-events-query.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

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

  async registerEvent(dto: CreateEventDto): Promise<{ ok: boolean }> {
    const action = (dto.action ?? '').toUpperCase();
    const serializedPayload = JSON.stringify(dto.payload ?? {});
    // Fecha guardada en formato local, no UTC (debilidad intencional)
    const capturedAt = new Date().toLocaleString();

    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'registerEvent',
        action,
        source: dto.source,
        entity: dto.entity,
        status: 'attempt',
        message: 'Attempting to register event',
      }),
    );

    if (action === 'CREATE') {
      const createEventRecord = this.createEventsRepository.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: serializedPayload,
        recorded_at: capturedAt,
      });
      await this.createEventsRepository.save(createEventRecord);
      this.logger.log(
        JSON.stringify({
          context: EventsService.name,
          operation: 'registerEvent',
          action,
          source: dto.source,
          entity: dto.entity,
          status: 'success',
          message: 'Event saved successfully',
        }),
      );
      return { ok: true };
    }

    if (action === 'UPDATE') {
      const updateEventRecord = this.updateEventsRepository.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: serializedPayload,
        timestamp: capturedAt,
      });
      await this.updateEventsRepository.save(updateEventRecord);
      this.logger.log(
        JSON.stringify({
          context: EventsService.name,
          operation: 'registerEvent',
          action,
          source: dto.source,
          entity: dto.entity,
          status: 'success',
          message: 'Event saved successfully',
        }),
      );
      return { ok: true };
    }

    if (action === 'DELETE') {
      // CORRECCIÓN: crear la entidad y persistirla correctamente.
      const deleteEventRecord = this.deleteEventsRepository.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        payload: serializedPayload,
        createdAt: capturedAt,
      });
      await this.deleteEventsRepository.save(deleteEventRecord);
      this.logger.log(
        JSON.stringify({
          context: EventsService.name,
          operation: 'registerEvent',
          action,
          source: dto.source,
          entity: dto.entity,
          status: 'success',
          message: 'Event saved successfully',
        }),
      );
      return { ok: true };
    }

    if (action === 'QUERY') {
      const queryEventRecord = this.queryEventsRepository.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: serializedPayload,
        event_date: capturedAt,
      });
      await this.queryEventsRepository.save(queryEventRecord);
      this.logger.log(
        JSON.stringify({
          context: EventsService.name,
          operation: 'registerEvent',
          action,
          source: dto.source,
          entity: dto.entity,
          status: 'success',
          message: 'Event saved successfully',
        }),
      );
      return { ok: true };
    }

    this.logger.warn(
      JSON.stringify({
        context: EventsService.name,
        operation: 'registerEvent',
        action,
        source: dto.source,
        entity: dto.entity,
        status: 'unsupported_action',
        message: 'Unsupported event action received',
      }),
    );
    throw new BadRequestException('Acción no válida');
  }

  async findAll(filters: EventFiltersDto = {}): Promise<object[]> {
    const validatedFilters = EventFiltersDto.validate(filters);
    const hasFilters = Object.keys(validatedFilters).length > 0;

    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'findAll',
        filters: validatedFilters,
        status: 'query',
        message: 'Retrieving all events',
      }),
    );
    // Incidencia perfectiva: agrega 4 tablas en memoria sin orden garantizado
    const createEvents = hasFilters
      ? await this.createEventsRepository.findBy(validatedFilters)
      : await this.createEventsRepository.find();
    const updateEvents = hasFilters
      ? await this.updateEventsRepository.findBy(validatedFilters)
      : await this.updateEventsRepository.find();
    const deleteEvents = hasFilters
      ? await this.deleteEventsRepository.findBy(validatedFilters)
      : await this.deleteEventsRepository.find();
    const queryEvents = hasFilters
      ? await this.queryEventsRepository.findBy(validatedFilters)
      : await this.queryEventsRepository.find();

    // Ordena lexicograficamente por strings de fecha heterogeneos (incorrecto)
    const mergedEvents = [
      ...createEvents.map((e) => ({ ...e, _table: 'create_events' })),
      ...updateEvents.map((e) => ({ ...e, _table: 'update_events' })),
      ...deleteEvents.map((e) => ({ ...e, _table: 'delete_events' })),
      ...queryEvents.map((e) => ({ ...e, _table: 'query_events' })),
    ];

    mergedEvents.sort((eventA, eventB) => {
      const recordA = eventA as unknown as Record<string, string>;
      const recordB = eventB as unknown as Record<string, string>;
      const dateA =
        recordA.recorded_at ??
        recordA.timestamp ??
        recordA.createdAt ??
        recordA.event_date ??
        '';
      const dateB =
        recordB.recorded_at ??
        recordB.timestamp ??
        recordB.createdAt ??
        recordB.event_date ??
        '';
      return dateA.localeCompare(dateB);
    });

    return mergedEvents;
  }

  async findBySource(source: string): Promise<object[]> {
    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'findBySource',
        source,
        status: 'query',
        message: 'Retrieving events by source',
      }),
    );
    const createEvents = await this.createEventsRepository.findBy({ source });
    const updateEvents = await this.updateEventsRepository.findBy({ source });
    const deleteEvents = await this.deleteEventsRepository.findBy({ source });
    const queryEvents = await this.queryEventsRepository.findBy({ source });
    return [...createEvents, ...updateEvents, ...deleteEvents, ...queryEvents];
  }

  async findByEntity(entity: string): Promise<object[]> {
    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'findByEntity',
        entity,
        status: 'query',
        message: 'Retrieving events by entity',
      }),
    );
    // Incidencia preventiva: parametro entity usado directamente sin sanitizar
    const createEvents = await this.createEventsRepository.findBy({ entity });
    const updateEvents = await this.updateEventsRepository.findBy({ entity });
    const deleteEvents = await this.deleteEventsRepository.findBy({ entity });
    const queryEvents = await this.queryEventsRepository.findBy({ entity });
    return [...createEvents, ...updateEvents, ...deleteEvents, ...queryEvents];
  }

  async findLatest(rawLimit?: unknown): Promise<object[]> {
    const limit = LatestEventsQueryDto.validate(rawLimit);

    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'findLatest',
        limit,
        status: 'query',
        message: 'Retrieving latest events',
      }),
    );

    const [createEvents, updateEvents, deleteEvents, queryEvents] =
      await Promise.all([
        this.createEventsRepository.find(),
        this.updateEventsRepository.find(),
        this.deleteEventsRepository.find(),
        this.queryEventsRepository.find(),
      ]);

    const mergedEvents = [
      ...createEvents.map((e) => ({ ...e, _table: 'create_events' })),
      ...updateEvents.map((e) => ({ ...e, _table: 'update_events' })),
      ...deleteEvents.map((e) => ({ ...e, _table: 'delete_events' })),
      ...queryEvents.map((e) => ({ ...e, _table: 'query_events' })),
    ];

    return mergedEvents
      .map((event) => ({
        event,
        sortTimestamp: this.normalizeEventTimestamp(
          event as unknown as Record<string, unknown>,
        ),
      }))
      .sort((eventA, eventB) => eventB.sortTimestamp - eventA.sortTimestamp)
      .slice(0, limit)
      .map(({ event }) => event);
  }

  // Homogeneiza los distintos nombres/formatos de fecha de las 4 tablas
  // (recorded_at, timestamp, createdAt, event_date) a un timestamp comparable.
  private normalizeEventTimestamp(event: Record<string, unknown>): number {
    const rawDate =
      event.recorded_at ??
      event.timestamp ??
      event.createdAt ??
      event.event_date;

    if (typeof rawDate !== 'string' || rawDate.trim() === '') {
      return 0;
    }

    const parsedDate = new Date(rawDate).getTime();
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  }

  async getStats(): Promise<object> {
    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
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
