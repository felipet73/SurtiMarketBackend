# Modulo comments

## Proposito
Documentacion tecnica del modulo src/comments y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### comments.controller.ts
- Ruta base: /comments
- DTOs referenciados: SendCommentToGroupDto, SendCommentToUserDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /comments/me/received | received |
| GET | /comments/me/with/:userId | withUser |
| POST | /comments/user | sendToUser |
| POST | /comments/group | sendToGroup |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/comments
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


