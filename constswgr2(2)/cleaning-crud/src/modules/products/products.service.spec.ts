import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';
import { EventEmitterService } from '../../services/event-emitter.service';
import { LoggerService } from '../../services/logger.service';
import { ProductEntity } from './product.entity';
import { ProductsService } from './products.service';
import { ProductValidationService } from './product-validation.service';

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
  overrides: Partial<ProductEntity> = {},
): ProductEntity => ({
  id: 1,
  name: 'Desinfectante',
  category: 'Limpieza',
  quantity: 10,
  price: 2.5,
  description: 'Producto de prueba',
  deleted: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: MockProductRepository;
  let eventEmitter: {
    emitEvent: jest.MockedFunction<
      (
        action: string,
        entity: string,
        title: string,
        description: string,
        payload: Record<string, unknown>,
      ) => Promise<unknown | undefined>
    >;
  };
  let logger: jest.Mocked<Pick<LoggerService, 'info' | 'error' | 'warn'>>;
  let productValidation: ProductValidationService;

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
    eventEmitter = {
      emitEvent: jest.fn<
        Promise<unknown | undefined>,
        [string, string, string, string, Record<string, unknown>]
      >(async () => undefined),
    };
    logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    productValidation = new ProductValidationService(
      repo as unknown as Repository<ProductEntity>,
    );
    service = new ProductsService(
      repo as unknown as Repository<ProductEntity>,
      productValidation,
      eventEmitter as unknown as EventEmitterService,
      logger as unknown as LoggerService,
    );
    delete process.env.LOGICAL_DELETE;
  });

  afterEach(() => {
    delete process.env.LOGICAL_DELETE;
  });

  it('creates a product, trims values, logs and emits an event', async () => {
    const validateCreate = jest.spyOn(productValidation, 'validateCreate');
    const validateDuplicate = jest.spyOn(
      productValidation,
      'validateCreateDuplicateId',
    );
    const product = await service.create({
      name: '  Cloro  ',
      category: '  Desinfectantes  ',
      quantity: 3,
      price: 1.5,
      description: '  Botella  ',
    });

    expect(repo.create).toHaveBeenCalledWith({
      name: 'Cloro',
      category: 'Desinfectantes',
      quantity: 3,
      price: 1.5,
      description: 'Botella',
    });
    expect(product.name).toBe('Cloro');
    expect(validateCreate).toHaveBeenCalledTimes(1);
    expect(validateDuplicate).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Producto creado',
      expect.objectContaining({ action: 'CREATE', productId: 1 }),
    );
    expect(eventEmitter.emitEvent).toHaveBeenCalledWith(
      'CREATE',
      'product',
      'Producto de limpieza creado: Cloro',
      expect.stringContaining('Desinfectantes'),
      expect.objectContaining({ name: 'Cloro' }),
    );
  });

  it.each([
    ['name', { name: '', category: 'Cat', quantity: 1, price: 1 }],
    ['category', { name: 'Name', category: '', quantity: 1, price: 1 }],
    ['quantity', { name: 'Name', category: 'Cat', quantity: -1, price: 1 }],
    ['price', { name: 'Name', category: 'Cat', quantity: 1, price: -1 }],
    [
      'long name',
      { name: 'x'.repeat(101), category: 'Cat', quantity: 1, price: 1 },
    ],
    [
      'long category',
      { name: 'Name', category: 'x'.repeat(51), quantity: 1, price: 1 },
    ],
    [
      'long description',
      {
        name: 'Name',
        category: 'Cat',
        quantity: 1,
        price: 1,
        description: 'x'.repeat(301),
      },
    ],
    [
      'suspicious text',
      { name: 'DROP TABLE', category: 'Cat', quantity: 1, price: 1 },
    ],
  ])('rejects invalid create data: %s', async (_caseName, dto) => {
    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate ids supplied by a client', async () => {
    repo.findOne.mockResolvedValue(makeProductEntity({ id: 5 }));

    await expect(
      service.create({
        id: 5,
        name: 'Cloro',
        category: 'Desinfectantes',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('wraps repository errors while creating', async () => {
    repo.save.mockRejectedValue(new Error('database down'));

    await expect(
      service.create({
        name: 'Cloro',
        category: 'Desinfectantes',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow(InternalServerErrorException);
    expect(logger.error).toHaveBeenCalledWith(
      'Error en create',
      expect.objectContaining({ error: 'database down' }),
    );
  });

  it('lists products and excludes logically deleted records when enabled', async () => {
    process.env.LOGICAL_DELETE = 'true';
    repo.find.mockResolvedValue([
      makeProductEntity({ id: 1, deleted: false }),
      makeProductEntity({ id: 2, deleted: true }),
    ]);

    const products = await service.findAll();

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe(1);
    expect(eventEmitter.emitEvent).toHaveBeenCalledWith(
      'QUERY',
      'product',
      'Listado de productos consultado',
      expect.stringContaining('1 productos'),
      expect.objectContaining({ count: 1, totalValue: 25 }),
    );
  });

  it('wraps repository errors while listing', async () => {
    repo.find.mockRejectedValue(new Error('find failed'));

    await expect(service.findAll()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('finds one product and emits a query event', async () => {
    repo.findOne.mockResolvedValue(
      makeProductEntity({ id: 10, name: 'Jabon' }),
    );

    const product = await service.findOne(10);

    expect(product.id).toBe(10);
    expect(eventEmitter.emitEvent).toHaveBeenCalledWith(
      'QUERY',
      'product',
      'Producto consultado: Jabon',
      'Se consultó el producto con ID 10',
      expect.objectContaining({ id: 10 }),
    );
  });

  it('throws NotFoundException when a product does not exist or is logically deleted', async () => {
    await expect(service.findOne(404)).rejects.toThrow(NotFoundException);

    process.env.LOGICAL_DELETE = 'true';
    repo.findOne.mockResolvedValue(makeProductEntity({ deleted: true }));

    await expect(service.findOne(2)).rejects.toThrow(NotFoundException);
  });

  it('wraps unexpected findOne errors', async () => {
    repo.findOne.mockRejectedValue(new Error('broken query'));

    await expect(service.findOne(1)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('updates a product and records previous values in the event payload', async () => {
    const validateUpdate = jest.spyOn(productValidation, 'validateUpdate');
    repo.findOne.mockResolvedValue(makeProductEntity({ id: 2, name: 'Viejo' }));

    const updated = await service.update(2, {
      name: ' Nuevo ',
      category: ' Nueva ',
      quantity: 5,
      price: 3,
      description: ' Ajustado ',
    });

    expect(updated.name).toBe('Nuevo');
    expect(validateUpdate).toHaveBeenCalledTimes(1);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Nuevo',
        category: 'Nueva',
        description: 'Ajustado',
      }),
    );
    expect(eventEmitter.emitEvent).toHaveBeenCalledWith(
      'UPDATE',
      'product',
      'Producto actualizado: Nuevo',
      expect.stringContaining('ID 2'),
      expect.objectContaining({
        previousValues: expect.objectContaining({ name: 'Viejo' }),
      }),
    );
  });

  it.each([
    [{ name: '' }],
    [{ name: 'x'.repeat(101) }],
    [{ name: 'SELECT * FROM products' }],
    [{ category: '' }],
    [{ category: 'x'.repeat(51) }],
    [{ category: 'UPDATE products' }],
    [{ quantity: -1 }],
    [{ price: -1 }],
    [{ description: 'x'.repeat(301) }],
    [{ description: '<script>alert(1)</script>' }],
  ])('rejects invalid update data %#', async dto => {
    repo.findOne.mockResolvedValue(makeProductEntity());

    await expect(service.update(1, dto)).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when updating a missing product', async () => {
    await expect(service.update(404, { price: 10 })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('wraps unexpected update errors', async () => {
    repo.findOne.mockResolvedValue(makeProductEntity());
    repo.save.mockRejectedValue(new Error('save failed'));

    await expect(service.update(1, { price: 10 })).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('removes a product physically by default', async () => {
    const entity = makeProductEntity({ id: 3 });
    repo.findOne.mockResolvedValue(entity);

    const removed = await service.remove(3);

    expect(removed.id).toBe(3);
    expect(repo.remove).toHaveBeenCalledWith(entity);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('removes a product logically when configured', async () => {
    process.env.LOGICAL_DELETE = 'true';
    const entity = makeProductEntity({ id: 4, deleted: false });
    repo.findOne.mockResolvedValue(entity);

    await service.remove(4);

    expect(entity.deleted).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(entity);
    expect(repo.remove).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when removing a missing product', async () => {
    await expect(service.remove(404)).rejects.toThrow(NotFoundException);
  });

  it('wraps unexpected remove errors', async () => {
    repo.findOne.mockResolvedValue(makeProductEntity());
    repo.remove.mockRejectedValue(new Error('remove failed'));

    await expect(service.remove(1)).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('does not stop create when event emission rejects', async () => {
    eventEmitter.emitEvent.mockRejectedValue(new Error('event manager down'));

    await expect(
      service.create({
        name: 'Cloro',
        category: 'Desinfectantes',
        quantity: 1,
        price: 1,
      }),
    ).resolves.toMatchObject({ name: 'Cloro' });
  });

  it('calculates inventory statistics by category', async () => {
    repo.find.mockResolvedValue([
      makeProductEntity({ category: 'A', quantity: 2, price: 5 }),
      makeProductEntity({ category: 'A', quantity: 3, price: 10 }),
      makeProductEntity({ category: 'B', quantity: 1, price: 2 }),
    ]);

    const stats = await service.getStats();

    expect(stats).toMatchObject({
      totalProducts: 3,
      totalQuantity: 6,
      totalInventoryValue: 42,
      averagePrice: 7,
      productsByCategory: { A: 2, B: 1 },
    });
  });

  it('returns zero average price when inventory has no quantity', async () => {
    repo.find.mockResolvedValue([
      makeProductEntity({ quantity: 0, price: 5, deleted: false }),
    ]);

    const stats = await service.getStats();

    expect(stats.averagePrice).toBe(0);
  });

  it('wraps unexpected stats errors', async () => {
    repo.find.mockRejectedValue(new Error('stats failed'));

    await expect(service.getStats()).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('calculates the active products summary', async () => {
    repo.find.mockResolvedValue([
      makeProductEntity({ id: 1, quantity: 2, price: 5 }),
      makeProductEntity({ id: 2, quantity: 3, price: 10 }),
    ]);

    const summary = await service.getActiveSummary();

    expect(summary).toMatchObject({
      activeProducts: 2,
      totalQuantity: 5,
      totalInventoryValue: 40,
    });
  });

  it('excludes logically deleted products from the active summary', async () => {
    process.env.LOGICAL_DELETE = 'true';
    repo.find.mockResolvedValue([
      makeProductEntity({ id: 1, quantity: 2, price: 5, deleted: false }),
      makeProductEntity({ id: 2, quantity: 100, price: 100, deleted: true }),
    ]);

    const summary = await service.getActiveSummary();

    expect(summary).toMatchObject({
      activeProducts: 1,
      totalQuantity: 2,
      totalInventoryValue: 10,
    });
  });

  it('returns zeros when there are no products', async () => {
    repo.find.mockResolvedValue([]);

    const summary = await service.getActiveSummary();

    expect(summary).toMatchObject({
      activeProducts: 0,
      totalQuantity: 0,
      totalInventoryValue: 0,
    });
  });

  it('does not alter /products/stats behaviour', async () => {
    repo.find.mockResolvedValue([
      makeProductEntity({ id: 1, quantity: 2, price: 5 }),
    ]);

    const stats = await service.getStats();
    const summary = await service.getActiveSummary();

    expect(stats.totalProducts).toBe(1);
    expect(summary.activeProducts).toBe(1);
  });

  it('wraps unexpected active summary errors', async () => {
    repo.find.mockRejectedValue(new Error('summary failed'));

    await expect(service.getActiveSummary()).rejects.toThrow(
      InternalServerErrorException,
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error en getActiveSummary',
      expect.objectContaining({ error: 'summary failed' }),
    );
  });
});
