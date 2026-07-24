import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

describe('Product DTO validation', () => {
  it('accepts valid create product data', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Cloro',
      category: 'Desinfectantes',
      quantity: 3,
      price: 1.5,
      description: 'Botella',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid create product data', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: '',
      category: 'x'.repeat(51),
      quantity: -1,
      price: -2,
      description: 'x'.repeat(301),
    });

    const errors = await validate(dto);

    expect(errors.map(error => error.property)).toEqual(
      expect.arrayContaining([
        'name',
        'category',
        'quantity',
        'price',
        'description',
      ]),
    );
  });

  it.each([
    ['name ausente', { category: 'Cat', quantity: 1, price: 1 }, 'name'],
    ['category ausente', { name: 'Cloro', quantity: 1, price: 1 }, 'category'],
    [
      'name vacío',
      { name: '', category: 'Cat', quantity: 1, price: 1 },
      'name',
    ],
    [
      'category con espacios',
      { name: 'Cloro', category: '   ', quantity: 1, price: 1 },
      'category',
    ],
    [
      'quantity ausente',
      { name: 'Cloro', category: 'Cat', price: 1 },
      'quantity',
    ],
    [
      'quantity no numérico',
      { name: 'Cloro', category: 'Cat', quantity: 'uno', price: 1 },
      'quantity',
    ],
    ['price ausente', { name: 'Cloro', category: 'Cat', quantity: 1 }, 'price'],
    [
      'price no numérico',
      { name: 'Cloro', category: 'Cat', quantity: 1, price: 'uno' },
      'price',
    ],
  ])('rejects create data with %s', async (_case, payload, property) => {
    const dto = plainToInstance(CreateProductDto, payload);

    const errors = await validate(dto);

    expect(errors.map(error => error.property)).toContain(property);
  });

  it('accepts partial valid update product data', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      price: 2.75,
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects invalid update product data', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      name: 123,
      quantity: -10,
    });

    const errors = await validate(dto);

    expect(errors.map(error => error.property)).toEqual(
      expect.arrayContaining(['name', 'quantity']),
    );
  });

  it.each([
    ['name vacío', { name: '' }, 'name'],
    ['name con espacios', { name: '   ' }, 'name'],
    ['category vacía', { category: '' }, 'category'],
    ['category con espacios', { category: '   ' }, 'category'],
    ['price no numérico', { price: 'uno' }, 'price'],
    ['quantity no numérico', { quantity: 'uno' }, 'quantity'],
    ['name nulo', { name: null }, 'name'],
  ])('rejects update data with %s', async (_case, payload, property) => {
    const dto = plainToInstance(UpdateProductDto, payload);

    const errors = await validate(dto);

    expect(errors.map(error => error.property)).toContain(property);
  });
});
