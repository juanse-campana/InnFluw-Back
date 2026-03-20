# PROMPT PARA GENERAR FRONTEND - InnFluw (Instant Drop SaaS)

## 1. INSTRUCCIONES GENERALES

```
Eres un desarrollador frontend senior especializado en React/Next.js. 
Tu tarea es crear el frontend completo para "Instant Drop" - un SaaS que permite 
a influencers crear páginas de venta de productos (drops) con checkout integrado.

El proyecto debe ser moderno, responsive, con excelente UX y estar listo para producción.
```

## 2. STACK TECNOLÓGICO RECOMENDADO

```typescript
// Stack sugerido (puedes elegir alternativas equivalentes)
const STACK = {
  framework: "Next.js 14+ (App Router)",
  language: "TypeScript",
  styling: "Tailwind CSS",
  stateManagement: "Zustand o React Query + Context",
  forms: "React Hook Form + Zod",
  ui: "shadcn/ui o Radix UI + Tailwind",
  httpClient: "Axios o fetch con wrapper",
  charts: "Recharts o Tremor",
  icons: "Lucide React",
  animations: "Framer Motion"
};
```

## 3. AUTENTICACIÓN (JWT + OTP + Verificación de Email)

```
FLOW DE AUTH:
1. Usuario se registra con email/password/name
2. Sistema guarda usuario con emailVerified=false
3. Sistema envía email con link de verificación
4. Usuario hace clic en link → emailVerified=true
5. Usuario inicia login con email/password
6. Backend envía OTP de 6 dígitos al email
7. Usuario ingresa OTP → backend valida y retorna JWT
8. JWT se guarda en localStorage/sessionStorage/cookies httpOnly
9. Todas las requests incluyen: Authorization: Bearer <token>

NOTAS IMPORTANTES:
- NO existe login directo con password
- El OTP vence en minutos (5 min)
- El JWT expira en 7 días
- El link de verificación expira en 24 horas
- Roles: 'INFLUENCER' | 'ADMIN'
- Usuario puede reenviar email de verificación si no lo recibe
```

## 4. BASE URL Y CONFIGURACIÓN

```typescript
const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1",
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3000",
  headers: {
    "Content-Type": "application/json"
  }
};
```

## 5. API HTTP ENDPOINTS

### 5.1 AUTH (`/api/v1/auth`)

```typescript
// REGISTER - Crear cuenta (envía email de verificación)
POST /auth/register
Body: { email, password, name }
Response: { 
  success, 
  message: "Usuario creado exitosamente. Por favor verifica tu email.",
  data: { user: { id, email, name, emailVerified: false, createdAt } } 
}

// VERIFY EMAIL - Verificar email con token (público)
GET /auth/verify-email?token=xxx-xxx-xxx
Auth: No
Response: { success, message: "Email verificado exitosamente" }

// RESEND VERIFICATION - Reenviar email de verificación
POST /auth/resend-verification
Body: { email }
Response: { success, message: "Email de verificación reenviado" }

// LOGIN - Envía OTP (requiere email verificado primero)
POST /auth/login  
Body: { email, password }
Response: { success, message } // "Código OTP enviado a tu email"

// VERIFY OTP - Recibe JWT
POST /auth/verify-otp
Body: { email, code }
Response: { success, message, data: { token, user: { id, email, name, role } } }

// GET PROFILE
GET /auth/profile
Auth: Bearer token
Response: { success, data: { user: { id, email, name, avatar, role, emailVerified, createdAt } } }

// UPDATE PROFILE  
PATCH /auth/profile
Auth: Bearer token
Body: { name?, avatar? }
Response: { success, message, data: { user } }
```

### 5.2 DROPS (`/api/v1/drops`)

