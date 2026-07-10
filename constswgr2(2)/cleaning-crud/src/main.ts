import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ValidationPipe } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { Request, Response, NextFunction } from 'express';

dotenv.config(); // [ADAPTIVE] load environment variables from .env

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Habilitar CORS
  app.enableCors();

  // Servir archivos estáticos (HTML, CSS, JS)
  app.useStaticAssets(path.join(__dirname, '..', 'public'));

  // [PREVENTIVE] Global validation pipe - strict mode: reject unknown fields
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // [PREVENTIVE] Global exception filter for uniform error responses
  app.useGlobalFilters(new HttpExceptionFilter());

  // [ADAPTIVE] API Key middleware — strict: reject all protected requests when key is not configured
  app.use((req: Request, res: Response, next: NextFunction) => {
    const isPublic =
      req.path === '/health' ||
      req.path.startsWith('/health') ||
      req.path === '/' ||
      req.path.startsWith('/index') ||
      req.path.match(/\.(js|css|ico|png|jpg|svg|woff|woff2|ttf)$/);

    if (isPublic) return next();

    const required = process.env.FIS_EPN_KEY;
    const key = req.header
      ? req.header('X-FIS-EPN-KEY') || req.headers['x-fis-epn-key']
      : req.headers['x-fis-epn-key'];

    // [SECURITY] Reject if key not configured OR key missing/invalid
    if (!required || !key || key !== required) {
      res.status(401).json({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Missing or invalid API key',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  });

  // [PERFECTIVO] Swagger UI available at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cleaning CRUD API')
    .setDescription(
      'API REST para gestión de inventario de productos de limpieza',
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', in: 'header', name: 'X-FIS-EPN-KEY' },
      'apiKey',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const logger = new LoggerService();
  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, () => {
    logger.info('Cleaning CRUD iniciado', {
      route: `http://localhost:${port}`,
      action: 'STARTUP',
    });
    logger.info('Swagger UI disponible', {
      route: `http://localhost:${port}/api/docs`,
      action: 'STARTUP',
    });
  });
}

bootstrap();
