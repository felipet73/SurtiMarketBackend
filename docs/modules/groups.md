# Modulo groups

## Proposito
Documentacion tecnica del modulo src/groups y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### groups.controller.ts
- Ruta base: /groups
- DTOs referenciados: CreateGroupDto, InviteUserDto, JoinByCodeDto

| Metodo | Ruta | Handler |
|---|---|---|
| POST | /groups | create |
| GET | /groups/search | search |
| GET | /groups/me | me |
| POST | /groups/:id/join-request | joinRequest |
| POST | /groups/me/leave | leave |
| POST | /groups/:id/invite-link | inviteLink |
| POST | /groups/join-by-code | joinByCode |
| POST | /groups/:id/invite-user | inviteUser |
| POST | /groups/invites/:notificationId/accept | acceptInvite |
| GET | /groups/me/join-requests | myJoinRequests |
| GET | /groups/:id/join-requests | listJoinRequests |
| POST | /groups/:id/join-requests/:userId/accept | acceptJoinRequest |
| GET | /groups/me/points-events | listMyGroupPoints |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/groups
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.

### groups-extras.controller.ts
- Ruta base: /groups
- DTOs referenciados: (sin DTOs importados en controlador)

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /groups/leaderboard/weekly | leaderboard |
| GET | /groups/me/neighborhood | myNeighborhood |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/groups
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


