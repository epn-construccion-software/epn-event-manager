# Changelog

Todos los cambios importantes de **EPN Event Manager Monorepo** se documentan en este archivo. El registro permite identificar la evolución funcional, técnica y documental del proyecto, así como las correcciones incluidas en cada versión estable.

## EPN Event Manager Monorepo

Este proyecto reúne dos aplicaciones NestJS relacionadas dentro de un mismo repositorio:

- `constswgr2(2)/cleaning-crud`: API para la gestión de productos de limpieza y emisión de eventos.
- `constswgr2(2)/epn-event-manager`: API para la recepción, persistencia, consulta y análisis de eventos.

La rama `develop` se utiliza para integrar y validar los cambios, mientras que `main` representa el estado estable del proyecto.

## Versionamiento SemVer

El proyecto adopta **Versionamiento Semántico (SemVer)** mediante el formato `MAJOR.MINOR.PATCH`:

- **MAJOR**: se incrementa cuando se introducen cambios incompatibles con versiones anteriores.
- **MINOR**: se incrementa cuando se agregan funcionalidades compatibles con versiones anteriores.
- **PATCH**: se incrementa cuando se incorporan correcciones compatibles con versiones anteriores.

La versión `1.0.0` establece la primera línea base estable del monorepo.

## [1.2.0] - 2026-07-26

### Resumen

Release final que consolida las mejoras desarrolladas sobre el monorepo **EPN Event Manager**, integrando nuevas funcionalidades, correcciones de errores, refactorizaciones técnicas, fortalecimiento de pruebas y una interfaz frontend para la demostración funcional del sistema.

Este release incluye mejoras en las aplicaciones:

- `constswgr2(2)/cleaning-crud`
- `constswgr2(2)/epn-event-manager`

### Agregado

- Filtros avanzados para consultar eventos por acción, origen, entidad y combinación de criterios.
- Endpoint para consultar los últimos eventos registrados en `epn-event-manager`.
- Búsqueda de productos por nombre, categoría y criterios combinados en `cleaning-crud`.
- Resumen de productos activos con indicadores de cantidad total y valor del inventario.
- Frontend de demostración funcional para evidenciar las mejoras del release `v1.2.0`.
- Vista de dashboard protegida por API Key.
- Vistas funcionales de Productos, Búsqueda, Inventario, Eventos, Estadísticas y Evidencia del release.
- Documentación de la demo funcional y del release final.

### Modificado

- Refactorización del servicio de validación de productos para mejorar mantenibilidad y separación de responsabilidades.
- Mejora de nombres y responsabilidades internas en `EventsService`.
- Refactorización de `StatsService` para mejorar claridad, mantenibilidad y estabilidad.
- Reorganización del frontend para presentar las funcionalidades desde una perspectiva de negocio y no únicamente como pruebas técnicas de endpoints.
- Fortalecimiento de la estrategia de pruebas del monorepo.
- Actualización de la documentación de release para reflejar los tickets implementados y las validaciones realizadas.

### Corregido

- Validación de productos con campos vacíos.
- Manejo de consultas a productos inexistentes mediante respuestas controladas.
- Validación de payloads inválidos al registrar eventos.
- Cálculo de estadísticas cuando los repositorios no contienen datos.
- Correcciones de formato y cobertura necesarias para cumplir con los criterios de calidad del pipeline y SonarCloud.

### Seguridad y configuración

- Validación de acceso mediante API Key usando el header `X-FIS-EPN-KEY`.
- Bloqueo de vistas operativas del frontend hasta validar la API Key configurada en el backend.
- Confirmación de que no se incluyen API Keys reales ni archivos `.env`.
- Mantenimiento de las validaciones de CI/CD mediante GitHub Actions.
- Validación de calidad mediante SonarCloud.

### Issues incluidos

