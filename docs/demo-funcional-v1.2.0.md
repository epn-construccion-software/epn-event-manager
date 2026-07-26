# Demostración funcional del release v1.2.0

Esta guía describe cómo levantar las dos aplicaciones y utilizar la pantalla web
incluida en `cleaning-crud` para demostrar los endpoints principales del release.
La interfaz no crea ni genera credenciales. La API Key válida debe estar
configurada previamente en el backend; durante la demostración se ingresa el
mismo valor en el frontend y se conserva únicamente en memoria durante la
sesión actual.

## Objetivo de la demostración

Evidenciar desde una sola pantalla los contratos HTTP incorporados o
estabilizados por los tickets de `v1.2.0`: filtros, validaciones, errores
controlados, consultas recientes, resúmenes y estadísticas. Cada prueba muestra
su nombre, ticket relacionado, URL, status HTTP, respuesta JSON y mensaje de
error cuando corresponda.

## Requisitos previos

- Node.js y npm instalados.
- Dependencias instaladas en ambas aplicaciones.
- Dos terminales disponibles para ejecutar los backends.
- Una API Key de demostración definida por el equipo. No debe registrarse en Git.

## Preparar las variables de entorno

En `constswgr2(2)/cleaning-crud`, crea el archivo local
`constswgr2(2)/cleaning-crud/.env` a partir de `.env.example` y configura al
menos:

```dotenv
PORT=3001
FIS_EPN_KEY=<clave-de-demostracion>
EVENT_HUB_URL=http://localhost:3002/events
```

El valor real de `FIS_EPN_KEY` debe mantenerse en secreto y nunca debe subirse
al repositorio. La misma clave se ingresará manualmente en la pantalla web.
`epn-event-manager` usa el puerto `3002` por defecto y no requiere una API Key
para los endpoints incluidos en esta demo.

`EVENT_HUB_URL` es la integración saliente utilizada por `cleaning-crud` para
registrar eventos. Debe apuntar exactamente a
`http://localhost:3002/events`. Después de cambiarla es obligatorio reiniciar
`cleaning-crud`.

## Levantar cleaning-crud y el frontend

Desde una primera terminal:

```bash
cd "constswgr2(2)/cleaning-crud"
npm ci
npm run start:dev
```

La aplicación queda disponible en `http://localhost:3001`. El frontend es
estático y lo sirve esta misma aplicación; no necesita un proceso ni una
instalación adicional. Abre:

```text
http://localhost:3001/index.html
```

El indicador **Cleaning CRUD** debe mostrar `En línea`.

## Levantar epn-event-manager

Desde una segunda terminal:

```bash
cd "constswgr2(2)/epn-event-manager"
npm ci
npm run start:dev
```

La aplicación queda disponible en `http://localhost:3002`. El indicador
**Event Manager** de la pantalla debe mostrar `En línea`.

## Uso de API Key en la demostración

La API Key válida se configura previamente en el backend mediante variables de entorno o configuración local.

El frontend no genera ni almacena claves reales en el repositorio. Durante la
demostración, el usuario ingresa manualmente el valor definido en
`cleaning-crud/.env`. Ese valor se conserva sólo en memoria y se envía en las
peticiones protegidas mediante el header `X-FIS-EPN-KEY`. Al recargar la
página, el acceso vuelve a estar no validado y se debe ingresar la clave otra
vez.

Si la API Key coincide con la configurada en el backend, las operaciones protegidas se ejecutan correctamente. Si la API Key está vacía o es incorrecta, la API responde con error de autorización y el frontend muestra un mensaje claro.

### Estado inicial y protección de datos operativos

La demostración siempre inicia con el acceso en estado **No validado**. Antes
de validar la API Key, el frontend no consulta ni muestra productos, eventos,
estadísticas o resúmenes del inventario. Los indicadores del Dashboard
permanecen en `—`.

Las vistas Productos, Búsqueda, Inventario, Eventos, Estadísticas y
**Evidencia del release** muestran un aviso de acceso requerido hasta completar
la validación. Aunque Evidencia del release es documental y no ejecuta
peticiones a los servicios, se mantiene dentro de la sesión protegida para que
la demostración siga un flujo de acceso único y consistente.

Al seleccionar **Cerrar acceso**, el frontend elimina la API Key local y limpia
productos, eventos, estadísticas, búsquedas, consultas individuales y métricas
visibles. Esta secuencia permite demostrar que las consultas y operaciones
principales permanecen protegidas durante todo el flujo.

## Validar el acceso en la pantalla

