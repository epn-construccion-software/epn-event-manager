import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './modules/products/products.module';
import { DatabaseModule } from './database/database.module';
import { LoggerService } from './services/logger.service';
import { EventEmitterService } from './services/event-emitter.service';

@Module({
  imports: [DatabaseModule, ProductsModule],
  controllers: [AppController],
  providers: [AppService, LoggerService, EventEmitterService],
})
export class AppModule {}