```typescript
// LISTAR DROPS (del usuario autenticado)
GET /drops
Auth: Bearer token
Query: { status?, category?, page?, limit? }
Response: { 
  success, 
  data: { 
    drops: [...], 
    pagination: { page, limit, total, pages } 
  } 
}

// OBTENER DROP POR ID
GET /drops/:id
Auth: Bearer token
Response: { success, data: { drop: { ..., discountCodes, _count: { orders, visitors } } } }

// OBTENER DROP PUBLICO POR SLUG (para landing pages)
GET /drops/slug/:slug
Auth: No requerido
Response: { success, data: { drop: { ..., user: { name, avatar } } } }

// CREAR DROP
POST /drops
Auth: Bearer token
Body: {
  title: string,
  slug: string, // lowercase con guiones: /^[a-z0-9-]+$/
  description: string,
  category: string,
  price: number,
  stock: number,
  productImage?: string,
  status: "DRAFT" | "COMING_SOON" | "LIVE" | "SOLD_OUT" | "ENDED",
  config?: {
    theme?: { colors?: {...}, fonts?: {...} },
    branding?: { logo?, favicon?, heroImage?, ogImage? },
    content?: { headline?, subheadline?, description?, ctaText?, footerText? },
    layout?: { template?, boxedWidth?, padding? },
    products?: { showStock?, showPrices?, currency? },
    checkout?: { successRedirect?, emailCustomMessage? },
    social?: { instagram?, twitter?, tiktok? },
    customCss?: string,
    meta?: { title?, description? }
  }
}
Response: { success, message, data: { drop } }

// ACTUALIZAR DROP
PATCH /drops/:id
Auth: Bearer token
Body: Mismo que POST (parcial)
Response: { success, message, data: { drop } }

// ELIMINAR DROP
DELETE /drops/:id
Auth: Bearer token
Response: { success, message }

// TRACK VISITOR (para landing pages)
POST /drops/track-visitor
Body: { dropId, sessionId? }
Response: { success, data: { visitorId } }
```

### 5.3 DISCOUNT CODES (`/api/v1/discount-codes`)

```typescript
// LISTAR CÓDIGOS
GET /discount-codes
Auth: Bearer token
Query: { isActive? }
Response: { success, data: { codes: [...] } }

// OBTENER POR ID
GET /discount-codes/:id
Auth: Bearer token
Response: { success, data: { code } }

// VALIDAR CÓDIGO (público, para checkout)
GET /discount-codes/validate?code=XXX&dropId=XXX&amount=XXX
Auth: No
Response: { success, data: { valid: true|false, code?: {...}, reason?: string } }

// CREAR CÓDIGO
POST /discount-codes
Auth: Bearer token
Body: {
  code: string, // se uppercasing automático
  type: "PERCENTAGE" | "FIXED_AMOUNT",
  value: number,
  minAmount?: number,
  maxUses?: number,
  expiresAt?: ISO datetime,
  isActive?: boolean,
  dropIds: string[] // mínimo 1 UUID
}
Response: { success, message, data: { code } }

// ACTUALIZAR
PATCH /discount-codes/:id
Auth: Bearer token
Body: (parcial)
Response: { success, message, data: { code } }

// ELIMINAR
DELETE /discount-codes/:id
Auth: Bearer token
Response: { success, message }
```

### 5.4 CHECKOUT (`/api/v1/checkout`)

```typescript
// SIMULAR CHECKOUT (crear orden)
POST /checkout/simulate
Auth: No (rate limited: 30/15min)
Body: {
  dropId: string,
  discountCode?: string,
  buyerEmail: string,
  buyerName: string,
  buyerPhone?: string,
  buyerAddress?: string,
  buyerCity?: string,
  buyerCountry?: string
}
Response: { 
  success, 
  message, 
  data: { 
    order: { 
      id, 
      status: "PENDING", 
      total, 
      confirmationUrl 
    } 
  } 
}

// LISTAR ÓRDENES (del usuario)
GET /checkout/orders
Auth: Bearer token
Query: { dropId?, status?, page?, limit? }
Response: { success, data: { orders, pagination } }

// OBTENER ORDEN POR ID
GET /checkout/orders/:id
Auth: Bearer token
Response: { success, data: { order } }

// CONFIRMAR ORDEN (via email link)
GET /checkout/confirm/:token
Auth: No
Response: { success, message, data: { order: { id, status: "CONFIRMED", confirmedAt } } }
```

### 5.5 ANALYTICS (`/api/v1/analytics`)

