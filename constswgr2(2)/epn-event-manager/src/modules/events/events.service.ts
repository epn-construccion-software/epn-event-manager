import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(CreateEventEntity)
    private readonly createRepo: Repository<CreateEventEntity>,
    @InjectRepository(UpdateEventEntity)
    private readonly updateRepo: Repository<UpdateEventEntity>,
    @InjectRepository(DeleteEventEntity)
    private readonly deleteRepo: Repository<DeleteEventEntity>,
    @InjectRepository(QueryEventEntity)
    private readonly queryRepo: Repository<QueryEventEntity>,
  ) {}

  async registerEvent(dto: CreateEventDto): Promise<{ ok: boolean }> {
    const action = (dto.action ?? '').toUpperCase();
    const payloadStr = JSON.stringify(dto.payload ?? {});
    // Fecha guardada en formato local, no UTC (debilidad intencional)
    const localDate = new Date().toLocaleString();

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
      const ev = this.createRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        recorded_at: localDate,
      });
      await this.createRepo.save(ev);
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
      const ev = this.updateRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        timestamp: localDate,
      });
      await this.updateRepo.save(ev);
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
      const ev = this.deleteRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        payload: payloadStr,
        createdAt: localDate,
      });
      await this.deleteRepo.save(ev);
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
      const ev = this.queryRepo.create({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: payloadStr,
        event_date: localDate,
      });
      await this.queryRepo.save(ev);
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

  async findAll(): Promise<object[]> {
    this.logger.log(
      JSON.stringify({
        context: EventsService.name,
        operation: 'findAll',
        status: 'query',
        message: 'Retrieving all events',
      }),
    );
    // Incidencia perfectiva: agrega 4 tablas en memoria sin orden garantizado
    const creates = await this.createRepo.find();
    const updates = await this.updateRepo.find();
    const deletes = await this.deleteRepo.find();
    const queries = await this.queryRepo.find();

    // Ordena lexicograficamente por strings de fecha heterogeneos (incorrecto)
    const merged = [
      ...creates.map((e) => ({ ...e, _table: 'create_events' })),
      ...updates.map((e) => ({ ...e, _table: 'update_events' })),
      ...deletes.map((e) => ({ ...e, _table: 'delete_events' })),
      ...queries.map((e) => ({ ...e, _table: 'query_events' })),
    ];

    merged.sort((a, b) => {
      const ra = a as unknown as Record<string, string>;
      const rb = b as unknown as Record<string, string>;
      const ta =
        ra.recorded_at ?? ra.timestamp ?? ra.createdAt ?? ra.event_date ?? '';
      const tb =
        rb.recorded_at ?? rb.timestamp ?? rb.createdAt ?? rb.event_date ?? '';
      return ta.localeCompare(tb);
    });

    return merged;
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
    const creates = await this.createRepo.findBy({ source });
    const updates = await this.updateRepo.findBy({ source });
    const deletes = await this.deleteRepo.findBy({ source });
    const queries = await this.queryRepo.findBy({ source });
    return [...creates, ...updates, ...deletes, ...queries];
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
    const creates = await this.createRepo.findBy({ entity });
    const updates = await this.updateRepo.findBy({ entity });
    const deletes = await this.deleteRepo.findBy({ entity });
    const queries = await this.queryRepo.findBy({ entity });
    return [...creates, ...updates, ...deletes, ...queries];
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
    const createCount = await this.createRepo.count();
    const updateCount = await this.updateRepo.count();
    const deleteCount = await this.deleteRepo.count();
    const queryCount = await this.queryRepo.count();

    return {
      create: createCount,
      update: updateCount,
      delete: deleteCount,
      query: queryCount,
      total: createCount + updateCount + deleteCount + queryCount,
    };
  }
}