1. Abre la pantalla principal en `http://localhost:3001/index.html`.
2. Ingresa en **API Key configurada en backend** el mismo valor configurado
   previamente como `FIS_EPN_KEY` en `cleaning-crud/.env`.
3. Selecciona **Validar acceso**. La pantalla consulta el endpoint protegido
   `GET /products`.
4. Si la clave coincide con la configurada en el backend, comprueba que el
   estado cambie de **Acceso no habilitado** a **Acceso validado** y aparezca
   el mensaje **Acceso validado. Las operaciones protegidas están habilitadas.**
   El valor completo no se vuelve a mostrar.

La clave se envía a las operaciones protegidas de `cleaning-crud` mediante el
header confirmado por el backend, `X-FIS-EPN-KEY`. El frontend no valida,
crea ni genera la clave: el backend compara el valor recibido con
`FIS_EPN_KEY`. La interfaz no muestra la clave completa después de validarla.
Para retirarla de la sesión y deshabilitar las operaciones protegidas,
selecciona **Cerrar acceso**. Esta acción sólo limpia el estado local y no
modifica la configuración del backend.

Si se intenta consultar un endpoint protegido sin una clave validada, la
interfaz no envía la solicitud y muestra una explicación. Esta conducta permite
evidenciar de forma controlada el caso de clave ausente.

## Usar la navegación por vistas

La barra superior cambia la vista activa; sólo se muestra el módulo
seleccionado y no es necesario recorrer una página larga. La vista inicial es
**Dashboard**.

- **Dashboard**: indicadores generales, servicios y validación de acceso.
- **Productos**: tres pestañas internas para inventario, creación y consulta
  individual.
- **Búsqueda**: consulta de catálogo por nombre, categoría o ambos.
- **Inventario**: resumen activo y estadísticas de productos.
- **Eventos**: historial de trazabilidad, filtros entendibles y actividad
  reciente.
- **Estadísticas**: tarjetas y barras de acciones registradas.
- **Evidencia del release**: matriz de tickets y detalle técnico plegable.

Los endpoints se presentan mediante acciones y resultados de negocio. El
método HTTP aparece sólo como información secundaria cuando aporta contexto.

### Pestañas internas de Productos

La vista **Productos** evita el desplazamiento largo mostrando una sola
subvista a la vez:

- **Inventario**: evidencia el listado de productos activos, búsqueda local,
  actualización, edición y eliminación lógica.
- **Crear producto**: contiene el formulario real de creación y evidencia las
  validaciones de datos y los mensajes del backend.
- **Consulta individual**: permite buscar por ID y evidencia tanto el producto
  encontrado como el manejo funcional de un producto inexistente.

Cada vez que se ingresa a **Productos**, la pestaña inicial es
**Inventario**. Después de crear correctamente, el formulario se limpia, el
inventario se actualiza internamente y aparece la opción **Ir a Inventario**.
Las tres pestañas conservan el bloqueo de operaciones mientras el acceso no
esté validado.

## Operaciones públicas y protegidas

Todas las operaciones de `cleaning-crud`, incluidas las consultas, búsquedas,
resúmenes, creación, edición y eliminación de productos, requieren que primero
se complete **Validar acceso**. Si no existe acceso validado, el frontend no
envía la petición y muestra:

> Primero valida la API Key configurada en el backend para habilitar esta operación.

Los endpoints usados por la sección **Eventos** y por las estadísticas de
eventos son públicos en la implementación actual de `epn-event-manager` y se
pueden consultar sin API Key. El frontend no crea, cambia ni administra claves:
únicamente conserva en memoria el valor ingresado durante la sesión y lo envía a
`cleaning-crud` mediante `X-FIS-EPN-KEY`.

La vista **Eventos** demuestra la trazabilidad de operaciones realizadas en
`cleaning-crud` y registradas por `epn-event-manager`. Este último recibe,
almacena y consulta los eventos; no genera eventos propios en el flujo actual.
El selector de origen se construye con los valores presentes en los eventos
recibidos y comienza con `cleaning-crud` como origen conocido.
El selector **Entidad afectada** también se construye dinámicamente. Antes de
cargar eventos sólo muestra **Todas las entidades**; después incorpora
únicamente entidades presentes en la trazabilidad, como `product`. Al actualizar
el historial completo se eliminan opciones que ya no existan y cualquier
selección obsoleta vuelve a **Todas las entidades**.

## Secuencia sugerida para el video

