type NestApplicationMock = {
  enableCors: jest.MockedFunction<() => void>;
  useGlobalPipes: jest.MockedFunction<(...pipes: unknown[]) => void>;
  listen: jest.MockedFunction<
    (port: string | number, callback: () => void) => Promise<void>
  >;
};

type BootstrapLoggerMock = {
  log: jest.MockedFunction<(message: string) => void>;
};

const importMain = async (port?: string) => {
  jest.resetModules();

  if (port === undefined) {
    delete process.env.PORT;
  } else {
    process.env.PORT = port;
  }

  const app: NestApplicationMock = {
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    listen: jest.fn((_, callback) => {
      callback();
      return Promise.resolve();
    }),
  };

  const create = jest.fn<Promise<NestApplicationMock>, [unknown]>(() =>
    Promise.resolve(app),
  );

  const logger: BootstrapLoggerMock = {
    log: jest.fn(),
  };

  const LoggerMock = jest.fn<BootstrapLoggerMock, [string]>(() => logger);

  jest.doMock('@nestjs/core', () => ({
    NestFactory: {
      create,
    },
  }));

  jest.doMock('@nestjs/common', () => {
    const actual =
      jest.requireActual<typeof import('@nestjs/common')>('@nestjs/common');

    return {
      ...actual,
      Logger: LoggerMock,
    };
  });

  jest.isolateModules(() => {
    void jest.requireActual('./main');
  });

  await Promise.resolve();
  await Promise.resolve();

  return { app, create, logger };
};

describe('main bootstrap', () => {
  afterEach(() => {
    delete process.env.PORT;
    jest.restoreAllMocks();
    jest.dontMock('@nestjs/core');
    jest.dontMock('@nestjs/common');
  });

  it('creates the app, enables CORS, configures validation and listens on the default port', async () => {
    const { app, create, logger } = await importMain();

    expect(create).toHaveBeenCalledTimes(1);
    expect(app.enableCors).toHaveBeenCalledTimes(1);
    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.listen.mock.calls[0][0]).toBe(3002);
    expect(typeof app.listen.mock.calls[0][1]).toBe('function');

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3002'),
    );
  });

  it('uses PORT from the environment when provided', async () => {
    const { app, logger } = await importMain('4100');

    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(app.listen.mock.calls[0][0]).toBe('4100');
    expect(typeof app.listen.mock.calls[0][1]).toBe('function');

    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4100'),
    );
  });
});
