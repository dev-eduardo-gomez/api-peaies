# Cálculo de Peajes — Cómo Funciona

Este documento explica la lógica de cálculo de peajes del módulo `routing`. Está pensado para desarrolladores que necesitan entender el flujo, las fórmulas matemáticas y las reglas de negocio.

---

## 1. Visión General

Cuando un usuario llama a `POST /api/v1/tolls/calculate`, el sistema:

1. Genera un hash del request para deduplicación
2. Verifica si ese mismo cálculo ya fue realizado anteriormente (caché)
3. Llama al proveedor de peajes activo (`TOLLGURU`, `LOCAL_DB` o `MOCK`)
4. Enriquece las rutas crudas con costo de combustible, etiquetas y estimaciones de llegada
5. Persiste el resultado
6. Devuelve el `TollCalculationResponseDto` completo

```
Usuario → TollController → CalculateTollUseCase → TollProvider → RouteScorer → DB → Response
```

---

## 2. Tipos de Sistema de Cobro

México tiene dos tipos de sistemas de cobro de peajes:

| Tipo | Cómo funciona | `TollEventType` |
|------|--------------|----------------|
| **Abierto / Barrera** (`OPEN`) | Pago individual en cada caseta | `PAY` |
| **Cerrado / Sistema de boleto** (`TICKET_SYSTEM`) | Pago en la salida según distancia recorrida desde la entrada | `ENTER` (entrada), `EXIT` (salida, aquí se aplica el costo) |

La mayoría de las autopistas federales mexicanas (`180D`, `57D`, `45D`, etc.) usan el sistema de boleto. Los periféricos urbanos usan el tipo barrera.

---

## 3. Desglose de Costos

Cada ruta tiene un `CostBreakdown` con cuatro campos:

```
CostBreakdown {
  tagCost     = suma de tagCost de todas las casetas        (pago con IAVE/TAG_PASE/etc.)
  cashCost    = suma de cashCost de todas las casetas       (pago en efectivo)
  fuelCost    = combustible estimado para la distancia      (calculado localmente)
  grandTotal  = (tagCost O cashCost) + fuelCost             (según preferredPaymentMethod)
}
```

Todos los valores están en **MXN**. TollGuru puede devolver costos en USD — el sistema siempre solicita MXN en la llamada a la API (`currency: "MXN"` en el cuerpo del request).

### Fórmula del grandTotal

```
Si preferredPaymentMethod == TAG:
  grandTotal = tagCost + fuelCost

Si preferredPaymentMethod == CASH (default):
  grandTotal = cashCost + fuelCost
```

---

## 4. Cálculo del Costo de Combustible

Manejado por `FuelCostCalculator.calculate()` en `domain/services/`.

```
distanceKm = distanceMeters / 1000
cityKm     = distanceKm * cityRatio      (cityRatio por defecto = 0.2, es decir 20% manejo urbano)
hwyKm      = distanceKm * (1 - cityRatio)

cityFuelL  = cityKm / cityKmpl
hwyFuelL   = hwyKm / hwyKmpl

fuelCost   = (cityFuelL + hwyFuelL) * fuelPricePerLiter  [redondeado a 2 decimales]
```

**Casos borde:**
- Si `cityKmpl == 0` o `hwyKmpl == 0`, el costo de combustible de ese segmento es `0`
- Si el vehículo no tiene datos de eficiencia, el costo de combustible es `Money { amount: 0, currency: 'MXN' }`
- El precio del combustible (`fuelPricePerLiter`) viene del catálogo `fuel_types` (columna `avg_price_mxn`)

---

## 5. Scoring de Rutas — Etiquetas

Manejado por `RouteScorer.score()` en `domain/services/`.

```
FASTEST  → ruta con menor durationSeconds
CHEAPEST → ruta con menor costs.grandTotal.amount
SHORTEST → ruta con menor distanceMeters
```

Una misma ruta puede tener múltiples etiquetas (ej: `['FASTEST', 'CHEAPEST']` si es la más rápida y la más barata a la vez).

**Reglas de desempate:**
- Empate en costo → la más rápida gana la etiqueta `CHEAPEST`
- Empate en duración → la más barata gana la etiqueta `FASTEST`

Si el proveedor devuelve una sola ruta, recibe las tres etiquetas.

---

## 6. Hash del Request — Deduplicación

El hash se calcula con `hashObject()` de `shared/util/hash.util.ts` usando SHA-256.

**Campos incluidos en el hash:**
```
{ userId, vehicleId, origin: { lat, lng }, destination: { lat, lng }, waypoints: [{ lat, lng }] }
```

**Campos NO incluidos:**
- `departureTime` — dos requests para la misma ruta a distinta hora reutilizan el resultado en caché
- Strings de `address` — solo importan las coordenadas para determinar la ruta

Si el hash coincide con un cálculo previo del mismo usuario, se devuelve el `TollCalculation` cacheado de forma inmediata sin llamar a TollGuru.

---

## 7. Estimación del Tiempo de Llegada

Manejado por `ArrivalTimeEstimator.estimate()` en `domain/services/`.

```
departure = command.departureTime ?? new Date()
estimatedArrival = departure + durationSeconds * 1000ms
```

