# Modulo admin

## Proposito
Documentacion tecnica del modulo src/admin y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.
- Usa guard RolesGuard en uno o mas endpoints.

## Controladores y Endpoints
### admin.controller.ts
- Ruta base: /admin
- DTOs referenciados: CreateUserDto, UpdateUserByAdminDto

| Metodo | Ruta | Handler |
|---|---|---|
| POST | /admin/users | createUser |
| GET | /admin/users | getUsers |
| GET | /admin/users/:id | getEmployeeById |
| PATCH | /admin/users/:id | updateUser |
| DELETE | /admin/users/:id | deleteUser |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/admin
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.

### admin-prompts.controller.ts
- Ruta base: /admin/prompts
- DTOs referenciados: UpdateChallengeTemplateDto, UpdateDashboardTemplateDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /admin/prompts/challenges | listChallengeTemplates |
| GET | /admin/prompts/challenges/:id | getChallengeTemplateById |
| PATCH | /admin/prompts/challenges/:id | updateChallengeTemplate |
| PATCH | /admin/prompts/challenges/:id/active | setChallengeTemplateActive |
| GET | /admin/prompts/dashboard | listDashboardTemplates |
| GET | /admin/prompts/dashboard/:id | getDashboardTemplateById |
| PATCH | /admin/prompts/dashboard/:id | updateDashboardTemplate |
| PATCH | /admin/prompts/dashboard/:id/active | setDashboardTemplateActive |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/admin/prompts
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


