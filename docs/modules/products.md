# Modulo products

## Proposito
Documentacion tecnica del modulo src/products y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Usa guard JwtAuthGuard en uno o mas endpoints.
- Usa guard RolesGuard en uno o mas endpoints.

## Controladores y Endpoints
### products.controller.ts
- Ruta base: /products
- DTOs referenciados: CreateProductDto, SetPromoDiscountDto, UpdateProductDto

| Metodo | Ruta | Handler |
|---|---|---|
| GET | /products | list |
| GET | /products/recommendations | recommendations |
| GET | /products/:id | getById |
| POST | /products | create |
| PATCH | /products/:id | update |
| PATCH | /products/:id/active | setActive |
| PATCH | /products/:id/activate | activate |
| PATCH | /products/:id/stock | setStock |
| DELETE | /products/:id | softDelete |
| PATCH | /products/:id/promo/stop | stopPromotion |
| PATCH | /products/:id/promo/discount | setPromotionByDiscount |
| POST | /products/:id/images | uploadImages |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/products
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


