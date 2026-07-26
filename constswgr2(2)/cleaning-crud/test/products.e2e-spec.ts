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

  // ── Búsqueda por nombre y categoría ──────────────────────────────────────

  describe('GET /products con filtros', () => {
    let matchingId: number;
    let sameNameId: number;
    let sameCategoryId: number;

    beforeAll(async () => {
      const matchingResponse = await request(app.getHttpServer())
        .post('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .send({
          name: 'FiltroJosue Cloro',
          category: 'CategoriaJosue',
          quantity: 3,
          price: 2,
        })
        .expect(201);
      matchingId = (matchingResponse.body as { id: number }).id;

      const sameNameResponse = await request(app.getHttpServer())
        .post('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .send({
          name: 'FiltroJosue Gel',
          category: 'OtraCategoria',
          quantity: 4,
          price: 3,
        })
        .expect(201);
      sameNameId = (sameNameResponse.body as { id: number }).id;

      const sameCategoryResponse = await request(app.getHttpServer())
        .post('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .send({
          name: 'Producto Distinto',
          category: 'CategoriaJosue',
          quantity: 5,
          price: 4,
        })
        .expect(201);
      sameCategoryId = (sameCategoryResponse.body as { id: number }).id;
    });

    afterAll(async () => {
      for (const id of [sameNameId, sameCategoryId]) {
        if (id) {
          await request(app.getHttpServer())
            .delete(`/products/${id}`)
            .set('X-FIS-EPN-KEY', API_KEY);
        }
      }
    });

    it('busca parcialmente por nombre ignorando mayúsculas y espacios', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ name: '  FILTROJOSUE  ' })
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);

      const ids = (response.body as Array<{ id: number }>).map(
        product => product.id,
      );
      expect(ids).toEqual(expect.arrayContaining([matchingId, sameNameId]));
      expect(ids).not.toContain(sameCategoryId);
    });

    it('busca por categoría normalizada usando coincidencia exacta', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ category: '  CATEGORIAJOSUE  ' })
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);

      const ids = (response.body as Array<{ id: number }>).map(
        product => product.id,
      );
      expect(ids).toEqual(expect.arrayContaining([matchingId, sameCategoryId]));
      expect(ids).not.toContain(sameNameId);
    });

    it('combina los filtros name y category usando AND', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .query({
          name: 'filtrojosue',
          category: 'categoriajosue',
        })
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);

      expect(response.body).toEqual([
        expect.objectContaining({ id: matchingId }),
      ]);
    });

    it('excluye de la búsqueda los productos eliminados', async () => {
      await request(app.getHttpServer())
        .delete(`/products/${matchingId}`)
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/products')
        .query({ name: 'FiltroJosue Cloro' })
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);

      expect(response.body).toEqual([]);
    });
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

  it.each([
    ['GET', '/products/999999'],
    ['PATCH', '/products/999999'],
    ['DELETE', '/products/999999'],
  ])(
    '%s /products/999999 responde 404 con los cinco campos acordados',
    async (method, url) => {
      const httpMethod = method.toLowerCase() as 'get' | 'patch' | 'delete';
      const agent = request(app.getHttpServer());
      const response = await agent[httpMethod](url)
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(404);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 404,
          error: expect.any(String),
          message: expect.stringContaining('999999'),
          timestamp: expect.any(String),
          path: '/products/999999',
        }),
      );
    },
  );

  it('PATCH y DELETE sobre un producto ya eliminado responden 404 sin modificarlo', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Producto Fantasma',
        category: 'Pruebas',
        quantity: 1,
        price: 1,
      })
      .expect(201);
    const ghostId = (createResponse.body as { id: number }).id;

    await request(app.getHttpServer())
      .delete(`/products/${ghostId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    const patchAfterDelete = await request(app.getHttpServer())
      .patch(`/products/${ghostId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ price: 999 })
      .expect(404);
    expect(patchAfterDelete.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        path: `/products/${ghostId}`,
      }),
    );

    const deleteAgain = await request(app.getHttpServer())
      .delete(`/products/${ghostId}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(404);
    expect(deleteAgain.body).toEqual(
      expect.objectContaining({
        statusCode: 404,
        error: expect.any(String),
        message: expect.any(String),
        timestamp: expect.any(String),
        path: `/products/${ghostId}`,
      }),
    );
  });

  // ── Errores 400 ───────────────────────────────────────────────────────────

  it('GET /products/abc debe responder 400 por ID no numérico', () => {
    return request(app.getHttpServer())
      .get('/products/abc')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(400);
  });

  it.each([
    ['GET', '/products/abc'],
    ['PATCH', '/products/abc'],
    ['DELETE', '/products/abc'],
  ])(
    '%s /products/abc responde 400 por ID con formato inválido',
    (method, url) => {
      const httpMethod = method.toLowerCase() as 'get' | 'patch' | 'delete';
      const agent = request(app.getHttpServer());
      return agent[httpMethod](url).set('X-FIS-EPN-KEY', API_KEY).expect(400);
    },
  );

  it('POST /products sin campos requeridos debe responder 400', () => {
    return request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ quantity: 5 })
      .expect(400);
  });

  it.each([
    ['name ausente', { category: 'Cat', quantity: 1, price: 1 }],
    ['category ausente', { name: 'Test', quantity: 1, price: 1 }],
    ['name vacío', { name: '', category: 'Cat', quantity: 1, price: 1 }],
    [
      'category con espacios',
      { name: 'Test', category: '   ', quantity: 1, price: 1 },
    ],
    ['quantity ausente', { name: 'Test', category: 'Cat', price: 1 }],
    [
      'quantity no numérico',
      { name: 'Test', category: 'Cat', quantity: 'uno', price: 1 },
    ],
    ['price ausente', { name: 'Test', category: 'Cat', quantity: 1 }],
    [
      'price no numérico',
      { name: 'Test', category: 'Cat', quantity: 1, price: 'uno' },
    ],
  ])(
    'POST /products con %s debe responder 400 sin persistir',
    async (_case, payload) => {
      const beforeResponse = await request(app.getHttpServer())
        .get('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);
      const countBefore = (beforeResponse.body as unknown[]).length;

      await request(app.getHttpServer())
        .post('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .send(payload)
        .expect(400);

      const afterResponse = await request(app.getHttpServer())
        .get('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);
      expect(afterResponse.body as unknown[]).toHaveLength(countBefore);
    },
  );

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

  it.each([
    ['name vacío', { name: '' }],
    ['category con espacios', { category: '   ' }],
  ])(
    'PATCH /products/:id con %s debe responder 400 sin modificar datos',
    async (_case, payload) => {
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('X-FIS-EPN-KEY', API_KEY)
        .send({
          name: 'Producto para validar PATCH',
          category: 'Pruebas',
          quantity: 2,
          price: 4,
        })
        .expect(201);
      const product = createResponse.body as {
        id: number;
        name: string;
        category: string;
      };

      await request(app.getHttpServer())
        .patch(`/products/${product.id}`)
        .set('X-FIS-EPN-KEY', API_KEY)
        .send(payload)
        .expect(400);

      const afterResponse = await request(app.getHttpServer())
        .get(`/products/${product.id}`)
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);
      const productAfter = afterResponse.body as {
        name: string;
        category: string;
      };
      expect(productAfter.name).toBe(product.name);
      expect(productAfter.category).toBe(product.category);

      await request(app.getHttpServer())
        .delete(`/products/${product.id}`)
        .set('X-FIS-EPN-KEY', API_KEY)
        .expect(200);
    },
  );

  it('PATCH /products/:id parcial con solo price debe seguir siendo válido', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Producto parcial',
        category: 'Pruebas',
        quantity: 2,
        price: 4,
      })
      .expect(201);
    const product = createResponse.body as {
      id: number;
      name: string;
      category: string;
      quantity: number;
    };

    const updateResponse = await request(app.getHttpServer())
      .patch(`/products/${product.id}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({ price: 7.5 })
      .expect(200);
    const updated = updateResponse.body as {
      name: string;
      category: string;
      quantity: number;
      price: number | string;
    };

    expect(updated.name).toBe(product.name);
    expect(updated.category).toBe(product.category);
    expect(updated.quantity).toBe(product.quantity);
    expect(Number(updated.price)).toBe(7.5);

    await request(app.getHttpServer())
      .delete(`/products/${product.id}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);
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

  // ── Resumen de productos activos ────────────────────────────────────────

  it('GET /products/active-summary sin API key debe responder 401', () => {
    return request(app.getHttpServer())
      .get('/products/active-summary')
      .expect(401);
  });

  it('GET /products/active-summary debe retornar exactamente los tres campos esperados', () => {
    return request(app.getHttpServer())
      .get('/products/active-summary')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200)
      .expect((res: SupertestResponse) => {
        expect(
          Object.keys(res.body).sort((a, b) => a.localeCompare(b)),
        ).toEqual(
          ['activeProducts', 'totalQuantity', 'totalInventoryValue'].sort(
            (a, b) => a.localeCompare(b),
          ),
        );
        expect(typeof res.body.activeProducts).toBe('number');
        expect(typeof res.body.totalQuantity).toBe('number');
        expect(typeof res.body.totalInventoryValue).toBe('number');
      });
  });

  it('GET /products/active-summary debe sumar price * quantity de productos activos y excluir los eliminados', async () => {
    const beforeResponse = await request(app.getHttpServer())
      .get('/products/active-summary')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);
    const baseline = beforeResponse.body as {
      activeProducts: number;
      totalQuantity: number;
      totalInventoryValue: number;
    };

    const createResponse = await request(app.getHttpServer())
      .post('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .send({
        name: 'Producto Resumen Activo',
        category: 'Pruebas',
        quantity: 4,
        price: 3.5,
      })
      .expect(201);
    const product = createResponse.body as { id: number };

    const afterCreateResponse = await request(app.getHttpServer())
      .get('/products/active-summary')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);
    const afterCreate = afterCreateResponse.body as {
      activeProducts: number;
      totalQuantity: number;
      totalInventoryValue: number;
    };

    // Cálculo manual: 4 unidades * 3.5 = 14 agregados al inventario activo
    expect(afterCreate.activeProducts).toBe(baseline.activeProducts + 1);
    expect(afterCreate.totalQuantity).toBe(baseline.totalQuantity + 4);
    expect(afterCreate.totalInventoryValue).toBeCloseTo(
      baseline.totalInventoryValue + 14,
      2,
    );

    await request(app.getHttpServer())
      .delete(`/products/${product.id}`)
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    const afterDeleteResponse = await request(app.getHttpServer())
      .get('/products/active-summary')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    // El producto eliminado (lógicamente) ya no debe contarse
    expect(afterDeleteResponse.body).toMatchObject(baseline);
  });

  it('GET /products/active-summary no debe alterar /products/stats ni el listado existente', async () => {
    const summaryResponse = await request(app.getHttpServer())
      .get('/products/active-summary')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    const statsResponse = await request(app.getHttpServer())
      .get('/products/stats')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    const listResponse = await request(app.getHttpServer())
      .get('/products')
      .set('X-FIS-EPN-KEY', API_KEY)
      .expect(200);

    expect(summaryResponse.body.activeProducts).toBe(
      statsResponse.body.totalProducts,
    );
    expect(summaryResponse.body.totalQuantity).toBe(
      statsResponse.body.totalQuantity,
    );
    expect(summaryResponse.body.activeProducts).toBe(
      (listResponse.body as unknown[]).length,
    );
  });
});
