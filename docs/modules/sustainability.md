# Modulo sustainability

## Proposito
Documentacion tecnica del modulo src/sustainability y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### sustainability.controller.ts
- Ruta base: /sustainability
- DTOs referenciados: SubmitAssessmentDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /sustainability/questionnaire | questionnaire |
| POST | /sustainability/assessment | submit |
| GET | /sustainability/me | me |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/sustainability
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


