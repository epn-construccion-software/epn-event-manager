# Contexto del Proyecto - Examen de Mantenimiento de Software

## 1. Información general del proyecto

- **Nombre del proyecto principal evaluado:** `cleaning-crud`.
- **Proyecto complementario:** `epn-event-manager`, utilizado como hub para registrar eventos del CRUD.
- **Tecnología:** Node.js, TypeScript, SQLite, TypeORM, Axios y Winston.
- **Framework:** NestJS 11.
- **Tipo de sistema:** API REST con interfaz web estática para gestión de inventario e integración HTTP con un gestor de eventos.
- **Descripción general:** administra productos de limpieza, permite ejecutar operaciones CRUD, calcular estadísticas de inventario y emitir eventos `CREATE`, `QUERY`, `UPDATE` y `DELETE` hacia el Event Manager.
- **Entidad principal del CRUD:** `Product` / `ProductEntity` (producto de limpieza).
- **Persistencia:** SQLite mediante TypeORM.
- **Puertos por defecto:** `cleaning-crud` en `3001`; `epn-event-manager` en `3002`, aunque la URL de integración predeterminada del CRUD apunta a `http://localhost:3000/events`. Esta diferencia debe corregirse mediante `EVENT_HUB_URL` o alineando los puertos.

Evidencia principal:

- `cleaning-crud/package.json`
- `cleaning-crud/src/modules/products/product.entity.ts`
- `cleaning-crud/src/modules/products/products.controller.ts`
- `cleaning-crud/src/modules/products/products.service.ts`
- `cleaning-crud/src/services/event-emitter.service.ts`
- `epn-event-manager/src/main.ts`

## 2. Contexto del examen

El examen práctico solicita partir de un CRUD inicial y analizar su deuda técnica para aplicar los cuatro tipos de mantenimiento de software:

- **Correctivo:** corregir fallos funcionales, errores de lógica y respuestas incorrectas.
- **Adaptativo:** ajustar el sistema a nuevas condiciones del entorno, como variables de entorno, API Key e integración externa.
- **Perfectivo:** mejorar legibilidad, pruebas, reportes y documentación.
- **Preventivo:** reforzar validaciones, manejo de excepciones y controles para reducir fallos o vulnerabilidades futuras.

También solicita agregar pruebas, logs, seguridad, documentación, validaciones y preparar evidencia verificable para la sustentación. El contexto académico y las incidencias intencionales del Event Manager se describen en `GUIA-TALLER-ESTUDIANTES.md`.

## 3. Objetivo del proyecto implementado

El propósito de `cleaning-crud` es gestionar un inventario de productos de limpieza mediante una API REST y una interfaz web. El sistema permite crear, listar, consultar, actualizar y eliminar productos persistidos en SQLite. Además, genera eventos de actividad hacia `epn-event-manager`.

La implementación responde parcialmente al examen porque incorpora manejo de errores, validaciones, configuración por variables de entorno, API Key, logs, pruebas unitarias, estadísticas y una especificación OpenAPI. No alcanza cumplimiento total porque Swagger no está servido en `/api/docs`, la seguridad queda desactivada si no existe `FIS_EPN_KEY`, faltan pruebas de endpoints del CRUD y los logs no contienen todos los campos estructurados solicitados.

## 4. Funcionalidades CRUD implementadas

| Operación | Endpoint | Método HTTP | Descripción | Estado | Evidencia en el código |
|---|---|---|---|---|---|
| Crear | `/products` | POST | Valida y guarda un producto; emite evento `CREATE`. | Implementado | `cleaning-crud/src/modules/products/products.controller.ts`; `products.service.ts` |
| Listar | `/products` | GET | Lista productos y filtra eliminados lógicamente cuando está habilitado; emite evento `QUERY`. | Implementado | `cleaning-crud/src/modules/products/products.controller.ts`; `products.service.ts` |
| Consultar por ID | `/products/:id` | GET | Valida el ID, devuelve el producto o responde 404; emite evento `QUERY`. | Implementado | `cleaning-crud/src/modules/products/products.controller.ts`; `products.service.ts` |
| Actualizar | `/products/:id` | PATCH | Actualiza campos opcionales y emite evento `UPDATE`. | Implementado | `cleaning-crud/src/modules/products/products.controller.ts`; `products.service.ts` |
| Eliminar | `/products/:id` | DELETE | Ejecuta borrado lógico o físico según `LOGICAL_DELETE`; emite evento `DELETE`. | Implementado | `cleaning-crud/src/modules/products/products.controller.ts`; `products.service.ts` |

