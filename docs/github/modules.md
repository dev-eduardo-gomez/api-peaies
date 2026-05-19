# Módulos

## auth

Gestiona el registro, login, ciclo de vida de los tokens JWT de acceso y refresh, y el bloqueo de cuentas.

**Decisiones de diseño clave:**
- Contraseñas hasheadas con `bcryptjs` (10 salt rounds)
- Los refresh tokens se almacenan como hash SHA-256 — el token en claro nunca toca la BD
- Rotación de tokens: cada refresh invalida el viejo token y emite uno nuevo
- 5 logins fallidos consecutivos bloquean la cuenta (`locked = true`)

**Puertos in:** `AuthServicePort` (register, login, refresh, logout)
**Puertos out:** `AuthUserRepositoryPort`, `RefreshTokenRepositoryPort`, `PasswordEncoderPort`

---

## vehicles

CRUD de vehículos del usuario. Incluye especificaciones de motor, dimensiones, eficiencia de combustible y tipo de carga — todo necesario para calcular con precisión el costo de peajes y combustible.

**Decisiones de diseño clave:**
- La `plate` es única por usuario (no globalmente) — la misma placa puede pertenecer a distintos usuarios en diferentes regiones
- `VehicleTypeCode` mapea a los códigos de clasificación de TollGuru (`2AxlesAuto`, `5AxlesTruck`, etc.)
- Por ahora no hay soft delete — `DELETE` es permanente

**Puertos in:** `VehicleServicePort`
**Puertos out:** `VehicleRepositoryPort`

---

## routing

El módulo central. Orquesta el cálculo de peajes de origen a destino usando un proveedor intercambiable.

**Servicios internos (lógica de dominio pura):**
| Servicio | Responsabilidad |
|---|---|
| `FuelCostCalculator` | Cilindrada + carga + ratio ciudad/autopista → costo de combustible |
| `TollCostAggregator` | Suma costos por método de pago, calcula `minimumTollCost` |
| `RouteScorer` | Asigna etiquetas: CHEAPEST, FASTEST, SHORTEST, PRACTICAL, ALTERNATE |
| `ArrivalTimeEstimator` | Estima ETA por caseta basado en la velocidad promedio de la ruta |

**Proveedores (intercambiables):**
- `MockTollProviderAdapter` — 15 casetas reales Carmen→Monterrey, 2 rutas (v1 / desarrollo)
- `TollGuruProviderAdapter` — llamadas reales a la API de TollGuru con 3 reintentos y timeout de 30s (v2 / producción)

**Caché:** los cálculos se hashean por `(userId, vehicleId, origin, destination, departureTime)` — requests idénticos devuelven resultados cacheados.

**Puertos in:** `CalculateTollUseCase`, `GetCalculationHistoryUseCase`, `CompareRoutesUseCase`
**Puertos out:** `TollProviderPort`, `TollCalculationRepositoryPort`, `CurrencyConverterPort`

---

## booths

Catálogo de solo lectura de casetas de peaje con sus tarifas. Soporta búsqueda por cercanía vía PostGIS.

**Decisión de diseño clave:** prioridad de fuente de tarifa `OFFICIAL > TOLLGURU` — cuando una caseta tiene tarifas oficiales del gobierno, estas tienen precedencia sobre los datos scrapeados de TollGuru.

**Endpoints:**
- `GET /booths` — listado paginado
- `GET /booths/:id` — detalle con todas las tarifas
- `GET /booths/nearby?lat=&lng=&radiusKm=` — PostGIS `ST_DWithin`

---

## pois

Puntos de Interés a lo largo o cerca de una ruta. Soporta gasolineras, áreas de descanso, restaurantes, hoteles y carga eléctrica.

**Decisión de diseño clave:** `findAlongRoute` decodifica la polyline almacenada y usa `ST_Buffer + ST_Intersects` para encontrar POIs dentro de un corredor — es más preciso que un simple radio desde el origen/destino.

**Endpoints:**
- `GET /pois/nearby?lat=&lng=&radiusKm=&type=`
- `GET /pois/along-route/:calculationId?type=&corridorMeters=`

---

## catalogs

Datos de referencia estáticos servidos como endpoints de solo lectura. Todos los datos del catálogo se insertan vía `migrations/002_seed-catalogs.sql`.

- Tipos de vehículo (17 tipos con códigos TollGuru)
- Tipos de combustible (MAGNA, PREMIUM, DIESEL, ELECTRIC, LPG)
- Sistemas de tag (IAVE, TAG_PASE, TELEVIA, VIAPASS, etc.)
- Tipos de carga (NONE, DRY, REFRIGERATED, HAZMAT, LIQUID, LIVESTOCK)
- Operadores de peaje (6 operadores)

Todos los endpoints del catálogo son `@Public()` — no requieren JWT.

---

## audits

Registro de eventos del sistema de solo escritura (append-only), para seguridad y cumplimiento. Registra: LOGIN, LOGIN_FAILED, REGISTER, CALCULATE_TOLL, RATE_CHANGE.

Por ahora es un módulo pasivo — los servicios de aplicación llaman a `AuditApplicationService.logEvent()` como efecto secundario. No hay endpoints públicos expuestos.

---

## shared

Infraestructura transversal que todos los módulos pueden usar. Regla estricta: si algo solo lo necesita un módulo, va en ese módulo, no aquí.

| Archivo | Propósito |
|---|---|
| `jwt-auth.guard.ts` | Guard global — todos los endpoints requieren JWT salvo `@Public()` |
| `roles.guard.ts` | Guard global — aplica `@Roles('ROLE_ADMIN')` |
| `global-exception.filter.ts` | Mapea excepciones de dominio y errores de validación a respuestas HTTP |
| `sentry.interceptor.ts` | Agrega contexto del request al scope de Sentry |
| `logging.interceptor.ts` | Loguea `MÉTODO /ruta → ESTADO (Xms)` |
| `hash.util.ts` | Hash SHA-256 (usado para almacenar refresh tokens) |
| `money.util.ts` | Redondeo con precisión (evita problemas de punto flotante 0.1+0.2) |
| `geo.util.ts` | Distancia haversine entre dos coordenadas GPS |
| `polyline-decoder.util.ts` | Decodifica polylines codificadas de Google Maps / TollGuru |
