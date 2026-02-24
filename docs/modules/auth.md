# Modulo auth

## Proposito
Documentacion tecnica del modulo src/auth y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.
- Usa guard RolesGuard en uno o mas endpoints.

## Controladores y Endpoints
### auth.controller.ts
- Ruta base: /auth
- DTOs referenciados: LoginDto, RegisterDto, UpdateProfileDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /auth/me | me |
| POST | /auth/register | register |
| POST | /auth/login | login |
| POST | /auth/profile | updateProfile |
| POST | /auth/me/avatar | uploadAvatar |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/auth
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