Observación: el CRUD compila y sus pruebas unitarias pasan, pero no existen pruebas automatizadas HTTP que demuestren el ciclo CRUD completo.

## 5. Verificación de mantenimiento correctivo

| Aspecto revisado | Implementación y evidencia | Cumplimiento |
|---|---|---|
| Manejo de errores | Los controladores y servicios usan `try/catch`; se preservan excepciones 400 y 404 y se transforman fallos inesperados en 500. Evidencia: `products.controller.ts` y `products.service.ts`. | Cumple |
| Errores 400 | Se rechazan IDs no numéricos, campos obligatorios vacíos, números negativos, longitudes excesivas y texto sospechoso. | Cumple |
| Errores 404 | `findOne`, `update` y `remove` lanzan `NotFoundException` cuando no existe el producto. | Cumple |
| Datos inválidos | Existe `ValidationPipe` global y DTOs con `class-validator`. | Cumple |
| Respuestas claras | Hay mensajes específicos para 400/404 y objetos propios para algunos errores 500/401. El formato no es uniforme para todos los errores. | Parcial |
| Corrección de lógica | Se implementó persistencia SQLite, control de no encontrados, borrado lógico/físico e integración tolerante a fallos. No existe evidencia automatizada de un fallo inicial reproducido antes y después. | Parcial |

Recomendaciones:

- Implementar un filtro global de excepciones para uniformar todas las respuestas.
- Añadir pruebas de regresión que documenten el fallo original y su corrección.
- Eliminar duplicación de validaciones entre DTO, controlador y servicio cuando no aporte una regla de dominio adicional.

## 6. Verificación de mantenimiento adaptativo

| Requisito | Evidencia | Estado |
|---|---|---|
| Uso de API Key | Middleware en `cleaning-crud/src/main.ts`. | Parcial |
| Cabecera `X-FIS-EPN-KEY` | Leída y comparada en `cleaning-crud/src/main.ts`; documentada en `openapi.yaml`. | Cumple |
| Configuración mediante `.env` | Se ejecuta `dotenv.config()` y existe `.env.example`. No se encontró archivo `.env` en el repositorio. Además, `dotenv` no figura como dependencia directa en `package.json`, aunque actualmente llega de forma transitiva. | Parcial |
| Claves, puertos y configuraciones sensibles separados | `PORT`, `FIS_EPN_KEY`, `EVENT_HUB_URL`, `LOG_LEVEL`, `LOG_FILE`, `DB_PATH`, `DB_SYNCHRONIZE`, `DB_LOGGING` y `LOGICAL_DELETE` están previstos en `.env.example`. | Cumple |
| Endpoint `/health` | Existe en `cleaning-crud/src/app.controller.ts` y queda libre del middleware. | Cumple |

Hallazgos relevantes:

- Si `FIS_EPN_KEY` no está configurada, el middleware permite todas las solicitudes protegidas. Por tanto, una instalación limpia con solo `.env.example` no garantiza respuesta 401.
- `DB_SYNCHRONIZE` usa `process.env.DB_SYNCHRONIZE === 'true' || true`, por lo que siempre resulta `true` y no respeta el valor `false`.
- El CRUD usa `EVENT_HUB_URL=http://localhost:3000/events` por defecto, mientras `epn-event-manager` inicia por defecto en el puerto `3002`.

## 7. Verificación de mantenimiento perfectivo

