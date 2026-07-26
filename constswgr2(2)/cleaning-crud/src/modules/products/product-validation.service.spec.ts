import { FindOneOptions, Repository } from 'typeorm';
import { ProductEntity } from './product.entity';
import { ProductValidationService } from './product-validation.service';

type RepositoryMock = {
  findOne: jest.MockedFunction<
    (options?: FindOneOptions<ProductEntity>) => Promise<ProductEntity | null>
  >;
};

describe('ProductValidationService', () => {
  let service: ProductValidationService;
  let repository: RepositoryMock;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(async () => null),
    };
    service = new ProductValidationService(
      repository as unknown as Repository<ProductEntity>,
    );
  });

  it('accepts valid create data', () => {
    expect(() =>
      service.validateCreate({
        name: 'Cloro',
        category: 'Desinfectantes',
        quantity: 1,
        price: 2,
        description: 'Botella',
      }),
    ).not.toThrow();
  });

  it.each([
    [
      'name vacío',
      { name: '', category: 'Cat', quantity: 1, price: 1 },
      'El nombre del producto es obligatorio',
    ],
    [
      'category con espacios',
      { name: 'Cloro', category: '   ', quantity: 1, price: 1 },
      'La categoría del producto es obligatoria',
    ],
    [
      'quantity negativa',
      { name: 'Cloro', category: 'Cat', quantity: -1, price: 1 },
      'La cantidad no puede ser negativa',
    ],
    [
      'price negativo',
      { name: 'Cloro', category: 'Cat', quantity: 1, price: -1 },
      'El precio no puede ser negativo',
    ],
    [
      'name largo',
      { name: 'x'.repeat(101), category: 'Cat', quantity: 1, price: 1 },
      'El nombre no puede superar los 100 caracteres',
    ],
    [
      'category larga',
      { name: 'Cloro', category: 'x'.repeat(51), quantity: 1, price: 1 },
      'La categoría no puede superar los 50 caracteres',
    ],
    [
      'description larga',
      {
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
        description: 'x'.repeat(301),
      },
      'La descripción no puede superar los 300 caracteres',
    ],
    [
      'contenido no permitido',
      { name: 'DROP TABLE', category: 'Cat', quantity: 1, price: 1 },
      'El producto contiene texto no permitido por seguridad',
    ],
  ])('rejects create data with %s', (_case, dto, message) => {
    expect(() => service.validateCreate(dto)).toThrow(message);
  });

  it('skips duplicate lookup when id is omitted', async () => {
    await expect(
      service.validateCreateDuplicateId({
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).resolves.toBeUndefined();

    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('accepts an unused explicit id', async () => {
    await expect(
      service.validateCreateDuplicateId({
        id: 7,
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).resolves.toBeUndefined();

    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it('rejects a duplicated explicit id with the existing message', async () => {
    repository.findOne.mockResolvedValue({ id: 7 } as ProductEntity);

    await expect(
      service.validateCreateDuplicateId({
        id: 7,
        name: 'Cloro',
        category: 'Cat',
        quantity: 1,
        price: 1,
      }),
    ).rejects.toThrow('Producto con ID 7 ya existe');
  });

  it('accepts an empty partial update', () => {
    expect(() => service.validateUpdate({})).not.toThrow();
  });

  it.each([
    [{ name: '' }, 'El nombre del producto es obligatorio'],
    [
      { name: 'x'.repeat(101) },
      'El nombre no puede superar los 100 caracteres',
    ],
    [{ name: 'SELECT products' }, 'Campo nombre contiene texto no permitido'],
    [{ category: '   ' }, 'La categoría del producto es obligatoria'],
    [
      { category: 'x'.repeat(51) },
      'La categoría no puede superar los 50 caracteres',
    ],
    [
      { category: 'UPDATE products' },
      'Campo categoría contiene texto no permitido',
    ],
    [{ quantity: -1 }, 'La cantidad no puede ser negativa'],
    [{ price: -1 }, 'El precio no puede ser negativo'],
    [
      { description: 'x'.repeat(301) },
      'La descripción no puede superar los 300 caracteres',
    ],
    [
      { description: '<script>alert(1)</script>' },
      'Campo descripción contiene texto no permitido',
    ],
  ])('rejects invalid update data %#', (dto, message) => {
    expect(() => service.validateUpdate(dto)).toThrow(message);
  });
});
