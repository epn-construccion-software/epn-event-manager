// NOTE: env vars must be set before module imports because DatabaseModule reads them at evaluation time.
// They are set via test/jest.setup.ts configured in jest-e2e.json setupFiles.

import request, { Response as SupertestResponse } from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/filters/http-exception.filter';
import * as fs from 'fs';
import { Request, Response, NextFunction } from 'express';

describe('Products API (e2e)', () => {
  let app: INestApplication;
  const API_KEY = 'test-api-key-e2e';
  let createdId: number;
  let initialProductCount = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Replicate same setup as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    // API key middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      const isPublic =
        req.path === '/health' ||
        req.path.startsWith('/health') ||
        req.path === '/' ||
        req.path.match(/\.(js|css|ico|png|jpg|svg|woff|woff2|ttf)$/);
      if (isPublic) return next();

      const required = process.env.FIS_EPN_KEY;
      const key = req.headers['x-fis-epn-key'];
      if (!required || !key || key !== required) {
        return res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Missing or invalid API key',
          timestamp: new Date().toISOString(),
        });
      }
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
    // Clean up test database
    if (fs.existsSync('test-e2e.sqlite')) fs.unlinkSync('test-e2e.sqlite');
  });

  // ── Seguridad ─────────────────────────────────────────────────────────────

  it('GET /health debe responder 200 sin API key (ruta pública)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(res.body.status).toBe('OK');
      });
  });

  it('GET /products sin API key debe responder 401', () => {
    return request(app.getHttpServer())
      .get('/products')
      .expect(401)
      .expect((res: SupertestResponse) => {
        expect(res.body.statusCode).toBe(401);
        expect(res.body.message).toBe('Missing or invalid API key');
      });
  });

  it('GET /products con API key inválida debe responder 401', () => {
    return request(app.getHttpServer())
      .get('/products')
      .set('X-FIS-EPN-KEY', 'clave-incorrecta')
      .expect(401);
  });

  // ── CRUD completo ─────────────────────────────────────────────────────────

  it('GET /products debe retornar productos iniciales', () => {
    return request(app.getHttpServer())
      .get('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(Array.isArray(res.body)).toBe(true);
        initialProductCount = res.body.length;
      });
  });

  it('POST /products debe crear un producto y retornar 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Limpiador Test',
        category: 'Desinfectantes',
        quantity: 10,
        price: 2.5,
        description: 'Producto de prueba e2e',
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Limpiador Test');
    expect(res.body.category).toBe('Desinfectantes');
    createdId = res.body.id;
  });

  it('GET /products debe retornar un producto adicional después de crear', () => {
    return request(app.getHttpServer())
      .get('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(initialProductCount + 1);
      });
  });

  it('GET /products/:id debe retornar el producto creado', () => {
    return request(app.getHttpServer())
      .get(`/products/${createdId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(res.body.id).toBe(createdId);
        expect(res.body.name).toBe('Limpiador Test');
      });
  });

  it('PATCH /products/:id debe actualizar precio y cantidad', () => {
    return request(app.getHttpServer())
      .patch(`/products/${createdId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ price: 3.99, quantity: 20 })
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(parseFloat(res.body.price)).toBe(3.99);
        expect(res.body.quantity).toBe(20);
      });
  });

  it('DELETE /products/:id debe eliminar el producto', () => {
    return request(app.getHttpServer())
      .delete(`/products/${createdId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);
  });

  // ── Errores 404 ───────────────────────────────────────────────────────────

  it('GET /products/:id después de eliminar debe responder 404', () => {
    return request(app.getHttpServer())
      .get(`/products/${createdId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(404);
  });

  it('GET /products/999999 debe responder 404', () => {
    return request(app.getHttpServer())
      .get('/products/999999')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(404);
  });

  it('PATCH /products/999999 debe responder 404', () => {
    return request(app.getHttpServer())
      .patch('/products/999999')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ price: 5 })
      .expect(404);
  });

  it('DELETE /products/999999 debe responder 404', () => {
    return request(app.getHttpServer())
      .delete('/products/999999')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(404);
  });

  // ── Errores 400 ───────────────────────────────────────────────────────────

  it('GET /products/abc debe responder 400 por ID no numérico', () => {
    return request(app.getHttpServer())
      .get('/products/abc')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(400);
  });

  it('POST /products sin campos requeridos debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ quantity: 5 })
      .expect(400);
  });

  it('POST /products con campo no permitido debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Test',
        category: 'Cat',
        quantity: 1,
        price: 1,
        extra: 'no permitido',
      })
      .expect(400);
  });

  it('POST /products con precio negativo debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ name: 'Test', category: 'Cat', quantity: 1, price: -5 })
      .expect(400);
  });

  it('POST /products con cantidad negativa debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ name: 'Test', category: 'Cat', quantity: -1, price: 1 })
      .expect(400);
  });

  it('POST /products con texto malicioso debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: '<script>alert(1)</script>',
        category: 'Cat',
        quantity: 1,
        price: 1,
      })
      .expect(400);
  });

  it('PATCH /products con precio negativo debe responder 400', () => {
    return request(app.getHttpServer())
      .patch('/products/1')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ price: -10 })
      .expect(400);
  });

  // ── Estadísticas ─────────────────────────────────────────────────────────

  it('GET /products/stats debe retornar estadísticas', async () => {
    // Create a product first so stats are meaningful
    await request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Producto Stats',
        category: 'Limpieza',
        quantity: 5,
        price: 10,
      });

    return request(app.getHttpServer())
      .get('/products/stats')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(res.body.totalProducts).toBeDefined();
        expect(res.body.totalQuantity).toBeDefined();
        expect(res.body.totalInventoryValue).toBeDefined();
        expect(res.body.productsByCategory).toBeDefined();
      });
  });
});
