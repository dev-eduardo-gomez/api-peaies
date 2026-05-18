# API Peajes

> API REST para cálculo de peajes, gestión de vehículos y enriquecimiento de rutas en México. Construida con NestJS 11, TypeScript 5.7 y PostgreSQL + PostGIS.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js / NestJS v11 |
| Lenguaje | TypeScript 5.7 |
| Base de datos | PostgreSQL 16 + PostGIS |
| ORM | TypeORM 0.3 (solo `em.query()` raw) |
| Autenticación | Passport + passport-jwt + @nestjs/jwt |
| Validación | class-validator + class-transformer |
| Documentación | Swagger / OpenAPI |
| Observabilidad | Sentry |
| Testing | Jest v30 + ts-jest + Supertest |
| Cliente API | Bruno |

---

## Arquitectura

Hexagonal (Puertos y Adaptadores) con distribución de carpetas por grito (Screaming Architecture). Cada módulo expone su frontera de dominio mediante abstract classes como puertos — los detalles de framework e infraestructura nunca se filtran hacia el dominio.

```
src/
├── auth/          → Autenticación, JWT dual token, rotación de refresh
├── booths/        → Catálogo de casetas + búsqueda por cercanía (PostGIS)
├── catalogs/      → Tipos de vehículo, combustibles, sistemas de tag, operadores
├── pois/          → Gasolineras, áreas de descanso a lo largo de una ruta (PostGIS)
├── routing/       → ★ Núcleo: cálculo de peajes, comparación de rutas
├── shared/        → Guards, interceptors, filtros, decoradores, utilidades
├── vehicles/      → Vehículos del usuario con especificaciones de motor y dimensiones
└── audits/        → Registro de eventos de auditoría
```

Cada módulo sigue la misma estructura interna:

```
<modulo>/
├── application/   → DTOs + servicios de aplicación (casos de uso)
├── domain/        → Modelos, enums, puertos (interfaces), excepciones de dominio
└── infrastructure/→ Adaptadores (BD, HTTP), controladores, queries SQL
```

**Regla de oro**: las flechas de dependencia siempre apuntan hacia adentro. `infrastructure` depende de `domain`, nunca al revés.

---

## Base de datos

- **TypeORM** se usa solo para el pool de conexiones y `@InjectEntityManager()` — sin entidades, sin `find()`, sin `QueryBuilder`.
- Todo el SQL está escrito a mano en archivos `*.queries.ts`.
- PostGIS potencia las queries geoespaciales: `ST_DWithin`, `ST_Buffer`, `ST_MakePoint`.
- Las migraciones viven en `migrations/` como archivos `.sql` planos.

---

## Cómo arrancar

```bash
# 1. Levantar base de datos
docker compose up -d

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# completar DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SENTRY_DSN

# 4. Aplicar migraciones
# (aplicar migrations/*.sql manualmente o con tu runner preferido)

# 5. Arrancar servidor de desarrollo
npm run start:dev
```

La documentación de la API está disponible en `http://localhost:3000/api/docs`.

---

## Autenticación

Esquema JWT de doble token:

| Token | TTL | Almacenamiento |
|---|---|---|
| Access Token | 15 min | Header `Authorization: Bearer` |
| Refresh Token | 7 días | Body (el cliente lo guarda de forma segura) |

- Los refresh tokens se **rotan** en cada uso (el viejo se revoca, se emite uno nuevo).
- Los refresh tokens se almacenan como **hash SHA-256** en la base de datos.
- Los intentos de login fallidos se registran — la cuenta se bloquea tras 5 fallos consecutivos.

---

## Testing

```bash
npm run test          # tests unitarios
npm run test:watch    # modo watch
npm run test:cov      # con reporte de cobertura
npm run test:e2e      # tests end-to-end
```

Estructura de tests:

```
test/
├── unit/
│   ├── auth/
│   ├── routing/
│   └── vehicles/
├── integration/
└── fixtures/
```

---

## Resumen de endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/v1/auth/register` | Registrar nuevo usuario |
| POST | `/api/v1/auth/login` | Login, obtener tokens |
| POST | `/api/v1/auth/refresh` | Rotar refresh token |
| POST | `/api/v1/auth/logout` | Revocar refresh token |
| GET | `/api/v1/vehicles` | Listar vehículos del usuario |
| POST | `/api/v1/vehicles` | Crear vehículo |
| GET | `/api/v1/vehicles/:id` | Obtener vehículo por id |
| PUT | `/api/v1/vehicles/:id` | Actualizar vehículo |
| DELETE | `/api/v1/vehicles/:id` | Eliminar vehículo |
| POST | `/api/v1/tolls/calculate` | Calcular peaje de una ruta |
| GET | `/api/v1/tolls/calculations` | Historial de cálculos |
| GET | `/api/v1/tolls/calculations/:id` | Un cálculo específico |
| POST | `/api/v1/tolls/compare` | Comparar múltiples rutas |
| GET | `/api/v1/booths` | Listar casetas (paginado) |
| GET | `/api/v1/booths/:id` | Detalle de caseta |
| GET | `/api/v1/booths/nearby` | Casetas cercanas (lat/lng/radio) |
| GET | `/api/v1/pois/nearby` | POIs cercanos |
| GET | `/api/v1/pois/along-route/:id` | POIs a lo largo de una ruta calculada |
| GET | `/api/v1/catalogs/vehicle-types` | Catálogo de tipos de vehículo |
| GET | `/api/v1/catalogs/fuel-types` | Catálogo de tipos de combustible |
| GET | `/api/v1/catalogs/tag-systems` | Catálogo de sistemas de tag |

Todos los endpoints salvo auth y catálogos requieren `Authorization: Bearer <token>`.

---

## Contribuir

- Ramas desde `dev`, PR de vuelta a `dev`. `main` es solo para releases.
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`.
- Cada PR debe pasar: lint → type check → tests unitarios → build.
- Sin lógica de negocio en `infrastructure/`. Sin imports de framework en `domain/`.
