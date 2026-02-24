# Modulo ecoimpact

## Proposito
Documentacion tecnica del modulo src/ecoimpact y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### ecoimpact.controller.ts
- Ruta base: /ecoimpact
- DTOs referenciados: CompareQueryDto, EcoImpactEventDto, LeaderboardQueryDto, ProgressQueryDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /ecoimpact/me | getMe |
| POST | /ecoimpact/event | registerEvent |
| GET | /ecoimpact/leaderboard | leaderboard |
| GET | /ecoimpact/compare | compare |
| GET | /ecoimpact/progress | progress |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/ecoimpact
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


