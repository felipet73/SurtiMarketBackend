# Release Notes

## v1.1.0-baseline2

### Resumen
Release de linea base de trazabilidad y documentacion para el backend NestJS + MongoDB.

### Incluye
- README tecnico actualizado (stack, arquitectura, ejecucion, variables de entorno).
- Changelog y notas de release estandarizadas.
- ADRs iniciales de arquitectura/proceso.
- Documentacion por modulo/controlador en `docs/modules/`.
- Workflow CI en GitHub Actions.
- Flujo GitFlow-lite con ramas `develop` y `release/1.1.0`.
- Simulacion y resolucion documentada de conflicto de merge.

### Checklist de despliegue
- [ ] `npm ci`
- [ ] `npm run build`
- [ ] Validar variables `MONGO_URI`, `JWT_SECRET`, `PUBLIC_BASE_URL`
- [ ] Validar `OPENAI_API_KEY` en ambientes que usan IA
- [ ] Probar endpoints criticos: auth, dashboard, challenges, analytics
- [ ] Verificar CORS y acceso a `/public/*`
- [ ] Revisar logs post-deploy en Render

### Riesgos / observaciones
- Uploads en `public/` pueden perderse en proveedores con disco efimero (ej. Render).
- Recomendado migrar assets a almacenamiento externo.

