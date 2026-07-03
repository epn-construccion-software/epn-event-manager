# Flujo Kanban del proyecto

## Objetivo

El equipo utiliza GitHub Projects para gestionar el trabajo de los proyectos
`cleaning-crud` y `epn-event-manager`.

El tablero permite visualizar el estado de cada ticket, controlar el trabajo
en progreso y mantener trazabilidad entre Issues, ramas, Pull Requests y
evidencias técnicas.

## Estados del tablero

### Backlog

Contiene trabajo identificado que todavía no cumple la Definition of Ready.

### Ready

Contiene tickets que tienen descripción clara, criterios de aceptación,
prioridad, estimación y responsable definido.

### In Progress

Contiene tickets que se encuentran actualmente en desarrollo y tienen una
rama de trabajo asociada.

### In Review

Contiene tickets con un Pull Request abierto y pendientes de revisión técnica.

### Testing

Contiene tickets en validación mediante pruebas automáticas, cobertura,
compilación, análisis de calidad y revisión funcional.

### Done

Contiene tickets completados que cumplen la Definition of Done y fueron
integrados correctamente.

## Tipos de tickets

Los tickets se clasifican en:

- Feature: nuevas funcionalidades.
- Bug: corrección de errores.
- Technical Debt: refactorización y mejora interna.
- Task: documentación, investigación o configuración.

## Prioridad

Los tickets pueden clasificarse como:

- High
- Medium
- Low

## Estimación

Se utiliza la siguiente escala:

- 1: muy pequeño
- 2: pequeño
- 3: mediano
- 5: grande
- 8: muy grande

## Política de trabajo en progreso

Cada integrante puede mantener como máximo un ticket en la columna
`In Progress`.

## Definition of Ready

Un ticket puede pasar a `Ready` cuando:

- Tiene un título claro.
- Tiene una descripción completa.
- Tiene criterios de aceptación verificables.
- Tiene tipo y prioridad.
- Tiene estimación.
- Tiene responsable.
- Tiene evidencia esperada.

## Definition of Done

Un ticket puede pasar a `Done` cuando:

- Fue desarrollado en una rama independiente.
- Las pruebas fueron añadidas o actualizadas.
- La cobertura es igual o superior al 80 %.
- ESLint finaliza sin errores.
- El proyecto compila correctamente.
- El pipeline es exitoso.
- No existen code smells críticos.
- La documentación fue actualizada.
- El Pull Request fue revisado y aprobado.