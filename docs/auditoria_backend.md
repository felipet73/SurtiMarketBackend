# Reporte de Auditoría Física - Backend

**Auditor:** Cristhian Pinos
**Fecha:** 16/02/2026

## Hallazgos y Cosas a Cambiar:
1. **Credenciales de Base de Datos:** Es vital asegurar que los scripts de conexión a la base de datos no tengan las contraseñas en duro en el código subido al repositorio. 
2. **Estructura de Scripts PHP:** Los scripts de conexión y las consultas deben de estar en carpetas separadas para mantener el orden.
3. **Archivo `.env.example`:** Falta crear este archivo con las variables base

**Acciones tomadas en este PR:** Documentación de hallazgos y creación de archivos de configuración base.