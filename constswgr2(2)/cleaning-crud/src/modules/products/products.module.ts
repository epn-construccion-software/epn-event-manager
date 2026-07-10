import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { EventEmitterService } from '../../services/event-emitter.service';
import { LoggerService } from '../../services/logger.service';
import { ProductEntity } from './product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity])],
  controllers: [ProductsController],
  providers: [ProductsService, EventEmitterService, LoggerService],
})
export class ProductsModule {}
