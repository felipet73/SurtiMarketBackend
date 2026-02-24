# Modulo challenges

## Proposito
Documentacion tecnica del modulo src/challenges y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### challenges.controller.ts
- Ruta base: /challenges
- DTOs referenciados: SubmitWeeklyQuizDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /challenges | list |
| POST | /challenges/:id/complete | complete |
| GET | /challenges/weekly/me | weeklyMe |
| GET | /challenges/weekly-quiz/me | weeklyQuizMe |
| POST | /challenges/weekly-quiz/:instanceId/submit | submitWeeklyQuiz |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/challenges
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


