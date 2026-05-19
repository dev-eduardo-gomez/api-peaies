# Base de datos

## Estrategia: SQL puro sobre TypeORM ORM

TypeORM se usa **solo** para:
- Gestión del pool de conexiones
- Token de DI `@InjectEntityManager()`
- `em.transaction()` para operaciones atómicas

No hay decoradores `@Entity()`, no hay `Repository<>`, no hay `.find()`, no hay `.save()`.

Cada query está escrita a mano en archivos `*.queries.ts` por módulo. Esto da control total, habilita PostGIS y hace el SQL auditable.

## Migraciones

```
migrations/
├── 001_init.sql           → Extensiones, tablas principales
├── 002_seed-catalogs.sql  → Datos de referencia (roles, tipos de vehículo, combustibles...)
└── 003_seed-toll-booths.sql → 15 casetas reales Carmen→Monterrey
```

Convenciones:
- Una migración = un cambio atómico
- Nunca editar una migración que ya corrió en otro entorno
- Incluir el cambio y su rollback como comentarios

## Tablas principales

### users
```sql
id                UUID PRIMARY KEY DEFAULT uuid_generate_v4()
email             VARCHAR(255) UNIQUE NOT NULL
password_hash     TEXT NOT NULL
full_name         VARCHAR(255)
enabled           BOOLEAN DEFAULT true
locked            BOOLEAN DEFAULT false
failed_login_attempts INT DEFAULT 0
last_login_at     TIMESTAMPTZ
created_at        TIMESTAMPTZ DEFAULT now()
updated_at        TIMESTAMPTZ DEFAULT now()
```

### roles / user_roles
```sql
roles: id, name (ROLE_USER, ROLE_ADMIN)
user_roles: user_id FK, role_id FK
```

### refresh_tokens
```sql
id          UUID PK
user_id     UUID FK → users
token_hash  VARCHAR(64) UNIQUE  -- SHA-256 del token en claro
expires_at  TIMESTAMPTZ
revoked     BOOLEAN DEFAULT false
revoked_at  TIMESTAMPTZ
created_at  TIMESTAMPTZ
```

### vehicles
```sql
id                UUID PK
user_id           UUID FK → users
alias             VARCHAR(100)
plate             VARCHAR(20)
vehicle_type_code VARCHAR FK → vehicle_types
fuel_type_code    VARCHAR FK → fuel_types
displacement_cc   INT
cylinders         INT
horsepower        INT
weight_kg         NUMERIC
height_m          NUMERIC
length_m          NUMERIC
width_m           NUMERIC
axles             INT
city_kmpl         NUMERIC
hwy_kmpl          NUMERIC
tank_capacity_l   NUMERIC
tags              TEXT[]
created_at        TIMESTAMPTZ
updated_at        TIMESTAMPTZ
UNIQUE(user_id, plate)
```

### toll_calculations
```sql
id                  UUID PK
user_id             UUID FK → users
vehicle_id          UUID FK → vehicles
request_hash        VARCHAR(64) UNIQUE  -- clave de caché
provider            VARCHAR(50)
currency            VARCHAR(3)
origin_lat          NUMERIC
origin_lng          NUMERIC
origin_address      TEXT
destination_lat     NUMERIC
destination_lng     NUMERIC
destination_address TEXT
departure_time      TIMESTAMPTZ
created_at          TIMESTAMPTZ
```

### toll_calculation_routes
```sql
id                UUID PK
calculation_id    UUID FK → toll_calculations
name              VARCHAR(255)
labels            TEXT[]
distance_meters   INT
duration_seconds  INT
toll_count        INT
fuel_cost         NUMERIC
cash_cost         NUMERIC
tag_cost          NUMERIC
minimum_toll_cost NUMERIC
grand_total       NUMERIC
currency          VARCHAR(3)
polyline          TEXT
```

### toll_booths / toll_booth_rates
```sql
toll_booths:
  id, name, road, state, location GEOGRAPHY(POINT, 4326),
  operator_code FK, toll_system_type, active

toll_booth_rates:
  booth_id FK, vehicle_type_code FK, cash NUMERIC,
  tag_primary NUMERIC, valid_from DATE, source VARCHAR
```

### pois
```sql
id       UUID PK
name     VARCHAR
type     VARCHAR  -- GAS_STATION, REST_AREA, RESTAURANT, HOTEL, EV_CHARGING
brand    VARCHAR
location GEOGRAPHY(POINT, 4326)
address  TEXT
metadata JSONB
```

### audit_events
```sql
id          UUID PK
user_id     UUID FK → users (nullable)
type        VARCHAR  -- LOGIN, LOGIN_FAILED, REGISTER, CALCULATE_TOLL, RATE_CHANGE
entity_type VARCHAR
entity_id   UUID
metadata    JSONB
created_at  TIMESTAMPTZ
```

## Queries PostGIS

**Casetas cercanas:**
```sql
SELECT *, ST_Distance(location, ST_MakePoint($1, $2)::geography) AS distance_m
FROM toll_booths
WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3 * 1000)
ORDER BY distance_m ASC
```

**POIs a lo largo de una ruta:**
```sql
SELECT * FROM pois
WHERE ST_Intersects(
  location,
  ST_Buffer(ST_GeomFromGeoJSON($1)::geography, $2)
)
```
Donde `$1` es el GeoJSON LineString decodificado de la polyline almacenada.

## Transacciones

Usar `em.transaction()` para cualquier escritura de múltiples pasos:

```ts
await this.em.transaction(async (tx) => {
  await tx.query(INSERT_USER, [...]);
  await tx.query(ASSIGN_ROLE, [...]);
});
```

COMMIT/ROLLBACK se manejan automáticamente — si cualquier query dentro lanza, toda la transacción hace rollback.
