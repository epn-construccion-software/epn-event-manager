import { CreateEventDto } from './dto/create-event.dto';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

type EventsServiceMock = jest.Mocked<
  Pick<
    EventsService,
    'registerEvent' | 'findAll' | 'findBySource' | 'findByEntity'
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

  it('findAll delegates to EventsService.findAll and returns events', async () => {
    const events: object[] = [
      { source: 'cleaning-crud', entity: 'product', action: 'CREATE' },
    ];
    eventsService.findAll.mockResolvedValue(events);

    await expect(controller.findAll()).resolves.toBe(events);
    expect(eventsService.findAll).toHaveBeenCalledTimes(1);
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
