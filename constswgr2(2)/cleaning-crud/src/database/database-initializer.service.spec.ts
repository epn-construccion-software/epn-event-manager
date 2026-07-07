import { Repository } from 'typeorm';
import { ProductEntity } from '../modules/products/product.entity';
import { DatabaseInitializerService } from './database-initializer.service';

type MockProductRepository = {
  count: jest.MockedFunction<() => Promise<number>>;
  save: jest.MockedFunction<
    (product: Partial<ProductEntity>) => Promise<Partial<ProductEntity>>
  >;
};

describe('DatabaseInitializerService', () => {
  let repo: MockProductRepository;
  let logSpy: jest.SpyInstance<
    void,
    [message?: unknown, ...optionalParams: unknown[]]
  >;

  beforeEach(() => {
    repo = {
      count: jest.fn(),
      save: jest.fn(async product => product),
    };
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('seeds sample products when the database is empty', async () => {
    repo.count.mockResolvedValue(0);
    const service = new DatabaseInitializerService(
      repo as unknown as Repository<ProductEntity>,
    );

    await service.onModuleInit();

    expect(repo.save).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Desinfectante Multiusos' }),
    );
  });

  it('does not seed when products already exist', async () => {
    repo.count.mockResolvedValue(4);
    const service = new DatabaseInitializerService(
      repo as unknown as Repository<ProductEntity>,
    );

    await service.onModuleInit();

    expect(repo.save).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      '✅ Base de datos con 4 productos existentes',
    );
  });
});