```typescript
// DASHBOARD
GET /analytics/dashboard?period=7d|30d|90d
Auth: Bearer token
Response: {
  success,
  data: {
    period: { start, end },
    summary: { totalDrops, activeDrops, totalVisitors, totalOrders, totalRevenue },
    recentOrders: [...]
  }
}

// ANALYTICS POR DROP
GET /analytics/drops/:id?period=7d|30d|90d
Auth: Bearer token
Response: {
  success,
  data: {
    dropId, period,
    summary: { visitors, orders, revenue, totalDiscount, conversionRate },
    topCodes: [...],
    dailyStats: { visitors: [...], orders: [...] }
  }
}
```

### 5.6 WEBHOOKS (`/api/v1/webhooks`)

```typescript
// LISTAR
GET /webhooks
Auth: Bearer token
Response: { success, data: { webhooks: [...] } }

// CREAR
POST /webhooks
Auth: Bearer token
Body: { url: string, events: string[] }
// Events: "order.created" | "order.confirmed" | "drop.stock.low"
Response: { success, message, data: { webhook } }

// ELIMINAR
DELETE /webhooks/:id
Auth: Bearer token
Response: { success, message }

// LOGS DE ENTREGA
GET /webhooks/:id/logs?limit=20
Auth: Bearer token
Response: { success, data: { deliveries: [...] } }
```

### 5.7 UPLOAD (`/api/v1/upload`)

```typescript
// SUBIR ARCHIVO
POST /upload
Auth: Bearer token
Content-Type: multipart/form-data
Body: { file: File }
Restricciones: jpg, png, gif, webp, svg | máx 5MB
Response: { success, message, data: { url, filename, originalName, size, mimetype } }

// OBTENER ARCHIVO
GET /upload/:filename
Auth: No
Response: Binary file
```

### 5.8 HEALTH

```typescript
GET /
GET /health
Response: { success, data: { status, app, version, timestamp, uptime } }
```

## 6. WEBSOCKETS (N/A en este backend)

```
Este backend NO implementa WebSockets. 
Si necesitas real-time, considera implementar Server-Sent Events (SSE) 
o polling con intervalos cortos (ej: cada 30s para analytics).
```

## 7. RESPUESTAS DE ERROR

```typescript
// FORMATO DE ERROR
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Error de validación",
    errors: [{ path: ["email"], message: "Email inválido" }]
  }
}

// CÓDIGOS HTTP
200: Éxito
201: Creado
400: Error de validación
401: No autorizado
403: Acceso denegado
404: No encontrado
429: Rate limit exceeded
500: Error interno
```

## 8. MODELOS DE DATOS (TypeScript)

