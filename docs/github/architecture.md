# Arquitectura

## Arquitectura Hexagonal (Puertos y Adaptadores)

El proyecto aplica un aislamiento estricto entre capas. La dirección de todas las dependencias es hacia adentro — las capas externas dependen de las internas, nunca al revés.

```
┌──────────────────────────────────────────────┐
│  INFRASTRUCTURE                              │
│  (Controladores NestJS, adaptadores TypeORM, │
│   clientes HTTP, queries SQL)                │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  APPLICATION                           │  │
│  │  (Casos de uso / servicios, DTOs)      │  │
│  │                                        │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  DOMAIN                          │  │  │
│  │  │  (Modelos, enums, puertos,        │  │  │
│  │  │   excepciones de dominio)         │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

## Responsabilidades por capa

| Capa | Permitido | Prohibido |
|---|---|---|
| **Domain** | Interfaces TypeScript, enums, abstract classes (puertos), lógica pura | Decoradores NestJS, TypeORM, HTTP, cualquier import de framework |
| **Application** | Servicios de caso de uso, DTOs, llamadas a puertos | Llamadas directas a BD, HTTP, detalles de infraestructura |
| **Infrastructure** | Controladores, adaptadores, SQL, clientes HTTP, NestJS/TypeORM | Lógica de negocio, decisiones de dominio |

## Puertos

Los puertos son `abstract class` (no `interface` de TypeScript) porque NestJS necesita un token concreto para la inyección de dependencias.

```
domain/ports/in/   → puertos entrantes (lo que la aplicación expone)
domain/ports/out/  → puertos salientes (lo que la aplicación necesita del exterior)
```

Ejemplo — módulo auth:

```
in/  auth-service.port.ts         → register(), login(), refresh(), logout()
out/ auth-user-repository.port.ts → findByEmail(), save(), existsByEmail()
out/ refresh-token-repository.port.ts
out/ password-encoder.port.ts
```

## Estrategia de base de datos

TypeORM se usa **solo** como proveedor de pool de conexiones y token DI. No hay decoradores `@Entity()`, ni `Repository<>`, ni `.find()`, ni `.save()`.

Todo el SQL vive en archivos `*.queries.ts` por módulo:

```ts
// auth/infrastructure/persistence/auth.queries.ts
export const FIND_USER_BY_EMAIL = `
  SELECT u.*, array_agg(r.name) AS roles
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  WHERE u.email = $1
  GROUP BY u.id
`;
```

Los adaptadores los ejecutan vía `@InjectEntityManager()`:

```ts
const [user] = await this.em.query(FIND_USER_BY_EMAIL, [email]);
```

Esto otorga control total sobre el SQL, habilita funciones PostGIS y elimina sorpresas por N+1.

## Uso de PostGIS

Las queries geoespaciales usan PostGIS directamente:

- `ST_DWithin` — casetas y POIs dentro de un radio
- `ST_MakePoint` — construir un punto geográfico desde lat/lng
- `ST_Buffer` + `ST_Intersects` — POIs a lo largo del corredor de una polyline decodificada

## Flujo de cálculo de peajes

```
POST /tolls/calculate
  └─ TollCalculationApplicationService
       ├─ Cargar vehículo (VehicleRepositoryPort)
       ├─ Verificar caché por hash del request (TollCalculationRepositoryPort)
       ├─ Obtener rutas (TollProviderPort → mock o TollGuru)
       ├─ Calcular costo de combustible (FuelCostCalculator)
       ├─ Agregar costos de peaje (TollCostAggregator)
       ├─ Puntuar y etiquetar rutas (RouteScorer)
       └─ Persistir y retornar (TollCalculationRepositoryPort)
```

`TollProviderPort` es la abstracción clave: pasar del mock a TollGuru no requiere ningún cambio en el dominio ni en la aplicación.

## Fronteras de módulos

Los módulos **no se importan directamente entre sí**. Las dependencias entre módulos se manejan a través de:

1. Puertos compartidos exportados desde el `*.module.ts` de cada módulo
2. Eventos de dominio (futuro)
3. Utilidades compartidas en `shared/`

`shared/` contiene solo concerns verdaderamente transversales: guards, interceptors, filtros, decoradores y utilidades puras (hash, dinero, geo, polyline). Si algo solo lo usa un módulo, pertenece a ese módulo, no a `shared/`.