| Elemento | Evidencia encontrada | Estado |
|---|---|---|
| Pruebas unitarias | `cleaning-crud/src/modules/products/products.service.spec.ts`, 4 pruebas ejecutadas correctamente. | Cumple |
| Pruebas de endpoints | No se encontraron pruebas e2e o Supertest para `cleaning-crud`. La colección Postman no contiene scripts de aserción. | No cumple |
| Swagger/OpenAPI | Existe `cleaning-crud/openapi.yaml`. No está integrado `@nestjs/swagger` ni servido Swagger UI. | Parcial |
| Documentación de DTOs | El esquema `ProductInput` existe en `openapi.yaml`, pero no documenta restricciones detalladas ni DTO de actualización separado. | Parcial |
| Errores 400, 401 y 404 | OpenAPI documenta algunos 400 y 404. No documenta respuestas 401 y faltan 400/404 en varias operaciones. | Parcial |
| Endpoint `/api/docs` | No encontrado. | No cumple |
| Endpoint `/stats` | En el CRUD existe `GET /products/stats`; no existe `GET /stats`. El Event Manager sí expone `GET /stats`. | Parcial |
| Documentación general | Hay README, reporte de mantenimiento, checklist, colección Postman y especificación OpenAPI. Parte de la documentación contiene rutas antiguas o afirmaciones que no coinciden con el código actual. | Parcial |

Elementos faltantes:

- Servir Swagger UI en `/api/docs`.
- Añadir decoradores Swagger o mantener una especificación completa y sincronizada.
- Incorporar pruebas e2e del CRUD, validaciones, API Key, estadísticas y errores.
- Corregir documentación que afirma que el CRUD usa memoria o que existen scripts no presentes.

## 8. Verificación de mantenimiento preventivo

| Validación o control | Evidencia | Estado |
|---|---|---|
| Campos obligatorios | `@IsNotEmpty`, `@IsString` y controles del servicio para `name` y `category`. | Cumple |
| Uso de `trim` | Se usa `trim()` para detectar cadenas vacías, pero el valor almacenado no se reemplaza por su versión recortada. | Parcial |
| Precio mayor o igual a 0 | `@Min(0)` y validación en servicio para crear y actualizar. | Cumple |
| Cantidad mayor o igual a 0 | `@Min(0)` y validación en servicio. | Cumple |
| URL `http/https` | No aplica a los campos de producto. No existe campo URL en el DTO. | No aplica |
| Bloqueo de `<script>` | Regex en creación; en actualización solo se aplica a `name` y `category`, no a `description`. | Parcial |
| Bloqueo de `SELECT`, `DROP`, `INSERT`, `--` | Regex en creación; parcial en actualización. También bloquea palabras legítimas que contengan esos textos. | Parcial |
| Manejo global de excepciones | Existen `try/catch` locales, pero no se encontró filtro global de excepciones. | Parcial |
| Sanitización rigurosa | `ValidationPipe` usa `whitelist: true`, pero `forbidNonWhitelisted` está en `false`; no transforma ni limpia espacios y no hay sanitizador especializado. | Parcial |
| Borrado lógico | Campo `deleted` y variable `LOGICAL_DELETE`. | Parcial |

Problemas preventivos adicionales:

- `getStats()` incluye productos eliminados lógicamente, mientras `findAll()` puede ocultarlos.
- `update()` no valida contenido sospechoso en `description` dentro del servicio.
- La regex de palabras SQL produce falsos positivos y no sustituye controles reales; TypeORM ya parametriza consultas normales.
- El borrado lógico depende de una columna válida, pero debe probarse de extremo a extremo.

Recomendaciones:

- Normalizar y guardar `name.trim()` y `category.trim()`.
- Aplicar validación consistente a `description` en creación y actualización.
- Configurar `forbidNonWhitelisted: true` si el contrato debe ser estricto.
- Agregar un filtro global de excepciones y pruebas de payload malicioso.
- Excluir eliminados lógicamente de estadísticas cuando corresponda.

## 9. Logs estructurados

Se encontró un logger Winston en `cleaning-crud/src/services/logger.service.ts`. Incluye nivel, timestamp ISO, mensaje y metadatos opcionales. Sin embargo, el formato final es una línea de texto y no un objeto JSON estructurado.

| Campo solicitado | Estado |
|---|---|
| `level` | Cumple |
| `timestampISO` | Parcial: existe timestamp ISO, pero la clave impresa es implícita, no `timestampISO`. |
| `route` | No encontrado |
| `action` | Parcial: suele aparecer dentro del mensaje, no como campo uniforme. |
| `platoId` o ID de entidad | Parcial: se usa metadato `id` en varias operaciones. |
| `message` | Cumple |
| Errores o eventos importantes | Cumple |

Ejemplo aproximado encontrado:

