import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../modules/products/product.entity';
import { DatabaseInitializerService } from './database-initializer.service';

// [ADAPTIVE] read DB configuration from environment variables
const dbPath = process.env.DB_PATH || 'database.sqlite';
const synchronize = process.env.DB_SYNCHRONIZE !== 'false';
const logging = process.env.DB_LOGGING === 'true' || false;

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [ProductEntity],
      synchronize,
      logging,
    }),
    TypeOrmModule.forFeature([ProductEntity]),
  ],
  providers: [DatabaseInitializerService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
