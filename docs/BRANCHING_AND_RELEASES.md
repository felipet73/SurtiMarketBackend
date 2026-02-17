# Branching y Releases

## Convenciones

- Rama estable: `main`
- Nuevas implementaciones: `feature/<nombre-corto>`
- Correcciones urgentes: `hotfix/<nombre-corto>`

## Flujo de trabajo

1. Crear rama desde `main`
   - `git checkout main`
   - `git pull`
   - `git checkout -b feature/<nombre-corto>`
2. Implementar, validar y abrir PR hacia `main`.
3. Hacer merge en `main` (solo cambios aprobados).
4. Actualizar `CHANGELOG.md` en cada merge.
5. Crear tag por funcionalidad mergeada.

## Tags

- Formato sugerido: `v<major>.<minor>.<patch>-<feature>`
- Ejemplo: `v1.0.1-auth-profile-update`

## Regla de calidad mínima para merge

- Build en verde.
- Validación manual de endpoint/UI impactados.
- Sin secretos en código o `.env`.