```text
[2026-06-05T12:00:00.000Z] INFO - Entity created {"id":5,"name":"Jabón"}
```

Ejemplo recomendado:

```json
{"level":"info","timestampISO":"2026-06-05T12:00:00.000Z","route":"/products","action":"CREATE","productId":5,"message":"Producto creado"}
```

## 10. Seguridad con API Key

Verificación:

- El middleware protege toda ruta que no sea pública, no solamente los endpoints de productos.
- `/health`, `/`, rutas de índice y archivos estáticos quedan libres.
- Responde 401 si existe `FIS_EPN_KEY` y la clave falta o es incorrecta.
- Usa la cabecera `X-FIS-EPN-KEY`.
- La clave está prevista para cargarse desde `.env`.
- **Riesgo:** si `FIS_EPN_KEY` no existe, se permite el acceso. Como no se encontró `.env`, el estado efectivo de seguridad en una instalación limpia es **Parcial**.

Comandos PowerShell:

```powershell
# Preparar una sesión segura antes de iniciar
$env:FIS_EPN_KEY = "clave-examen"
npm run start:dev

# Health público: esperado 200
curl.exe -i http://localhost:3001/health

# Sin API Key: esperado 401 solo si FIS_EPN_KEY está configurada
curl.exe -i http://localhost:3001/products

# Clave inválida: esperado 401
curl.exe -i -H "X-FIS-EPN-KEY: incorrecta" http://localhost:3001/products

# Clave válida: esperado 200
curl.exe -i -H "X-FIS-EPN-KEY: clave-examen" http://localhost:3001/products
```

## 11. Swagger / OpenAPI

| Verificación | Resultado |
|---|---|
| Swagger disponible en `/api/docs` | No encontrado |
| Documenta CRUD | Sí, en el archivo estático `cleaning-crud/openapi.yaml` |
| Documenta estadísticas | Sí, documenta `/products/stats` |
| Documenta DTOs | Parcial, mediante `ProductInput` |
| Documenta errores 400, 401 y 404 | Parcial; no documenta 401 |
| Documenta `X-FIS-EPN-KEY` | Sí, como esquema `apiKey` |

No se encontró `@nestjs/swagger` en dependencias ni configuración `SwaggerModule` en el código. Por tanto, acceder a `http://localhost:3001/api/docs` debería responder 401 si la clave está configurada o 404 si supera el middleware; no existe Swagger UI.

Evidencia recomendada para la sustentación:

- Captura de `openapi.yaml` mostrando rutas CRUD y `X-FIS-EPN-KEY`.
- Captura de `/api/docs` después de implementarlo; en el estado actual debe documentarse como faltante.
- Captura de cada respuesta 400, 401 y 404 una vez documentadas.

## 12. Pruebas implementadas

| Archivo de prueba | Qué prueba | Tipo | Resultado esperado / verificado | Relación con el examen |
|---|---|---|---|---|
| `cleaning-crud/src/modules/products/products.service.spec.ts` | Rechazo de ID duplicado al crear | Unitaria | Pasa | Correctivo/preventivo |
| `cleaning-crud/src/modules/products/products.service.spec.ts` | Consulta por ID | Unitaria | Pasa | CRUD |
| `cleaning-crud/src/modules/products/products.service.spec.ts` | Rechazo de precio negativo al actualizar | Unitaria | Pasa | Preventivo |
| `cleaning-crud/src/modules/products/products.service.spec.ts` | Eliminación lógica y física | Unitaria | Pasa | Adaptativo/preventivo |
| `epn-event-manager/src/app.controller.spec.ts` | Respuesta de ruta raíz | Unitaria | Pasa | Verificación básica del hub |
| `epn-event-manager/test/app.e2e-spec.ts` | Respuesta HTTP de ruta raíz | E2E | Pasa | Verificación básica del hub |

Resultados ejecutados durante esta revisión:

```text
cleaning-crud: 1 suite, 4 pruebas, todas aprobadas.
epn-event-manager unitarias: 1 suite, 1 prueba, aprobada.
epn-event-manager e2e: 1 suite, 1 prueba, aprobada.
Ambos proyectos: npm run build aprobado.
```

Pruebas faltantes:

