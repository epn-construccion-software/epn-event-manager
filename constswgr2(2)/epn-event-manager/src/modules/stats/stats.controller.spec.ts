import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

type StatsServiceMock = jest.Mocked<Pick<StatsService, 'getStats'>>;

describe('StatsController', () => {
  let controller: StatsController;
  let statsService: StatsServiceMock;

  beforeEach(() => {
    statsService = {
      getStats: jest.fn(),
    };

    controller = new StatsController(statsService as unknown as StatsService);
  });

  it('getStats llama a StatsService.getStats y devuelve las estadísticas recibidas', async () => {
    const stats = {
      create: 2,
      update: 1,
      delete: 0,
      query: 3,
      total: 6,
    };

    statsService.getStats.mockResolvedValue(stats);

    await expect(controller.getStats()).resolves.toBe(stats);
    expect(statsService.getStats).toHaveBeenCalledTimes(1);
  });
});
