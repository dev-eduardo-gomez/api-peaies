# Routing Module — Guía de Implementación y Cálculos

Este documento explica cómo está construido el módulo `routing`, qué hace cada pieza, y cómo se realizan los cálculos internamente. Está pensado para cualquier desarrollador que necesite entender, modificar o extender este módulo.

---

## Índice

1. [Arquitectura del módulo](#1-arquitectura-del-módulo)
2. [Flujo completo de una petición](#2-flujo-completo-de-una-petición)
3. [Cálculo de costos de peaje](#3-cálculo-de-costos-de-peaje)
4. [Cálculo del costo de combustible](#4-cálculo-del-costo-de-combustible)
5. [Scoring de rutas — Labels](#5-scoring-de-rutas--labels)
6. [Estimación de tiempos de llegada](#6-estimación-de-tiempos-de-llegada)
7. [Deduplicación via hash](#7-deduplicación-via-hash)
8. [Integración con TollGuru](#8-integración-con-tollguru)
9. [Proveedor Mock](#9-proveedor-mock)
10. [Persistencia y transacciones](#10-persistencia-y-transacciones)
11. [Comparación de rutas](#11-comparación-de-rutas)
12. [Historial paginado](#12-historial-paginado)
13. [Configuración de entorno](#13-configuración-de-entorno)
14. [Diagrama de dependencias del módulo](#14-diagrama-de-dependencias-del-módulo)

---

## 1. Arquitectura del módulo

El módulo sigue arquitectura hexagonal (puertos y adaptadores). Cada capa solo conoce hacia adentro — nunca hacia afuera.

```
routing/
├── domain/                         ← Núcleo de negocio. Sin dependencias externas.
│   ├── model/                      ← Interfaces TypeScript (no clases, no decoradores)
│   │   ├── toll-calculation.model.ts
│   │   ├── route.model.ts
│   │   ├── toll-booth.model.ts
│   │   ├── cost-breakdown.model.ts
│   │   ├── money.model.ts
│   │   └── ...
│   ├── ports/
│   │   ├── in/                     ← Use cases (abstract classes que la app implementa)
│   │   │   ├── calculate-toll.use-case.ts
│   │   │   ├── compare-routes.use-case.ts
│   │   │   └── get-calculation-history.use-case.ts
│   │   └── out/                    ← Ports hacia infraestructura (abstract classes)
│   │       ├── toll-calculation-repository.port.ts
│   │       ├── toll-provider.port.ts
│   │       └── currency-converter.port.ts
│   ├── services/                   ← Lógica de dominio pura (sin @Injectable, sin DI)
│   │   ├── fuel-cost-calculator.ts
│   │   ├── toll-cost-aggregator.ts
│   │   ├── route-scorer.ts
│   │   └── arrival-time-estimator.ts
│   └── exceptions/
│       ├── toll-provider.exception.ts
│       ├── calculation-not-found.exception.ts
│       └── invalid-coordinate.exception.ts
│
├── application/                    ← Orquestación. Coordina dominio e infraestructura.
│   ├── dto/                        ← Contratos HTTP (request/response)
│   └── services/                   ← Implementaciones de los use cases
│
└── infrastructure/                 ← Detalles técnicos: BD, HTTP, mappers
    ├── adapters/                   ← Implementa ports out/ (repositorio de BD)
    ├── api/                        ← Controllers HTTP + mappers web
    ├── persistence/                ← Queries SQL raw
    └── toll-provider/              ← Adaptadores TollGuru (real) y Mock
```

### Regla clave

```
domain ← application ← infrastructure
```

- **Domain** no importa nada de application ni infrastructure.
- **Application** importa domain (models + ports), nada de infrastructure.
- **Infrastructure** implementa los ports del domain.

---

## 2. Flujo completo de una petición

```
POST /api/v1/tolls/calculate
```

```
TollController.calculate()
  │
  ├── Crea CalculateTollCommand (DTO → dominio)
  │
  └── CalculateTollUseCase.execute(command)   [→ TollCalculationApplicationService]
        │
        ├── 1. hashObject(userId + vehicleId + origin + destination + waypoints)
        │
        ├── 2. calcRepo.findByHash(hash, userId)
        │         └── Si existe → return cached (sin llamar al proveedor)
        │
        ├── 3. vehicleRepo.findById(vehicleId)
        │         └── Valida que el vehículo pertenece al usuario
        │
        ├── 4. catalogRepo.findFuelTypeByOrderCode()
        │         └── Obtiene avgPriceMxn del tipo de combustible del vehículo
        │
        ├── 5. tollProvider.calculateRoute(command)
        │         └── TollguruProviderAdapter o MockTollProviderAdapter
        │               → Route[] con costos en MXN (sin fuel, sin labels)
        │
        ├── 6. Por cada Route:
        │     ├── FuelCostCalculator.calculate(distancia, eficiencia, precio)
        │     ├── TollCostAggregator.aggregate(tolls, 'MXN')
        │     └── Recalcula grandTotal = tollBase (tag o cash) + fuelCost
        │
        ├── 7. RouteScorer.score(routes)
        │         └── Asigna labels: FASTEST / CHEAPEST / SHORTEST
        │
        ├── 8. Por cada Route:
        │         └── ArrivalTimeEstimator.estimate(distancia, duración, departureTime)
        │
        ├── 9. calcRepo.save(calculation)
        │         └── Transacción: toll_calculations → routes → booths + directions
        │
        └── 10. return TollCalculation
                  │
                  TollController: TollWebMapper.toCalculationResponse()
                    └── TollCalculationResponseDto → 200 OK
```

---

## 3. Cálculo de costos de peaje

### Tipos de sistema de cobro

| Tipo | Constante | Cómo funciona | `TollEventType` |
|------|-----------|---------------|-----------------|
| Cuota abierta | `OPEN` / `BARRIER` | Pago individual en cada caseta | `PAY` |
| Cuota cerrada | `TICKET_SYSTEM` | Boleto en entrada, pago en salida según distancia | `ENTER` / `EXIT` |

Las autopistas federales mexicanas (57D, 180D, 45D, etc.) son mayormente **ticket system**. Los periféricos urbanos usan **barrier**.

### Campos de costo por caseta (`TollBooth`)

```typescript
interface TollBooth {
  cashCost:     Money   // Costo si se paga en efectivo
  tagCost:      Money   // Costo si se paga con telepeaje (IAVE, TAG_PASE, etc.)
  costApplied:  Money   // El costo que realmente se usó en el cálculo
  paymentMethod: PaymentMethod
}
```

### Agregación de costos (`TollCostAggregator`)

```typescript
// Suma todos los cashCost de las casetas de la ruta
cashTotal = Σ booth.cashCost.amount   para cada booth

// Suma todos los tagCost de las casetas
tagTotal  = Σ booth.tagCost.amount    para cada booth
```

### Cálculo del `grandTotal`

El `grandTotal` depende del `preferredPaymentMethod` del usuario:

```
Si preferredPaymentMethod == TAG:
    grandTotal = tagTotal + fuelCost

Si preferredPaymentMethod == CASH (default):
    grandTotal = cashTotal + fuelCost
```

**Importante:** Todas las cifras están en **MXN**. TollGuru recibe `"currency": "MXN"` en el request para que devuelva precios en pesos directamente.

---

## 4. Cálculo del costo de combustible

**Servicio:** `FuelCostCalculator.calculate()` en `domain/services/fuel-cost-calculator.ts`

### Fórmula

```
distanceKm  = distanceMeters / 1000

cityKm      = distanceKm × cityRatio          (porción de manejo urbano)
hwyKm       = distanceKm × (1 - cityRatio)    (porción de carretera)

cityFuelL   = cityKm / cityKmpl               (litros en ciudad)
hwyFuelL    = hwyKm / hwyKmpl                 (litros en carretera)

totalFuelL  = cityFuelL + hwyFuelL

fuelCost    = round(totalFuelL × fuelPricePerLiter, 2)   [en MXN]
```

### Parámetros

| Parámetro | Fuente | Ejemplo |
|-----------|--------|---------|
| `distanceMeters` | TollGuru response | `921400` |
| `cityRatio` | Hardcoded `0.2` (80% carretera) | `0.2` |
| `cityKmpl` | `vehicles.fuel_efficiency_city_kmpl` | `10.5` km/l |
| `hwyKmpl` | `vehicles.fuel_efficiency_hwy_kmpl` | `14.2` km/l |
| `fuelPricePerLiter` | `fuel_types.avg_price_mxn` (catálogos) | `22.50` MXN/l |

### Ejemplo completo

```
Ruta CDMX → Monterrey, 921 km, Nissan Versa (Magna, 14 km/l hwy)

distanceKm  = 921400 / 1000 = 921.4 km
cityKm      = 921.4 × 0.2   = 184.28 km
hwyKm       = 921.4 × 0.8   = 737.12 km

cityFuelL   = 184.28 / 10.5 = 17.55 l
hwyFuelL    = 737.12 / 14.2 = 51.91 l
totalFuelL  = 17.55 + 51.91 = 69.46 l

fuelCost    = 69.46 × 22.50 = MXN 1,562.85
```

### Edge cases

- Si `cityKmpl = 0` o `hwyKmpl = 0` → ese segmento aporta 0 litros (no se divide por cero)
- Si el vehículo no tiene datos de eficiencia → `fuelCost = Money { amount: 0, currency: 'MXN' }`
- Si `fuelPricePerLiter = 0` (combustible no encontrado en catálogos) → `fuelCost = 0`

---

## 5. Scoring de rutas — Labels

**Servicio:** `RouteScorer.score()` en `domain/services/route-scorer.ts`

TollGuru puede devolver 1 a 3 rutas por petición. El scorer las compara y asigna etiquetas:

```typescript
enum RouteLabel {
  FASTEST  = 'FASTEST'   // menor durationSeconds
  CHEAPEST = 'CHEAPEST'  // menor costs.grandTotal.amount
  SHORTEST = 'SHORTEST'  // menor distanceMeters
}
```

### Algoritmo

```
fasterRoute  = routes.minBy(r => r.durationSeconds)
cheaperRoute = routes.minBy(r => r.costs.grandTotal.amount)
shorterRoute = routes.minBy(r => r.distanceMeters)

Para cada route:
  labels = []
  if route == fasterRoute  → labels.push('FASTEST')
  if route == cheaperRoute → labels.push('CHEAPEST')
  if route == shorterRoute → labels.push('SHORTEST')
```

Una ruta puede tener múltiples labels. Si solo hay una ruta, recibe los tres.

### Reglas de desempate

- Empate en costo → la más rápida gana `CHEAPEST`
- Empate en duración → la más barata gana `FASTEST`

### Ejemplo

```
Ruta 0: 921 km, 9h03m, MXN 1,410   → labels: ['FASTEST']
Ruta 1: 978 km, 9h58m, MXN 1,340   → labels: ['CHEAPEST', 'SHORTEST']
```

---

## 6. Estimación de tiempos de llegada

**Servicio:** `ArrivalTimeEstimator.estimate()` en `domain/services/arrival-time-estimator.ts`

### Cálculo del destino

```
departure           = command.departureTime ?? new Date()
estimatedArrival    = departure + (durationSeconds × 1000 ms)

// Con tráfico:
totalSeconds        = durationSeconds + trafficDelaySeconds
estimatedArrival    = departure + (totalSeconds × 1000 ms)
```

### Ejemplo

```
Salida: 2025-05-20T08:00:00Z
Duración: 32,520 segundos (≈ 9h03m)
Retraso: 0s

Llegada estimada: 2025-05-20T17:02:00Z
```

### Nota sobre TollGuru

TollGuru puede devolver `arrivalTime` por caseta directamente. Si lo hace, se usa ese valor. Este estimador es el **fallback** cuando el proveedor no incluye ese dato.

---

## 7. Deduplicación via hash

Antes de llamar a TollGuru, el sistema calcula un hash SHA-256 del request para evitar llamadas duplicadas.

### Qué se incluye en el hash

```typescript
hashObject({
  userId,
  vehicleId,
  origin:      { lat, lng },       // solo coordenadas, no el address string
  destination: { lat, lng },
  waypoints:   [{ lat, lng }, ...]
})
```

### Qué NO se incluye

| Campo | Razón |
|-------|-------|
| `departureTime` | Dos cálculos para la misma ruta a distinta hora devuelven el mismo resultado de casetas |
| `origin.address` | El string de dirección no afecta el cálculo |
| `preferredPaymentMethod` | Se recalcula en la aplicación sobre los costos ya obtenidos |

### Flujo de caché

```
hash = SHA-256(userId + vehicleId + origin + destination + waypoints)
  │
  ├── calcRepo.findByHash(hash, userId)
  │       ├── Resultado → return cached TollCalculation (sin llamar TollGuru)
  │       └── Sin resultado → continuar con el flujo normal
  │
  └── [... llamada a TollGuru ...]
      calcRepo.save(calculation)  ← persiste con el hash
```

> El hash filtra por `userId` — dos usuarios haciendo la misma ruta **no** comparten caché entre sí.

---

## 8. Integración con TollGuru

El adaptador de TollGuru está separado en tres clases con responsabilidades claras.

### `TollguruRequestBuilder`

Convierte el command de dominio al formato que espera TollGuru:

```typescript
// Dominio → TollGuru
{
  vehicle:     { type: "2AxlesAuto" },     // viene de vehicle_types.code
  departure:   "2025-05-20T08:00:00Z",    // ISO 8601 o "now"
  source:      [19.4326, -99.1332],        // [lat, lng]
  destination: [25.6866, -100.3161],
  waypoints:   [[20.9674, -101.3481]],
  currency:    "MXN"
}
```

**Nota:** `source`, `destination` y `waypoints` son arrays `[lat, lng]`, no objetos.

### `TollguruClient`

Hace el POST a `https://api.tollguru.com/v2/gps-toll-by-waypoints` con:

- Header: `x-api-key: {TOLLGURU_API_KEY}`
- Timeout: 15 segundos
- Si falla → lanza `TollProviderException extends BadGatewayException`

### `TollguruResponseMapper`

Convierte la respuesta cruda de TollGuru a `Route[]` del dominio:

```
TollguruRouteDto
  ├── distance.value     → route.distanceMeters
  ├── duration.value     → route.durationSeconds
  ├── hasTolls           → route.hasTolls
  ├── polyline           → route.polyline
  ├── url                → route.googleMapsUrl
  └── tolls[]            → route.tolls[] (TollBooth[])
        ├── cashCost      → TollBooth.cashCost  { amount, currency: 'MXN' }
        ├── tagCost       → TollBooth.tagCost   { amount, currency: 'MXN' }
        └── type          → TollEventType       ('ticketSystem' → 'ENTER', resto → 'PAY')
```

**Importante:** El mapper devuelve rutas con `costs` inicializados en 0 y `labels: []`. Estos valores los completa el **application service** después (fuel cost, aggregation, scoring).

### `TollguruProviderAdapter`

Coordina los tres colaboradores:

```
1. vehicleRepo.findById(vehicleId)   → obtiene vehicleType.code
2. builder.build(command, typeCode)  → TollguruRequestDto
3. client.post(request)              → TollguruResponseDto
4. mapper.map(response)              → Route[]
```

---

## 9. Proveedor Mock

`MockTollProviderAdapter` implementa el mismo `TollProviderPort` pero devuelve datos hardcodeados de la ruta **Ciudad del Carmen → Monterrey** con 500ms de latencia simulada.

Útil para:
- Desarrollo local sin necesitar una API key de TollGuru
- Tests de integración
- Demos

```
TOLL_PROVIDER=MOCK  ← activa el mock (default si no se configura)
```

Las dos rutas del mock:

| Ruta | Distancia | Duración | Casetas | Cash | Tag |
|------|-----------|----------|---------|------|-----|
| Ruta 0 (vía 180D costero) | 921 km | ~9h03m | 6 | MXN 360 | MXN 288 |
| Ruta 1 (vía Coatzacoalcos) | 978 km | ~9h58m | 4 | MXN 215 | MXN 172 |

---

## 10. Persistencia y transacciones

### Schema de tablas

```
toll_calculations (1)
│   id, user_id, vehicle_id, request_hash
│   origin_location (GEOGRAPHY), destination_location (GEOGRAPHY)
│   waypoints_json (JSONB), departure_time, provider, raw_response (JSONB)
│
└── toll_calculation_routes (N) — una por cada opción de ruta
    │   id, calculation_id, route_index, labels (CSV)
    │   distance_meters, duration_seconds, toll_count
    │   fuel_cost, tag_cost, cash_cost, grand_total
    │   polyline, google_maps_url
    │
    ├── toll_calculation_route_booths (N) — una por caseta
    │       route_id, sequence_order, toll_booth_id (nullable)
    │       event_type, booth_name
    │       cash_cost, tag_pri_cost, cost_applied, payment_method_used
    │       arrival_time
    │
    └── toll_calculation_route_directions (N) — turn-by-turn
            route_id, sequence_order, lat, lng
            instruction, distance_meters, duration_seconds
```

### Método `save()` — Transacción

Todo el guardado ocurre dentro de **una sola transacción**. Si cualquier INSERT falla, se hace rollback completo.

```
BEGIN TRANSACTION
  INSERT INTO toll_calculations          (1 row)
  │
  └── Para cada Route:
        INSERT INTO toll_calculation_routes   (1 row por ruta)
        │
        └── En paralelo (Promise.all):
              INSERT INTO toll_calculation_route_booths     (N rows)
              INSERT INTO toll_calculation_route_directions (N rows)
COMMIT  (o ROLLBACK si alguno falla)
```

### Coordenadas geográficas

Las coordenadas se almacenan como `GEOGRAPHY(POINT, 4326)` usando PostGIS:

```sql
ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography
```

**Atención:** `ST_MakePoint` recibe `(longitud, latitud)` — **primero lng, luego lat**. Es el estándar GIS (eje X = longitud, eje Y = latitud).

Para leer de vuelta:
```sql
ST_Y(location::geometry) AS lat   -- Y = latitud
ST_X(location::geometry) AS lng   -- X = longitud
```

### Consultas separadas en `findById`

En lugar de un JOIN masivo entre rutas + casetas + pasos (que genera producto cartesiano), se usan **queries separadas**:

```
1. SELECT toll_calculations WHERE id = $1 AND user_id = $2
2. SELECT toll_calculation_routes WHERE calculation_id = $1
3. Para cada route_id:
   SELECT toll_calculation_route_booths     WHERE route_id = $routeId   ← en paralelo
   SELECT toll_calculation_route_directions WHERE route_id = $routeId   ← en paralelo
```

Esto evita filas duplicadas y es más fácil de leer.

---

## 11. Comparación de rutas

**Endpoint:** `POST /api/v1/tolls/compare-routes`

`RouteComparisonApplicationService` **reutiliza** `TollCalculationApplicationService` — no duplica el flujo de cálculo.

```typescript
// 1. Delega el cálculo completo
const calculation = await this.calculateToll.execute(command);

// 2. Extrae las rutas relevantes
fasterRoute  = routes.find(r => r.labels.includes('FASTEST')) ?? routes[0]
cheaperRoute = routes.find(r => r.labels.includes('CHEAPEST')) ?? routes[0]

// 3. Calcula diferencias
isSameRoute            = fasterRoute.routeIndex === cheaperRoute.routeIndex
timeDifferenceSeconds  = |fasterRoute.durationSeconds - cheaperRoute.durationSeconds|
costDifference         = |cheaperRoute.grandTotal - fasterRoute.grandTotal|  [MXN]
```

### Lógica de recomendación

```
Si isSameRoute:
  → "La ruta más rápida y la más barata coinciden."

Si costDifference < MXN 100:
  → "La diferencia de costo es mínima ($X MXN). Se recomienda la ruta más rápida."

Si costDifference ≥ MXN 100:
  → "La ruta más barata ahorra $X MXN a costa de Y minutos adicionales."
```

---

## 12. Historial paginado

**Endpoint:** `GET /api/v1/tolls/history?page=1&limit=10`

Para eficiencia, el historial **no carga rutas, casetas ni pasos**. Solo devuelve un resumen por cálculo usando agregaciones SQL:

```sql
SELECT
  tc.id,
  ST_Y(tc.origin_location::geometry)       AS origin_lat,
  ST_X(tc.origin_location::geometry)       AS origin_lng,
  ...
  COUNT(tcr.id)::int     AS route_count,          -- cuántas rutas tiene
  MIN(tcr.grand_total)   AS cheapest_route_cost   -- costo de la más barata
FROM toll_calculations tc
LEFT JOIN toll_calculation_routes tcr ON tcr.calculation_id = tc.id
WHERE tc.user_id = $1
GROUP BY tc.id
ORDER BY tc.created_at DESC
LIMIT $2 OFFSET $3
```

El paginado usa `LIMIT` + `OFFSET` calculado como:
```
offset = (page - 1) * limit
```

El `limit` máximo aceptado por la aplicación es **50** (lo trunca silenciosamente si viene mayor).

---

## 13. Configuración de entorno

| Variable | Descripción | Valores |
|----------|-------------|---------|
| `TOLL_PROVIDER` | Qué adaptador de proveedor usar | `MOCK` (default) / `TOLLGURU` |
| `TOLLGURU_API_KEY` | API key de TollGuru | Solo necesaria si `TOLL_PROVIDER=TOLLGURU` |

**Ejemplo `.env`:**

```env
TOLL_PROVIDER=MOCK

# Solo para producción:
# TOLL_PROVIDER=TOLLGURU
# TOLLGURU_API_KEY=tg_live_xxxxxxxxxxxxxxxx
```

---

## 14. Diagrama de dependencias del módulo

```
RoutingModule
  imports:
    HttpModule     ← para TollguruClient
    ConfigModule   ← para leer env vars
    VehiclesModule ← para VehicleRepositoryPort (obtener datos del vehículo)
    CatalogModule  ← para CatalogRepositoryPort (obtener precio del combustible)

  providers:
    TollCalculationRepositoryPort  → TollCalculationRepositoryAdapter
    CalculateTollUseCase           → TollCalculationApplicationService
    CompareRoutesUseCase           → RouteComparisonApplicationService
    GetCalculationHistoryUseCase   → CalculationHistoryApplicationService
    TollProviderPort               → MockTollProviderAdapter | TollguruProviderAdapter
                                     (selección dinámica via TOLL_PROVIDER env var)
    TollguruClient
    TollguruRequestBuilder
    TollguruResponseMapper
    TollguruProviderAdapter        ← instanciado aunque no sea el activo (para el factory)
    MockTollProviderAdapter        ← ídem

  controllers:
    TollController     → POST /tolls/calculate, POST /tolls/compare-routes
    HistoryController  → GET  /tolls/history,   GET  /tolls/:id
```

### Inyección dinámica del proveedor

```typescript
{
  provide: TollProviderPort,
  useFactory: (tollguru, mock, config) =>
    config.get('TOLL_PROVIDER') === 'TOLLGURU' ? tollguru : mock,
  inject: [TollguruProviderAdapter, MockTollProviderAdapter, ConfigService],
}
```

Ambos adaptadores se instancian siempre — el factory simplemente elige cuál exponer bajo el token `TollProviderPort`. Esto evita lógica condicional dentro de los servicios de aplicación.

---

## Resumen de archivos clave

| Archivo | Responsabilidad |
|---------|----------------|
| `domain/services/fuel-cost-calculator.ts` | Fórmula de costo de combustible (pura, sin DI) |
| `domain/services/toll-cost-aggregator.ts` | Suma cash/tag de todas las casetas |
| `domain/services/route-scorer.ts` | Asigna labels FASTEST/CHEAPEST/SHORTEST |
| `domain/services/arrival-time-estimator.ts` | Calcula hora estimada de llegada |
| `application/services/toll-calculation-application.service.ts` | **Orquesta todo el flujo** |
| `infrastructure/toll-provider/tollguru-provider.adapter.ts` | Llama a la API de TollGuru |
| `infrastructure/toll-provider/mock-toll-provider.adapter.ts` | Datos hardcodeados para dev |
| `infrastructure/adapters/toll-calculation-repository.adapter.ts` | Persiste en PostgreSQL |
| `infrastructure/api/mapper/toll-web.mapper.ts` | Domain → DTO para HTTP responses |
| `infrastructure/persistence/routing.queries.ts` | Todas las queries SQL |