- Endpoints CRUD completos con Supertest.
- 401 sin API Key y con clave inválida.
- `/health` público.
- Errores 400 por DTO, ID inválido, texto malicioso y campos desconocidos.
- Errores 404 en consulta, actualización y eliminación.
- `/products/stats`, incluyendo comportamiento con borrado lógico.
- Integración real entre CRUD y Event Manager.
- Logs estructurados y tolerancia a caída del Event Manager.

## 13. Comandos de ejecución y prueba manual

Ejecutar desde la raíz del repositorio. Para alinear la integración, se recomienda iniciar el Event Manager en el puerto `3000` o cambiar `EVENT_HUB_URL`.

```powershell
# Instalar dependencias
Set-Location .\epn-event-manager
npm install
Set-Location ..\cleaning-crud
npm install

# Configurar la sesión del CRUD
$env:PORT = "3001"
$env:FIS_EPN_KEY = "clave-examen"
$env:EVENT_HUB_URL = "http://localhost:3000/events"
$env:LOGICAL_DELETE = "true"

# Ejecutar backend CRUD
npm run start:dev

# En otra terminal: ejecutar Event Manager en puerto compatible
Set-Location .\epn-event-manager
$env:PORT = "3000"
npm run start:dev

# Ejecutar pruebas
Set-Location ..\cleaning-crud
npm test -- --runInBand
Set-Location ..\epn-event-manager
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Pruebas manuales con `curl.exe`:

```powershell
# Health público
curl.exe -i http://localhost:3001/health

# 401 sin API Key
curl.exe -i http://localhost:3001/products

# 400 por validación
curl.exe -i -X POST http://localhost:3001/products `
  -H "X-FIS-EPN-KEY: clave-examen" `
  -H "Content-Type: application/json" `
  -d '{"name":"Producto inválido","category":"prueba","quantity":1,"price":-1}'

# 404 por ID inexistente
curl.exe -i -H "X-FIS-EPN-KEY: clave-examen" http://localhost:3001/products/999999

# Creación correcta
curl.exe -i -X POST http://localhost:3001/products `
  -H "X-FIS-EPN-KEY: clave-examen" `
  -H "Content-Type: application/json" `
  -d '{"name":"Limpiador examen","category":"desinfectantes","quantity":10,"price":2.50,"description":"Producto de prueba"}'

# Listado
curl.exe -i -H "X-FIS-EPN-KEY: clave-examen" http://localhost:3001/products

# Actualización; sustituir 1 por un ID existente
curl.exe -i -X PATCH http://localhost:3001/products/1 `
  -H "X-FIS-EPN-KEY: clave-examen" `
  -H "Content-Type: application/json" `
  -d '{"price":3.25,"quantity":12}'

# Eliminación; sustituir 1 por un ID existente
curl.exe -i -X DELETE `
  -H "X-FIS-EPN-KEY: clave-examen" `
  http://localhost:3001/products/1

# Estadísticas del CRUD
curl.exe -i -H "X-FIS-EPN-KEY: clave-examen" http://localhost:3001/products/stats

# Estadísticas del Event Manager
curl.exe -i http://localhost:3000/stats

