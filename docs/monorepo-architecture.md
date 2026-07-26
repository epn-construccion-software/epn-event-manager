# Arquitectura del monorepo EPN Event Manager

## 1. Descripción general

El repositorio `epn-event-manager` adopta una organización de monorepo: dos aplicaciones NestJS relacionadas se mantienen bajo un mismo control de versiones, junto con su documentación y sus configuraciones de automatización. Esta disposición permite coordinar cambios, aplicar criterios de calidad comunes y validar conjuntamente la integración entre los componentes.

Las aplicaciones se encuentran dentro de `constswgr2(2)`:

- `constswgr2(2)/cleaning-crud`: administra productos de limpieza y emite eventos asociados con sus operaciones.
- `constswgr2(2)/epn-event-manager`: recibe, almacena y consulta los eventos generados por sistemas emisores, incluido `cleaning-crud`.

Cada aplicación conserva su propio `package.json`, lockfile, código fuente, pruebas y configuración de NestJS. Por tanto, comparten el repositorio y el proceso de integración, pero mantienen ciclos de instalación, compilación y prueba independientes.

## 2. Estructura del repositorio

La siguiente vista resume los directorios y archivos relevantes:

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
│   │   │   ├── modules/
│   │   │   │   └── products/
│   │   │   ├── services/
│   │   │   │   ├── event-emitter.service.ts
│   │   │   │   └── logger.service.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── package.json
│   │   └── package-lock.json
│   └── epn-event-manager/
│       ├── src/
│       │   ├── database/
│       │   │   └── entities/
│       │   ├── modules/
│       │   │   ├── events/
│       │   │   ├── health/
│       │   │   └── stats/
│       │   └── main.ts
│       ├── test/
│       ├── package.json
│       └── package-lock.json
├── docs/
│   ├── definition-of-done.md
│   ├── definition-of-ready.md
│   ├── kanban-workflow.md
│   ├── monorepo-architecture.md
│   └── testing-strategy.md
└── sonar-project.properties
```

Los directorios generados durante instalación, compilación y pruebas —como `node_modules`, `dist` y `coverage`— no forman parte de la arquitectura fuente del sistema.

## 3. Aplicación `cleaning-crud`

`cleaning-crud` es una API NestJS para la gestión de productos de limpieza. Su módulo de productos implementa operaciones de creación, consulta, actualización y eliminación, con persistencia mediante TypeORM. La aplicación también incluye validaciones, manejo uniforme de excepciones y registro de actividad.

El código principal del dominio se ubica en:

- `constswgr2(2)/cleaning-crud/src/modules/products`
- `constswgr2(2)/cleaning-crud/src/database`
- `constswgr2(2)/cleaning-crud/src/services`

Después de determinadas operaciones sobre productos, `ProductsService` solicita la emisión de eventos con las acciones `CREATE`, `UPDATE`, `DELETE` o `QUERY`. `EventEmitterService` construye el mensaje y realiza una petición HTTP al gestor de eventos. La URL se obtiene de la variable `EVENT_HUB_URL` y, cuando no está definida, utiliza `http://localhost:3000/events`.

La emisión se diseñó para no interrumpir el flujo principal del CRUD cuando el gestor de eventos no está disponible: el error se registra y la aplicación puede continuar con su operación local.

## 4. Aplicación `epn-event-manager`

`epn-event-manager` es una API NestJS responsable de recibir y administrar eventos. Su estructura incluye:

- `events`: registro y consulta de eventos.
- `health`: comprobación del estado del servicio.
- `stats`: exposición de estadísticas agregadas.
- `database`: configuración de persistencia y entidades diferenciadas por acción.

El endpoint de recepción se implementa en `constswgr2(2)/epn-event-manager/src/modules/events/events.controller.ts`. El servicio asociado clasifica los eventos soportados y utiliza repositorios separados para `CREATE`, `UPDATE`, `DELETE` y `QUERY`. También permite recuperar eventos, filtrarlos por origen o entidad y calcular estadísticas que incluyen los cuatro tipos.

## 5. Relación entre las aplicaciones

La relación es de productor y consumidor de eventos:

```text
cleaning-crud                         epn-event-manager
┌──────────────────────┐              ┌────────────────────────┐
│ Operación de producto│              │ POST /events           │
│ CREATE/UPDATE/DELETE │── HTTP POST ─▶│ validación y registro  │
│ o QUERY              │              │ por tipo de acción      │
└──────────────────────┘              └────────────────────────┘
```

No existe una dependencia de código entre los proyectos: la integración se realiza mediante HTTP y un contrato de datos. El evento emitido contiene, entre otros campos, `source`, `entity`, `action`, `title`, `description` y `payload`. Para los eventos originados en el CRUD, `source` toma el valor `cleaning-crud` y `entity` identifica el recurso `product`.

## 6. Flujo general de eventos

El flujo implementado puede resumirse así:

1. Un cliente invoca una operación de productos en `cleaning-crud`.
2. `ProductsService` valida la solicitud y ejecuta la operación de persistencia o consulta.
3. El servicio prepara el título, la descripción y el `payload` del evento.
4. `EventEmitterService` envía una petición `POST` a `EVENT_HUB_URL` con un tiempo de espera configurado en el cliente HTTP.
5. `EventsController` recibe el mensaje en `epn-event-manager` y delega su procesamiento a `EventsService`.
6. `EventsService` normaliza la acción y persiste el evento en el repositorio correspondiente.
7. Los eventos pueden consultarse posteriormente de forma conjunta, por origen, por entidad o mediante estadísticas.

