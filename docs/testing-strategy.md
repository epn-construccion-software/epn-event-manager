# Estrategia de pruebas del monorepo

## 1. Objetivo

El monorepo `epn-event-manager` contiene dos aplicaciones NestJS independientes,
cada una con sus propias dependencias, comandos y configuración de pruebas:

- `constswgr2(2)/cleaning-crud`
- `constswgr2(2)/epn-event-manager`

Esta guía reúne en un solo lugar los comandos, umbrales, ubicación de
reportes, preparación y limpieza segura de datos, fallos frecuentes y el
checklist de evidencia que debe acompañar a un Pull Request. No modifica los
scripts de ningún `package.json`, el workflow de CI ni la configuración de
Jest: documenta exactamente lo que ya existe.

## 2. Directorios y aplicaciones

| Aplicación | Directorio | Framework de persistencia |
| --- | --- | --- |
| `cleaning-crud` | `constswgr2(2)/cleaning-crud` | TypeORM + `better-sqlite3` |
| `epn-event-manager` | `constswgr2(2)/epn-event-manager` | TypeORM + `better-sqlite3` |

Cada aplicación tiene su propio `package.json`, `package-lock.json`,
`node_modules` y configuración de Jest embebida en su `package.json` (pruebas
unitarias) más un `test/jest-e2e.json` (pruebas end-to-end). Los comandos de
esta guía siempre se ejecutan **desde el directorio de la aplicación
correspondiente**, nunca desde la raíz del repositorio.

## 3. Comandos por aplicación

Los siguientes comandos son idénticos en nombre para ambas aplicaciones; lo
que cambia es el directorio de trabajo.

| Comando | Qué valida |
| --- | --- |
| `npm ci` | Instala dependencias exactas según el lockfile. |
| `npm run format:check` | Verifica formato con Prettier sin modificar archivos. |
| `npm run lint` | Ejecuta ESLint sobre `src`, `apps`, `libs` y `test`. |
| `npm run typecheck` | Compila con `tsc --noEmit` para detectar errores de tipos. |
| `npm run build` | Compila el proyecto con `nest build`. |
| `npm run test` | Ejecuta las pruebas unitarias (`*.spec.ts`). |
| `npm run test:cov` | Ejecuta las pruebas unitarias con reporte de cobertura. |
| `npm run test:e2e` | Ejecuta las pruebas end-to-end (`test/*.e2e-spec.ts`). |

Ejemplo para `cleaning-crud`:

```bash
cd constswgr2(2)/cleaning-crud
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:cov -- --runInBand
```

El mismo bloque aplica a `epn-event-manager` cambiando el directorio de
trabajo. El flag `--runInBand` (usado por el pipeline) ejecuta las
suites de forma secuencial en lugar de en paralelo; es más lento pero evita
condiciones de carrera al acceder al mismo archivo SQLite entre suites.

### 3.1 Lo que ejecuta el pipeline de GitHub Actions

El workflow `.github/workflows/ci.yml` corre, para cada aplicación de forma
independiente, exactamente esta secuencia: `npm ci`, `format:check`, `lint`,
`typecheck`, `build` y `npm run test:cov -- --runInBand`. Un job adicional
`SonarCloud analysis` reinstala dependencias, regenera la cobertura de ambas
aplicaciones y ejecuta el escaneo de SonarCloud.

**El pipeline no ejecuta `npm run test:e2e`.** Las pruebas end-to-end existen
en ambas aplicaciones pero deben ejecutarse manualmente antes de abrir un
Pull Request; no son un check obligatorio de CI actualmente.

## 4. Umbral de cobertura del 80 %

El criterio de aceptación del equipo (ver `docs/definition-of-done.md`) exige
cobertura igual o superior al 80 % en statements, branches, functions y
lines.

- **`cleaning-crud`** declara el umbral directamente en la configuración de
  Jest de su `package.json` (`coverageThreshold.global` = 80 en las cuatro
  métricas). Si la cobertura cae por debajo, `npm run test:cov` **falla**
  aunque todas las pruebas pasen.
- **`epn-event-manager`** no tiene `coverageThreshold` configurado en su
  `package.json`. `npm run test:cov` no falla localmente por baja cobertura;
  el umbral se verifica manualmente leyendo el reporte y, sobre todo,
  mediante la condición de cobertura del Quality Gate de SonarCloud en el
  Pull Request.

### Cómo leer el reporte

Al ejecutar `npm run test:cov`, Jest imprime en la terminal una tabla con las
columnas `% Stmts`, `% Branch`, `% Funcs`, `% Lines` y, cuando aplica,
`Uncovered Line #s` por archivo y un renglón `All files` con el total. Ese
mismo comando genera un directorio `coverage/` (hermano de `src/`, fuera del
repositorio versionado) con:

- `coverage/lcov-report/index.html`: reporte navegable por archivo.
- `coverage/lcov.info`: reporte en formato LCOV, consumido por
  `sonar-project.properties` (`sonar.javascript.lcov.reportPaths`) durante el
  análisis de SonarCloud.

## 5. Pruebas end-to-end

Ambas aplicaciones usan una configuración de Jest separada
(`test/jest-e2e.json`) que descubre archivos `*.e2e-spec.ts` y levanta la
aplicación completa (`AppModule`) con NestJS Testing, sobrescribiendo
únicamente los repositorios de TypeORM con mocks en memoria.

- `cleaning-crud/test/products.e2e-spec.ts`
- `epn-event-manager/test/app.e2e-spec.ts`
- `epn-event-manager/test/stats.e2e-spec.ts`

