# Instant Drop API

API REST para el SaaS de influencers "Instant Drop".

## Stack Tecnológico

- **Runtime**: Node.js 20+
- **Framework**: Express + TypeScript
- **Base de Datos**: PostgreSQL + Prisma ORM
- **Cache/Queues**: Redis + BullMQ
- **Email**: Resend SDK
- **Contenedores**: Docker + docker-compose

## Requisitos

- Node.js 20+
- pnpm 8+
- PostgreSQL 16+
- Redis 7+
- Docker (opcional)

## Instalación

### 1. Instalar pnpm (si no lo tienes)

```bash
npm install -g pnpm
```

### 2. Clonar y configurar entorno

```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Generar cliente Prisma

```bash
pnpm prisma:generate
```

### 5. Crear base de datos

```bash
# Si usas Docker:
docker-compose up -d postgres redis

# O crea la base de datos manualmente:
createdb instant_drop
```

### 6. Ejecutar migraciones

```bash
pnpm prisma:migrate
# O para solo sincronizar el schema:
pnpm prisma:push
```

### 7. Iniciar servidor

```bash
# Desarrollo (con hot reload):
pnpm dev

# Producción:
pnpm build
pnpm start
```

## Docker

```bash
# Desarrollo
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Producción
docker-compose up -d
```

## Endpoints de la API

Base URL: `http://localhost:3000/api/v1`

### Autenticación

| Método | Endpoint           | Descripción                 |
| ------ | ------------------ | --------------------------- |
| POST   | `/auth/register`   | Registrar nuevo usuario     |
| POST   | `/auth/login`      | Iniciar sesión (envía OTP)  |
| POST   | `/auth/verify-otp` | Verificar OTP y obtener JWT |
| GET    | `/auth/profile`    | Obtener perfil del usuario  |
| PATCH  | `/auth/profile`    | Actualizar perfil           |

### Drops (requiere JWT)

| Método | Endpoint            | Descripción                     |
| ------ | ------------------- | ------------------------------- |
| GET    | `/drops`            | Listar drops del usuario        |
| GET    | `/drops/:id`        | Obtener drop específico         |
| GET    | `/drops/slug/:slug` | Obtener drop por slug (público) |
| POST   | `/drops`            | Crear nuevo drop                |
| PATCH  | `/drops/:id`        | Actualizar drop                 |
| DELETE | `/drops/:id`        | Eliminar drop                   |

### Códigos de Descuento (requiere JWT)

| Método | Endpoint                   | Descripción       |
| ------ | -------------------------- | ----------------- |
| GET    | `/discount-codes`          | Listar códigos    |
| GET    | `/discount-codes/:id`      | Obtener código    |
| GET    | `/discount-codes/validate` | Validar código    |
| POST   | `/discount-codes`          | Crear código      |
| PATCH  | `/discount-codes/:id`      | Actualizar código |
| DELETE | `/discount-codes/:id`      | Eliminar código   |

### Checkout

| Método | Endpoint                   | Descripción          |
| ------ | -------------------------- | -------------------- |
| POST   | `/checkout/simulate`       | Simular compra       |
| GET    | `/checkout/orders`         | Listar órdenes (JWT) |
| GET    | `/checkout/orders/:id`     | Obtener orden (JWT)  |
| POST   | `/checkout/confirm/:token` | Confirmar orden      |

### Webhooks (requiere JWT)

| Método | Endpoint             | Descripción          |
| ------ | -------------------- | -------------------- |
| GET    | `/webhooks`          | Listar webhooks      |
| POST   | `/webhooks`          | Crear webhook        |
| DELETE | `/webhooks/:id`      | Eliminar webhook     |
| GET    | `/webhooks/:id/logs` | Ver logs de entregas |

### Analytics (requiere JWT)

| Método | Endpoint               | Descripción             |
| ------ | ---------------------- | ----------------------- |
| GET    | `/analytics/dashboard` | Estadísticas generales  |
| GET    | `/analytics/drops/:id` | Estadísticas de un drop |

### Upload (requiere JWT)

| Método | Endpoint  | Descripción   |
| ------ | --------- | ------------- |
| POST   | `/upload` | Subir archivo |

### Sistema

| Método | Endpoint  | Descripción    |
| ------ | --------- | -------------- |
| GET    | `/health` | Health check   |
| GET    | `/`       | Info de la API |

## Ejemplos de Uso

### Registrar usuario

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "influencer@example.com",
    "password": "securepassword123",
    "name": "Juan Pérez"
  }'
```

### Login y obtener OTP

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "influencer@example.com",
    "password": "securepassword123"
  }'
```

### Verificar OTP y obtener JWT

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "influencer@example.com",
    "code": "123456"
  }'
```

### Crear un Drop

```bash
curl -X POST http://localhost:3000/api/v1/drops \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Mi Primer Drop",
    "slug": "mi-primer-drop",
    "description": "Un producto increíble",
    "category": "digital",
    "price": 29.99,
    "stock": 100,
    "status": "LIVE",
    "config": {
      "theme": {
        "colors": {
          "primary": "#007bff"
        }
      },
      "content": {
        "headline": "¡Lanzamiento Exclusivo!",
        "ctaText": "Comprar Ahora"
      }
    }
  }'
```

### Simular Checkout

```bash
curl -X POST http://localhost:3000/api/v1/checkout/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "dropId": "DROP_UUID",
    "buyerEmail": "comprador@example.com",
    "buyerName": "María García",
    "discountCode": "DESCUENTO20"
  }'
```

## Variables de Entorno

Ver `.env.example` para todas las variables disponibles.

## Scripts Disponibles

```bash
pnpm dev           # Desarrollo con hot reload
pnpm build         # Compilar TypeScript
pnpm start         # Iniciar producción
pnpm lint          # Linting
pnpm typecheck     # Verificación de tipos
pnpm prisma:studio # Abrir Prisma Studio
pnpm prisma:generate # Generar cliente Prisma
pnpm prisma:migrate  # Ejecutar migraciones
pnpm prisma:push     # Sincronizar schema con BD
```

## Licencia

MIT

# 3. Inicia Docker (PostgreSQL + Redis)

docker-compose up -d postgres redis

# 4. Crea las tablas

pnpm prisma:migrate

# 5. Inicia el servidor

pnpm dev
