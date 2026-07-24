import { BadRequestException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventFiltersDto } from './dto/event-filters.dto';

type EventsServiceMock = jest.Mocked<
  Pick<
    EventsService,
    'registerEvent' | 'findAll' | 'findLatest' | 'findBySource' | 'findByEntity'
  >
>;

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: EventsServiceMock;

  const dto: CreateEventDto = {
    source: 'cleaning-crud',
    entity: 'product',
    action: 'CREATE',
    title: 'Product created',
    description: 'A product was created',
    payload: { id: 1, name: 'Cloro' },
  };

  beforeEach(() => {
    eventsService = {
      registerEvent: jest.fn(),
      findAll: jest.fn(),
      findLatest: jest.fn(),
      findBySource: jest.fn(),
      findByEntity: jest.fn(),
    };

    controller = new EventsController(
      eventsService as unknown as EventsService,
    );
  });

  it('registerEvent delegates to EventsService.registerEvent and returns its result', async () => {
    eventsService.registerEvent.mockResolvedValue({ ok: true });

    await expect(controller.registerEvent(dto)).resolves.toEqual({ ok: true });
    expect(eventsService.registerEvent).toHaveBeenCalledWith(dto);
  });

  it('registerEvent propagates BadRequestException for unsupported actions', async () => {
    const invalidDto: CreateEventDto = {
      ...dto,
      action: 'INVALID',
      payload: {},
    };
    eventsService.registerEvent.mockRejectedValue(
      new BadRequestException('Acción no válida'),
    );

    await expect(controller.registerEvent(invalidDto)).rejects.toThrow(
      BadRequestException,
    );
    expect(eventsService.registerEvent).toHaveBeenCalledWith(invalidDto);
  });

  it('findAll without filters delegates to EventsService.findAll', async () => {
    const events: object[] = [
      { source: 'cleaning-crud', entity: 'product', action: 'CREATE' },
    ];
    eventsService.findAll.mockResolvedValue(events);

    await expect(controller.findAll()).resolves.toBe(events);
    expect(eventsService.findAll).toHaveBeenCalledWith({});
  });

  it('findAll delegates query filters to EventsService.findAll', async () => {
    const filters: EventFiltersDto = {
      action: 'CREATE',
      source: 'cleaning-crud',
      entity: 'product',
    };
    const events: object[] = [{ ...filters }];
    eventsService.findAll.mockResolvedValue(events);

    await expect(controller.findAll(filters)).resolves.toBe(events);
    expect(eventsService.findAll).toHaveBeenCalledWith(filters);
  });

  it('findLatest without limit delegates to EventsService.findLatest', async () => {
    const events: object[] = [{ source: 'cleaning-crud' }];
    eventsService.findLatest.mockResolvedValue(events);

    await expect(controller.findLatest()).resolves.toBe(events);
    expect(eventsService.findLatest).toHaveBeenCalledWith(undefined);
  });

  it('findLatest delegates the limit query param to EventsService.findLatest', async () => {
    const events: object[] = [{ source: 'cleaning-crud' }];
    eventsService.findLatest.mockResolvedValue(events);

    await expect(controller.findLatest('5')).resolves.toBe(events);
    expect(eventsService.findLatest).toHaveBeenCalledWith('5');
  });

  it('findLatest propagates BadRequestException for invalid limits', async () => {
    eventsService.findLatest.mockRejectedValue(
      new BadRequestException(
        'El parámetro limit debe ser un entero entre 1 y 100',
      ),
    );

    await expect(controller.findLatest('0')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('findBySource delegates to EventsService.findBySource with the source param', async () => {
    const events: object[] = [{ source: 'cleaning-crud' }];
    eventsService.findBySource.mockResolvedValue(events);

    await expect(controller.findBySource('cleaning-crud')).resolves.toBe(
      events,
    );
    expect(eventsService.findBySource).toHaveBeenCalledWith('cleaning-crud');
  });

  it('findByEntity delegates to EventsService.findByEntity with the entity param', async () => {
    const events: object[] = [{ entity: 'product' }];
    eventsService.findByEntity.mockResolvedValue(events);

    await expect(controller.findByEntity('product')).resolves.toBe(events);
    expect(eventsService.findByEntity).toHaveBeenCalledWith('product');
  });
});
