import { ProductsService } from './products.service';
import { BadRequestException } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';
import { ProductEntity } from './product.entity';
import { EventEmitterService } from '../../services/event-emitter.service';
import { LoggerService } from '../../services/logger.service';

type MockProductRepository = {
  create: jest.MockedFunction<
    (product: Partial<ProductEntity>) => ProductEntity
  >;
  save: jest.MockedFunction<(product: ProductEntity) => Promise<ProductEntity>>;
  find: jest.MockedFunction<() => Promise<ProductEntity[]>>;
  findOne: jest.MockedFunction<
    (options?: FindOneOptions<ProductEntity>) => Promise<ProductEntity | null>
  >;
  remove: jest.MockedFunction<
    (product: ProductEntity) => Promise<ProductEntity>
  >;
};

const makeProductEntity = (
  overrides: Partial<ProductEntity>,
): ProductEntity => ({
  id: 1,
  name: 'Product',
  category: 'Category',
  quantity: 1,
  price: 1,
  description: '',
  deleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ProductsService (unit)', () => {
  let service: ProductsService;
  let repo: MockProductRepository;
  let eventEmitter: jest.Mocked<Pick<EventEmitterService, 'emitEvent'>>;
  let logger: jest.Mocked<Pick<LoggerService, 'info' | 'error' | 'warn'>>;

  beforeEach(() => {
    repo = {
      create: jest.fn(product => makeProductEntity(product)),
      save: jest.fn(async product =>
        makeProductEntity({ ...product, id: product.id || 1 }),
      ),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      remove: jest.fn(async product => product),
    };

    eventEmitter = { emitEvent: jest.fn() };
    logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

    service = new ProductsService(
      repo as unknown as Repository<ProductEntity>,
      eventEmitter as unknown as EventEmitterService,
      logger as unknown as LoggerService,
    );
  });

  test('CREATE should reject duplicate id when provided', async () => {
    // simulate existing product with id=5
    repo.findOne = jest.fn(async () => makeProductEntity({ id: 5, name: 'X' }));
    await expect(
      service.create({
        id: 5,
        name: 'X',
        category: 'C',
        quantity: 1,
        price: 1,
        description: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  test('READ by id returns entity', async () => {
    const now = new Date();
    repo.findOne = jest.fn(async () =>
      makeProductEntity({
        id: 10,
        name: 'Soap',
        category: 'Hygiene',
        quantity: 2,
        price: 3.5,
        description: 'desc',
        createdAt: now,
        updatedAt: now,
        deleted: false,
      }),
    );
    const prod = await service.findOne(10);
    expect(prod.id).toBe(10);
    expect(prod.name).toBe('Soap');
  });

  test('UPDATE rejects negative price', async () => {
    repo.findOne = jest.fn(async () =>
      makeProductEntity({
        id: 2,
        name: 'P',
        category: 'C',
        quantity: 1,
        price: 5,
        description: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        deleted: false,
      }),
    );
    await expect(service.update(2, { price: -10 })).rejects.toThrow(
      BadRequestException,
    );
  });

  test('DELETE logical vs physical', async () => {
    // logical
    process.env.LOGICAL_DELETE = 'true';
    const entity = makeProductEntity({
      id: 3,
      name: 'D',
      category: 'C',
      quantity: 1,
      price: 1,
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    });
    repo.findOne = jest.fn(async () => entity);
    repo.save = jest.fn(async obj => makeProductEntity(obj));
    await service.remove(3);
    expect(repo.save).toHaveBeenCalled();
    expect(entity.deleted).toBe(true);

    // physical
    process.env.LOGICAL_DELETE = 'false';
    const entity2 = makeProductEntity({
      id: 4,
      name: 'E',
      category: 'C',
      quantity: 1,
      price: 1,
      description: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      deleted: false,
    });
    repo.findOne = jest.fn(async () => entity2);
    repo.remove = jest.fn(async obj => obj);
    await service.remove(4);
    expect(repo.remove).toHaveBeenCalled();
  });
});
