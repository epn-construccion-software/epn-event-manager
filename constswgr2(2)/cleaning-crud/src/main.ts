import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { NextFunction, Request, Response } from 'express';
import * as path from 'path';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggerService } from './services/logger.service';

dotenv.config();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilitar CORS
  app.enableCors();

  // Servir archivos estáticos
  app.useStaticAssets(path.join(__dirname, '..', 'public'));

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filtro global de excepciones
  app.useGlobalFilters(new HttpExceptionFilter());

  // Middleware de autenticación mediante API Key
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isPublicRoute =
      request.path === '/health' ||
      request.path.startsWith('/health') ||
      request.path === '/' ||
      request.path.startsWith('/index') ||
      /\.(js|css|ico|png|jpg|jpeg|svg|woff|woff2|ttf)$/.test(request.path);

    if (isPublicRoute) {
      next();
      return;
    }

    const requiredApiKey = process.env.FIS_EPN_KEY;
    const providedApiKey =
      request.header('X-FIS-EPN-KEY') ?? request.headers['x-fis-epn-key'];

    const isValidApiKey =
      requiredApiKey !== undefined &&
      typeof providedApiKey === 'string' &&
      providedApiKey === requiredApiKey;

    if (!isValidApiKey) {
      response.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid API key',
        timestamp: new Date().toISOString(),
        path: request.url,
      });

      return;
    }

    next();
  });

  // Configuración de Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cleaning CRUD API')
    .setDescription(
      'API REST para la gestión de inventario de productos de limpieza',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'X-FIS-EPN-KEY',
      },
      'apiKey',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const logger = new LoggerService();
  const port = Number.parseInt(process.env.PORT ?? '3001', 10);

  await app.listen(port);

  logger.info('Cleaning CRUD iniciado', {
    route: `http://localhost:${port}`,
    action: 'STARTUP',
  });

  logger.info('Swagger UI disponible', {
    route: `http://localhost:${port}/api/docs`,
    action: 'STARTUP',
  });
}

void bootstrap();