Cada `TollBooth` de la ruta puede tener un `arrivalTime` — el momento estimado en que el vehículo pasa por esa caseta. TollGuru puede proveer estos valores directamente; si no lo hace, el estimador distribuye la duración total de forma proporcional a lo largo de la secuencia de la ruta.

---

## 8. Proveedores de Peajes

El módulo soporta tres proveedores intercambiables a través de la variable de entorno `TOLL_PROVIDER`. Todos implementan `TollProviderPort` y devuelven `Route[]` — el dominio no sabe cuál está activo.

### Selección del proveedor

```
TOLL_PROVIDER=MOCK      # por defecto — rutas hardcodeadas Carmen→Monterrey, demora de 500ms
TOLL_PROVIDER=LOCAL_DB  # casetas reales de la BD, sin API externa (requiere toll_booth_rates)
TOLL_PROVIDER=TOLLGURU  # API real de TollGuru, requiere TOLLGURU_API_KEY
```

### MOCK

Devuelve dos rutas fijas hardcodeadas con nombres y costos inventados. Útil para desarrollo sin dependencias externas. El campo `"provider": "MOCK"` aparece en la respuesta.

### LOCAL_DB — `LocalDbTollProviderAdapter`

Consulta directamente la base de datos para obtener las casetas reales en el corredor geográfico entre origen y destino.

**Algoritmo:**
1. Resuelve el tipo de vehículo (`vehicleType.code`) consultando `VehicleRepositoryPort`
2. Calcula un bounding box con 1.5° de padding sobre las coordenadas de origen y destino
3. Consulta `toll_booths` filtradas dentro de ese bounding box via `ST_Y` / `ST_X`
4. Por cada caseta, hace un `LATERAL JOIN` a `toll_booth_rates` para obtener la tarifa vigente del tipo de vehículo (prioridad: `OFFICIAL > MANUAL > TOLLGURU`)
5. Ordena las casetas por distancia al origen con `ST_Distance` para asignar el `sequence` correcto
6. Estima distancia y duración de la ruta con Haversine × 1.3 (factor de carretera) a 80 km/h promedio

**Limitaciones:**
- Devuelve una sola ruta (sin alternativas)
- La distancia y duración son estimaciones — no tiene motor de ruteo real
- Los costos serán 0 si `toll_booth_rates` no tiene tarifas para el tipo de vehículo consultado

**Dependencias:**
- `toll_booths` — coordenadas geográficas (PostGIS `geography`)
- `toll_booth_rates` — tarifas vigentes por tipo de vehículo
- `vehicle_types` — para hacer match por `code`

El campo `"provider": "LOCAL_DB"` aparece en la respuesta.

### TOLLGURU — `TollguruProviderAdapter`

Llama a la API externa de TollGuru (`https://api.tollguru.com/v2/gps-toll-by-waypoints`). Requiere `TOLLGURU_API_KEY` en el entorno.

La integración está dividida en tres colaboradores:

| Clase | Responsabilidad |
|-------|----------------|
| `TollguruRequestBuilder` | Transforma `CalculateTollCommand` → `TollguruRequestDto` |
| `TollguruClient` | Realiza el POST HTTP, maneja timeouts y errores |
| `TollguruResponseMapper` | Transforma `TollguruResponseDto` → `Route[]` |

**Formato del request:**

```json
{
  "vehicle": { "type": "2AxlesAuto" },
  "departure": "2025-05-20T08:00:00Z",
  "source": [19.4326, -99.1332],
  "destination": [25.6866, -100.3161],
  "waypoints": [],
  "currency": "MXN"
}
```

- `source` / `destination` / `waypoints` son arrays `[lat, lng]` (NO objetos)
- `vehicle.type` se mapea a `vehicle_types.code` (ej: `"2AxlesAuto"`, `"2AxlesMotorcycle"`)

El campo `"provider": "TOLLGURU"` aparece en la respuesta.

---

## 9. Comparación de Rutas

`POST /api/v1/tolls/compare-routes` delega internamente en `TollCalculationApplicationService` y luego:

1. Identifica la ruta etiquetada como `FASTEST` y la etiquetada como `CHEAPEST`
2. Calcula `timeDifferenceMinutes` y `costDifferenceMxn`
3. Genera un string de `recommendation`:
   - Diferencia de costo < MXN 100 → recomienda la ruta más rápida
   - Diferencia de costo ≥ MXN 100 → recomienda la ruta más barata
   - Misma ruta → mensaje neutral

---

## 10. Schema de Persistencia

```
toll_calculations (1)
  └── toll_calculation_routes (N)              ← una por cada opción de ruta devuelta
        ├── toll_calculation_route_booths (N)        ← ordenadas por sequence_order
        └── toll_calculation_route_directions (N)    ← pasos turn-by-turn
```

El método `save()` ejecuta todos los inserts dentro de **una única transacción**. Si algún insert falla, el cálculo completo se revierte.

---

## 11. Endpoint de Historial

`GET /api/v1/tolls/history` devuelve un resumen liviano por cálculo — sin listas de casetas ni instrucciones de manejo. El SQL usa agregaciones `COUNT` + `MIN` para calcular `routeCount` y `cheapestRouteCost` de forma eficiente en una sola query.

`GET /api/v1/tolls/:id` devuelve el `TollCalculationResponseDto` completo con todas las rutas, casetas y tiempos de llegada.
