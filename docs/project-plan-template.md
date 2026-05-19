# Plan de Implementación — [Nombre del Proyecto]

> **Cómo usar este documento:** Completá cada sección antes de escribir una línea de código. Las decisiones que se toman aquí definen la estructura para todo el ciclo de vida del proyecto. Lo que no está definido acá, se improvisa mal después.

---

## Índice

1. [Contexto del Proyecto](#1-contexto-del-proyecto)
2. [Arquitectura](#2-arquitectura)
3. [Patrones de Diseño](#3-patrones-de-diseño)
4. [Stack Tecnológico](#4-stack-tecnológico)
5. [Estructura de Directorios](#5-estructura-de-directorios)
6. [Modelo de Dominio](#6-modelo-de-dominio)
7. [Base de Datos](#7-base-de-datos)
8. [Caching](#8-caching)
9. [Autenticación y Autorización](#9-autenticación-y-autorización)
10. [Diseño de API](#10-diseño-de-api)
11. [Manejo de Errores](#11-manejo-de-errores)
12. [Testing](#12-testing)
13. [CI/CD y Despliegue](#13-cicd-y-despliegue)
14. [Cloud e Infraestructura](#14-cloud-e-infraestructura)
15. [Monitoreo y Observabilidad](#15-monitoreo-y-observabilidad)
16. [Seguridad](#16-seguridad)
17. [Documentación](#17-documentación)
18. [Escalabilidad y Rendimiento](#18-escalabilidad-y-rendimiento)
19. [Roadmap de Implementación](#19-roadmap-de-implementación)
20. [Riesgos y Decisiones Pendientes](#20-riesgos-y-decisiones-pendientes)

---

## 1. Contexto del Proyecto

### Descripción
> Una oración que explique qué hace el sistema y para quién.

```
[COMPLETAR]
```

### Problema que resuelve
> ¿Qué dolor concreto elimina? ¿Qué proceso manual reemplaza?

```
[COMPLETAR]
```

### Stakeholders

| Rol | Nombre / Equipo | Responsabilidad |
|-----|----------------|----------------|
| Product Owner | | Define qué se construye |
| Tech Lead | | Decisiones técnicas |
| Dev Team | | Implementación |
| DevOps | | Infraestructura y despliegue |
| QA | | Calidad y pruebas |

### Restricciones conocidas

- **Fecha límite:** [COMPLETAR]
- **Presupuesto:** [COMPLETAR]
- **Cumplimiento / Regulaciones:** (ej: GDPR, PCI-DSS, HIPAA, ninguna)
- **Dependencias externas:** (ej: APIs de terceros, sistemas legados)

---

## 2. Arquitectura

### Estilo arquitectónico

Seleccioná el que aplique y justificá brevemente la elección:

| Estilo | Cuándo usarlo |
|--------|--------------|
| **Monolito modular** | Equipo pequeño, dominio acotado, MVP rápido |
| **Hexagonal / Puertos y Adaptadores** | Dominio complejo, alta testabilidad, cambio frecuente de providers |
| **Clean Architecture** | Separación estricta entre UI/DB/negocio, múltiples delivery mechanisms |
| **Microservicios** | Equipos independientes, escalado granular, dominio distribuido |
| **Event-driven** | Baja acoplamiento entre servicios, flujos asíncronos, alta escalabilidad |
| **CQRS** | Lectura y escritura con cargas y modelos muy distintos |

**Elección:** [COMPLETAR]

**Justificación:** [COMPLETAR]

### Diagrama de contexto (C4 — Nivel 1)

```
[Dibujar: actores externos → sistema → sistemas externos]

Ejemplo:
  Usuario Móvil ──▶ [API Gateway] ──▶ [Tu Sistema] ──▶ [Base de Datos]
                                              │
                                              └──▶ [Servicio de Pagos Externo]
```

### Diagrama de contenedores (C4 — Nivel 2)

```
[Dibujar: los bloques internos principales del sistema]

Ejemplo:
  [Frontend Web] ──HTTP──▶ [API REST]
                                │
                        ┌───────┴───────┐
                    [PostgreSQL]    [Redis Cache]
```

---

## 3. Patrones de Diseño

### Patrones de arquitectura a aplicar

| Patrón | ¿Se usa? | Módulos donde aplica |
|--------|----------|---------------------|
| Repository | ☐ Sí / ☐ No | |
| Unit of Work | ☐ Sí / ☐ No | |
| Domain Events | ☐ Sí / ☐ No | |
| CQRS | ☐ Sí / ☐ No | |
| Saga | ☐ Sí / ☐ No | |
| Outbox Pattern | ☐ Sí / ☐ No | |
| Factory | ☐ Sí / ☐ No | |
| Strategy | ☐ Sí / ☐ No | |
| Observer / Event Bus | ☐ Sí / ☐ No | |
| Decorator | ☐ Sí / ☐ No | |

### Convenciones de naming

```
Módulos:        kebab-case           (user-profile, toll-calculation)
Clases:         PascalCase           (UserProfileService, TollCalculation)
Interfaces:     PascalCase           (sin prefijo I — preferir nombres descriptivos)
Variables:      camelCase            (userId, fuelPrice)
Constantes:     UPPER_SNAKE_CASE     (MAX_PAGE_LIMIT, DEFAULT_CURRENCY)
Archivos:       kebab-case.tipo.ts   (user.service.ts, toll.controller.ts)
```

### Convenciones de estructura de módulo

```
[módulo]/
├── domain/
│   ├── model/          ← interfaces/tipos puros, sin decoradores
│   ├── ports/
│   │   ├── in/         ← abstract classes (use cases)
│   │   └── out/        ← abstract classes (repositories, providers)
│   ├── services/       ← lógica de negocio pura (sin DI, sin @Injectable)
│   └── exceptions/
├── application/
│   ├── dto/            ← request/response contracts
│   └── services/       ← implementaciones de use cases
└── infrastructure/
    ├── adapters/       ← implementaciones de ports out
    ├── api/            ← controllers + mappers
    └── persistence/    ← queries SQL / ORM config
```

---

## 4. Stack Tecnológico

### Backend

| Categoría | Tecnología elegida | Alternativa considerada | Razón de elección |
|-----------|-------------------|------------------------|-------------------|
| Runtime | | Node.js / Go / Python / Java | |
| Framework | | NestJS / Express / Fastify / Spring | |
| Lenguaje | | TypeScript / Go / Python | |
| ORM / Query Builder | | TypeORM / Prisma / Drizzle / GORM | |
| Validación | | class-validator / Zod / Joi | |

### Frontend (si aplica)

| Categoría | Tecnología elegida | Razón |
|-----------|-------------------|-------|
| Framework | | React / Vue / Angular / Next.js |
| Estado | | Zustand / Redux / Pinia |
| Estilos | | Tailwind / CSS Modules / Styled Components |
| Testing UI | | Vitest / Jest + Testing Library |

### Infraestructura

| Categoría | Tecnología elegida | Razón |
|-----------|-------------------|-------|
| Contenedores | | Docker / Podman |
| Orquestación | | Docker Compose / Kubernetes / ECS |
| CI/CD | | GitHub Actions / GitLab CI / CircleCI |
| Cloud | | AWS / GCP / Azure / Railway / Fly.io |

---

## 5. Estructura de Directorios

### Raíz del proyecto

```
proyecto/
├── src/
│   ├── [módulo-1]/
│   ├── [módulo-2]/
│   └── shared/
│       ├── util/
│       ├── filters/
│       ├── guards/
│       ├── interceptors/
│       └── decorators/
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── migrations/
├── docs/
├── docker/
├── .env.example
├── docker-compose.yml
└── README.md
```

### Módulos identificados

Lista todos los módulos del sistema con una línea de descripción:

| Módulo | Descripción |
|--------|-------------|
| `auth` | Registro, login, refresh tokens, JWT |
| `users` | Gestión de usuarios y perfiles |
| `[módulo]` | [descripción] |

---

## 6. Modelo de Dominio

### Entidades principales

> Para cada entidad principal, definí sus atributos clave y relaciones.

```
Entidad: [Nombre]
  Atributos: id, [campo1], [campo2], createdAt, updatedAt
  Relaciones: [Entidad A] 1─N [Entidad B]

Entidad: [Nombre]
  Atributos: ...
  Relaciones: ...
```

### Diagrama Entidad-Relación (simplificado)

```
[COMPLETAR con un ASCII diagram o referencia a un archivo externo]

Ejemplo:
  users (1) ──────── (N) vehicles
  users (1) ──────── (N) calculations
  calculations (1) ── (N) routes
```

### Reglas de negocio clave

> Las invariantes del dominio que NUNCA pueden violarse.

1. [Regla 1]
2. [Regla 2]
3. [Regla 3]

---

## 7. Base de Datos

### Motor de base de datos

| Opción | Cuándo elegirla |
|--------|----------------|
| **PostgreSQL** | Datos relacionales, consultas complejas, JSONB, PostGIS |
| **MySQL / MariaDB** | Ecosistema MySQL, simplicidad, alto read throughput |
| **MongoDB** | Documentos flexibles, esquema cambiante, aggregations |
| **DynamoDB** | Escala masiva en AWS, acceso por clave conocida |
| **SQLite** | Proyectos pequeños, local-first, sin servidor |

**Elección:** [COMPLETAR]

**Justificación:** [COMPLETAR]

### Estrategia de migraciones

```
☐ TypeORM Migrations (npx typeorm migration:generate / migration:run)
☐ Prisma Migrate
☐ Flyway
☐ Liquibase
☐ Migraciones manuales con scripts SQL versionados
```

**Convención de nombres:** `YYYYMMDDHHMMSS_descripcion-en-kebab-case.ts`

### Índices planificados

> Identificar las queries más frecuentes y crear índices antes de que el rendimiento sea un problema.

| Tabla | Columna(s) | Tipo | Motivo |
|-------|-----------|------|--------|
| `users` | `email` | UNIQUE | Login y lookup |
| `[tabla]` | `[col]` | | |

### Estrategia de backups

- **Frecuencia:** [ej: diario a las 2am UTC]
- **Retención:** [ej: 30 días]
- **Destino:** [ej: S3 bucket cifrado]
- **Punto de recuperación objetivo (RPO):** [ej: 24 horas]

---

## 8. Caching

### ¿Cuándo usar caché?

Usá caché cuando:
- Una operación es costosa y su resultado no cambia frecuentemente
- El mismo dato se solicita muchas veces por segundo
- Necesitás reducir la carga en la base de datos o en APIs externas

### Estrategia

| Capa | Herramienta | TTL | Casos de uso |
|------|-------------|-----|-------------|
| **In-memory (proceso)** | Node.js Map / LRU Cache | segundos | Config, feature flags |
| **Distribuido** | Redis | minutos/horas | Sesiones, rate limiting, resultados de APIs |
| **CDN** | Cloudflare / CloudFront | horas/días | Assets estáticos, respuestas públicas |

**¿Se usa Redis?** ☐ Sí / ☐ No

Si sí, configuración básica:

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Claves de caché

Convención: `{proyecto}:{módulo}:{entidad}:{id}`

```
Ejemplo:
  miapp:users:profile:uuid-123
  miapp:routing:calculation:sha256hash
```

### Estrategia de invalidación

```
☐ TTL fijo (más simple, datos levemente desactualizados aceptables)
☐ Invalidación explícita al mutar (más preciso, mayor complejidad)
☐ Write-through (escribe en caché y DB simultáneamente)
☐ Cache-aside (app decide cuándo leer de caché vs DB)
```

---

## 9. Autenticación y Autorización

### Autenticación

| Mecanismo | Cuándo usarlo |
|-----------|--------------|
| **JWT (stateless)** | APIs REST, microservicios, mobile |
| **Sessions (stateful)** | Apps web tradicionales, invalidación inmediata necesaria |
| **OAuth 2.0 / OIDC** | Login social, SSO, delegación a Identity Provider |
| **API Keys** | Comunicación máquina-a-máquina, integraciones B2B |

**Elección:** [COMPLETAR]

**Access Token TTL:** [ej: 15 minutos]
**Refresh Token TTL:** [ej: 30 días]
**¿Refresh token rotation?** ☐ Sí / ☐ No

### Autorización

| Modelo | Cuándo usarlo |
|--------|--------------|
| **RBAC** (roles) | Permisos por perfil de usuario (admin, user, viewer) |
| **ABAC** (atributos) | Permisos basados en propiedades del recurso o del contexto |
| **ACL** (listas) | Control granular por recurso individual |
| **Ownership** | El usuario solo accede a sus propios recursos |

**Elección:** [COMPLETAR]

**Roles definidos:**

| Rol | Permisos |
|-----|----------|
| `admin` | |
| `user` | |

---

## 10. Diseño de API

### Estilo

```
☐ REST (recursos, HTTP verbs, status codes)
☐ GraphQL (queries flexibles, schema tipado)
☐ gRPC (alto rendimiento, comunicación interna entre servicios)
☐ WebSockets (tiempo real, bidireccional)
☐ Combinación: [especificar]
```

### Versionado

```
☐ URL path:     /api/v1/users
☐ Header:       Accept: application/vnd.miapp.v1+json
☐ Query param:  /users?version=1
☐ Sin versionado (versión única, breaking changes permitidos)
```

**Prefijo base:** `/api/v1`

### Convenciones REST

```
GET    /resources          → lista paginada
GET    /resources/:id      → uno por ID
POST   /resources          → crear
PATCH  /resources/:id      → actualización parcial
PUT    /resources/:id      → reemplazo completo
DELETE /resources/:id      → eliminar

Paginación: ?page=1&limit=20
Filtros:    ?status=active&type=premium
Orden:      ?sort=createdAt&order=desc
```

### Formato de respuesta estándar

```json
// Éxito
{
  "data": { ... },
  "meta": { "page": 1, "total": 150 }
}

// Error
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Descripción legible del error",
  "code": "VALIDATION_ERROR"
}
```

---

## 11. Manejo de Errores

### Jerarquía de excepciones

```
BaseException
├── DomainException           ← reglas de negocio violadas (400)
│   ├── ValidationException
│   └── BusinessRuleException
├── NotFoundException         ← recurso no encontrado (404)
├── UnauthorizedException     ← sin credenciales (401)
├── ForbiddenException        ← sin permisos (403)
├── ConflictException         ← duplicado / estado incorrecto (409)
└── InfrastructureException   ← falla de proveedor externo (502/503)
    ├── ProviderException
    └── DatabaseException
```

### Estrategia de logging de errores

| Nivel | Cuándo |
|-------|--------|
| `error` | Excepciones no manejadas, errores críticos de infraestructura |
| `warn` | Errores esperados con impacto para el usuario (validación, 404) |
| `info` | Flujos exitosos importantes (login, pago procesado) |
| `debug` | Detalles de ejecución (solo en desarrollo) |

---

## 12. Testing

### Estrategia (pirámide de tests)

```
         ▲
        /E2E\          ← pocos, lentos, costosos — flujos críticos completos
       /──────\
      / Integr. \      ← módulos + BD real / adapters reales
     /────────────\
    /   Unit Tests  \  ← muchos, rápidos, domain services y use cases
   /────────────────────\
```

### Niveles y herramientas

| Nivel | Herramienta | Qué cubre |
|-------|-------------|----------|
| Unit | Jest / Vitest | Domain services, use cases, utils |
| Integración | Jest + Supertest | Controllers + repositorios con DB real |
| E2E | Playwright / Cypress | Flujos de usuario completos |
| Contrato | Pact | Entre microservicios |

**¿TDD activado?** ☐ Sí — test primero / ☐ No — test después

### Cobertura mínima exigida

```
Domain services:        100%
Use cases:               90%
Controllers:             80%
Infrastructure:          60%
```

### Fixtures y factories

```
Estrategia para datos de test:
☐ Factories con datos aleatorios (faker.js)
☐ Fixtures estáticos en JSON/YAML
☐ Seeds de base de datos para tests de integración
☐ Combinación
```

---

## 13. CI/CD y Despliegue

### Pipeline de CI (por cada PR)

```
1. Lint (ESLint / golangci-lint)
2. Type check (tsc --noEmit)
3. Unit tests
4. Integration tests
5. Build (verifica que compila)
6. Security scan (Snyk / Trivy)
```

### Pipeline de CD

```
Branch main → deploy a Staging (automático)
Tag v*.*.* → deploy a Producción (manual con approval)
```

### Estrategia de despliegue

| Estrategia | Cuándo usarla |
|-----------|--------------|
| **Recreate** | Sin cero downtime aceptable, simple |
| **Rolling update** | Zero downtime, misma versión durante rollout |
| **Blue/Green** | Zero downtime, rollback instantáneo, mayor costo |
| **Canary** | Rollout gradual a % de usuarios, validación en producción |

**Elección:** [COMPLETAR]

### Environments

| Ambiente | URL | Branch | Deploy |
|----------|-----|--------|--------|
| Development | localhost | feature/* | manual |
| Staging | staging.miapp.com | main | automático |
| Production | miapp.com | tags v*.*.* | manual |

### Rollback

```
☐ Revertir el deploy al contenedor anterior (docker tag)
☐ git revert + nuevo deploy
☐ Feature flags (desactivar la feature sin nuevo deploy)
```

---

## 14. Cloud e Infraestructura

### Proveedor Cloud

```
☐ AWS        (más completo, mayor complejidad, alto costo)
☐ GCP        (fuerte en ML/data, Kubernetes nativo)
☐ Azure      (ecosistema Microsoft, .NET, enterprise)
☐ Railway    (simple, bajo costo, ideal para side projects)
☐ Fly.io     (containers, bajo costo, edge deployments)
☐ Render     (similar a Railway, PaaS)
☐ Hetzner    (VPS económico, control total, requiere más ops)
```

**Elección:** [COMPLETAR]

### Servicios necesarios

| Servicio | Proveedor elegido | Alternativa |
|----------|------------------|-------------|
| Cómputo | [ej: ECS / EC2 / Cloud Run] | |
| Base de datos | [ej: RDS / Cloud SQL / Neon] | |
| Caché | [ej: ElastiCache / Upstash] | |
| Storage | [ej: S3 / GCS / R2] | |
| CDN | [ej: CloudFront / Cloudflare] | |
| Secrets | [ej: AWS Secrets Manager / Vault] | |
| Queue / Mensajería | [ej: SQS / Pub/Sub / RabbitMQ] | |
| Email | [ej: SES / SendGrid / Resend] | |

### Estimación de costos (mensual)

| Servicio | Tier | Costo estimado |
|----------|------|----------------|
| Cómputo | | |
| DB | | |
| Cache | | |
| Total estimado | | |

---

## 15. Monitoreo y Observabilidad

### Los tres pilares

#### Logs

```
Herramienta:  ☐ Winston  ☐ Pino  ☐ Bunyan  ☐ Sentry (errores)
Destino:      ☐ Stdout (containers)  ☐ CloudWatch  ☐ Datadog  ☐ Loki/Grafana
Formato:      ☐ JSON estructurado (recomendado)  ☐ Plain text
```

Campos obligatorios en cada log:
```json
{
  "timestamp": "ISO 8601",
  "level": "info | warn | error",
  "service": "nombre-del-servicio",
  "traceId": "uuid",
  "userId": "uuid o null",
  "message": "descripción",
  "context": { ... }
}
```

#### Métricas

```
Herramienta:  ☐ Prometheus + Grafana  ☐ Datadog  ☐ CloudWatch  ☐ New Relic

Métricas clave a trackear:
- Latencia de requests (p50, p95, p99)
- Tasa de errores por endpoint
- Requests por segundo (RPS)
- Uso de CPU y memoria
- Conexiones activas a la DB
- Hit rate de caché
```

#### Trazas distribuidas

```
Herramienta:  ☐ Jaeger  ☐ Zipkin  ☐ Datadog APM  ☐ AWS X-Ray  ☐ OpenTelemetry
```

### Alertas

| Condición | Severidad | Canal |
|-----------|----------|-------|
| Error rate > 5% por 5 min | Critical | PagerDuty / OpsGenie |
| Latencia p99 > 3s | Warning | Slack |
| CPU > 80% sostenido | Warning | Slack |
| DB connection pool agotado | Critical | PagerDuty |
| Disco > 85% | Warning | Slack |

### Health checks

```
GET /health        → liveness  (¿el proceso está vivo?)
GET /health/ready  → readiness (¿puede recibir tráfico?)
```

---

## 16. Seguridad

### Checklist de seguridad

**Input validation**
- [ ] Validar y sanitizar TODA entrada del usuario (body, query, params, headers)
- [ ] Usar DTOs con class-validator / Zod, nunca confiar en tipos TypeScript solos
- [ ] Sanitizar para prevenir XSS (si hay rendering HTML)
- [ ] Usar queries parametrizadas siempre (nunca concatenar SQL)

**Autenticación**
- [ ] Tokens JWT firmados con RS256 (asimétrico) en producción
- [ ] Refresh token rotation activada
- [ ] Blacklist de tokens revocados en Redis
- [ ] Rate limiting en endpoints de auth

**Headers HTTP**
- [ ] Helmet.js (o equivalente) para headers de seguridad
- [ ] CORS configurado explícitamente (sin `*` en producción)
- [ ] HTTPS obligatorio (redirigir HTTP → HTTPS)

**Datos sensibles**
- [ ] Passwords hasheados con bcrypt (cost factor ≥ 12)
- [ ] PII no logueada nunca
- [ ] Secrets en variables de entorno, nunca en código
- [ ] `.env` en `.gitignore`

**Rate limiting y DDoS**
- [ ] Rate limiting por IP y por usuario
- [ ] Throttling en endpoints pesados (cálculos, uploads)
- [ ] WAF a nivel de infraestructura (Cloudflare / AWS WAF)

**Dependencias**
- [ ] `npm audit` / `snyk` en el pipeline de CI
- [ ] Dependabot o Renovate para actualizaciones automáticas

### Variables de entorno

```env
# .env.example — template sin valores reales

# App
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Auth
JWT_SECRET=change-me-in-production
JWT_ACCESS_TTL=900       # 15 minutos en segundos
JWT_REFRESH_TTL=2592000  # 30 días en segundos

# Cache
REDIS_URL=redis://localhost:6379

# APIs externas
EXTERNAL_API_KEY=
EXTERNAL_API_URL=
```

---

## 17. Documentación

### Documentación técnica

| Tipo | Herramienta | Ubicación |
|------|-------------|----------|
| API Reference | Swagger / OpenAPI | `/api/docs` en dev |
| Colección HTTP | Bruno / Postman | `bruno/` o `postman/` |
| Arquitectura | Markdown + diagramas | `docs/` |
| Decisiones técnicas | ADR (Architecture Decision Records) | `docs/adr/` |

### Architecture Decision Records (ADR)

Cada decisión técnica importante debería tener un ADR:

```markdown
# ADR-001: Uso de PostgreSQL como base de datos principal

**Estado:** Aceptado
**Fecha:** YYYY-MM-DD

## Contexto
[Por qué fue necesaria esta decisión]

## Decisión
[Qué se decidió]

## Consecuencias
[Pros y contras de la decisión]
```

### README mínimo del proyecto

El `README.md` debe tener:
- [ ] Qué hace el proyecto (1 párrafo)
- [ ] Requisitos previos
- [ ] Cómo correrlo localmente (máximo 3 comandos)
- [ ] Variables de entorno necesarias
- [ ] Cómo correr los tests
- [ ] Cómo hacer un deploy

---

## 18. Escalabilidad y Rendimiento

### Bottlenecks esperados

> Identificar antes de construir dónde va a estar el cuello de botella.

| Componente | Bottleneck potencial | Solución planificada |
|-----------|---------------------|---------------------|
| API | Alta concurrencia | Horizontal scaling + load balancer |
| DB | Queries lentas | Índices + read replicas |
| Operaciones lentas | Timeouts | Queues + jobs asíncronos |
| APIs externas | Latencia / rate limits | Caché + reintentos con backoff |

### Estrategia de escalado

```
☐ Vertical (más CPU/RAM al servidor) — más simple, límite físico
☐ Horizontal (más instancias) — requiere stateless, load balancer
☐ Serverless (auto-scale a cero) — ideal para workloads variables
```

### Operaciones asíncronas

Si hay operaciones que toman más de ~2 segundos, deben ser asíncronas:

```
☐ Job Queue (BullMQ / Bull con Redis)
☐ Message Broker (RabbitMQ / Kafka / SQS)
☐ Webhooks para notificar completions
☐ Server-Sent Events / WebSockets para progreso en tiempo real
```

---

## 19. Roadmap de Implementación

### Fases

#### Fase 0 — Fundaciones (Semana 1)
- [ ] Repo inicializado con estructura base
- [ ] Docker Compose con DB + Cache
- [ ] Pipeline de CI básico
- [ ] Módulo de Auth completo (registro, login, refresh)
- [ ] Health checks
- [ ] Variables de entorno documentadas

#### Fase 1 — MVP (Semanas 2–N)
- [ ] [Módulo 1 — funcionalidad core]
- [ ] [Módulo 2]
- [ ] Tests de integración para flujos críticos
- [ ] Documentación Swagger

#### Fase 2 — Hardening (antes de producción)
- [ ] Rate limiting configurado
- [ ] Monitoreo y alertas
- [ ] Load testing
- [ ] Security audit
- [ ] Runbook de operaciones

#### Fase 3 — Post-launch
- [ ] [Feature 1]
- [ ] [Feature 2]
- [ ] Optimizaciones basadas en métricas reales

### Estimaciones

| Módulo | Estimación | Responsable | Estado |
|--------|-----------|-------------|--------|
| Auth | [X días] | | ☐ Pendiente |
| [Módulo] | | | ☐ Pendiente |

---

## 20. Riesgos y Decisiones Pendientes

### Riesgos identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| API externa poco confiable | Media | Alto | Circuit breaker + mock fallback |
| Cambio de requisitos frecuente | Alta | Medio | Arquitectura flexible, feature flags |
| [Riesgo] | | | |

### Decisiones técnicas pendientes

> Lo que todavía no se resolvió y necesita resolverse antes de codificarlo.

- [ ] **[Decisión]:** [Opciones en consideración] — responsable: [X] — fecha límite: [Y]
- [ ] **[Decisión]:** ...

### Preguntas abiertas

- [ ] ¿[Pregunta de negocio o técnica no resuelta]?
- [ ] ¿[Otra pregunta]?

---

*Última actualización: [FECHA]*
*Autor: [NOMBRE]*
