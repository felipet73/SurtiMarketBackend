# Modulo dashboard

## Proposito
Documentacion tecnica del modulo src/dashboard y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### dashboard.controller.ts
- Ruta base: /dashboard
- DTOs referenciados: (sin DTOs importados en controlador)

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /dashboard/awareness | awareness |
| GET | /dashboard/progress/weekly | weeklyProgress |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/dashboard
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


