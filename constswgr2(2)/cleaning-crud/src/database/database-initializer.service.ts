import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../modules/products/product.entity';

@Injectable()
export class DatabaseInitializerService implements OnModuleInit {
  constructor(
    @InjectRepository(ProductEntity)
    private productsRepository: Repository<ProductEntity>,
  ) {}

  async onModuleInit() {
    // Crear tabla si no existe (TypeORM lo hace automáticamente con synchronize: true)
    // Pero aquí podemos agregar datos iniciales si lo deseamos
    const count = await this.productsRepository.count();

    if (count === 0) {
      console.log('📦 Base de datos vacía. Agregando productos de ejemplo...');

      const sampleProducts = [
        {
          name: 'Desinfectante Multiusos',
          category: 'desinfectantes',
          quantity: 50,
          price: 5.99,
          description: 'Elimina 99.9% de bacterias y virus',
        },
        {
          name: 'Detergente para Pisos',
          category: 'detergentes',
          quantity: 30,
          price: 3.5,
          description: 'Detergente concentrado para pisos',
        },
        {
          name: 'Papel Higiénico Premium',
          category: 'papel',
          quantity: 200,
          price: 1.25,
          description: 'Papel higiénico suave y resistente',
        },
      ];

      for (const product of sampleProducts) {
        await this.productsRepository.save(product);
      }

      console.log('✅ Productos de ejemplo agregados exitosamente');
    } else {
      console.log(`✅ Base de datos con ${count} productos existentes`);
    }
  }
}
