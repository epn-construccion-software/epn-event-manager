# Definition of Done

## Objetivo

La Definition of Done establece las condiciones que debe cumplir un ticket
antes de considerarse terminado.

Su propósito es garantizar que el código integrado tenga calidad,
trazabilidad, pruebas y documentación.

## Criterios

Un ticket puede pasar a `Done` cuando cumple:

- [ ] Fue desarrollado en una rama independiente.
- [ ] El código sigue las convenciones del proyecto.
- [ ] Las pruebas fueron añadidas o actualizadas.
- [ ] Las pruebas automáticas finalizaron correctamente.
- [ ] La cobertura es igual o superior al 80 %.
- [ ] ESLint finaliza sin errores.
- [ ] El proyecto compila correctamente.
- [ ] El pipeline de integración continua es exitoso.
- [ ] No existen code smells críticos.
- [ ] Los logs necesarios fueron implementados.
- [ ] La documentación fue actualizada.
- [ ] El Pull Request fue revisado.
- [ ] El Pull Request fue aprobado.
- [ ] El cambio fue integrado en `develop`.

## Aplicación en Kanban

Cuando se abre un Pull Request, el ticket pasa a `In Review`.

Después de la revisión, las pruebas y el pipeline, pasa a `Testing`.

Solo puede pasar a `Done` cuando todos los criterios anteriores se cumplen.