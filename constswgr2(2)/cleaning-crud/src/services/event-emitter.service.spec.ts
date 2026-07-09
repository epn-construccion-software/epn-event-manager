import axios from 'axios';
import { LoggerService } from './logger.service';
import { EventEmitterService } from './event-emitter.service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EventEmitterService', () => {
  let logger: jest.Mocked<Pick<LoggerService, 'info' | 'error' | 'warn'>>;

  beforeEach(() => {
    logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    delete process.env.EVENT_HUB_URL;
    mockedAxios.post.mockReset();
  });

  it('posts a structured event and returns response data', async () => {
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: { accepted: true },
    });
    const service = new EventEmitterService(logger as unknown as LoggerService);

    await expect(
      service.emitEvent('CREATE', 'product', 'Created', 'Description', {
        id: 1,
      }),
    ).resolves.toEqual({ accepted: true });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://localhost:3000/events',
      expect.objectContaining({
        source: 'cleaning-crud',
        action: 'CREATE',
        entity: 'product',
        payload: { id: 1 },
      }),
      { timeout: 3000 },
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Event emitted: CREATE',
      expect.objectContaining({ status: 202 }),
    );
  });

  it('uses EVENT_HUB_URL when configured', async () => {
    process.env.EVENT_HUB_URL = 'http://event-manager.test/events';
    mockedAxios.post.mockResolvedValue({ status: 200, data: 'ok' });
    const service = new EventEmitterService(logger as unknown as LoggerService);

    await service.emitEvent('QUERY', 'product', 'Title', 'Description', {});

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://event-manager.test/events',
      expect.objectContaining({
        action: 'QUERY',
        entity: 'product',
      }),
      { timeout: 3000 },
    );
  });

  it('logs and returns undefined when event delivery fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('connection refused'));
    const service = new EventEmitterService(logger as unknown as LoggerService);

    await expect(
      service.emitEvent('DELETE', 'product', 'Deleted', 'Description', {
        id: 1,
      }),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      'Error emitting event [DELETE]: connection refused',
    );
  });
});