Cada vista muestra el resultado principal mediante tarjetas, listas, tablas,
mensajes o barras. En **Evidencia del release**, abre
**Detalle técnico de la última operación** para consultar la acción, URL,
status HTTP y JSON sin convertirlos en el foco de la demostración.

### cleaning-crud

Con la API Key válida y el servicio en el puerto `3001`, prueba:

1. Inicia en **Dashboard** y captura los indicadores, estados de conexión y
   estado del acceso.
2. Valida la API Key desde la tarjeta secundaria **Acceso protegido**.
3. En **Productos**, comienza en la pestaña **Inventario** y selecciona
   **Actualizar inventario** para obtener la lista
   general y evidenciar que los eliminados
   lógicamente no aparecen.
4. Abre la pestaña **Crear producto**, completa el formulario y comprueba el mensaje
   **Producto creado correctamente y agregado al inventario.**
5. En **Búsqueda**, usa sólo el nombre, sólo la categoría y ambos valores con el
   mismo botón **Buscar**.
6. Usa **Limpiar filtros** y prueba un criterio sin coincidencias.
7. En la pestaña **Consulta individual**, ingresa un ID válido y luego uno inexistente.
   El caso inexistente debe informar que el inventario no fue modificado.
8. En **Inventario**, selecciona **Actualizar resumen** y comprueba los tres
   indicadores, incluido el formato monetario.
9. Selecciona **Consultar estadísticas de productos** para confirmar que el contrato
   previo no cambió.

### Validación de productos a nivel de usuario y backend

La validación del ticket se evidencia desde el formulario real
**Crear Nuevo Producto**. El formulario conserva validaciones HTML5 y añade
mensajes funcionales para nombre, categoría, cantidad y precio. Si una
solicitud alcanza el backend y es rechazada, la interfaz muestra
**No se pudo crear el producto. Revisa los datos ingresados.**

La consulta del inventario se evidencia desde **Productos en Inventario**, donde
aparece el único botón **Actualizar inventario**. La demostración prioriza
acciones de negocio; el método, URL, status y JSON permanecen únicamente en el
detalle técnico secundario de la última operación.

Para evidenciar el control de acceso:

1. Selecciona **Cerrar acceso** y ejecuta un endpoint de productos. La
   pantalla debe indicar que la solicitud no fue enviada.
2. Ingresa deliberadamente una clave inválida y selecciona **Validar acceso**.
   La consola debe mostrar el estado `401` y el mensaje de API Key inválida o
   no autorizada.
3. Vuelve a validar la clave correcta antes de continuar.

### epn-event-manager

Con el servicio en el puerto `3002`, prueba:

La vista **Eventos** se divide en dos pestañas internas:

- **Historial** contiene los filtros avanzados por acción, origen y entidad,
  junto con la tabla de trazabilidad.
- **Actividad reciente** consulta los últimos eventos y los presenta del más
  reciente al más antiguo, respetando el límite indicado.

1. En **Eventos / Historial**, selecciona **Ver historial completo** y revisa
   la tabla de trazabilidad.
2. En **Tipo de acción**, selecciona `CREATE` y usa **Filtrar eventos**.
3. Prueba **Origen del evento** con `cleaning-crud` y **Entidad afectada** con
   `product`, primero por separado.
4. Combina acción, origen y entidad. El resumen visual debe indicar los filtros
   aplicados y que se muestran eventos que cumplen todos ellos mediante
   condición AND.
5. Selecciona **Limpiar filtros** para regresar los tres selectores a su opción
   general sin borrar los resultados mostrados. **Limpiar búsqueda** también
   vacía la tabla del historial y la devuelve a su estado inicial.
6. En **Eventos / Actividad reciente**, usa límite `5` en **Ver actividad
   reciente** y comprueba que la tabla esté ordenada del evento más reciente al
   más antiguo. Repite con un límite inválido, por ejemplo `0`, para evidenciar
   el error controlado. **Limpiar actividad reciente** vacía esta tabla,
   restablece el límite a `5` y muestra nuevamente la instrucción inicial.
7. En **Estadísticas**, selecciona **Actualizar estadísticas** y comprueba las
   cinco tarjetas y las barras; todos los valores deben ser numéricos y `total`
   debe ser la suma de las cuatro acciones.

Las respuestas dependerán de los datos generados durante la demostración. Si
la lista de eventos está vacía, crea o actualiza un producto válido desde el
CRUD y vuelve a consultar.

