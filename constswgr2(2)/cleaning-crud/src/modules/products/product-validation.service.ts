import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductEntity } from './product.entity';

@Injectable()
export class ProductValidationService {
  private readonly suspiciousPattern =
    /<script|<\/script>|SELECT|DROP|INSERT|DELETE|UPDATE|--/i;

  constructor(
    @InjectRepository(ProductEntity)
    private readonly productsRepository: Repository<ProductEntity>,
  ) {}

  validateCreate(dto: CreateProductDto): void {
    this.validateRequiredCreateFields(dto);
    this.validateCreateFieldLengths(dto);
    this.validateSuspiciousCreateContent(dto);
  }

  async validateCreateDuplicateId(dto: CreateProductDto): Promise<void> {
    if (dto.id === undefined || dto.id === null) return;

    const existingProduct = await this.productsRepository.findOne({
      where: { id: dto.id },
    });

    if (existingProduct) {
      throw new BadRequestException(`Producto con ID ${dto.id} ya existe`);
    }
  }

  validateUpdate(dto: UpdateProductDto): void {
    this.validateUpdateName(dto.name);
    this.validateUpdateCategory(dto.category);
    this.validateUpdateQuantity(dto.quantity);
    this.validateUpdatePrice(dto.price);
    this.validateUpdateDescription(dto.description);
  }

  private validateRequiredCreateFields(dto: CreateProductDto): void {
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
}
