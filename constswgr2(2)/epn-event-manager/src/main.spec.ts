type NestApplicationMock = {
  enableCors: jest.MockedFunction<() => void>;
  listen: jest.MockedFunction<
    (port: string | number, callback: () => void) => Promise<void>
  >;
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
    listen: jest.fn((_, callback) => {
      callback();
      return Promise.resolve();
    }),
  };
  const create = jest.fn<Promise<NestApplicationMock>, [unknown]>(() =>
    Promise.resolve(app),
  );
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  jest.doMock('@nestjs/core', () => ({
    NestFactory: {
      create,
    },
  }));

  jest.isolateModules(() => {
    void jest.requireActual('./main');
  });
  await Promise.resolve();
  await Promise.resolve();

  return { app, create, logSpy };
};

describe('main bootstrap', () => {
  afterEach(() => {
    delete process.env.PORT;
    jest.restoreAllMocks();
    jest.dontMock('@nestjs/core');
  });

  it('creates the app, enables CORS and listens on the default port', async () => {
    const { app, create, logSpy } = await importMain();

    expect(create).toHaveBeenCalledTimes(1);
    expect(app.enableCors).toHaveBeenCalledTimes(1);
    expect(app.listen.mock.calls[0][0]).toBe(3002);
    expect(typeof app.listen.mock.calls[0][1]).toBe('function');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:3002'),
    );
  });

  it('uses PORT from the environment when provided', async () => {
    const { app, logSpy } = await importMain('4100');

    expect(app.listen.mock.calls[0][0]).toBe('4100');
    expect(typeof app.listen.mock.calls[0][1]).toBe('function');
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:4100'),
    );
  });
});