La validación de payload inválido en eventos se mantiene como garantía técnica
del backend. Para no interrumpir el flujo de negocio de la demo, no se muestra
como botón principal en la interfaz; su evidencia se documenta en la vista
**Evidencia del release** y en las pruebas automatizadas del Ticket #47.

## Relación entre tickets y evidencia funcional

La vista **Evidencia del release v1.2.0** funciona como guion del video y
relaciona los doce incrementos del sprint con una evidencia observable:

| Versión | Ticket | Tipo | Funcionalidad demostrada | Vista de la demo | Evidencia funcional |
| --- | --- | --- | --- | --- | --- |
| v1.1.1 | #40 | Feature | Filtros avanzados de eventos | Eventos | Se filtra la trazabilidad por tipo de acción, origen y entidad afectada, mostrando únicamente los eventos que cumplen todos los filtros seleccionados. |
| v1.1.2 | #41 | Bug | Validación de productos | Productos / Crear producto | El formulario de creación muestra validaciones de negocio y el backend rechaza datos incompletos o inválidos sin modificar el inventario. |
| v1.1.3 | #42 | Technical Debt | Servicio dedicado de validación de productos | Productos / Crear producto | La creación y validación de productos se mantiene estable después del refactor, conservando las reglas de validación sin regresiones visibles. |
| v1.1.4 | #43 | Feature | Últimos eventos registrados | Eventos | La sección de actividad reciente muestra los eventos más nuevos primero, respetando la cantidad indicada por el usuario. |
| v1.1.5 | #44 | Bug | Manejo de producto inexistente | Productos / Consulta individual | Al buscar un ID inexistente, el sistema muestra un mensaje funcional de producto no encontrado sin modificar el inventario. |
| v1.1.6 | #45 | Technical Debt | Mejora de nombres internos en EventsService | Eventos | La trazabilidad de eventos se conserva estable después del refactor, sin cambios visibles en filtros, historial ni actividad reciente. |
| v1.1.7 | #46 | Feature | Búsqueda de productos por nombre y categoría | Búsqueda | El usuario puede buscar productos por nombre, seleccionar una categoría y combinar ambos criterios para filtrar el catálogo. |
| v1.1.8 | #47 | Bug | Validación de eventos inválidos | Evidencia del release / pruebas automatizadas | El backend mantiene una protección contra eventos incompletos o con acciones no permitidas. No se muestra como botón principal para no interrumpir el flujo de negocio, pero queda documentado como garantía técnica del release. |
| v1.1.9 | #48 | Technical Debt | Servicio especializado de estadísticas | Estadísticas | La vista de estadísticas muestra los conteos de eventos mediante indicadores y barras, manteniendo el contrato público después de separar la lógica en un servicio especializado. |
| v1.1.10 | #49 | Feature | Resumen de productos activos | Inventario / Dashboard | El sistema presenta indicadores de negocio como productos activos, cantidad total y valor total del inventario. |
| v1.1.11 | #50 | Bug | Estadísticas estables con repositorios vacíos o parciales | Estadísticas | Los conteos se muestran siempre como valores numéricos y el total corresponde a la suma de las acciones, evitando valores nulos, indefinidos o NaN. |
| v1.1.12 | #51 | Technical Debt | Estrategia de pruebas del monorepo | Evidencia del release / documentación | La documentación permite reproducir validaciones de ambas aplicaciones, incluyendo formato, lint, typecheck, build, pruebas unitarias, e2e y cobertura mínima del 80%. |
| v1.2.0 | #66 | Task | Frontend para demostración funcional | Todas las vistas de la demo | La interfaz integra en un flujo funcional el Dashboard protegido, la gestión de productos, la trazabilidad de eventos, las estadísticas y la evidencia del release. |
| v1.2.0 | #67 | Task | Documentación del release final | CHANGELOG / guía de demo | El release queda documentado mediante su resumen formal, issues, tags, validaciones, cobertura y secuencia reproducible de demostración. |

## Resumen del release

- 12 tickets incrementales y 2 tareas finales de release completados.
- Tags del ciclo: `v1.1.1` a `v1.1.12`.
- Release consolidado esperado: `v1.2.0`.
- Las ramas de los tickets se integran en `develop`.
- La promoción final se realiza hacia `main`.

Los tickets v1.1.1 a v1.1.12 representan incrementos micro integrados en
`develop`. El release oficial v1.2.0 consolida todas las mejoras y se
promociona a `main` mediante Pull Request final.

## Validaciones y cobertura del release

