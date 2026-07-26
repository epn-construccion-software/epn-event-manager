import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import supertest from 'supertest';
import { AppModule } from './../src/app.module';
import { CreateEventEntity } from '../src/database/entities/create-event.entity';
import { DeleteEventEntity } from '../src/database/entities/delete-event.entity';
import { QueryEventEntity } from '../src/database/entities/query-event.entity';
import { UpdateEventEntity } from '../src/database/entities/update-event.entity';

describe('StatsController (e2e)', () => {
  const repositoryMock = (count: unknown) => ({
    count: jest.fn().mockResolvedValue(count),
  });

  const buildApp = async (
    counts: [unknown, unknown, unknown, unknown],
  ): Promise<INestApplication> => {
    const [createCount, updateCount, deleteCount, queryCount] = counts;

    const moduleBuilder = Test.createTestingModule({
      imports: [AppModule],
    });

    moduleBuilder
      .overrideProvider(getRepositoryToken(CreateEventEntity))
      .useValue(repositoryMock(createCount));

    moduleBuilder
      .overrideProvider(getRepositoryToken(UpdateEventEntity))
      .useValue(repositoryMock(updateCount));

    moduleBuilder
      .overrideProvider(getRepositoryToken(DeleteEventEntity))
      .useValue(repositoryMock(deleteCount));

    moduleBuilder
      .overrideProvider(getRepositoryToken(QueryEventEntity))
      .useValue(repositoryMock(queryCount));

    const moduleFixture: TestingModule = await moduleBuilder.compile();

    const app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
      }),
    );

    await app.init();

    return app;
  };

  it.each([
    [
      'returns numeric counts and a total when repositories have data',
      [2, 1, 0, 3],
      { create: 2, update: 1, delete: 0, query: 3, total: 6 },
    ],
    [
      'returns five zero values when all repositories are empty',
      [0, 0, 0, 0],
      { create: 0, update: 0, delete: 0, query: 0, total: 0 },
    ],
    [
      'normalizes null, undefined and non-numeric counts to zero instead of NaN',
      [null, undefined, 'abc', Number.NaN],
      { create: 0, update: 0, delete: 0, query: 0, total: 0 },
    ],
  ] as Array<[string, [unknown, unknown, unknown, unknown], object]>)(
    '/stats (GET) %s',
    async (_description, counts, expectedBody) => {
      const app = await buildApp(counts);

      const response = await supertest(
        app.getHttpServer() as Parameters<typeof supertest>[0],
      )
        .get('/stats')
        .expect(200);

      const body = response.body as Record<string, number>;

      expect(body).toEqual(expectedBody);

      Object.values(body).forEach((value) => {
        expect(typeof value).toBe('number');
        expect(Number.isNaN(value)).toBe(false);
      });

      await app.close();
    },
  );
});