Si la acción no corresponde a `CREATE`, `UPDATE`, `DELETE` o `QUERY`, el gestor de eventos la rechaza mediante una respuesta HTTP 400. Si la comunicación desde `cleaning-crud` falla, el emisor registra el error sin deshacer la operación principal del CRUD.

## 7. Integración continua con GitHub Actions

El workflow `.github/workflows/ci.yml` se ejecuta para `push` y `pull_request` dirigidos a `develop` o `main`. Utiliza Node.js 24 y mantiene dos jobs de validación independientes:

- `Validate cleaning-crud`
- `Validate epn-event-manager`

Cada job verifica la presencia de su `package-lock.json` y ejecuta dentro del directorio de la aplicación:

1. `npm ci`
2. `npm run format:check`
3. `npm run lint`
4. `npm run typecheck`
5. `npm run build`
6. `npm run test:cov -- --runInBand`

Esta separación permite identificar qué aplicación incumple una validación y evita mezclar sus dependencias. El uso de `npm ci` proporciona instalaciones reproducibles basadas en los lockfiles versionados.

## 8. Análisis de calidad con SonarCloud

La configuración raíz `sonar-project.properties` identifica el proyecto `epn-event-manager` dentro de la organización `epn-construccion-software`. El análisis incluye los directorios `src` y las pruebas de ambas aplicaciones, excluye artefactos generados y consume los reportes LCOV ubicados en:

- `constswgr2(2)/cleaning-crud/coverage/lcov.info`
- `constswgr2(2)/epn-event-manager/coverage/lcov.info`

El job `SonarCloud analysis` depende de los dos jobs de CI. Debido a que los jobs se ejecutan en entornos aislados, este job instala las dependencias y genera nuevamente la cobertura de cada aplicación antes de ejecutar `SonarSource/sonarqube-scan-action@v5`. La autenticación se realiza mediante el secreto `SONAR_TOKEN` configurado en GitHub.

SonarCloud complementa las verificaciones locales del pipeline mediante análisis estático, métricas de mantenibilidad y lectura de cobertura. La aprobación técnica debe considerar el resultado del análisis y la ausencia de problemas críticos, conforme a la Definition of Done.

## 9. Gestión de dependencias con Dependabot

El archivo `.github/dependabot.yml` define dos configuraciones del ecosistema npm, una por aplicación. Dependabot revisa semanalmente los manifiestos ubicados en:

- `/constswgr2(2)/cleaning-crud`
- `/constswgr2(2)/epn-event-manager`

Las actualizaciones se proponen contra `develop`, con un límite de cinco pull requests abiertos por aplicación. Las etiquetas `dependencies` y la etiqueta específica de cada proyecto permiten clasificar las propuestas. La configuración actual se limita a dependencias npm y no incluye actualizaciones de GitHub Actions.

## 10. Flujo de ramas

El repositorio utiliza `develop` como rama principal de integración y `main` como rama estable. El trabajo se desarrolla en ramas independientes creadas a partir de la base apropiada y se integra mediante pull requests.

| Rama | Propósito |
| --- | --- |
| `main` | Mantener versiones estables e integradas. |
| `develop` | Integrar y validar el trabajo antes de promoverlo a `main`. |
| `feature/*` | Implementar nuevas capacidades funcionales. |
| `fix/*` | Corregir defectos de comportamiento. |
| `refactor/*` | Mejorar la estructura interna sin cambiar el comportamiento esperado. |
| `docs/*` | Crear o actualizar documentación. |
| `chore/*` | Realizar tareas técnicas, de automatización o mantenimiento. |

Como flujo general, una rama de trabajo se crea desde `develop`, incorpora un alcance acotado y abre un pull request hacia `develop`. Una promoción estable se realiza posteriormente desde `develop` hacia `main`, sujeta a revisión y validaciones.

## 11. Protección de `main` y `develop`

La política de protección debe aplicarse en la configuración del repositorio de GitHub, puesto que estas reglas no se almacenan en los archivos fuente. Para mantener coherencia con el workflow y la Definition of Done, `main` y `develop` deben operar bajo las siguientes reglas:

- Integrar cambios mediante pull request, evitando cambios directos.
- Requerir revisión y aprobación antes de la integración.
- Exigir que los jobs `Validate cleaning-crud` y `Validate epn-event-manager` finalicen correctamente.
- Exigir el análisis de SonarCloud cuando este se encuentre configurado como check requerido.
- Resolver todas las conversaciones de revisión antes de integrar.
- Mantener la rama actualizada con su rama base cuando GitHub lo requiera.
- Restringir eliminaciones y actualizaciones forzadas de las ramas protegidas.

En `develop`, estas reglas protegen la rama de integración cotidiana. En `main`, deben aplicarse con especial rigor porque representa el estado estable. La configuración efectiva y los nombres exactos de los checks deben verificarse en **Settings > Branches** o en las reglas del repositorio en GitHub.

## 12. Resumen

El monorepo reúne dos aplicaciones NestJS autónomas pero integradas: `cleaning-crud` administra productos y produce eventos, mientras que `epn-event-manager` los recibe, clasifica, persiste y consulta. La comunicación HTTP evita acoplamiento directo entre sus bases de código.

GitHub Actions valida cada aplicación de forma independiente; SonarCloud consolida análisis estático y cobertura; y Dependabot propone actualizaciones npm semanales para ambos proyectos. El flujo basado en `develop`, ramas de trabajo y promoción hacia `main` completa una arquitectura técnica acompañada por controles de calidad, revisión y trazabilidad.
