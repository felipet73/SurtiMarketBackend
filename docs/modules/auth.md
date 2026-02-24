# Modulo auth

## Proposito

Gestiona autenticacion y perfil del usuario:

- registro de cliente
- login JWT
- consulta de usuario actual (`/auth/me`)
- actualizacion de perfil
- carga de avatar del cliente en `public/avatars/<userId>/`

## Seguridad / Auth

- `GET /auth/me`: `JwtAuthGuard`
- `POST /auth/profile`: `JwtAuthGuard`
- `POST /auth/me/avatar`: `JwtAuthGuard + RolesGuard` y requiere rol `CLIENT`
- `POST /auth/register` y `POST /auth/login`: publicos

## DTOs y validaciones clave

### `RegisterDto`
- `fullName`: string requerido
- `username`: string requerido
- `email`: email valido
- `password`: string, minimo 8 caracteres

### `LoginDto`
- `email`: email valido
- `password`: string, minimo 8 caracteres

### `UpdateProfileDto`
- opcionales: `fullName`, `username`, `displayName`, `avatarUrl`, `privacy`, `email`, `roles`, `isActive`
- nota: backend valida unicidad de `email` y `username` en `UsersService.updateProfile`

## Endpoints

| Metodo | Ruta | Auth | Descripcion |
|---|---|---|---|
| GET | `/auth/me` | JWT | Datos del usuario autenticado |
| POST | `/auth/register` | No | Registro de cliente (`CLIENT`) |
| POST | `/auth/login` | No | Login y emision de access token |
| POST | `/auth/profile` | JWT | Actualiza perfil del usuario actual |
| POST | `/auth/me/avatar` | JWT + rol CLIENT | Sube avatar y actualiza `avatarUrl` |

---

## Ejemplos reales completos

### 1) Registro de cliente

### Request
```http
POST /auth/register
Content-Type: application/json
```

```json
{
  "fullName": "Felipe Torres",
  "username": "felipe.torres",
  "email": "felipe@surtimarket.com",
  "password": "Password123"
}
```

### Response (201/200)
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "697c28cbdcf9d0d23d957a38",
    "fullName": "Felipe Torres",
    "email": "felipe@surtimarket.com",
    "roles": ["CLIENT"]
  }
}
```

### Errores frecuentes
- `409 Conflict`: email ya registrado
- `400 Bad Request`: DTO invalido

---

### 2) Login

### Request
```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "felipe@surtimarket.com",
  "password": "Password123"
}
```

### Response
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "697c28cbdcf9d0d23d957a38",
    "fullName": "Felipe Torres",
    "email": "felipe@surtimarket.com",
    "roles": ["CLIENT"]
  }
}
```

### Error (credenciales)
```json
{
  "message": "Credenciales inválidas",
  "error": "Unauthorized",
  "statusCode": 401
}
```

---

### 3) Obtener usuario actual

### Request
```http
GET /auth/me
Authorization: Bearer <TOKEN>
```

### Response
```json
{
  "id": "697c28cbdcf9d0d23d957a38",
  "fullName": "Felipe Torres",
  "username": "felipe.torres",
  "displayName": "Pipe",
  "avatarUrl": "https://surtimarketbackend.onrender.com/public/avatars/697c28cbdcf9d0d23d957a38/1771772532208.png",
  "privacy": {
    "profileVisibility": "COMMUNITY",
    "emailSearchable": true,
    "friendRequests": "ANYONE"
  },
  "email": "felipe@surtimarket.com",
  "roles": ["CLIENT"],
  "isActive": true,
  "createdAt": "2026-02-09T04:49:06.955Z",
  "updatedAt": "2026-02-22T15:02:11.000Z"
}
```

---

### 4) Actualizar perfil

### Request
```http
POST /auth/profile
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

```json
{
  "displayName": "Pipe",
  "username": "felipe",
  "privacy": {
    "profileVisibility": "COMMUNITY",
    "emailSearchable": true,
    "friendRequests": "ANYONE"
  }
}
```

### Response
```json
{
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
```

---

### 5) Subir avatar (cliente)

### Request (multipart/form-data)
```http
POST /auth/me/avatar
Authorization: Bearer <TOKEN_CLIENT>
Content-Type: multipart/form-data
```

Campo:
- `file` = imagen (`jpg|jpeg|png|webp`, max 5MB)

### cURL
```bash
curl -X POST "https://surtimarketbackend.onrender.com/auth/me/avatar" \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -F "file=@C:/ruta/avatar.png"
```

### Response
```json
{
  "id": "699a9b48e58ab86418ebee3a",
  "fullName": "Cliente Uno",
  "username": "cliente1",
  "displayName": "Cliente Uno",
  "avatarUrl": "https://surtimarketbackend.onrender.com/public/avatars/699a9b48e58ab86418ebee3a/1771772532208.png",
  "privacy": {
    "profileVisibility": "COMMUNITY",
    "emailSearchable": true,
    "friendRequests": "ANYONE"
  },
  "email": "cliente1@surtimarket.com",
  "roles": ["CLIENT"],
  "isActive": true,
  "createdAt": "2026-02-22T14:58:00.000Z",
  "updatedAt": "2026-02-22T15:02:12.000Z"
}
```

### Errores frecuentes
- `400`: archivo faltante (`"Archivo requerido en campo \"file\""`).
- `400`: formato no permitido.
- `400`: tamano > 5MB.
- `403`: token no tiene rol `CLIENT`.

## Decisiones de implementacion

- El perfil responde siempre una vista saneada del usuario (sin `passwordHash`).
- La subida de avatar persiste primero archivo y luego actualiza `avatarUrl` en BD.
- `PUBLIC_BASE_URL` define el host de la URL pública guardada.

## Pendientes / Riesgos

- En deploys con filesystem efimero (Render), las imagenes en `public/` pueden perderse tras reinicio/redeploy.
- Recomendado migrar uploads a Cloudinary/S3/Supabase Storage.