```typescript
// USER
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'INFLUENCER' | 'ADMIN';
  emailVerified: boolean;  // false hasta que verifique via email
  createdAt: string;
  updatedAt: string;
}

// DROP
interface Drop {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  productImage?: string;
  isActive: boolean;
  status: 'DRAFT' | 'COMING_SOON' | 'LIVE' | 'SOLD_OUT' | 'ENDED';
  config?: DropConfig;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: { id: string; name: string; avatar?: string };
  _count?: { orders: number; visitors: number };
}

interface DropConfig {
  theme?: { colors?: Record<string, string>; fonts?: Record<string, string> };
  branding?: { logo?: string; favicon?: string; heroImage?: string; ogImage?: string };
  content?: { headline?: string; subheadline?: string; description?: string; ctaText?: string; footerText?: string };
  layout?: { template?: string; boxedWidth?: number; padding?: number };
  products?: { showStock?: boolean; showPrices?: boolean; currency?: string };
  checkout?: { successRedirect?: string; emailCustomMessage?: string };
  social?: { instagram?: string; twitter?: string; tiktok?: string };
  customCss?: string;
  meta?: { title?: string; description?: string };
}

// DISCOUNT CODE
interface DiscountCode {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  minAmount?: number;
  maxUses?: number;
  uses: number;
  expiresAt?: string;
  isActive: boolean;
  drops?: Array<{ drop: { id: string; title: string; slug: string } }>;
  _count?: { orders: number };
}

// ORDER
interface Order {
  id: string;
  buyerEmail: string;
  buyerName: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerCity?: string;
  buyerCountry?: string;
  subtotal: number;
  discount: number;
  total: number;
  status: 'PENDING' | 'CONFIRMED' | 'REFUNDED';
  confirmedAt?: string;
  createdAt: string;
  drop: { id: string; title: string; slug: string };
  discountCode?: { id: string; code: string };
}

// WEBHOOK
interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## 9. ESTRUCTURA DE PÁGINAS REQUERIDAS

```typescript
const PAGES = {
  // PUBLICAS
  "/": "Landing page principal",
  "/auth/login": "Login (ingresa email + password)",
  "/auth/register": "Registro (ingresa email + password + name)",
  "/auth/verify-email": "Verificar email (link del email, ?token=xxx)",
  "/auth/resend-verification": "Reenviar email de verificación",
  "/auth/verify": "Verificar OTP (ingresa código de 6 dígitos)",
  "/d/[slug]": "Página pública del drop (checkout)",
  "/order/confirm/[token]": "Confirmación de orden vía email",
  
  // DASHBOARD (requiere auth)
  "/dashboard": "Vista general con analytics",
  "/drops": "Lista de todos los drops",
  "/drops/new": "Crear nuevo drop",
  "/drops/[id]": "Detalle/editar drop",
  "/drops/[id]/analytics": "Analytics específicos del drop",
  "/codes": "Lista de códigos de descuento",
  "/codes/new": "Crear código",
  "/codes/[id]": "Detalle/editar código",
  "/orders": "Lista de órdenes",
  "/orders/[id]": "Detalle de orden",
  "/settings": "Configuración de cuenta",
  "/webhooks": "Gestión de webhooks"
};
```

## 10. PÁGINA PÚBLICA DEL DROP (más importante)

```typescript
// /d/[slug] - Esta es la landing page que ven los compradores
// Debe ser altamente personalizable según DropConfig

interface CheckoutPageProps {
  // Datos del drop (GET /drops/slug/:slug)
  drop: {
    id: string;
    title: string;
    slug: string;
    description: string;
    category: string;
    price: number;
    stock: number;
    productImage?: string;
    status: 'LIVE' | 'COMING_SOON' | 'SOLD_OUT';
    config: DropConfig;
    user: { name: string; avatar?: string };
  };
  
  // Funcionalidades requeridas:
  // 1. Mostrar producto con tema/estilos del config
  // 2. Validar código de descuento en tiempo real (GET /discount-codes/validate)
  // 3. Checkout con validación (POST /checkout/simulate)
  // 4. Trackear visitante (POST /drops/track-visitor)
  // 5. Redirect a successRedirect del config tras confirmación
}
```

## 11. EJEMPLO DE REQUEST HTTP

```typescript
// Función wrapper para API calls
async function apiRequest<T>(
  endpoint: string, 
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: Record<string, unknown>;
    auth?: boolean;
  }
): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options?.auth && token && { Authorization: `Bearer ${token}` })
  };
  
  const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  
  const data = await response.json();
  
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Request failed');
  }
  
  return data.data;
}

// Uso
const user = await apiRequest<{ user: User }>('/auth/profile', { auth: true });
const drops = await apiRequest<{ drops: Drop[] }>('/drops?status=LIVE');
```

## 12. NOTAS IMPORTANTES PARA EL DESARROLLO

1. **Rate Limits**: Implementar exponential backoff en caso de 429
2. **UX del OTP**: Mostrar countdown hasta reenvío, 5 intentos máximo
3. **Formularios**: Validación con Zod matching los schemas del backend
4. **Stock en tiempo real**: Considerar polling o refresh cada 30s en páginas públicas
5. **CORS**: Backend permite localhost:3000, 3001, 3002
6. **Slug**: Validar que sea lowercase + guiones, auto-generar desde title si vacío
7. **Config del Drop**: Editor visual para tema/estilos sería muy valioso
8. **Responsive**: Mobile-first, especialmente la página de checkout
9. **Verificación de Email**: 
   - Después de register, mostrar mensaje "Revisa tu email para verificar tu cuenta"
   - Página /auth/verify-email?token=xxx debe mostrar éxito/error
   - Botón "Reenviar email" disponible si no llega
   - El login solo funciona después de verificar el email
