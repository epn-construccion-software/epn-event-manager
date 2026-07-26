import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { LoggerService } from '../../services/logger.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      if (!createProductDto.name || !createProductDto.category) {
        throw new BadRequestException(
          'Los campos name y category son requeridos',
        );
      }
      const result = await this.productsService.create(createProductDto);
      this.logger.info('Controlador: producto creado', {
        route: '/products',
        action: 'CREATE',
        productId: result.id,
      });
      return result;
    } catch (error) {
      this.logger.error('Controlador: error en create', {
        route: '/products',
        action: 'CREATE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error interno en create',
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }

  @Get()
  async findAll(@Query() filters: SearchProductsDto = {}) {
    try {
      const result = await this.productsService.findAll(filters);
      this.logger.info('Controlador: productos listados', {
        route: '/products',
        action: 'QUERY',
        count: result.length,
      });
      return result;
    } catch (error) {
      this.logger.error('Controlador: error en findAll', {
        route: '/products',
        action: 'QUERY',
        error: error instanceof Error ? error.message : String(error),
      });
      throw new HttpException(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error interno en findAll',
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }

  @Get('stats')
  async getStats() {
    try {
      const result = await this.productsService.getStats();
      this.logger.info('Controlador: estadísticas generadas', {
        route: '/products/stats',
        action: 'QUERY',
      });
      return result;
    } catch (error) {
      this.handleAggregationError(
        error,
        '/products/stats',
        'Controlador: error en getStats',
        'Error interno en getStats',
      );
    }
  }

  @Get('active-summary')
  async getActiveSummary() {
    try {
      const result = await this.productsService.getActiveSummary();
      this.logger.info('Controlador: resumen de productos activos generado', {
        route: '/products/active-summary',
        action: 'QUERY',
      });
      return result;
    } catch (error) {
      this.handleAggregationError(
        error,
        '/products/active-summary',
        'Controlador: error en getActiveSummary',
        'Error interno en getActiveSummary',
      );
    }
  }

  // [PREVENTIVE] Shared by los endpoints de agregacion (stats/active-summary)
  // para responder un 500 uniforme sin duplicar la construccion del error.
  private handleAggregationError(
    error: unknown,
    route: string,
    logMessage: string,
    publicMessage: string,
  ): never {
    this.logger.error(logMessage, {
      route,
      action: 'QUERY',
      error: error instanceof Error ? error.message : String(error),
    });
    throw new HttpException(
      {
        statusCode: 500,
        error: 'Internal Server Error',
        message: publicMessage,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        throw new BadRequestException('El ID debe ser un número válido');
      }
      const result = await this.productsService.findOne(parsedId);
      this.logger.info('Controlador: producto consultado', {
        route: `/products/${parsedId}`,
        action: 'QUERY',
        productId: parsedId,
      });
      return result;
    } catch (error) {
      this.logger.error('Controlador: error en findOne', {
        route: `/products/${id}`,
        action: 'QUERY',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error interno en findOne',
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        throw new BadRequestException('El ID debe ser un número válido');
      }
      const result = await this.productsService.update(
        parsedId,
        updateProductDto,
      );
      this.logger.info('Controlador: producto actualizado', {
        route: `/products/${parsedId}`,
        action: 'UPDATE',
        productId: parsedId,
      });
      return result;
    } catch (error) {
      this.logger.error('Controlador: error en update', {
        route: `/products/${id}`,
        action: 'UPDATE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error interno en update',
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        throw new BadRequestException('El ID debe ser un número válido');
      }
      const result = await this.productsService.remove(parsedId);
      this.logger.info('Controlador: producto eliminado', {
        route: `/products/${parsedId}`,
        action: 'DELETE',
        productId: parsedId,
      });
      return result;
    } catch (error) {
      this.logger.error('Controlador: error en remove', {
        route: `/products/${id}`,
        action: 'DELETE',
        error: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Error interno en remove',
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  }
}