Aunque los repositorios se mockean, **el `DataSource` de TypeORM se sigue
inicializando de verdad** al arrancar `AppModule`, porque `DatabaseModule`
no se sobrescribe. Esto significa que `npm run test:e2e` requiere que el
binario nativo de `better-sqlite3` esté compilado para la plataforma actual.

### Limitación conocida en entornos con red restringida

En un entorno sin acceso completo a `nodejs.org` y a los releases de GitHub
(por ejemplo, un sandbox con salida de red limitada), tanto
`prebuild-install` como el respaldo `node-gyp rebuild` fallan al intentar
descargar el binario o las cabeceras de Node, y `npm run test:e2e` termina
en errores repetidos de `TypeOrmModule: Unable to connect to the database`.
Esto **no es un fallo del código ni de las pruebas**: es una limitación del
entorno de ejecución. En una máquina de desarrollo normal o en el runner de
GitHub Actions (con acceso de red completo), `npm ci` compila el binario sin
intervención adicional y `npm run test:e2e` funciona con normalidad.

## 6. Preparación y limpieza segura de datos

Ambas aplicaciones usan SQLite embebido a través de `better-sqlite3`, con la
ruta del archivo determinada así:

| Aplicación | Variable | Valor por defecto | Valor en pruebas e2e |
| --- | --- | --- | --- |
| `cleaning-crud` | `DB_PATH` | `database.sqlite` | `test-e2e.sqlite` (fijado en `test/jest.setup.ts`) |
| `epn-event-manager` | *(sin variable, ruta fija en código)* | `db/events.sqlite` | `db/events.sqlite` (mismo archivo) |

Recomendaciones antes de abrir un Pull Request:

1. Ejecutar `npm run test:e2e` genera un archivo SQLite real en disco.
   Verificar con `git status` que ese archivo **no** aparezca como untracked
   antes de hacer commit.
2. Si el archivo aparece, eliminarlo manualmente
   (`rm test-e2e.sqlite` o `rm db/events.sqlite`, según la aplicación) en
   lugar de comitearlo.
3. `cleaning-crud/.gitignore` ya excluye `*.sqlite`, `*.sqlite3`, `*.db` y
   `coverage/`. `epn-event-manager/.gitignore` no tenía esas reglas; se
   alineó con las de `cleaning-crud` como parte de este ticket para evitar
   que un archivo de datos local o el directorio de cobertura terminen
   versionados por accidente.
4. Nunca commitear `.env` con credenciales reales; usar siempre
   `.env.example` como referencia de las variables esperadas.

## 7. Fallos frecuentes

| Síntoma | Causa | Solución |
| --- | --- | --- |
| `test:cov` falla en `cleaning-crud` aunque todas las pruebas pasen | Cobertura por debajo del 80 % configurado en `coverageThreshold` | Agregar o ampliar pruebas antes de abrir el PR. |
| `test:cov` pasa en `epn-event-manager` pero SonarCloud marca el Quality Gate en rojo por cobertura | `epn-event-manager` no tiene `coverageThreshold` local; el umbral solo se aplica en SonarCloud | Revisar el resumen de SonarCloud del PR, no solo la salida local de Jest. |
| `test:e2e` falla con `Unable to connect to the database` en bucle | Binario nativo de `better-sqlite3` no compilado (falta de red o `--ignore-scripts`) | Ejecutar `npm ci` completo (sin `--ignore-scripts`) en una máquina con acceso de red normal, o validar el e2e en el pipeline de GitHub Actions. |
| SonarCloud reporta `Not authorized or project not found... check SONAR_TOKEN` | El PR se abrió desde un fork personal; GitHub no pasa los secretos del repositorio a workflows disparados por PRs desde forks | Publicar la rama directamente en el repositorio compartido (requiere acceso de colaborador) en lugar de usar un fork. |
| Quality Gate falla por `Duplicated Lines (%) on New Code` | Varios bloques de prueba casi idénticos copiados y pegados | Consolidar los casos con `it.each(...)` en vez de repetir la estructura del test. |
| `git status` muestra decenas de archivos modificados sin cambios reales | Diferencia de configuración de finales de línea (CRLF/LF) entre el checkout de Windows y la herramienta usada para inspeccionar el repo | Usar siempre el mismo entorno/cliente Git para editar y comitear; no mezclar herramientas con `core.autocrlf` distinto sobre el mismo working tree. |

## 8. Checklist de evidencia para Pull Requests

Antes de solicitar revisión, confirmar en la aplicación (o aplicaciones)
modificadas:

- [ ] `npm run format:check` pasa sin cambios pendientes.
- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm run build` compila correctamente.
- [ ] `npm run test:cov -- --runInBand` pasa y la cobertura es ≥ 80 % en
      statements, branches, functions y lines.
- [ ] `npm run test:e2e` se ejecutó localmente o se validó en el pipeline
      (si el cambio afecta endpoints HTTP).
- [ ] No quedan archivos `*.sqlite`, `db/` ni `coverage/` como untracked en
      `git status`.
- [ ] El pipeline "Monorepo CI" (ambos jobs de aplicación + SonarCloud)
      pasa en verde sobre el Pull Request.
- [ ] El Quality Gate de SonarCloud aparece como **Passed**.
- [ ] Los comandos ejecutados y sus resultados (cobertura, pipeline,
      SonarCloud) quedaron registrados en la descripción del Pull Request
      como evidencia.

## 9. Referencias

- `docs/definition-of-done.md`: criterios generales de finalización de un
  ticket, incluido el umbral de cobertura.
- `docs/monorepo-architecture.md`: estructura del repositorio y detalle del
  pipeline de CI.
- `.github/workflows/ci.yml`: definición autoritativa de los jobs de
  integración continua.
- `sonar-project.properties`: configuración del análisis de SonarCloud.
