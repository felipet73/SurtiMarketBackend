# Modulo groups

## Proposito

Gestiona grupos eco-sociales:

- crear grupo
- búsqueda de grupos públicos
- obtener grupo actual del usuario
- solicitudes de unión
- invitaciones por código / invitación directa
- aceptación de solicitudes/invitaciones
- salida del grupo
- consulta de eventos de puntos del grupo

## Seguridad / Auth

Todos los endpoints de `GroupsController` usan `JwtAuthGuard`.

Roles dentro del grupo se validan en servicio (`GroupRole.OWNER`, etc.), no por `RolesGuard`.

## DTOs principales

### `CreateGroupDto`
- `name` (3..50)
- `description?` (max 200)
- `visibility?`: `PUBLIC | PRIVATE`
- `joinPolicy?`: `OPEN | REQUEST_APPROVAL | INVITE_ONLY`

### `JoinByCodeDto`
- `code`: string, minimo 4

### `InviteUserDto`
- `userId`: MongoId requerido

## Endpoints

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/groups` | Crear grupo y membership OWNER |
| GET | `/groups/search?q=` | Buscar grupos publicos |
| GET | `/groups/me` | Obtener grupo actual + miembros + data de usuarios |
| POST | `/groups/:id/join-request` | Solicitar unión a grupo |
| POST | `/groups/me/leave` | Salir del grupo actual |
| POST | `/groups/:id/invite-link` | Generar código de invitación (solo owner) |
| POST | `/groups/join-by-code` | Unirse por código |
| POST | `/groups/:id/invite-user` | Invitar usuario (solo owner) |
| POST | `/groups/invites/:notificationId/accept` | Aceptar invitación de grupo |
| GET | `/groups/me/join-requests` | Solicitudes pendientes hechas por el usuario |
| GET | `/groups/:id/join-requests` | Ver solicitudes pendientes del grupo (owner) |
| POST | `/groups/:id/join-requests/:userId/accept` | Aceptar solicitud (owner) |
| GET | `/groups/me/points-events?weekKey=` | Eventos de puntos del grupo del usuario |

---

## Ejemplos reales completos

### 1) Crear grupo

### Request
```http
POST /groups
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{
  "name": "EcoVecinos Cuenca",
  "description": "Grupo barrial para retos y compras sostenibles",
  "visibility": "PUBLIC",
  "joinPolicy": "REQUEST_APPROVAL"
}
```

### Response
```json
{
  "id": "697978d6e2d098dc68423dd0",
  "name": "EcoVecinos Cuenca",
  "joinPolicy": "REQUEST_APPROVAL",
  "visibility": "PUBLIC"
}
```

---

### 2) Obtener mi grupo (respuesta enriquecida con miembros)

### Request
```http
GET /groups/me
Authorization: Bearer <TOKEN>
```

### Response
```json
{
  "inGroup": true,
  "membership": {
    "role": "OWNER",
    "joinedAt": "2026-02-09T04:40:00.000Z"
  },
  "group": {
    "id": "697978d6e2d098dc68423dd0",
    "name": "EcoVecinos Cuenca",
    "description": "Grupo barrial para retos y compras sostenibles",
    "memberCount": 2,
    "level": 1,
    "xp": 0,
    "joinPolicy": "REQUEST_APPROVAL",
    "visibility": "PUBLIC"
  },
  "members": [
    {
      "role": "OWNER",
      "joinedAt": "2026-02-09T04:40:00.000Z",
      "user": {
        "id": "697c28cbdcf9d0d23d957a38",
        "fullName": "Felipe Torres",
        "username": "felipe",
        "displayName": "Pipe",
        "avatarUrl": "",
        "privacy": {
          "profileVisibility": "COMMUNITY",
          "emailSearchable": true,
          "friendRequests": "ANYONE"
        },
        "email": "felipe@surtimarket.com",
        "roles": ["CLIENT"],
        "isActive": true,
        "createdAt": "2026-02-09T04:49:06.955Z",
        "updatedAt": "2026-02-22T15:00:00.000Z"
      }
    }
  ]
}
```

### Response (sin grupo)
```json
{
  "inGroup": false
}
```

---

### 3) Solicitar unión a grupo

### Request
```http
POST /groups/697978d6e2d098dc68423dd0/join-request
Authorization: Bearer <TOKEN>
```

### Response (grupo con aprobación)
```json
{
  "status": "requested",
  "groupId": "697978d6e2d098dc68423dd0"
}
```

### Response (grupo abierto)
```json
{
  "status": "joined",
  "groupId": "697978d6e2d098dc68423dd0"
}
```

---

### 4) Invitar usuario al grupo (owner)

### Request
```http
POST /groups/697978d6e2d098dc68423dd0/invite-user
Authorization: Bearer <TOKEN_OWNER>
Content-Type: application/json
```

```json
{
  "userId": "69890a0467d5f9fc8b98f8e4"
}
```

### Response
```json
{
  "ok": true,
  "status": "invited"
}
```

### Response (ya es miembro)
```json
{
  "ok": true,
  "status": "already_member"
}
```

---

### 5) Listar solicitudes pendientes del grupo (owner)

### Request
```http
GET /groups/697978d6e2d098dc68423dd0/join-requests
Authorization: Bearer <TOKEN_OWNER>
```

### Response
```json
[
  {
    "user": {
      "id": "69890a0467d5f9fc8b98f8e4",
      "fullName": "Ana Ruiz",
      "username": "ana",
      "displayName": "Ani",
      "avatarUrl": "",
      "privacy": {
        "profileVisibility": "COMMUNITY",
        "emailSearchable": true,
        "friendRequests": "ANYONE"
      },
      "email": "ana@surtimarket.com",
      "roles": ["CLIENT"],
      "isActive": true,
      "createdAt": "2026-02-10T00:10:00.000Z",
      "updatedAt": "2026-02-10T00:10:00.000Z"
    },
    "requestedAt": "2026-02-21T19:00:00.000Z"
  }
]
```

---

### 6) Aceptar solicitud de unión (owner)

### Request
```http
POST /groups/697978d6e2d098dc68423dd0/join-requests/69890a0467d5f9fc8b98f8e4/accept
Authorization: Bearer <TOKEN_OWNER>
```

### Response
```json
{
  "ok": true,
  "status": "accepted",
  "groupId": "697978d6e2d098dc68423dd0",
  "userId": "69890a0467d5f9fc8b98f8e4"
}
```

### Response (idempotente)
```json
{
  "idempotent": true,
  "status": "already_member"
}
```

---

### 7) Ver eventos de puntos del grupo actual

### Request
```http
GET /groups/me/points-events?weekKey=2026-W07
Authorization: Bearer <TOKEN>
```

### Response
```json
{
  "inGroup": true,
  "weekKey": "2026-W07",
  "total": 5,
  "items": [
    {
      "id": "698968ab0db350791a33480b",
      "userId": "697c28cbdcf9d0d23d957a38",
      "eventKey": "QUIZ_PASS:2026-W07:697c28cbdcf9d0d23d957a38",
      "points": 40,
      "source": "QUIZ_PASS",
      "dateKey": null,
      "createdAt": "2026-02-09T04:55:07.700Z"
    },
    {
      "id": "69896ce70db350791a334b7a",
      "userId": "697c28cbdcf9d0d23d957a38",
      "eventKey": "STREAK_DAY:2026-02-09:697c28cbdcf9d0d23d957a38",
      "points": 10,
      "source": "STREAK_DAY",
      "dateKey": "2026-02-09",
      "createdAt": "2026-02-09T05:13:11.246Z"
    }
  ]
}
```

## Decisiones de implementacion

- La pertenencia al grupo se deriva por `membership ACTIVE`; no se confía en IDs enviados por cliente para rutas `/me`.
- Las invitaciones directas se materializan como notificaciones (`GROUP_INVITE`) y se aceptan via `notificationId`.
- Aceptar solicitudes genera notificación `GROUP_JOIN_ACCEPTED` al usuario aceptado.

## Pendientes / Riesgos

- Algunos mensajes de notificación usan `groupId` en el body (mejorar para mostrar nombre de grupo en todos los casos).
- Validar consistentemente `ObjectId` en todos los endpoints antes de llegar al servicio para evitar errores BSON.

