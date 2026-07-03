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

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private productsRepository: Repository<ProductEntity>,
    private eventEmitter: EventEmitterService,
    private logger: LoggerService,
  ) {}

  private getAdaptiveMetadata() {
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

  // [PREVENTIVE] Shared suspicious content pattern
  private readonly suspiciousPattern =
    /<script|<\/script>|SELECT|DROP|INSERT|DELETE|UPDATE|--/i;

  async create(createProductDto: CreateProductDto): Promise<Product> {
    // [CORRECTIVO] Validate required fields
    if (!createProductDto.name || createProductDto.name.trim() === '') {
      throw new BadRequestException('El nombre del producto es obligatorio');
    }
    if (!createProductDto.category || createProductDto.category.trim() === '') {
      throw new BadRequestException('La categoría del producto es obligatoria');
    }
    if (createProductDto.quantity < 0) {
      throw new BadRequestException('La cantidad no puede ser negativa');
    }
    if (createProductDto.price < 0) {
      throw new BadRequestException('El precio no puede ser negativo');
    }

    // [PREVENTIVE] Length and injection checks
    if (createProductDto.name.length > 100) {
      throw new BadRequestException(
        'El nombre no puede superar los 100 caracteres',
      );
    }
    if (createProductDto.category.length > 50) {
      throw new BadRequestException(
        'La categoría no puede superar los 50 caracteres',
      );
    }
    if (
      createProductDto.description &&
      createProductDto.description.length > 300
    ) {
      throw new BadRequestException(
        'La descripción no puede superar los 300 caracteres',
      );
    }
    if (
      this.suspiciousPattern.test(createProductDto.name) ||
      this.suspiciousPattern.test(createProductDto.category) ||
      this.suspiciousPattern.test(createProductDto.description || '')
    ) {
      throw new BadRequestException(
        'El producto contiene texto no permitido por seguridad',
      );
    }

    try {
      // [PREVENTIVE] Duplicate id check if client provides id
      if (
        createProductDto['id'] !== undefined &&
        createProductDto['id'] !== null
      ) {
        const existing = await this.productsRepository.findOne({
          where: { id: createProductDto['id'] },
        });
        if (existing) {
          throw new BadRequestException(
            `Producto con ID ${createProductDto['id']} ya existe`,
          );
        }
      }

      // [PREVENTIVE] Store normalized (trimmed) values
      const productEntity = this.productsRepository.create({
        name: createProductDto.name.trim(),
        category: createProductDto.category.trim(),
        quantity: createProductDto.quantity,
        price: createProductDto.price,
        description: createProductDto.description?.trim(),
      });

      const savedProduct = await this.productsRepository.save(productEntity);
      const product = this.entityToModel(savedProduct);

      this.logger.info('Producto creado', {
        route: '/products',
        action: 'CREATE',
        productId: product.id,
        name: product.name,
      });

      await this.eventEmitter.emitEvent(
        'CREATE',
        'product',
        `Producto de limpieza creado: ${product.name}`,
        `Se agregó un nuevo producto de categoría "${product.category}" con ${product.quantity} unidades en inventario`,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          price: product.price,
          metadata: this.getAdaptiveMetadata(),
        },
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
      const filtered = this.isLogicalDeleteEnabled()
        ? products.filter(p => !p.deleted)
        : products;
      const models = filtered.map(p => this.entityToModel(p));

      this.logger.info('Productos listados', {
        route: '/products',
        action: 'QUERY',
        count: models.length,
      });

      this.eventEmitter.emitEvent(
        'QUERY',
        'product',
        'Listado de productos consultado',
        `Se consultó el listado completo de ${models.length} productos`,
        {
          count: models.length,
          totalValue: models.reduce(
            (acc: number, p: Product) =>
              acc + parseFloat(p.price.toString()) * p.quantity,
            0,
          ),
          metadata: this.getAdaptiveMetadata(),
        },
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

      this.eventEmitter.emitEvent(
        'QUERY',
        'product',
        `Producto consultado: ${product.name}`,
        `Se consultó el producto con ID ${id}`,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          metadata: this.getAdaptiveMetadata(),
        },
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
      if (updateProductDto.name !== undefined) {
        if (updateProductDto.name.trim() === '')
          throw new BadRequestException(
            'El nombre del producto es obligatorio',
          );
        if (updateProductDto.name.length > 100)
          throw new BadRequestException(
            'El nombre no puede superar los 100 caracteres',
          );
        if (this.suspiciousPattern.test(updateProductDto.name))
          throw new BadRequestException(
            'Campo nombre contiene texto no permitido',
          );
      }

      if (updateProductDto.category !== undefined) {
        if (updateProductDto.category.trim() === '')
          throw new BadRequestException(
            'La categoría del producto es obligatoria',
          );
        if (updateProductDto.category.length > 50)
          throw new BadRequestException(
            'La categoría no puede superar los 50 caracteres',
          );
        if (this.suspiciousPattern.test(updateProductDto.category))
          throw new BadRequestException(
            'Campo categoría contiene texto no permitido',
          );
      }

      if (updateProductDto.quantity !== undefined) {
        if (updateProductDto.quantity < 0)
          throw new BadRequestException('La cantidad no puede ser negativa');
      }

      if (updateProductDto.price !== undefined) {
        if (updateProductDto.price < 0)
          throw new BadRequestException('El precio no puede ser negativo');
      }

      // [PREVENTIVE] Now also validates description in update (was missing before)
      if (updateProductDto.description !== undefined) {
        if (updateProductDto.description.length > 300)
          throw new BadRequestException(
            'La descripción no puede superar los 300 caracteres',
          );
        if (this.suspiciousPattern.test(updateProductDto.description))
          throw new BadRequestException(
            'Campo descripción contiene texto no permitido',
          );
      }

      const previousValues = {
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        price: parseFloat(product.price.toString()),
        description: product.description,
      };

      // [PREVENTIVE] Store normalized (trimmed) values
      if (updateProductDto.name !== undefined)
        product.name = updateProductDto.name.trim();
      if (updateProductDto.category !== undefined)
        product.category = updateProductDto.category.trim();
      if (updateProductDto.quantity !== undefined)
        product.quantity = updateProductDto.quantity;
      if (updateProductDto.price !== undefined)
        product.price = updateProductDto.price;
      if (updateProductDto.description !== undefined)
        product.description = updateProductDto.description.trim();

      const updatedProduct = await this.productsRepository.save(product);
      const model = this.entityToModel(updatedProduct);

      this.logger.info('Producto actualizado', {
        route: `/products/${id}`,
        action: 'UPDATE',
        productId: model.id,
      });

      await this.eventEmitter.emitEvent(
        'UPDATE',
        'product',
        `Producto actualizado: ${product.name}`,
        `Se actualizaron los datos del producto con ID ${id}`,
        {
          id: product.id,
          name: product.name,
          previousValues,
          newValues: updateProductDto,
          metadata: this.getAdaptiveMetadata(),
        },
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

      await this.eventEmitter.emitEvent(
        'DELETE',
        'product',
        `Producto eliminado: ${product.name}`,
        `Se eliminó el producto con ID ${id} de la base de datos`,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          quantity: product.quantity,
          price: parseFloat(product.price.toString()),
          metadata: this.getAdaptiveMetadata(),
        },
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

  async getStats() {
    try {
      const allProducts = await this.productsRepository.find();

      // [PREVENTIVE] Exclude logically deleted products from stats (consistent with findAll)
      const products = this.isLogicalDeleteEnabled()
        ? allProducts.filter(p => !p.deleted)
        : allProducts;

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
        {} as Record<string, number>,
      );

      this.logger.info('Estadísticas generadas', {
        route: '/products/stats',
        action: 'QUERY',
        totalProducts,
      });

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
