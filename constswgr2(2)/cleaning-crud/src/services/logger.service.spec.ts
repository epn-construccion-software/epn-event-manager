import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LoggerService } from './logger.service';

type LoggerInternals = {
  logger: {
    info: jest.MockedFunction<(message: string, meta?: unknown) => void>;
    warn: jest.MockedFunction<(message: string, meta?: unknown) => void>;
    error: jest.MockedFunction<(message: string, meta?: unknown) => void>;
  };
};

describe('LoggerService', () => {
  const originalLogFile = process.env.LOG_FILE;
  const originalLogLevel = process.env.LOG_LEVEL;

  afterEach(() => {
    if (originalLogFile === undefined) {
      delete process.env.LOG_FILE;
    } else {
      process.env.LOG_FILE = originalLogFile;
    }

    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }
  });

  it('delegates info, warn and error calls to winston', () => {
    const service = new LoggerService();
    const internals = service as unknown as LoggerInternals;
    internals.logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service.info('info message', { route: '/products' });
    service.warn('warn message', { action: 'QUERY' });
    service.error('error message', { productId: 1 });

    expect(internals.logger.info).toHaveBeenCalledWith('info message', {
      route: '/products',
    });
    expect(internals.logger.warn).toHaveBeenCalledWith('warn message', {
      action: 'QUERY',
    });
    expect(internals.logger.error).toHaveBeenCalledWith('error message', {
      productId: 1,
    });
  });

  it('can be configured with file logging enabled', () => {
    const logPath = path.join(os.tmpdir(), 'cleaning-crud-test.log');
    process.env.LOG_FILE = logPath;
    process.env.LOG_LEVEL = 'debug';

    expect(() => new LoggerService()).not.toThrow();

    if (fs.existsSync(logPath)) {
      fs.unlinkSync(logPath);
    }
  });
});
