import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';
import { EventFiltersDto } from './dto/event-filters.dto';

type RepositoryMock<T extends object> = {
  create: jest.Mock<T, [Partial<T>]>;
  save: jest.Mock<Promise<T>, [T]>;
  find: jest.Mock<Promise<T[]>, []>;
  findBy: jest.Mock<Promise<T[]>, [Partial<T>]>;
  count: jest.Mock<Promise<number>, []>;
};

const createRepositoryMock = <T extends object>(): RepositoryMock<T> => ({
  create: jest.fn((entity: Partial<T>) => entity as T),
  save: jest.fn((entity: T) => Promise.resolve(entity)),
  find: jest.fn(() => Promise.resolve([])),
  findBy: jest.fn((criteria: Partial<T>) => {
    void criteria;
    return Promise.resolve([]);
  }),
  count: jest.fn(() => Promise.resolve(0)),
});

describe('EventsService', () => {
  let service: EventsService;
  let createRepo: RepositoryMock<CreateEventEntity>;
  let updateRepo: RepositoryMock<UpdateEventEntity>;
  let deleteRepo: RepositoryMock<DeleteEventEntity>;
  let queryRepo: RepositoryMock<QueryEventEntity>;

  const createDto = (action: string): CreateEventDto => ({
    source: 'cleaning-crud',
    entity: 'product',
    action,
    title: `${action} product`,
    description: `Event for ${action}`,
    payload: {
      id: 1,
      name: 'Detergente',
    },
  });

  beforeEach(() => {
    createRepo = createRepositoryMock<CreateEventEntity>();
    updateRepo = createRepositoryMock<UpdateEventEntity>();
    deleteRepo = createRepositoryMock<DeleteEventEntity>();
    queryRepo = createRepositoryMock<QueryEventEntity>();

    service = new EventsService(
      createRepo as unknown as Repository<CreateEventEntity>,
      updateRepo as unknown as Repository<UpdateEventEntity>,
      deleteRepo as unknown as Repository<DeleteEventEntity>,
      queryRepo as unknown as Repository<QueryEventEntity>,
    );
  });

  it('should register CREATE events', async () => {
    const dto = createDto('CREATE');

    const result = await service.registerEvent(dto);

    expect(result).toEqual({ ok: true });
    expect(createRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: JSON.stringify(dto.payload),
      }),
    );
    expect(createRepo.create.mock.calls[0][0].recorded_at).toEqual(
      expect.stringMatching(/.+/),
    );
    expect(createRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should register UPDATE events', async () => {
    const dto = createDto('UPDATE');

    const result = await service.registerEvent(dto);

    expect(result).toEqual({ ok: true });
    expect(updateRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: JSON.stringify(dto.payload),
      }),
    );
    expect(updateRepo.create.mock.calls[0][0].timestamp).toEqual(
      expect.stringMatching(/.+/),
    );
    expect(updateRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should register DELETE events', async () => {
    const dto = createDto('DELETE');

    const result = await service.registerEvent(dto);

    expect(result).toEqual({ ok: true });
    expect(deleteRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        payload: JSON.stringify(dto.payload),
      }),
    );
    expect(deleteRepo.create.mock.calls[0][0].createdAt).toEqual(
      expect.stringMatching(/.+/),
    );
    expect(deleteRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should register QUERY events', async () => {
    const dto = createDto('QUERY');

    const result = await service.registerEvent(dto);

    expect(result).toEqual({ ok: true });
    expect(queryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        source: dto.source,
        entity: dto.entity,
        action: dto.action,
        title: dto.title,
        description: dto.description,
        payload: JSON.stringify(dto.payload),
      }),
    );
    expect(queryRepo.create.mock.calls[0][0].event_date).toEqual(
      expect.stringMatching(/.+/),
    );
    expect(queryRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should reject unsupported actions with BadRequestException', async () => {
    await expect(service.registerEvent(createDto('ARCHIVE'))).rejects.toThrow(
      BadRequestException,
    );

    await expect(
      service.registerEvent(createDto('ARCHIVE')),
    ).rejects.toMatchObject({
      status: 400,
    });

    expect(createRepo.save).not.toHaveBeenCalled();
    expect(updateRepo.save).not.toHaveBeenCalled();
    expect(deleteRepo.save).not.toHaveBeenCalled();
    expect(queryRepo.save).not.toHaveBeenCalled();
  });

  it('should merge all events when finding all records', async () => {
    createRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
        recorded_at: '2026-07-07 10:00:00',
      } as CreateEventEntity,
    ]);
    updateRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
        timestamp: '2026-07-07 11:00:00',
      } as UpdateEventEntity,
    ]);
    deleteRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
        createdAt: '2026-07-07 12:00:00',
      } as DeleteEventEntity,
    ]);
    queryRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
        event_date: '2026-07-07 13:00:00',
      } as QueryEventEntity,
    ]);

    const result = await service.findAll();

    expect(result).toHaveLength(4);
    expect(result).toEqual([
      expect.objectContaining({ _table: 'create_events' }),
      expect.objectContaining({ _table: 'update_events' }),
      expect.objectContaining({ _table: 'delete_events' }),
      expect.objectContaining({ _table: 'query_events' }),
    ]);
  });

  it('should sort events with missing dates using empty-string fallback', async () => {
    createRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
      } as CreateEventEntity,
    ]);
    updateRepo.find.mockResolvedValue([
      {
        source: 'cleaning-crud',
        timestamp: '2026-07-07 11:00:00',
      } as UpdateEventEntity,
    ]);
    deleteRepo.find.mockResolvedValue([]);
    queryRepo.find.mockResolvedValue([]);

    const result = await service.findAll();

    expect(result).toEqual([
      expect.objectContaining({ _table: 'create_events' }),
      expect.objectContaining({ _table: 'update_events' }),
    ]);
  });

  describe('findAll filters', () => {
    beforeEach(() => {
      createRepo.findBy.mockResolvedValue([
        {
          action: 'CREATE',
          source: 'cleaning-crud',
          entity: 'product',
          recorded_at: '2026-07-07 10:00:00',
        } as CreateEventEntity,
      ]);
      updateRepo.findBy.mockResolvedValue([]);
      deleteRepo.findBy.mockResolvedValue([]);
      queryRepo.findBy.mockResolvedValue([]);
    });

    it.each([
      ['action', { action: 'CREATE' }],
      ['source', { source: 'cleaning-crud' }],
      ['entity', { entity: 'product' }],
    ] as const)('should filter events by %s', async (_name, filters) => {
      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(createRepo.findBy).toHaveBeenCalledWith(filters);
      expect(updateRepo.findBy).toHaveBeenCalledWith(filters);
      expect(deleteRepo.findBy).toHaveBeenCalledWith(filters);
      expect(queryRepo.findBy).toHaveBeenCalledWith(filters);
      expect(createRepo.find).not.toHaveBeenCalled();
    });

    it('should apply combined filters with AND criteria', async () => {
      const filters: EventFiltersDto = {
        action: 'CREATE',
        source: 'cleaning-crud',
        entity: 'product',
      };

      const result = await service.findAll(filters);

      expect(result).toHaveLength(1);
      expect(createRepo.findBy).toHaveBeenCalledWith(filters);
      expect(result[0]).toEqual(
        expect.objectContaining({
          action: 'CREATE',
          source: 'cleaning-crud',
          entity: 'product',
          _table: 'create_events',
        }),
      );
    });

    it.each([
      [{ action: 'ARCHIVE' }, 'action'],
      [{ source: '' }, 'source'],
      [{ entity: '   ' }, 'entity'],
      [{ status: 'active' }, 'status'],
    ])('should reject invalid filters %o', async (filters, message) => {
      await expect(
        service.findAll(filters as unknown as EventFiltersDto),
      ).rejects.toThrow(message);

      expect(createRepo.find).not.toHaveBeenCalled();
      expect(createRepo.findBy).not.toHaveBeenCalled();
    });
  });

  it('should find events by source in all repositories', async () => {
    createRepo.findBy.mockResolvedValue([
      { source: 'cleaning-crud' } as CreateEventEntity,
    ]);
    updateRepo.findBy.mockResolvedValue([
      { source: 'cleaning-crud' } as UpdateEventEntity,
    ]);
    deleteRepo.findBy.mockResolvedValue([
      { source: 'cleaning-crud' } as DeleteEventEntity,
    ]);
    queryRepo.findBy.mockResolvedValue([
      { source: 'cleaning-crud' } as QueryEventEntity,
    ]);

    const result = await service.findBySource('cleaning-crud');

    expect(result).toHaveLength(4);
    expect(createRepo.findBy).toHaveBeenCalledWith({ source: 'cleaning-crud' });
    expect(updateRepo.findBy).toHaveBeenCalledWith({ source: 'cleaning-crud' });
    expect(deleteRepo.findBy).toHaveBeenCalledWith({ source: 'cleaning-crud' });
    expect(queryRepo.findBy).toHaveBeenCalledWith({ source: 'cleaning-crud' });
  });

  it('should find events by entity in all repositories', async () => {
    createRepo.findBy.mockResolvedValue([
      { entity: 'product' } as CreateEventEntity,
    ]);
    updateRepo.findBy.mockResolvedValue([
      { entity: 'product' } as UpdateEventEntity,
    ]);
    deleteRepo.findBy.mockResolvedValue([
      { entity: 'product' } as DeleteEventEntity,
    ]);
    queryRepo.findBy.mockResolvedValue([
      { entity: 'product' } as QueryEventEntity,
    ]);

    const result = await service.findByEntity('product');

    expect(result).toHaveLength(4);
    expect(createRepo.findBy).toHaveBeenCalledWith({ entity: 'product' });
    expect(updateRepo.findBy).toHaveBeenCalledWith({ entity: 'product' });
    expect(deleteRepo.findBy).toHaveBeenCalledWith({ entity: 'product' });
    expect(queryRepo.findBy).toHaveBeenCalledWith({ entity: 'product' });
  });

  it('should include QUERY events in stats total', async () => {
    createRepo.count.mockResolvedValue(2);
    updateRepo.count.mockResolvedValue(3);
    deleteRepo.count.mockResolvedValue(1);
    queryRepo.count.mockResolvedValue(4);

    const result = await service.getStats();

    expect(result).toEqual({
      create: 2,
      update: 3,
      delete: 1,
      query: 4,
      total: 10,
    });
  });
});