# Swagger: actualmente esperado 401 o 404 porque no está implementado
curl.exe -i -H "X-FIS-EPN-KEY: clave-examen" http://localhost:3001/api/docs
```

## 14. Evidencias recomendadas para la sustentación

- Backend `cleaning-crud` corriendo en el puerto 3001.
- Event Manager corriendo en un puerto alineado con `EVENT_HUB_URL`.
- Swagger abierto en `/api/docs` después de implementarlo; actualmente mostrar la especificación `openapi.yaml` y declarar la limitación.
- Respuesta 401 sin API Key con `FIS_EPN_KEY` configurada.
- Respuesta 400 por validación.
- Respuesta 404 por ID inexistente.
- Creación correcta y posterior listado del producto.
- Logs en consola durante crear, consultar, actualizar y eliminar.
- Resultado de las 4 pruebas unitarias del CRUD aprobadas.
- Resultado de compilación de ambos proyectos.
- Endpoint `/products/stats` y endpoint `/stats` del Event Manager.
- Archivo `cleaning-crud/.env.example`.
- Evento registrado en `epn-event-manager` después de una operación CRUD.

## 15. Matriz de cumplimiento del examen

| Requisito del examen | Estado | Evidencia | Observación | Recomendación |
|---|---|---|---|---|
| CRUD completo | Cumple | `products.controller.ts`; `products.service.ts` | Las cinco operaciones están implementadas. | Añadir pruebas e2e. |
| Manejo 400 | Cumple | DTOs, `ValidationPipe`, controlador y servicio | Existen validaciones de entrada. | Probar todos los casos. |
| Manejo 404 | Cumple | `products.service.ts` | Consulta, actualización y eliminación controlan no encontrados. | Añadir pruebas HTTP. |
| Manejo de errores 500 | Parcial | `try/catch` en controlador y servicio | No existe filtro global y el formato varía. | Crear filtro global. |
| API Key | Parcial | `cleaning-crud/src/main.ts` | Es permisiva si falta `FIS_EPN_KEY`. | Fallar al iniciar o rechazar solicitudes si falta la clave. |
| `X-FIS-EPN-KEY` | Cumple | `main.ts`; `openapi.yaml` | Cabecera implementada y documentada. | Añadir prueba e2e. |
| `/health` público | Cumple | `app.controller.ts`; `main.ts` | Ruta excluida del middleware. | Añadir prueba e2e. |
| Variables de entorno | Parcial | `.env.example`; uso de `process.env` | No existe `.env`; `DB_SYNCHRONIZE` siempre queda activo. | Corregir expresión y declarar `dotenv` directamente. |
| Logs estructurados | Parcial | `logger.service.ts` | Nivel y timestamp existen; faltan `route`, `action` e ID uniforme. | Emitir JSON con campos estándar. |
| Validaciones preventivas | Parcial | DTOs; `products.service.ts` | Buen alcance en creación, inconsistente en actualización y sin normalización. | Unificar validación y sanitización. |
| Pruebas unitarias | Cumple | `products.service.spec.ts` | 4 de 4 aprobadas. | Ampliar casos. |
| Pruebas de endpoints | No cumple | No encontrado en `cleaning-crud` | No existe suite e2e del CRUD. | Implementar Supertest. |
| Swagger `/api/docs` | No cumple | No encontrado | Solo existe `openapi.yaml`. | Integrar Swagger UI. |
| OpenAPI de CRUD | Parcial | `cleaning-crud/openapi.yaml` | Documenta CRUD y API Key, pero faltan respuestas y detalles. | Completar 400/401/404 y DTOs. |
| Endpoint de estadísticas | Cumple | `GET /products/stats`; `GET /stats` en el hub | El CRUD usa una ruta distinta a `/stats`. | Documentar claramente o agregar alias. |
| Integración con Event Manager | Parcial | `event-emitter.service.ts` | Código implementado, pero los puertos predeterminados no coinciden y no hay prueba e2e. | Alinear configuración y probar integración. |
| Documentación para sustentación | Parcial | README, reportes, Postman, OpenAPI | Hay documentación abundante, pero contiene inconsistencias. | Actualizarla según el código real. |

## 16. Conclusión técnica

El proyecto **cumple parcialmente** con las indicaciones del examen.

La base funcional es sólida: existe un CRUD completo con persistencia SQLite, validaciones, manejo de 400/404/500, borrado lógico configurable, estadísticas, integración con un Event Manager, configuración por variables de entorno, logs y pruebas unitarias. Durante esta revisión, `cleaning-crud` compiló y aprobó sus 4 pruebas; `epn-event-manager` también compiló y aprobó sus pruebas unitaria y e2e.

Para alcanzar cumplimiento total faltan principalmente:

1. Integrar y servir Swagger UI en `/api/docs`.
2. Documentar de forma completa DTOs y respuestas 400, 401 y 404.
3. Hacer obligatoria la API Key incluso cuando falte configuración, o impedir el arranque inseguro.
4. Crear pruebas e2e del CRUD, seguridad, validaciones, estadísticas e integración.
5. Estandarizar logs JSON con `level`, `timestampISO`, `route`, `action`, ID y `message`.
6. Corregir `DB_SYNCHRONIZE`, alinear los puertos del Event Manager y completar la sanitización en actualizaciones.
7. Actualizar la documentación existente para eliminar afirmaciones y rutas que no coinciden con el código actual.
