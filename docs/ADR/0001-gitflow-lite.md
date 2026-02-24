# ADR 0001 - GitFlow-lite para backend

- Estado: Aceptado
- Fecha: 2026-02-24

## Contexto

El proyecto requiere trazabilidad de cambios, control de releases y trabajo paralelo de funcionalidades/documentacion con un equipo pequeno.

## Decision

Adoptar un flujo GitFlow-lite:

- `main`: rama estable
- `develop`: integracion
- `release/x.y.z`: preparacion de release
- `feature/<nombre>`: trabajo acotado por funcionalidad/documentacion

## Consecuencias

### Positivas
- Mejor trazabilidad por PR y por feature.
- Facilita releases controlados y hotfixes.
- Permite documentar conflictos y merges de forma auditable.

### Costos
- Mas overhead operativo (ramas, merges, changelog, release notes).
- Requiere disciplina en mensajes de commit y PRs.

