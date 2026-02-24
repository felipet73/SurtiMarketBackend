# Resolucion de conflictos (simulada)

Este archivo documenta la simulacion de un conflicto de merge sobre el mismo bloque de `docs/CHANGELOG.md` usando dos ramas:

- `feature/conflicto-a`
- `feature/conflicto-b`

## Objetivo

Demostrar trazabilidad de conflictos y su resolucion en Git con comandos reproducibles.

## Archivo afectado

- `docs/CHANGELOG.md`

## Resumen de resolucion

- Ambas ramas editaron el mismo bloque de texto.
- Se fusiono primero `feature/conflicto-a` en `develop`.
- Al fusionar `feature/conflicto-b` en `develop`, Git genero conflicto.
- Se resolvio manualmente manteniendo ambas notas y consolidando el texto final.

## Comandos utilizados (se completan durante la simulacion)

```bash
git checkout develop
git merge --no-ff feature/conflicto-a
git merge --no-ff feature/conflicto-b
# resolver conflicto en docs/CHANGELOG.md
git add docs/CHANGELOG.md
git commit
```

## Resultado esperado

- `develop` queda con historial que evidencia conflicto y su resolucion.
- `docs/CHANGELOG.md` conserva ambas aportaciones sin perder trazabilidad.

