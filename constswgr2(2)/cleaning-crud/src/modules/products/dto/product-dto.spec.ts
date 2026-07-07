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
});
