# ADR 0002 - Manejo de assets publicos en backend

- Estado: Aceptado (transitorio)
- Fecha: 2026-02-24

## Contexto

El backend actualmente guarda imagenes (avatar/productos/puzzle) en `public/` y las expone con `useStaticAssets`.
En despliegues tipo Render, el filesystem puede ser efimero.

## Decision

Mantener temporalmente almacenamiento local en `public/` por simplicidad de MVP, con trazabilidad en documentacion y release notes.

## Consecuencias

### Positivas
- Implementacion simple y rapida para MVP.
- No requiere infraestructura adicional para pruebas.

### Negativas
- Riesgo de perdida de archivos en reinicios/redeploys.
- Escalado horizontal puede producir inconsistencias de archivos.

## Plan de evolucion

Migrar a almacenamiento externo (Cloudinary / S3 / Supabase Storage) manteniendo el mismo contrato de URLs en BD.

