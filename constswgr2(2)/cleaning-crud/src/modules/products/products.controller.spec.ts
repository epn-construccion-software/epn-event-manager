import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '../../services/logger.service';
import { Product } from './product.model';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  name: 'Cloro',
  category: 'Desinfectantes',
  quantity: 5,
  price: 2.5,
  description: 'Botella',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  deleted: false,
  ...overrides,
});

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: jest.Mocked<
    Pick<
      ProductsService,
      'create' | 'findAll' | 'findOne' | 'update' | 'remove' | 'getStats'
    >
  >;
  let logger: jest.Mocked<Pick<LoggerService, 'info' | 'error' | 'warn'>>;

  beforeEach(() => {
    productsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    };
    logger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };
    controller = new ProductsController(
      productsService as unknown as ProductsService,
      logger as unknown as LoggerService,
    );
  });

  it('creates products and logs the action', async () => {
    const product = makeProduct({ id: 7 });
    productsService.create.mockResolvedValue(product);

    await expect(
      controller.create({
        name: 'Cloro',
        category: 'Desinfectantes',
        quantity: 1,
        price: 1,
      }),
    ).resolves.toBe(product);
    expect(logger.info).toHaveBeenCalledWith(
      'Controlador: producto creado',
      expect.objectContaining({ productId: 7 }),
    );
  });

  it('rejects create requests missing required body fields', async () => {
    await expect(
      controller.create({
        name: '',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('propagates known HttpException errors and converts unknown create errors', async () => {
    productsService.create.mockRejectedValueOnce(new NotFoundException('no'));
    await expect(
      controller.create({
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow(NotFoundException);

    productsService.create.mockRejectedValueOnce(new Error('boom'));
    await expect(
      controller.create({
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow(HttpException);
  });

  it('lists products and converts list errors to 500', async () => {
    productsService.findAll.mockResolvedValueOnce([makeProduct()]);
    await expect(controller.findAll()).resolves.toHaveLength(1);

    productsService.findAll.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.findAll()).rejects.toThrow(HttpException);
  });

  it('returns stats and converts stats errors to 500', async () => {
    productsService.getStats.mockResolvedValueOnce({
      totalProducts: 1,
      totalQuantity: 5,
      totalInventoryValue: 12.5,
      averagePrice: 2.5,
      productsByCategory: { Desinfectantes: 1 },
      generatedAt: 'today',
      message: 'ok',
    });
    await expect(controller.getStats()).resolves.toMatchObject({
      totalProducts: 1,
    });

    productsService.getStats.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.getStats()).rejects.toThrow(HttpException);
  });

  it('finds one product and validates numeric ids', async () => {
    productsService.findOne.mockResolvedValueOnce(makeProduct({ id: 9 }));

    await expect(controller.findOne('9')).resolves.toMatchObject({ id: 9 });
    await expect(controller.findOne('abc')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('propagates known findOne errors and converts unknown ones', async () => {
    productsService.findOne.mockRejectedValueOnce(new NotFoundException('no'));
    await expect(controller.findOne('99')).rejects.toThrow(NotFoundException);

    productsService.findOne.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.findOne('99')).rejects.toThrow(HttpException);
  });

  it('updates products and validates numeric ids', async () => {
    productsService.update.mockResolvedValueOnce(makeProduct({ price: 4 }));

    await expect(controller.update('1', { price: 4 })).resolves.toMatchObject({
      price: 4,
    });
    await expect(controller.update('x', { price: 4 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('propagates known update errors and converts unknown ones', async () => {
    productsService.update.mockRejectedValueOnce(
      new BadRequestException('bad'),
    );
    await expect(controller.update('1', { price: -1 })).rejects.toThrow(
      BadRequestException,
    );

    productsService.update.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.update('1', { price: 4 })).rejects.toThrow(
      HttpException,
    );
  });

  it('removes products and validates numeric ids', async () => {
    productsService.remove.mockResolvedValueOnce(makeProduct({ id: 3 }));

    await expect(controller.remove('3')).resolves.toMatchObject({ id: 3 });
    await expect(controller.remove('nan')).rejects.toThrow(BadRequestException);
  });

  it('propagates known remove errors and converts unknown ones', async () => {
    productsService.remove.mockRejectedValueOnce(new NotFoundException('no'));
    await expect(controller.remove('3')).rejects.toThrow(NotFoundException);

    productsService.remove.mockRejectedValueOnce(new Error('boom'));
    await expect(controller.remove('3')).rejects.toThrow(HttpException);
  });

  it('returns InternalServerErrorException from service as an HttpException', async () => {
    productsService.findAll.mockRejectedValueOnce(
      new InternalServerErrorException('service failed'),
    );

    await expect(controller.findAll()).rejects.toThrow(HttpException);
  });
});
