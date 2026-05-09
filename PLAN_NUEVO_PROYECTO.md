# Plan Maestro para Nuevo Proyecto Backend

> Plan agnóstico al framework (NestJS, Spring Boot, Express, FastAPI, Laravel, etc.)
> Sirve como **checklist secuencial** para arrancar un proyecto desde cero con bases sólidas.

---

## Tabla de Contenidos

1. [Filosofía y Principios](#1-filosofía-y-principios)
2. [Decisiones Iniciales](#2-decisiones-iniciales)
3. [Arquitectura de Software](#3-arquitectura-de-software)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Base de Datos](#5-base-de-datos)
6. [Autenticación y Seguridad](#6-autenticación-y-seguridad)
7. [Manejo de Configuración y Entornos](#7-manejo-de-configuración-y-entornos)
8. [Bruno – Colecciones de API](#8-bruno--colecciones-de-api)
9. [Observabilidad: Sentry, Logs y Métricas](#9-observabilidad-sentry-logs-y-métricas)
10. [Testing](#10-testing)
11. [Documentación (OpenAPI / Swagger)](#11-documentación-openapi--swagger)
12. [CI/CD y Calidad](#12-cicd-y-calidad)
13. [Integración con Tecnologías en la Nube](#13-integración-con-tecnologías-en-la-nube)
14. [Roadmap de Implementación Paso a Paso](#14-roadmap-de-implementación-paso-a-paso)

---

## 1. Filosofía y Principios

Antes de escribir una línea, fijar las reglas del juego:

- **SOLID** como guía, no como dogma.
- **Dominio primero**: la lógica de negocio no debe depender de frameworks ni librerías.
- **Inversión de Dependencias**: las capas externas (HTTP, BD) dependen del dominio, nunca al revés.
- **Convención sobre configuración**: nombres y carpetas predecibles.
- **Pequeños commits, semánticos** (Conventional Commits: `feat:`, `fix:`, `refactor:`...).
- **Rama por feature**, PR a `dev`, merge a `main` solo en releases.

---

## 2. Decisiones Iniciales

Llenar esta tabla **antes** de codear:

| Categoría | Opciones | Decisión |
|---|---|---|
| Lenguaje | TypeScript / Java / Kotlin / Python / Go | _______ |
| Framework | NestJS / Spring Boot / FastAPI / Express | _______ |
| Base de datos | MySQL / PostgreSQL / MongoDB | _______ |
| ORM / Query builder | TypeORM / Prisma / JPA / SQLAlchemy | _______ |
| Migraciones | Nativas del ORM / Flyway / Liquibase | _______ |
| Auth | JWT propio / OAuth2 / Keycloak / Auth0 | _______ |
| Cache | Redis / In-memory | _______ |
| Cola de mensajes | RabbitMQ / Kafka / SQS / BullMQ | _______ |
| Observabilidad | Sentry + Pino/Winston / ELK / Datadog | _______ |
| Contenedores | Docker + Docker Compose | _______ |
| Gestor de paquetes | npm / pnpm / yarn / Maven / Gradle / pip | _______ |

---

## 3. Arquitectura de Software

### 3.1 Arquitectura Limpia + Hexagonal (recomendada)

Tres capas concéntricas. La regla de oro: **las flechas de dependencia apuntan hacia adentro**.

```
┌─────────────────────────────────────────────┐
│   INFRASTRUCTURE (frameworks, BD, HTTP)     │
│  ┌───────────────────────────────────────┐  │
│  │   APPLICATION (casos de uso)          │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │   DOMAIN (entidades, reglas)    │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

| Capa | Contiene | NO contiene |
|---|---|---|
| **Domain** | Entidades, Value Objects, Interfaces de repositorios, Errores de dominio | Anotaciones de framework, SQL, HTTP |
| **Application** | Casos de uso (Use Cases / Services), DTOs, orquestación | Implementaciones concretas de BD o HTTP |
| **Infrastructure** | Controladores, Repositorios concretos, ORM, Adaptadores externos, Config | Lógica de negocio |

### 3.2 Puertos y Adaptadores

- **Puerto** = interfaz declarada en `domain/interfaces/`
- **Adaptador** = implementación concreta en `infrastructure/`
- Permite cambiar BD, proveedor de email, etc. **sin tocar el dominio**.

---

## 4. Estructura de Carpetas

### 4.1 Estructura raíz

```
proyecto/
├── bruno/                  # Colecciones de pruebas API
├── docs/                   # Documentación adicional (ADRs, diagramas)
├── docker/                 # Dockerfiles y compose por entorno
├── scripts/                # Scripts de utilidad (seed, migrate, etc.)
├── src/
│   ├── modules/            # Módulos de negocio (bounded contexts)
│   ├── shared/             # Utilidades compartidas, helpers
│   ├── config/             # Carga de configuración y validación
│   ├── common/             # Filtros, guards, interceptors transversales
│   └── main.ts             # Bootstrap
├── test/                   # Tests e2e
├── .env.example
├── .gitignore
├── README.md
└── PLAN_NUEVO_PROYECTO.md
```

### 4.2 Estructura por módulo (Hexagonal)

Cada módulo de negocio replica esta estructura:

```
src/modules/<nombre-modulo>/
├── application/
│   ├── dtos/                       # DTOs de entrada/salida del caso de uso
│   └── use-cases/
│       ├── create-x.usecase.ts
│       ├── get-x.usecase.ts
│       ├── update-x.usecase.ts
│       └── remove-x.usecase.ts
├── domain/
│   ├── entities/
│   │   └── x.entity.ts
│   ├── value-objects/
│   ├── interfaces/
│   │   ├── x-read-repository.interface.ts
│   │   └── x-write-repository.interface.ts
│   └── errors/
│       └── x-not-found.error.ts
├── infrastructure/
│   ├── repositories/
│   │   └── mysql/
│   │       ├── mysql-x.repository.ts
│   │       └── x.schema.ts         # mapeo ORM
│   └── mappers/
│       └── x.mapper.ts             # entidad <-> persistencia
├── controllers/                    # o presentation/http/
│   └── x.controller.ts
└── x.module.ts                     # composición / inyección
```

### 4.3 Reglas de oro de la estructura

- Un módulo **no importa** de otro módulo directamente; lo hace vía interfaces compartidas o eventos.
- `shared/` es para cosas **realmente** compartidas. Si solo lo usa un módulo, no es shared.
- Los `mappers` evitan que el ORM contamine el dominio.

---

## 5. Base de Datos

### 5.1 Diseño previo

1. **Modelado**: dibujar el ERD (dbdiagram.io, drawSQL, Mermaid).
2. **Convención de nombres**:
   - Tablas en `snake_case` y plural (`users`, `nscea_mediciones`).
   - Columnas en `snake_case` (`created_at`, `user_id`).
   - PK: `id` (UUID o BIGINT autoincremental).
   - FK: `<tabla_singular>_id`.
3. **Campos de auditoría obligatorios** en toda tabla:
   - `created_at`, `updated_at`, `deleted_at` (soft delete).
   - Opcional: `created_by`, `updated_by`.
4. **Índices**: en toda FK y en columnas frecuentes en `WHERE` u `ORDER BY`.

### 5.2 Migraciones

- **Una migración = un cambio atómico**. Nunca editar migraciones ya ejecutadas en otros entornos.
- Nombrarlas con timestamp: `1735000000000-create-users-table.ts`.
- Incluir siempre **`up` y `down`**.
- Versionar también los **seeds** (datos iniciales: roles, permisos, configuración).

### 5.3 Estrategia de IDs

- **UUID v7** o ULID si el sistema es distribuido o público.
- **BIGINT autoincremental** si es interno y se requiere orden natural.

---

## 6. Autenticación y Seguridad

### 6.1 Estrategia JWT

Esquema **dual token**:

| Token | Tiempo de vida | Almacenamiento | Uso |
|---|---|---|---|
| **Access Token** | 15 min | Memoria / header `Authorization: Bearer` | Llamadas API |
| **Refresh Token** | 7-30 días | Cookie `httpOnly` + `Secure` + `SameSite=Strict` | Renovar access token |

Reglas:

- Firmar con **RS256** (clave asimétrica) si hay múltiples servicios; **HS256** solo para monolito.
- Guardar `jti` (JWT ID) y permitir **revocación** (lista negra en Redis).
- Rotar refresh token en cada uso (**refresh token rotation**).
- Incluir en el payload: `sub`, `iat`, `exp`, `roles`, `tenant_id` si aplica. **Nada sensible**.

### 6.2 CSRF

Solo necesario si usas **cookies** para autenticación.

- Patrón **Double Submit Cookie**: cookie + header `X-CSRF-Token`.
- O patrón **Synchronizer Token**: token en sesión + form/header.
- Las APIs puramente Bearer (sin cookies) no requieren CSRF.

### 6.3 Hashing de Passwords

- **Argon2id** (preferido) o **bcrypt** (cost ≥ 12).
- Nunca SHA/MD5.
- Pepper opcional almacenado fuera de la BD (variable de entorno).

### 6.4 Otros controles obligatorios

- **Helmet** (o equivalente): headers de seguridad (`X-Frame-Options`, `CSP`, `HSTS`).
- **CORS** con whitelist explícita; nada de `*` en producción.
- **Rate limiting** por IP y por usuario (ej. 100 req/min en endpoints públicos, 5/min en login).
- **Validación de entrada** con DTOs + librería tipo `class-validator`, `Joi`, `Zod`, `Bean Validation`.
- **Sanitización** contra XSS y SQL injection (usar parámetros, nunca string concat).
- **HTTPS obligatorio** en cualquier entorno expuesto.
- **Secrets** en `.env` o vault (AWS Secrets Manager, Vault de HashiCorp). Jamás en el repo.

### 6.5 Autorización (RBAC / ABAC)

- Definir **roles** y **permisos** en BD, no hardcoded.
- Guards / middlewares decoradores:
  - `@Roles('admin')`
  - `@Permissions('user.create')`
- Auditar acciones sensibles en tabla `audit_log`.

### 6.6 Recuperación de cuenta

- Tokens de reset con expiración corta (15 min) y de un solo uso.
- Enviar por email con link firmado.
- Notificar al usuario cuando hay cambio de password o login desde nuevo dispositivo.

---

## 7. Manejo de Configuración y Entornos

- Archivos: `.env`, `.env.development`, `.env.production`, `.env.test`.
- **Validar** al arranque (Zod / class-validator / Joi). Si falta una variable crítica, **el servidor no debe iniciar**.
- Mantener `.env.example` actualizado con TODAS las variables (sin valores reales).
- Cargar config vía un módulo dedicado (`src/config/`), nunca leer `process.env` disperso por el código.

Variables mínimas:

```env
NODE_ENV=
PORT=
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
SENTRY_DSN=
CORS_ORIGINS=
RATE_LIMIT_MAX=
```

---

## 8. Bruno – Colecciones de API

Bruno almacena las requests como **archivos `.bru` versionables en git**, ideal para colaboración.

### 8.1 Estructura recomendada

```
bruno/
├── bruno.json                  # Metadata de la colección
├── environments/
│   ├── Local.bru
│   ├── Development.bru
│   └── Production.bru
├── Auth/
│   ├── Login.bru
│   ├── Refresh Token.bru
│   ├── Logout.bru
│   └── Register.bru
├── Users/
│   ├── Get All.bru
│   ├── Get By Id.bru
│   ├── Create.bru
│   ├── Update.bru
│   └── Delete.bru
└── <Modulo>/
    ├── Get All.bru
    ├── Get By Id.bru
    ├── Create.bru
    ├── Update.bru
    └── Delete.bru
```

### 8.2 Buenas prácticas

- **Una carpeta por módulo/recurso**. Nombres en español si el dominio lo está.
- Usar **variables de entorno** (`{{baseUrl}}`, `{{accessToken}}`).
- **Script post-response** en login que guarde el token automáticamente:
  ```javascript
  bru.setEnvVar("accessToken", res.body.accessToken);
  ```
- Cada request debe incluir un **ejemplo válido** y, si aplica, casos de error documentados como variantes.
- Versionar la carpeta `bruno/` en git. **No commitear** `environments/Production.bru` con secretos reales.

---

## 9. Observabilidad: Sentry, Logs y Métricas

### 9.1 Sentry

- Inicializar en el bootstrap, **antes** de cualquier otro middleware.
- Capturar:
  - Errores no controlados (`unhandledException`, `unhandledRejection`).
  - Errores HTTP 5xx automáticamente vía interceptor/filter.
  - Excepciones de negocio críticas con `Sentry.captureException(err, { tags, extra })`.
- **No capturar** errores 4xx esperados (validación, no autorizado): generan ruido.
- Enriquecer con contexto: `userId`, `requestId`, `tenantId`.
- Configurar **environments** (`development`, `staging`, `production`) y **release** (commit SHA) para tracking de regresiones.
- Activar **performance monitoring** y **session replay** solo si el costo lo justifica.

### 9.2 Logging estructurado

- Usar logger JSON (Pino, Winston, Logback, structlog).
- Cada log debe incluir: `timestamp`, `level`, `requestId`, `userId`, `module`, `message`.
- **Niveles**: `error`, `warn`, `info`, `debug`. Nunca `console.log` en producción.
- Correlacionar requests con un **`X-Request-Id`** propagado en headers.

### 9.3 Métricas (opcional pero recomendado)

- Exportar a Prometheus / OpenTelemetry: latencia por endpoint, throughput, tasa de errores, uso de memoria.

### 9.4 Health checks

- Endpoints `/health/live` y `/health/ready` para orquestadores (Kubernetes, ECS).
- Verificar conexión a BD, Redis, servicios externos.

---

## 10. Testing

| Tipo | Cobertura objetivo | Herramienta típica |
|---|---|---|
| **Unitarios** | 80%+ en `domain` y `application` | Jest, JUnit, pytest |
| **Integración** | repositorios, módulos completos | Testcontainers |
| **E2E** | flujos críticos (auth, checkout) | Supertest, RestAssured |

Reglas:

- Los tests del dominio **no deben requerir base de datos ni framework**.
- Usar **fixtures** y **factories**, no datos hardcodeados.
- En CI, correr unitarios en cada push; e2e en PR a `dev`.

---

## 11. Documentación (OpenAPI / Swagger)

- Exponer `/api/docs` en entornos no productivos (o protegido con auth en producción).
- Documentar **cada endpoint**: parámetros, body, respuestas, ejemplos, códigos de error.
- Generar la spec **desde el código** (decoradores) para evitar desincronización.
- Mantener un **changelog** de la API si hay clientes externos.

---

## 12. CI/CD y Calidad

### 12.1 CI mínimo (GitHub Actions / GitLab CI)

Pipeline en cada PR:

1. Instalar dependencias (con cache).
2. Lint (`eslint`, `checkstyle`, `ruff`).
3. Format check (`prettier`, `spotless`, `black`).
4. Type check (`tsc --noEmit`, `mypy`).
5. Tests unitarios + cobertura.
6. Build.
7. Análisis de seguridad: `npm audit`, `snyk`, `trivy` para imágenes Docker.

### 12.2 CD

- Build de imagen Docker, push a registry.
- Deploy automático a `staging` en merge a `dev`.
- Deploy a `production` manual o por tag.

### 12.3 Pre-commit hooks (Husky / pre-commit)

- Lint-staged
- Conventional commits (`commitlint`)
- Bloquear commits con `secrets` (gitleaks).

---

## 13. Integración con Tecnologías en la Nube

El plan es **cloud-agnostic**, pero conviene definir desde el inicio qué proveedor se usará. Aquí el mapeo equivalente entre los 3 grandes (AWS / GCP / Azure) y cómo integrarlos.

### 13.1 Mapeo de servicios equivalentes

| Necesidad | AWS | GCP | Azure |
|---|---|---|---|
| Cómputo serverless | Lambda | Cloud Functions | Functions |
| Cómputo contenedores | ECS / Fargate / EKS | Cloud Run / GKE | Container Apps / AKS |
| Cómputo VM | EC2 | Compute Engine | Virtual Machines |
| Base de datos relacional | RDS / Aurora | Cloud SQL | Azure SQL |
| Base de datos NoSQL | DynamoDB | Firestore | Cosmos DB |
| Cache | ElastiCache (Redis) | Memorystore | Azure Cache for Redis |
| Storage de objetos | S3 | Cloud Storage | Blob Storage |
| Cola de mensajes | SQS / SNS / EventBridge | Pub/Sub | Service Bus / Event Grid |
| Secretos | Secrets Manager / SSM | Secret Manager | Key Vault |
| Auth gestionado | Cognito | Identity Platform | Entra ID (AAD) |
| CDN | CloudFront | Cloud CDN | Front Door |
| Email transaccional | SES | SendGrid (3rd party) | Communication Services |
| Logs y métricas | CloudWatch | Cloud Logging / Monitoring | Monitor / App Insights |
| Trazas distribuidas | X-Ray | Cloud Trace | Application Insights |
| IaC | CloudFormation / CDK | Deployment Manager | ARM / Bicep |
| IaC multi-cloud | **Terraform** / Pulumi | Terraform / Pulumi | Terraform / Pulumi |

### 13.2 Stack AWS recomendado (referencia)

Para un backend típico:

- **API**: ECS Fargate detrás de **ALB** (o API Gateway + Lambda si serverless).
- **BD**: RDS PostgreSQL/MySQL Multi-AZ con backups automáticos y read replicas.
- **Cache**: ElastiCache Redis para sesiones, rate limiting, JWT blacklist.
- **Archivos**: S3 con CloudFront delante. Subidas vía **presigned URLs** (no proxy por el backend).
- **Secretos**: Secrets Manager (rotación automática) o SSM Parameter Store (más barato).
- **Email**: SES con dominio verificado (SPF, DKIM, DMARC).
- **Colas**: SQS para tareas asíncronas; SNS para fan-out; EventBridge para eventos de dominio.
- **Logs**: CloudWatch Logs + envío a Sentry para errores.
- **Auth federada**: Cognito si no quieres gestionar usuarios; si gestionas tú, igual úsalo solo para social login.

### 13.3 Patrones de integración desde el código

Reglas para mantener el dominio limpio:

1. **Toda llamada a un SDK de la nube vive en `infrastructure/`**, nunca en `domain/` ni `application/`.
2. **Definir un puerto** en el dominio y un **adaptador** en infraestructura:
   ```
   domain/interfaces/file-storage.interface.ts        ← puerto
   infrastructure/storage/s3-file-storage.adapter.ts  ← adaptador
   infrastructure/storage/local-file-storage.adapter.ts ← para tests
   ```
3. Esto permite cambiar S3 → GCS → MinIO sin tocar lógica de negocio.
4. **Inyectar la implementación** vía DI según el entorno (`local` usa filesystem, `prod` usa S3).

Adaptadores típicos a implementar:

- `FileStorageService` → S3 / GCS / Blob.
- `EmailService` → SES / SendGrid.
- `QueuePublisher` → SQS / Pub/Sub.
- `SecretProvider` → Secrets Manager / Vault.
- `NotificationService` → SNS / FCM.

### 13.4 Autenticación con servicios gestionados

Si decides **no** implementar JWT propio:

- **AWS Cognito**: pools de usuarios, MFA, social login. Tu backend valida el JWT firmado por Cognito (JWKS).
- **Auth0 / Clerk / Firebase Auth**: similares, multi-cloud.
- **Keycloak self-hosted**: si necesitas control total y on-premise.

En todos los casos: el backend **valida** el token (no lo emite) y extrae claims para autorización.

### 13.5 Infraestructura como Código (IaC)

**No clickear en la consola en producción.** Todo recurso debe estar versionado.

- **Terraform** (recomendado, multi-cloud) o **AWS CDK** (si te casas con AWS, en TS/Python).
- Estructura:
  ```
  infrastructure/
  ├── modules/           # módulos reutilizables (vpc, rds, ecs-service)
  ├── environments/
  │   ├── dev/
  │   ├── staging/
  │   └── production/
  └── README.md
  ```
- **State remoto** (S3 + DynamoDB lock para Terraform) — nunca local.
- Plan en CI, apply manual con aprobación para producción.

### 13.6 Despliegue de la app

Opciones según madurez:

| Etapa | Opción | Complejidad |
|---|---|---|
| MVP | Elastic Beanstalk / App Runner / Cloud Run | Baja |
| Producción | ECS Fargate / Cloud Run + ALB | Media |
| Escala | EKS / GKE con Helm + ArgoCD | Alta |

Pipeline típico CD a AWS:

1. Push a `main` → GitHub Actions
2. Build imagen Docker → push a **ECR**
3. Update task definition de **ECS** (o `kubectl apply` para EKS)
4. Health check post-deploy → rollback automático si falla

### 13.7 Costos y FinOps

- Activar **AWS Budgets** / **GCP Budgets** desde el día 1 con alertas.
- **Tags obligatorios** en cada recurso: `project`, `environment`, `owner`, `cost-center`.
- Apagar entornos `dev`/`staging` fuera de horario laboral (Lambda + EventBridge para auto-stop).
- Revisar **Compute Optimizer** / **Trusted Advisor** mensualmente.
- Reservas/Savings Plans para cargas predecibles (>30% ahorro).

### 13.8 Seguridad cloud — checklist mínimo

- [ ] Cuenta root **sin uso diario**, MFA hardware obligatorio.
- [ ] Usuarios IAM con **least privilege**, sin claves de larga duración (usar SSO / IAM Identity Center).
- [ ] **Roles IAM** para servicios (nunca credenciales hardcodeadas).
- [ ] Cifrado en reposo (KMS) y en tránsito (TLS 1.2+) por defecto.
- [ ] **VPC** con subnets privadas para BD; nunca BD pública.
- [ ] **Security Groups** restrictivos (deny por defecto).
- [ ] **GuardDuty** + **Security Hub** + **CloudTrail** activados.
- [ ] Backups automatizados con retención y prueba de restore periódica.
- [ ] **WAF** delante de endpoints públicos.
- [ ] Escaneo de imágenes en ECR (Inspector / Trivy).

---

## 14. Roadmap de Implementación Paso a Paso

Orden sugerido para arrancar el proyecto:

1. **Día 0 – Decisiones**
   - Llenar la tabla de [Decisiones Iniciales](#2-decisiones-iniciales).
   - Crear repo, definir branching strategy (Git Flow / Trunk-based).

2. **Día 1 – Esqueleto**
   - Inicializar proyecto con el framework elegido.
   - Configurar TypeScript/lint/format/editorconfig.
   - Crear estructura de carpetas vacía según [sección 4](#4-estructura-de-carpetas).
   - Dockerizar (`Dockerfile` + `docker-compose.yml` con BD).

3. **Día 2 – Configuración y BD**
   - Módulo de configuración con validación de `.env`.
   - Conexión a BD + primera migración (tabla `users`).
   - Health check.

4. **Día 3 – Auth**
   - Módulo `auth` completo: register, login, refresh, logout.
   - Hashing de passwords, JWT dual, guards.
   - CSRF si se usan cookies.
   - Rate limiting en endpoints de auth.

5. **Día 4 – Seguridad transversal**
   - Helmet, CORS, validación global de DTOs.
   - Filter global de excepciones que mapea errores de dominio → HTTP.
   - Logger estructurado + request ID.

6. **Día 5 – Observabilidad**
   - Integrar Sentry.
   - Configurar logs y health checks.
   - Documentación Swagger inicial.

7. **Día 6 – Bruno**
   - Crear colección con carpetas Auth + Users.
   - Variables de entorno y script de auto-token.

8. **Día 7+ – Primer módulo de negocio**
   - Aplicar la estructura hexagonal completa para validar el setup.
   - Tests unitarios del dominio y use cases.
   - PR template, CODEOWNERS, contribución.

9. **CI/CD**
   - Pipeline mínimo con lint + tests + build.
   - Deploy automático a staging.

10. **Cloud (cuando aplique)**
    - Decidir proveedor (AWS / GCP / Azure) y llenar [sección 13](#13-integración-con-tecnologías-en-la-nube).
    - Provisionar VPC, BD gestionada, secretos y storage con Terraform.
    - Definir adaptadores en `infrastructure/` para storage, email, colas.
    - Configurar IAM roles, WAF, backups y alertas de costo.

11. **Antes de producción**
    - Revisión de seguridad (OWASP Top 10).
    - Pruebas de carga básicas (k6, JMeter).
    - Backups automáticos de BD.
    - Documentación de runbook (qué hacer si X falla).

---

## Anexo: Checklist OWASP Top 10 Rápido

- [ ] A01 Broken Access Control → Guards, RBAC, tests de autorización.
- [ ] A02 Cryptographic Failures → HTTPS, hashing fuerte, secrets fuera del repo.
- [ ] A03 Injection → ORM con parámetros, validación de entrada.
- [ ] A04 Insecure Design → Threat modeling antes de features sensibles.
- [ ] A05 Security Misconfiguration → Helmet, CORS estricto, errores genéricos en prod.
- [ ] A06 Vulnerable Components → `npm audit`, `dependabot`, escaneo de imágenes.
- [ ] A07 Auth Failures → Bloqueo tras N intentos, MFA opcional, rotación de tokens.
- [ ] A08 Data Integrity Failures → Firmar artefactos, validar integridad de inputs.
- [ ] A09 Logging Failures → Logs estructurados + Sentry, no loggear PII/credenciales.
- [ ] A10 SSRF → Whitelist de URLs en llamadas externas, validar DNS resolution.

---

> **Filosofía final**: este plan es un punto de partida, no un dogma. Cada proyecto tiene contexto propio. Adáptalo, pero **nunca saltes** las secciones de seguridad ni la estructura de carpetas: son las que más cuesta cambiar después.
