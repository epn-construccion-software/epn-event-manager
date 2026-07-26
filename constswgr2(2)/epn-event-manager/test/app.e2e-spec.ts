import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { CreateEventEntity } from '../src/database/entities/create-event.entity';
import { DeleteEventEntity } from '../src/database/entities/delete-event.entity';
import { QueryEventEntity } from '../src/database/entities/query-event.entity';
import { UpdateEventEntity } from '../src/database/entities/update-event.entity';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  const repositoryMock = (events: object[]) => ({
    find: jest.fn().mockResolvedValue(events),

    findBy: jest
      .fn()
      .mockImplementation((filters: Record<string, string>) =>
        Promise.resolve(
          events.filter((event) =>
            Object.entries(filters).every(
              ([key, value]) =>
                (event as Record<string, unknown>)[key] === value,
            ),
          ),
        ),
      ),

    count: jest.fn().mockResolvedValue(events.length),

    create: jest.fn((data: object) => data),

    save: jest.fn().mockResolvedValue({}),
  });

  const createEvents = [
    {
      id: 1,
      action: 'CREATE',
      source: 'cleaning-crud',
      entity: 'product',
      recorded_at: '2026-07-07 10:00:00',
    },
  ];

  const updateEvents = [
    {
      id: 2,
      action: 'UPDATE',
      source: 'cleaning-crud',
      entity: 'product',
      timestamp: '2026-07-07 11:00:00',
    },
  ];

  const deleteEvents = [
    {
      id: 3,
      action: 'DELETE',
      source: 'inventory-api',
      entity: 'product',
      createdAt: '2026-07-07 12:00:00',
    },
  ];

  const queryEvents = [
    {
      id: 4,
      action: 'QUERY',
      source: 'cleaning-crud',
      entity: 'report',
      event_date: '2026-07-07 13:00:00',
    },
  ];

  beforeAll(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    moduleBuilder
      .overrideProvider(getRepositoryToken(CreateEventEntity))
      .useValue(repositoryMock(createEvents));

    moduleBuilder
      .overrideProvider(getRepositoryToken(UpdateEventEntity))
      .useValue(repositoryMock(updateEvents));

    moduleBuilder
      .overrideProvider(getRepositoryToken(DeleteEventEntity))
      .useValue(repositoryMock(deleteEvents));

    moduleBuilder
      .overrideProvider(getRepositoryToken(QueryEventEntity))
      .useValue(repositoryMock(queryEvents));

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it.each([
    ['/events', 4],
    ['/events?action=CREATE', 1],
    ['/events?source=cleaning-crud', 3],
    ['/events?entity=product', 3],
    ['/events?action=CREATE&source=cleaning-crud&entity=product', 1],
  ])('%s (GET) returns matching events', async (url, expectedCount) => {
    const response = await supertest(
      app.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get(url)
      .expect(200);

    const body = response.body as unknown[];

    expect(body).toHaveLength(expectedCount);
  });

  it.each([
    '/events?action=ARCHIVE',
    '/events?source=',
    '/events?entity=%20%20%20',
    '/events?status=active',
  ])('%s (GET) rejects invalid filters', async (url) => {
    const response = await supertest(
      app.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get(url)
      .expect(400);

    const body = response.body as {
      message: unknown;
    };

    expect(body.message).toEqual(expect.stringMatching(/filtro/i));
  });

  it('/events/latest (GET) returns events ordered from most to least recent', async () => {
    const response = await supertest(
      app.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get('/events/latest')
      .expect(200);

    const body = response.body as Array<{
      id: number;
    }>;

    expect(body.map((event) => event.id)).toEqual([4, 3, 2, 1]);
  });

  it('/events/latest?limit=N (GET) caps the amount of returned events', async () => {
    const response = await supertest(
      app.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get('/events/latest?limit=2')
      .expect(200);

    const body = response.body as Array<{
      id: number;
    }>;

    expect(body).toHaveLength(2);
    expect(body.map((event) => event.id)).toEqual([4, 3]);
  });

  it.each([
    '/events/latest?limit=0',
    '/events/latest?limit=abc',
    '/events/latest?limit=101',
  ])('%s (GET) rejects an invalid limit', async (url) => {
    const response = await supertest(
      app.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get(url)
      .expect(400);

    const body = response.body as {
      message: unknown;
    };

    expect(body.message).toEqual(expect.stringMatching(/limit/i));
  });

  it('/events/latest (GET) returns 200 and [] when there are no events', async () => {
    const emptyModuleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    emptyModuleBuilder
      .overrideProvider(getRepositoryToken(CreateEventEntity))
      .useValue(repositoryMock([]));

    emptyModuleBuilder
      .overrideProvider(getRepositoryToken(UpdateEventEntity))
      .useValue(repositoryMock([]));

    emptyModuleBuilder
      .overrideProvider(getRepositoryToken(DeleteEventEntity))
      .useValue(repositoryMock([]));

    emptyModuleBuilder
      .overrideProvider(getRepositoryToken(QueryEventEntity))
      .useValue(repositoryMock([]));

    const emptyModuleFixture = await emptyModuleBuilder.compile();
    const emptyApp = emptyModuleFixture.createNestApplication();

    emptyApp.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    await emptyApp.init();

    const response = await supertest(
      emptyApp.getHttpServer() as Parameters<typeof supertest>[0],
    )
      .get('/events/latest')
      .expect(200);

    const body = response.body as unknown[];

    expect(body).toEqual([]);

    await emptyApp.close();
  });

  describe('POST /events validation', () => {
    const validEvent = {
      source: 'cleaning-crud',
      entity: 'product',
      action: 'CREATE',
      title: 'Product created',
      description: 'A product was created',
      payload: {
        id: 1,
        name: 'Cloro',
      },
    };

    const invalidPayloadCases: Array<[string, unknown]> = [
      ['string', 'invalid payload'],
      ['array', [{ id: 1 }]],
      ['number', 25],
      ['null', null],
    ];

    it.each([
      ['source', { ...validEvent, source: undefined }],
      ['entity', { ...validEvent, entity: undefined }],
      ['action', { ...validEvent, action: undefined }],
      ['title', { ...validEvent, title: undefined }],
    ])('rejects a request when %s is missing', async (_field, payload) => {
      const response = await supertest(
        app.getHttpServer() as Parameters<typeof supertest>[0],
      )
        .post('/events')
        .send(payload)
        .expect(400);

      const body = response.body as {
        statusCode: number;
        message: unknown;
      };

      expect(body.statusCode).toBe(400);
      expect(body.message).toBeDefined();
    });

    it.each([
      ['source', { ...validEvent, source: '   ' }],
      ['entity', { ...validEvent, entity: '' }],
      ['action', { ...validEvent, action: '   ' }],
      ['title', { ...validEvent, title: '' }],
    ])('rejects a request when %s is empty', async (_field, payload) => {
      await supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
        .post('/events')
        .send(payload)
        .expect(400);
    });

    it('rejects an unsupported action', async () => {
      await supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
        .post('/events')
        .send({
          ...validEvent,
          action: 'ARCHIVE',
        })
        .expect(400);
    });

    it.each(invalidPayloadCases)(
      'rejects payload when it is a %s',
      async (_type: string, invalidPayload: unknown) => {
        await supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
          .post('/events')
          .send({
            ...validEvent,
            payload: invalidPayload,
          })
          .expect(400);
      },
    );

    it.each(['CREATE', 'UPDATE', 'DELETE', 'QUERY'])(
      'accepts the valid action %s',
      async (action) => {
        await supertest(app.getHttpServer() as Parameters<typeof supertest>[0])
          .post('/events')
          .send({
            ...validEvent,
            action,
          })
          .expect(201);
      },
    );
  });
});
