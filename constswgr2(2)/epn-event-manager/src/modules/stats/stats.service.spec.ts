import { Repository } from 'typeorm';

import { CreateEventEntity } from '../../database/entities/create-event.entity';
import { UpdateEventEntity } from '../../database/entities/update-event.entity';
import { DeleteEventEntity } from '../../database/entities/delete-event.entity';
import { QueryEventEntity } from '../../database/entities/query-event.entity';

import { StatsService } from './stats.service';

type RepositoryMock<T extends object> = jest.Mocked<
  Pick<Repository<T>, 'count'>
>;

describe('StatsService', () => {
  let service: StatsService;

  let createEventsRepository: RepositoryMock<CreateEventEntity>;
  let updateEventsRepository: RepositoryMock<UpdateEventEntity>;
  let deleteEventsRepository: RepositoryMock<DeleteEventEntity>;
  let queryEventsRepository: RepositoryMock<QueryEventEntity>;

  beforeEach(() => {
    createEventsRepository = {
      count: jest.fn(),
    };

    updateEventsRepository = {
      count: jest.fn(),
    };

    deleteEventsRepository = {
      count: jest.fn(),
    };

    queryEventsRepository = {
      count: jest.fn(),
    };

    service = new StatsService(
      createEventsRepository as unknown as Repository<CreateEventEntity>,
      updateEventsRepository as unknown as Repository<UpdateEventEntity>,
      deleteEventsRepository as unknown as Repository<DeleteEventEntity>,
      queryEventsRepository as unknown as Repository<QueryEventEntity>,
    );
  });

  it('calcula los conteos de eventos y el total', async () => {
    createEventsRepository.count.mockResolvedValue(2);
    updateEventsRepository.count.mockResolvedValue(1);
    deleteEventsRepository.count.mockResolvedValue(0);
    queryEventsRepository.count.mockResolvedValue(3);

    await expect(service.getStats()).resolves.toEqual({
      create: 2,
      update: 1,
      delete: 0,
      query: 3,
      total: 6,
    });

    expect(createEventsRepository.count).toHaveBeenCalledTimes(1);
    expect(updateEventsRepository.count).toHaveBeenCalledTimes(1);
    expect(deleteEventsRepository.count).toHaveBeenCalledTimes(1);
    expect(queryEventsRepository.count).toHaveBeenCalledTimes(1);
  });

  it('devuelve ceros cuando todos los repositorios están vacíos', async () => {
    createEventsRepository.count.mockResolvedValue(0);
    updateEventsRepository.count.mockResolvedValue(0);
    deleteEventsRepository.count.mockResolvedValue(0);
    queryEventsRepository.count.mockResolvedValue(0);

    await expect(service.getStats()).resolves.toEqual({
      create: 0,
      update: 0,
      delete: 0,
      query: 0,
      total: 0,
    });
  });
});
