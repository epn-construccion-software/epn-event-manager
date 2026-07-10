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
