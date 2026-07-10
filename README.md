# EPN Event Manager Monorepo

## Descripción general

**EPN Event Manager Monorepo** reúne dos aplicaciones NestJS que colaboran en la gestión de productos de limpieza y el registro de los eventos producidos por sus operaciones. El repositorio centraliza el código, las pruebas, la documentación y las herramientas de aseguramiento de calidad, aunque cada aplicación mantiene sus propias dependencias y comandos.

La rama `develop` concentra la integración continua del trabajo y `main` representa el estado estable. Los cambios se incorporan mediante pull requests sujetos a revisión, checks de CI y análisis de calidad.

## Aplicaciones incluidas

### `cleaning-crud`

Ubicada en `constswgr2(2)/cleaning-crud`, esta aplicación administra productos de limpieza mediante operaciones de creación, consulta, actualización y eliminación. Además, emite eventos relacionados con dichas operaciones hacia el gestor de eventos.

### `epn-event-manager`

Ubicada en `constswgr2(2)/epn-event-manager`, esta aplicación recibe, valida y registra eventos. También permite consultarlos y generar estadísticas según las acciones soportadas: `CREATE`, `UPDATE`, `DELETE` y `QUERY`.

La comunicación entre ambas aplicaciones se realiza mediante HTTP. La arquitectura y el flujo de eventos se describen con mayor detalle en la [documentación de arquitectura](docs/monorepo-architecture.md).

## Estructura del repositorio

```text
epn-event-manager/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       └── ci.yml
├── constswgr2(2)/
│   ├── cleaning-crud/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   ├── filters/
│   │   │   ├── modules/products/
│   │   │   └── services/
│   │   ├── test/
│   │   ├── package.json
│   │   └── package-lock.json
│   └── epn-event-manager/
│       ├── src/
│       │   ├── database/
│       │   └── modules/
│       │       ├── events/
│       │       ├── health/
│       │       └── stats/
│       ├── test/
│       ├── package.json
│       └── package-lock.json
├── docs/
│   ├── definition-of-done.md
│   ├── definition-of-ready.md
│   ├── kanban-workflow.md
│   └── monorepo-architecture.md
├── CHANGELOG.md
├── README.md
└── sonar-project.properties
```

## Requisitos previos

Para trabajar con el monorepo se requiere:

- Node.js 24.
- npm.
- Git.

Se recomienda comprobar las versiones instaladas antes de continuar:

```bash
node --version
npm --version
git --version
```

## Instalación de dependencias

Cada aplicación posee su propio `package-lock.json`; por ello, las dependencias deben instalarse por separado mediante `npm ci`.

### `cleaning-crud`

```bash
cd "constswgr2(2)/cleaning-crud"
npm ci
```

### `epn-event-manager`

Desde la raíz del repositorio:

```bash
cd "constswgr2(2)/epn-event-manager"
npm ci
```

## Comandos principales

Los siguientes scripts están disponibles en ambas aplicaciones y deben ejecutarse dentro del directorio correspondiente.

| Comando | Propósito |
| --- | --- |
| `npm run start` | Iniciar la aplicación. |
| `npm run start:dev` | Iniciar la aplicación en modo de desarrollo con recarga. |
| `npm run start:prod` | Ejecutar la compilación ubicada en `dist`. |
| `npm run format:check` | Comprobar el formato del código sin modificar archivos. |
| `npm run lint` | Ejecutar ESLint. |
| `npm run typecheck` | Validar los tipos con TypeScript sin emitir archivos. |
| `npm run build` | Compilar la aplicación con NestJS. |
| `npm run test` | Ejecutar las pruebas unitarias. |
| `npm run test:cov` | Ejecutar las pruebas y generar el reporte de cobertura. |
| `npm run test:e2e` | Ejecutar las pruebas end-to-end. |

Por ejemplo, para validar `cleaning-crud`:

