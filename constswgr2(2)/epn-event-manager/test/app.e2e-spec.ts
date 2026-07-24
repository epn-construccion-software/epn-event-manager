import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateEventEntity } from '../src/database/entities/create-event.entity';
import { UpdateEventEntity } from '../src/database/entities/update-event.entity';
import { DeleteEventEntity } from '../src/database/entities/delete-event.entity';
import { QueryEventEntity } from '../src/database/entities/query-event.entity';

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
    create: jest.fn(),
    save: jest.fn(),
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

    expect(response.body).toHaveLength(expectedCount);
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

    const body = response.body as { message: unknown };
    expect(body.message).toEqual(expect.stringMatching(/filtro/i));
  });
});
