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
import { EventEmitterService } from '../../services/event-emitter.service';
import { LoggerService } from '../../services/logger.service';
import { ProductEntity } from './product.entity';

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
    private eventEmitter: EventEmitterService,
    private logger: LoggerService,
  ) {}

  // [PREVENTIVE] Shared suspicious content pattern
  private readonly suspiciousPattern =
    /<script|<\/script>|SELECT|DROP|INSERT|DELETE|UPDATE|--/i;

  async create(createProductDto: CreateProductDto): Promise<Product> {
    this.validateCreateProductDto(createProductDto);

    try {
      await this.validateCreateDuplicateId(createProductDto);

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

  async findAll(): Promise<Product[]> {
    try {
      const products = await this.productsRepository.find();
      // [PREVENTIVE] filter out logically deleted items when enabled
      const filtered = this.filterDeletedProducts(products);
      const models = filtered.map(product => this.entityToModel(product));

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
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product || (this.isLogicalDeleteEnabled() && product.deleted)) {
        throw new NotFoundException(
          `Producto con ID ${id} no encontrado en la base de datos`,
        );
      }

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
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${id} no encontrado. No se puede actualizar.`,
        );
      }

      // [PREVENTIVE] Validate all fields consistently in update (same rules as create)
      this.validateUpdateProductDto(updateProductDto);
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
      const product = await this.productsRepository.findOne({ where: { id } });

      if (!product) {
        throw new NotFoundException(
          `Producto con ID ${id} no encontrado. No se puede eliminar.`,
        );
      }

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

  private validateCreateProductDto(dto: CreateProductDto): void {
    this.validateRequiredCreateFields(dto);
    this.validateCreateFieldLengths(dto);
    this.validateSuspiciousCreateContent(dto);
  }

  private validateRequiredCreateFields(dto: CreateProductDto): void {
    // [CORRECTIVO] Validate required fields
    if (!dto.name || dto.name.trim() === '') {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }
    if (!dto.category || dto.category.trim() === '') {
      throw new BadRequestException('La categoría del producto es obligatoria');
    }
    if (dto.quantity < 0) {
      throw new BadRequestException('La cantidad no puede ser negativa');
    }
    if (dto.price < 0) {
      throw new BadRequestException('El precio no puede ser negativo');
    }
  }

  private validateCreateFieldLengths(dto: CreateProductDto): void {
    // [PREVENTIVE] Length checks
    if (dto.name.length > 100) {
      throw new BadRequestException(
        'El nombre no puede superar los 100 caracteres',
      );
    }
    if (dto.category.length > 50) {
      throw new BadRequestException(
        'La categoría no puede superar los 50 caracteres',
      );
    }
    if (dto.description && dto.description.length > 300) {
      throw new BadRequestException(
        'La descripción no puede superar los 300 caracteres',
      );
    }
  }

  private validateSuspiciousCreateContent(dto: CreateProductDto): void {
    // [PREVENTIVE] Injection checks
    if (
      this.suspiciousPattern.test(dto.name) ||
      this.suspiciousPattern.test(dto.category) ||
      this.suspiciousPattern.test(dto.description || '')
    ) {
      throw new BadRequestException(
        'El producto contiene texto no permitido por seguridad',
      );
    }
  }

  private async validateCreateDuplicateId(
    dto: CreateProductDto,
  ): Promise<void> {
    // [PREVENTIVE] Duplicate id check if client provides id
    if (dto.id !== undefined && dto.id !== null) {
      const existing = await this.productsRepository.findOne({
        where: { id: dto.id },
      });
      if (existing) {
        throw new BadRequestException(`Producto con ID ${dto.id} ya existe`);
      }
    }
  }

  private validateUpdateProductDto(dto: UpdateProductDto): void {
    this.validateUpdateName(dto.name);
    this.validateUpdateCategory(dto.category);
    this.validateUpdateQuantity(dto.quantity);
    this.validateUpdatePrice(dto.price);
    this.validateUpdateDescription(dto.description);
  }

  private validateUpdateName(name: string | undefined): void {
    if (name === undefined) return;

    if (name.trim() === '') {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }
    if (name.length > 100) {
      throw new BadRequestException(
        'El nombre no puede superar los 100 caracteres',
      );
    }
    if (this.suspiciousPattern.test(name)) {
      throw new BadRequestException('Campo nombre contiene texto no permitido');
    }
  }

  private validateUpdateCategory(category: string | undefined): void {
    if (category === undefined) return;

    if (category.trim() === '') {
      throw new BadRequestException('La categoría del producto es obligatoria');
    }
    if (category.length > 50) {
      throw new BadRequestException(
        'La categoría no puede superar los 50 caracteres',
      );
    }
    if (this.suspiciousPattern.test(category)) {
      throw new BadRequestException(
        'Campo categoría contiene texto no permitido',
      );
    }
  }

  private validateUpdateQuantity(quantity: number | undefined): void {
    if (quantity !== undefined && quantity < 0) {
      throw new BadRequestException('La cantidad no puede ser negativa');
    }
  }

  private validateUpdatePrice(price: number | undefined): void {
    if (price !== undefined && price < 0) {
      throw new BadRequestException('El precio no puede ser negativo');
    }
  }

  private validateUpdateDescription(description: string | undefined): void {
    if (description === undefined) return;

    // [PREVENTIVE] Now also validates description in update (was missing before)
    if (description.length > 300) {
      throw new BadRequestException(
        'La descripción no puede superar los 300 caracteres',
      );
    }
    if (this.suspiciousPattern.test(description)) {
      throw new BadRequestException(
        'Campo descripción contiene texto no permitido',
      );
    }
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
