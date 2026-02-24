# Modulo wallet

## Proposito
Documentacion tecnica del modulo src/wallet y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.

## Controladores y Endpoints
### wallet.controller.ts
- Ruta base: /wallet
- DTOs referenciados: (sin DTOs importados en controlador)

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /wallet/me | me |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/wallet
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


