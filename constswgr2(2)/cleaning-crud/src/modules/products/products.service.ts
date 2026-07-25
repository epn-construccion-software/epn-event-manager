import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.model';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { EventEmitterService } from '../../services/event-emitter.service';
import { LoggerService } from '../../services/logger.service';
import { ProductEntity } from './product.entity';
import { ProductValidationService } from './product-validation.service';

type PreviousProductValues = {
  name: string;
  category: string;
  quantity: number;
  price: number;
  description: string;
};

type ProductsStats = {
  totalProducts: number;
  totalQuantity: number;
  totalInventoryValue: number;
  averagePrice: number;
  productsByCategory: Record<string, number>;
  generatedAt: string;
  message: string;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private productsRepository: Repository<ProductEntity>,
    private readonly productValidation: ProductValidationService,
    private eventEmitter: EventEmitterService,
    private logger: LoggerService,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.productValidation.validateCreate(createProductDto);

    try {
      await this.productValidation.validateCreateDuplicateId(createProductDto);

      // [PREVENTIVE] Store normalized (trimmed) values
      const productEntity = this.buildCreateProductEntity(createProductDto);

      const savedProduct = await this.productsRepository.save(productEntity);
      const product = this.entityToModel(savedProduct);

      this.logger.info('Producto creado', {
        route: '/products',
        action: 'CREATE',
        productId: product.id,
        name: product.name,
      });

      await this.emitEventSafely(
        'CREATE',
        'product',
        `Producto de limpieza creado: ${product.name}`,
        `Se agregó un nuevo producto de categoría "${product.category}" con ${product.quantity} unidades en inventario`,
        this.buildCreateEventPayload(product),
      );

      return product;
    } catch (error) {
      this.logger.error('Error en create', {
        route: '/products',
        action: 'CREATE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException('Error interno creando producto');
    }
  }

  async findAll(filters: SearchProductsDto = {}): Promise<Product[]> {
    try {
      const products = await this.productsRepository.find();
      // [PREVENTIVE] filter out logically deleted items when enabled
      const activeProducts = this.filterDeletedProducts(products);
      const filteredProducts = this.filterProducts(activeProducts, filters);
      const models = filteredProducts.map(product =>
        this.entityToModel(product),
      );

      this.logger.info('Productos listados', {
        route: '/products',
        action: 'QUERY',
        count: models.length,
      });

      void this.emitEventSafely(
        'QUERY',
        'product',
        'Listado de productos consultado',
        `Se consultó el listado completo de ${models.length} productos`,
        this.buildFindAllEventPayload(models),
      );

      return models;
    } catch (error) {
      this.logger.error('Error en findAll', {
        route: '/products',
        action: 'QUERY',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new InternalServerErrorException(
        'Error interno consultando productos',
      );
    }
  }

  async findOne(id: number): Promise<Product> {
    try {
      const product = await this.getExistingProduct(
        id,
        `Producto con ID ${id} no encontrado en la base de datos`,
      );

      const model = this.entityToModel(product);
      this.logger.info('Producto consultado', {
        route: `/products/${id}`,
        action: 'QUERY',
        productId: model.id,
      });

      void this.emitEventSafely(
        'QUERY',
        'product',
        `Producto consultado: ${product.name}`,
        `Se consultó el producto con ID ${id}`,
        this.buildFindOneEventPayload(product),
      );

      return model;
    } catch (error) {
      this.logger.error('Error en findOne', {
        route: `/products/${id}`,
        action: 'QUERY',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error interno consultando producto',
      );
    }
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    try {
      const product = await this.getExistingProduct(
        id,
        `Producto con ID ${id} no encontrado. No se puede actualizar.`,
      );

      // [PREVENTIVE] Validate all fields consistently in update (same rules as create)
      this.productValidation.validateUpdate(updateProductDto);
      const previousValues = this.buildPreviousProductValues(product);

      // [PREVENTIVE] Store normalized (trimmed) values
      this.applyProductUpdates(product, updateProductDto);

      const updatedProduct = await this.productsRepository.save(product);
      const model = this.entityToModel(updatedProduct);

      this.logger.info('Producto actualizado', {
        route: `/products/${id}`,
        action: 'UPDATE',
        productId: model.id,
      });

      await this.emitEventSafely(
        'UPDATE',
        'product',
        `Producto actualizado: ${product.name}`,
        `Se actualizaron los datos del producto con ID ${id}`,
        this.buildUpdateEventPayload(product, previousValues, updateProductDto),
      );

      return model;
    } catch (error) {
      this.logger.error('Error en update', {
        route: `/products/${id}`,
        action: 'UPDATE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new InternalServerErrorException(
        'Error interno actualizando producto',
      );
    }
  }

  async remove(id: number): Promise<Product> {
    try {
      const product = await this.getExistingProduct(
        id,
        `Producto con ID ${id} no encontrado. No se puede eliminar.`,
      );

      const model = this.entityToModel(product);
      if (this.isLogicalDeleteEnabled()) {
        product.deleted = true;
        await this.productsRepository.save(product);
        this.logger.info('Producto eliminado lógicamente', {
          route: `/products/${id}`,
          action: 'DELETE',
          productId: model.id,
        });
      } else {
        await this.productsRepository.remove(product);
        this.logger.info('Producto eliminado físicamente', {
          route: `/products/${id}`,
          action: 'DELETE',
          productId: model.id,
        });
      }

      await this.emitEventSafely(
        'DELETE',
        'product',
        `Producto eliminado: ${product.name}`,
        `Se eliminó el producto con ID ${id} de la base de datos`,
        this.buildDeleteEventPayload(product),
      );

      return model;
    } catch (error) {
      this.logger.error('Error en remove', {
        route: `/products/${id}`,
        action: 'DELETE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException(
        'Error interno eliminando producto',
      );
    }
  }

  async getStats(): Promise<ProductsStats> {
    try {
      const allProducts = await this.productsRepository.find();

      // [PREVENTIVE] Exclude logically deleted products from stats (consistent with findAll)
      const products = this.filterDeletedProducts(allProducts);
      const stats = this.calculateProductsStats(products);

      this.logger.info('Estadísticas generadas', {
        route: '/products/stats',
        action: 'QUERY',
        totalProducts: stats.totalProducts,
      });

      return stats;
    } catch (error) {
      this.logger.error('Error en getStats', {
        route: '/products/stats',
        action: 'QUERY',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new InternalServerErrorException(
        'Error interno generando estadísticas',
      );
    }
  }

  // Regla única de existencia: usada por findOne, update y remove para que
  // un producto inexistente o lógicamente eliminado produzca siempre 404.
  private async getExistingProduct(
    id: number,
    notFoundMessage: string,
  ): Promise<ProductEntity> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product || (this.isLogicalDeleteEnabled() && product.deleted)) {
      throw new NotFoundException(notFoundMessage);
    }

    return product;
  }

  private buildCreateProductEntity(dto: CreateProductDto): ProductEntity {
    return this.productsRepository.create({
      name: dto.name.trim(),
      category: dto.category.trim(),
      quantity: dto.quantity,
      price: dto.price,
      description: dto.description?.trim(),
    });
  }

  private applyProductUpdates(
    product: ProductEntity,
    dto: UpdateProductDto,
  ): void {
    if (dto.name !== undefined) product.name = dto.name.trim();
    if (dto.category !== undefined) product.category = dto.category.trim();
    if (dto.quantity !== undefined) product.quantity = dto.quantity;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.description !== undefined) {
      product.description = dto.description.trim();
    }
  }

  private buildPreviousProductValues(
    product: ProductEntity,
  ): PreviousProductValues {
    return {
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      price: parseFloat(product.price.toString()),
      description: product.description,
    };
  }

  private buildCreateEventPayload(product: Product): Record<string, unknown> {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      price: product.price,
      metadata: this.getAdaptiveMetadata(),
    };
  }

  private buildUpdateEventPayload(
    product: ProductEntity,
    previousValues: PreviousProductValues,
    updateProductDto: UpdateProductDto,
  ): Record<string, unknown> {
    return {
      id: product.id,
      name: product.name,
      previousValues,
      newValues: updateProductDto,
      metadata: this.getAdaptiveMetadata(),
    };
  }

  private buildDeleteEventPayload(
    product: ProductEntity,
  ): Record<string, unknown> {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      price: parseFloat(product.price.toString()),
      metadata: this.getAdaptiveMetadata(),
    };
  }

  private buildFindAllEventPayload(models: Product[]): Record<string, unknown> {
    return {
      count: models.length,
      totalValue: models.reduce(
        (acc: number, product: Product) =>
          acc + parseFloat(product.price.toString()) * product.quantity,
        0,
      ),
      metadata: this.getAdaptiveMetadata(),
    };
  }

  private buildFindOneEventPayload(
    product: ProductEntity,
  ): Record<string, unknown> {
    return {
      id: product.id,
      name: product.name,
      category: product.category,
      metadata: this.getAdaptiveMetadata(),
    };
  }

  private filterProducts(
    products: ProductEntity[],
    filters: SearchProductsDto,
  ): ProductEntity[] {
    const normalizedName = this.normalizeSearchValue(filters.name);
    const normalizedCategory = this.normalizeSearchValue(filters.category);

    return products.filter(product => {
      const productName = this.normalizeSearchValue(product.name);
      const productCategory = this.normalizeSearchValue(product.category);

      const matchesName =
        normalizedName.length === 0 || productName.includes(normalizedName);
      const matchesCategory =
        normalizedCategory.length === 0 ||
        productCategory === normalizedCategory;

      return matchesName && matchesCategory;
    });
  }

  private normalizeSearchValue(value?: string): string {
    return value?.trim().toLowerCase() ?? '';
  }

  private filterDeletedProducts(products: ProductEntity[]): ProductEntity[] {
    return this.isLogicalDeleteEnabled()
      ? products.filter(product => !product.deleted)
      : products;
  }

  private calculateProductsStats(products: ProductEntity[]): ProductsStats {
    const totalProducts = products.length;

    const totalQuantity = products.reduce(
      (acc: number, product: ProductEntity) => acc + product.quantity,
      0,
    );

    const totalInventoryValue = products.reduce(
      (acc: number, product: ProductEntity) =>
        acc + parseFloat(product.price.toString()) * product.quantity,
      0,
    );

    const averagePrice =
      totalQuantity > 0 ? totalInventoryValue / totalQuantity : 0;

    const productsByCategory = products.reduce(
      (acc: Record<string, number>, product: ProductEntity) => {
        acc[product.category] = (acc[product.category] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      totalProducts,
      totalQuantity,
      totalInventoryValue,
      averagePrice,
      productsByCategory,
      generatedAt: new Date().toLocaleString('es-EC', {
        timeZone: 'America/Guayaquil',
      }),
      message: 'Reporte estadístico generado correctamente',
    };
  }

  private getAdaptiveMetadata(): Record<string, string> {
    return {
      source: 'cleaning-crud',
      system: 'Sistema de Gestión de Productos de Limpieza',
      apiVersion: 'v1',
      timestampISO: new Date().toISOString(),
      timezone: 'America/Guayaquil',
      environment: 'local',
      integrationTarget: 'EPN Event Manager',
    };
  }

  private isLogicalDeleteEnabled(): boolean {
    return process.env.LOGICAL_DELETE === 'true';
  }

  private async emitEventSafely(
    action: string,
    entity: string,
    title: string,
    description: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.eventEmitter.emitEvent(
        action,
        entity,
        title,
        description,
        payload,
      );
    } catch (error) {
      this.logger.warn('Error emitiendo evento externo', {
        action,
        entity,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private entityToModel(entity: ProductEntity): Product {
    const product = new Product(
      entity.id,
      entity.name,
      entity.category,
      entity.quantity,
      entity.price as number,
      entity.description,
    );
    product.createdAt = entity.createdAt;
    product.updatedAt = entity.updatedAt;
    return product;
  }
}