```bash
cd "constswgr2(2)/cleaning-crud"
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test
npm run test:cov
```

Para validar `epn-event-manager` se utiliza la misma secuencia desde `constswgr2(2)/epn-event-manager`.

## Integración continua con GitHub Actions

El workflow `.github/workflows/ci.yml` se ejecuta en pushes y pull requests dirigidos a `develop` o `main`. El pipeline utiliza Node.js 24 y valida las aplicaciones en jobs separados.

Para cada aplicación se comprueba el lockfile y se ejecutan:

1. Instalación reproducible mediante `npm ci`.
2. Verificación de formato.
3. Análisis con ESLint.
4. Comprobación de tipos.
5. Compilación.
6. Pruebas con cobertura.

Un job adicional realiza el análisis de SonarCloud después de que las validaciones de ambas aplicaciones finalizan correctamente.

## Calidad del código

### SonarCloud

La configuración de análisis se encuentra en `sonar-project.properties`. SonarCloud analiza las fuentes y pruebas de las dos aplicaciones y consume los reportes LCOV generados durante las pruebas con cobertura.

La autenticación del scanner en GitHub Actions utiliza el secreto `SONAR_TOKEN`. Este valor no debe almacenarse en el repositorio.

### Cobertura

La cobertura mínima esperada por el proyecto es del **80 %**, de acuerdo con la Definition of Done. Antes de abrir o actualizar un pull request debe ejecutarse:

```bash
npm run test:cov
```

## Gestión de dependencias con Dependabot

Dependabot está configurado en `.github/dependabot.yml` para revisar semanalmente las dependencias npm de:

- `constswgr2(2)/cleaning-crud`
- `constswgr2(2)/epn-event-manager`

Las propuestas se dirigen a `develop`, se identifican mediante etiquetas específicas y se validan con el mismo flujo de pull requests y CI que los demás cambios.

## Flujo de ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama estable del proyecto. |
| `develop` | Rama de integración y validación continua. |
| `feature/*` | Desarrollo de nuevas funcionalidades. |
| `fix/*` | Corrección de defectos. |
| `refactor/*` | Mejoras internas que preservan el comportamiento esperado. |
| `docs/*` | Creación o actualización de documentación. |
| `chore/*` | Configuración, automatización y mantenimiento técnico. |

El flujo habitual consiste en crear una rama de trabajo desde `develop`, realizar un cambio de alcance acotado y abrir un pull request hacia `develop`. La promoción del estado validado hacia `main` también debe realizarse mediante pull request y respetar las reglas de protección.

## Documentación relacionada

- [Definition of Ready](docs/definition-of-ready.md)
- [Definition of Done](docs/definition-of-done.md)
- [Flujo Kanban](docs/kanban-workflow.md)
- [Arquitectura del monorepo](docs/monorepo-architecture.md)
- [Changelog](CHANGELOG.md)

## Release actual

La versión estable documentada actualmente es **v1.0.0**. Los cambios incluidos en esta versión se detallan en el [Changelog](CHANGELOG.md).

## Actividades relacionadas con el README

- Crear el README principal del monorepo.
- Documentar los comandos principales de ejecución y validación.
- Agregar enlaces a la documentación y a las herramientas de calidad y automatización del proyecto.

## Notas para contribuidores

- Trabajar en una rama acorde con el tipo de cambio.
- Mantener cada cambio limitado al alcance del issue correspondiente.
- No incluir credenciales, tokens, archivos `.env` ni otros secretos.
- Instalar dependencias con `npm ci` y conservar actualizados los lockfiles cuando corresponda.
- Ejecutar formato, lint, typecheck, compilación y pruebas antes de abrir el pull request.
- Mantener una cobertura mínima del 80 %.
- Actualizar la documentación y el changelog cuando el cambio lo requiera.
- Vincular el pull request con su issue y atender las observaciones de revisión.
- No integrar cambios hasta que los checks requeridos hayan finalizado correctamente.
