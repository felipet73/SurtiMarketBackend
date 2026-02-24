# Modulo streak

## Proposito
Documentacion tecnica del modulo src/streak y sus controladores. Este documento fue generado automaticamente y puede complementarse con detalles funcionales del equipo.

## Auth / Seguridad
- Sin guardas globales en controlador (revisar metodos individuales).

## Controladores y Endpoints
### streak.controller.ts
- Ruta base: /streak
- DTOs referenciados: (sin DTOs importados en controlador)

| Metodo | Ruta | Handler |
|---|---|---|
| POST | /streak/mark | mark |
| GET | /streak/me | me |

#### Ejemplos request/response
- Request (ejemplo): curl -X GET https://<host>/streak
- Response (ejemplo): JSON segun contrato del controlador; validar con Postman/Swagger si aplica.

#### Decisiones de implementacion
- Se documenta a nivel de controlador y rutas para trazabilidad de cambios.
- Completar contratos finos de DTOs desde código fuente cuando se publiquen cambios en PR.

#### Pendientes
- Agregar ejemplos reales por endpoint (payload y respuesta) en siguientes iteraciones.
- Mantener actualizado este documento cuando cambien rutas/guardas/DTOs.


