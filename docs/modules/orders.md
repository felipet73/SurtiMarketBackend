# Modulo orders

## Proposito
Documentacion tecnica del modulo src/orders y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.
- Usa guard RolesGuard en uno o mas endpoints.

## Controladores y Endpoints
### orders.controller.ts
- Ruta base: /orders
- DTOs referenciados: CreateOrderDto

| Metodo | Ruta | Handler |
|---|---|---|
| POST | /orders | create |
| GET | /orders/my | my |
| GET | /orders | listAll |
| PATCH | /orders/:id/confirm | confirm |
| PATCH | /orders/:id/deliver | deliver |
| PATCH | /orders/:id/cancel | cancel |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/orders
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


