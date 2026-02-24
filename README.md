# SurtiMarket Backend (NestJS + MongoDB)

Backend API para SurtiMarket: autenticacion, comunidad, retos semanales, ecoimpact, pedidos, wallet/ecocoins, dashboard del cliente y analytics/admin.

## Arquitectura (resumen tecnico)

- Framework: `NestJS` (modular, controllers + services + guards)
- Persistencia: `MongoDB` con `@nestjs/mongoose`
- Auth: JWT (`JwtAuthGuard`) + `RolesGuard`
- IA: OpenAI (generacion de quizzes, awareness/dashboard e imagenes)
- Archivos publicos: carpeta `public/` servida por Nest con prefijo `/public`
- Integraciones de dominio principales:
  - `auth`, `users`, `social`, `groups`, `notifications`
  - `challenges`, `streak`, `sustainability`, `ecoimpact`
  - `products`, `orders`, `wallet`
  - `dashboard`, `analytics`, `comments`

## Estructura del proyecto

- `src/` codigo fuente NestJS
- `docs/` documentacion funcional/tecnica, ADRs, changelog y notas de release
- `scripts/` seeds y utilidades operativas
- `public/` assets publicos (imagenes subidas / generadas)
- `test/` pruebas e2e (si aplica)

## Requisitos

- Node.js 20+ (recomendado)
- npm 10+
- MongoDB (Atlas o local)
- OpenAI API key (para modulos con IA)

## Instalacion y ejecucion

```bash
npm install
```

### Desarrollo

```bash
npm run start:dev
```

### Build

```bash
npm run build
```

### Produccion

```bash
npm run start:prod
```

## Variables de entorno (minimas / recomendadas)

Crear `.env` basado en `.env.example` y agregar variables del backend actual:

### Minimas

- `PORT` puerto del servidor (default 3000 / segun deploy)
- `MONGO_URI` cadena de conexion MongoDB
- `JWT_SECRET` secreto para firmar tokens JWT

### IA / contenido (si se usan retos dashboard/quizzes)

- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL` (opcional, ej. `gpt-4.1-mini`)
- `OPENAI_IMAGE_MODEL` (opcional, ej. `gpt-image-1`)

### URLs publicas (archivos)

- `PUBLIC_BASE_URL` URL publica del backend (ej. `https://surtimarketbackend.onrender.com`)

### Notas de deploy (Render)

- La carpeta `public/` en Render puede ser almacenamiento efimero.
- Para produccion estable, migrar uploads a storage externo (Cloudinary/S3/Supabase Storage).

## Scripts utiles

- `npm run start:dev` desarrollo
- `npm run build` build Nest
- `npm run seed:products` seed de productos
- `npm run fix:product-images` corrige URLs de imagenes de productos en BD
- `npx tsc --noEmit` validacion TS rapida

## Calidad y flujo Git (resumen)

- `main`: estable
- `develop`: integracion
- `release/x.y.z`: preparacion release
- `feature/<nombre>`: trabajo de funcionalidad/documentacion

Ver detalle en:
- `docs/BRANCHING_AND_RELEASES.md`
- `docs/CHANGELOG.md`
- `docs/RELEASE_NOTES.md`

## Documentacion de modulos

Se genero documentacion base por modulo/controlador en:

- `docs/modules/`

Cada archivo incluye:
- proposito
- endpoints
- DTOs referenciados
- auth/guardas
- ejemplos (base)
- decisiones
- pendientes