| Versión | Issue | Tipo | Descripción |
|---|---:|---|---|
| v1.1.1 | #40 | Feature | Filtros avanzados de eventos |
| v1.1.2 | #41 | Bug | Validación de productos con campos vacíos |
| v1.1.3 | #42 | Technical Debt | Refactor del servicio de validación de productos |
| v1.1.4 | #43 | Feature | Endpoint de últimos eventos |
| v1.1.5 | #44 | Bug | Manejo de producto inexistente |
| v1.1.6 | #45 | Technical Debt | Mejora de nombres en EventsService |
| v1.1.7 | #46 | Feature | Búsqueda de productos |
| v1.1.8 | #47 | Bug | Validación de payload inválido en eventos |
| v1.1.9 | #48 | Technical Debt | Refactor de StatsService |
| v1.1.10 | #49 | Feature | Resumen de productos activos |
| v1.1.11 | #50 | Bug | Estadísticas con repositorios vacíos |
| v1.1.12 | #51 | Technical Debt | Estrategia de pruebas del monorepo |
| v1.2.0 | #66 | Task | Frontend para demostración funcional |
| v1.2.0 | #67 | Task | Documentación del release final |

### Tags incluidos

- `v1.0.0`
- `v1.1.1`
- `v1.1.2`
- `v1.1.3`
- `v1.1.4`
- `v1.1.5`
- `v1.1.6`
- `v1.1.7`
- `v1.1.8`
- `v1.1.9`
- `v1.1.10`
- `v1.1.11`
- `v1.1.12`
- `v1.2.0`

### Validaciones del release

- Formato verificado con Prettier.
- Lint ejecutado sin errores.
- Typecheck ejecutado correctamente.
- Build generado correctamente.
- Pruebas unitarias ejecutadas correctamente.
- Pruebas end-to-end ejecutadas correctamente.
- Cobertura backend mantenida sobre el mínimo requerido del 80 %.
- SonarCloud validado sin errores críticos bloqueantes.

### Demo funcional

La demo funcional del release `v1.2.0` permite evidenciar:

- Dashboard protegido por API Key.
- Gestión de productos.
- Búsqueda de productos.
- Indicadores de inventario activo.
- Historial de eventos.
- Actividad reciente.
- Estadísticas del sistema.
- Evidencia funcional de los tickets del release.

## [1.0.0] - 2026-07-10

### Agregado

- Gestión ágil del proyecto mediante GitHub Projects.
- Clasificación de issues como `Feature`, `Bug`, `Technical Debt` y `Task`.
- Documentación de la Definition of Ready y la Definition of Done.
- Definición del flujo Kanban para la trazabilidad del trabajo.
- Plantillas para la creación de issues y pull requests.
- Pruebas unitarias y pruebas end-to-end para las aplicaciones del monorepo.
- Criterio de cobertura mínima del 80 %.
- Pipeline de integración continua con GitHub Actions para validar `cleaning-crud` y `epn-event-manager` de forma independiente.
- Integración con SonarCloud para análisis estático y seguimiento de cobertura.
- Configuración de Dependabot para revisar semanalmente las dependencias npm de ambas aplicaciones.
- Documentación formal de la arquitectura del monorepo.

### Modificado

- Aplicación de prácticas de Clean Coding para mejorar legibilidad, mantenibilidad y organización interna.
- Incorporación de logging estructurado en operaciones relevantes de las aplicaciones.
- Fortalecimiento de las validaciones automatizadas de formato, lint, tipos, compilación, pruebas y cobertura.
- Organización del flujo de integración mediante `develop` y del estado estable mediante `main`.

### Corregido

- Corrección de errores detectados por ESLint y TypeScript.
- Corrección del cálculo de estadísticas para incluir los eventos de tipo `QUERY` en su contador y en el total.
- Corrección del registro de eventos para rechazar acciones no soportadas mediante una respuesta HTTP 400.

### Seguridad y configuración

- Protección de las ramas `main` y `develop` mediante reglas de revisión e integración.
- Validación de cambios mediante pull requests y checks del pipeline de integración continua.
- Análisis de calidad centralizado con SonarCloud.
- Gestión automatizada y separada de dependencias npm mediante Dependabot para cada aplicación del monorepo.