Las validaciones deben ejecutarse de forma independiente dentro de
`constswgr2(2)/cleaning-crud` y
`constswgr2(2)/epn-event-manager`:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run build
npm run test:cov -- --runInBand
npm run test:e2e
```

La fila `All files` de los reportes reales de Jest utilizados para validar el
release presentó estos resultados:

| Aplicación | Statements | Branches | Functions | Lines |
| --- | ---: | ---: | ---: | ---: |
| `cleaning-crud` | 99.5 % | 89.77 % | 97.46 % | 99.46 % |
| `epn-event-manager` | 100 % | 87.5 % | 100 % | 100 % |
| Frontend / demo | No aplica | No aplica | No aplica | No aplica |

Ambas aplicaciones superan el mínimo requerido del 80 %. El frontend estático
de la demostración no posee una suite independiente de cobertura, por lo que
sus métricas se registran como **No aplica**.

## Observaciones y límites de la interfaz

- En el árbol de trabajo analizado, la fuente de tickets está disponible como
  `TICKETS_VERSION_1_2_0.md` en la raíz, no como
  `docs/TICKETS_VERSION_1_2_0.md`. La matriz anterior se obtuvo de ese
  documento sin modificarlo.
- No existe un endpoint público para vaciar selectivamente los repositorios de
  eventos. Por ello, los estados completamente vacíos o parciales del ticket
  #50 sólo pueden mostrarse si el entorno se prepara previamente; la interfaz
  sí permite verificar que todos los conteos actuales sean numéricos y que
  `total` sea consistente.
- La exclusión de productos eliminados lógicamente se evidencia eliminando un
  producto desde el CRUD existente y repitiendo el listado o los filtros.
- Los tickets de deuda técnica no agregan contratos HTTP. Su evidencia visual
  es la ausencia de regresiones; su estructura interna se demuestra mediante
  código, pruebas y cobertura.

## Evidencias que se deben capturar

- Los dos indicadores de servicio en estado `En línea`.
- El Dashboard como vista inicial con indicadores cargados.
- El estado visual **Acceso validado**, sin mostrar el valor de la clave.
- El resultado exitoso del botón **Validar acceso**.
- Una consulta exitosa de cada endpoint solicitado.
- La URL completa y el status HTTP de cada consulta.
- La respuesta JSON formateada.
- Las tablas de productos y eventos, las tarjetas de inventario y las barras de
  estadísticas.
- El nombre de la prueba y el ticket relacionado.
- Respuestas controladas `400` para ambos payloads inválidos.
- La respuesta `404` de producto inexistente.
- El bloqueo previo al intentar consultar productos sin una API Key.
- Una respuesta `401` usando una clave deliberadamente inválida.
- Un error de conexión controlado, si forma parte del alcance del video.

No captures el archivo `.env`, la consola donde se haya escrito la clave ni el
valor visible en el campo de entrada.

## Solución de problemas

### Error 401

- Confirma que se validó una clave en la pantalla.
- Confirma que coincide exactamente con `FIS_EPN_KEY` de `cleaning-crud`.
- Cierra el acceso, vuelve a ingresar la clave y repite la validación.
- Reinicia `cleaning-crud` si el archivo `.env` cambió mientras estaba activo.

### Un backend no está levantado

La consola de respuestas mostrará **Error de red** y el indicador del servicio
aparecerá desconectado. Revisa la terminal correspondiente, confirma el puerto
y ejecuta nuevamente `npm run start:dev`.

### Puerto ocupado

Detén el proceso que utiliza `3001` o `3002`. Si se cambia un puerto mediante
`PORT`, también deben actualizarse las URLs usadas por el frontend; para la
demostración se recomienda conservar los puertos predeterminados.

### Los eventos no se generan

Confirma que `cleaning-crud/.env` contiene:

```dotenv
EVENT_HUB_URL=http://localhost:3002/events
```

Después reinicia `cleaning-crud`, ejecuta una operación válida sobre productos
y vuelve a consultar los eventos. Al crear un producto desde el frontend, la
interfaz actualiza automáticamente el historial filtrado por acción `CREATE`,
origen `cleaning-crud` y entidad `product`, además de la actividad reciente.

Si el producto aparece en el inventario pero no en Eventos:

1. Confirma que `epn-event-manager` esté activo en el puerto `3002`.
2. Confirma que `EVENT_HUB_URL` sea `http://localhost:3002/events`.
3. Reinicia `cleaning-crud`, porque las variables se leen al iniciar.
4. Crea otro producto y revisa la vista **Eventos**.
5. Revisa el log de `cleaning-crud` si aparece `Error emitting event`.
