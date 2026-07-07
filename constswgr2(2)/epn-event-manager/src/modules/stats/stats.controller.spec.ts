import { EventsService } from '../events/events.service';
import { StatsController } from './stats.controller';

type EventsServiceMock = jest.Mocked<Pick<EventsService, 'getStats'>>;

describe('StatsController', () => {
  let controller: StatsController;
  let eventsService: EventsServiceMock;

  beforeEach(() => {
    eventsService = {
      getStats: jest.fn(),
    };
    controller = new StatsController(eventsService as unknown as EventsService);
  });

  it('getStats calls EventsService.getStats and returns received statistics', async () => {
    const stats = {
      create: 2,
      update: 1,
      delete: 0,
      query: 3,
      total: 6,
    };
    eventsService.getStats.mockResolvedValue(stats);

    await expect(controller.getStats()).resolves.toBe(stats);
    expect(eventsService.getStats).toHaveBeenCalledTimes(1);
  });
});
