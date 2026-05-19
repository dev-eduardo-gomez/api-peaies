# Datos de Prueba — Bruno

> **Flujo recomendado:** Auth → Vehicles → Catalogs → Tolls → Booths → POIs  
> Las variables `{{accessToken}}`, `{{vehicleId}}` y `{{calculationId}}` se guardan automáticamente con los scripts post-response de Bruno.

---

## Variables de entorno (local.bru)

```
baseUrl:       http://localhost:3000
accessToken:   (se llena automáticamente al hacer login/register)
refreshToken:  (se llena automáticamente al hacer login/register)
vehicleId:     (se llena automáticamente al crear un vehículo)
calculationId: (se llena automáticamente al calcular un peaje)
```

---

## Auth

### POST /api/v1/auth/register

```json
{
  "email": "dev.eduardo.gomez@gmail.com",
  "password": "Seguridad08",
  "fullName": "Angel Eduardo Gomez Ramirez"
}
```

> Solo se puede registrar el mismo email una vez. Si ya existe, usá login directamente.

---

### POST /api/v1/auth/login

```json
{
  "email": "dev.eduardo.gomez@gmail.com",
  "password": "Seguridad08"
}
```

**Respuesta esperada (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGci...",
  "tokenType": "Bearer",
  "expiresInSeconds": 900,
  "user": {
    "id": "uuid",
    "email": "dev.eduardo.gomez@gmail.com",
    "fullName": "Angel Eduardo Gomez Ramirez",
    "roles": ["ROLE_USER"]
  }
}
```

**Casos de error para probar:**

| Scenario | Body | Esperado |
|----------|------|----------|
| Email inexistente | `{ "email": "no@existe.com", "password": "123" }` | 401 Unauthorized |
| Contraseña incorrecta | `{ "email": "dev.eduardo.gomez@gmail.com", "password": "WrongPass" }` | 401 Unauthorized |
| Email inválido | `{ "email": "no-es-un-email", "password": "123" }` | 400 Bad Request |
| Sin password | `{ "email": "dev.eduardo.gomez@gmail.com" }` | 400 Bad Request |

---

### POST /api/v1/auth/refresh

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

> Usá el `refreshToken` guardado en la variable de entorno.

---

### POST /api/v1/auth/logout

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

**Respuesta esperada (200):** `{ "message": "Logout successful" }`

> Después del logout, el refreshToken queda revocado. Si intentás usarlo de nuevo para refresh → 401.

---

## Vehicles

### POST /api/v1/vehicles — Nissan Versa (auto particular)

```json
{
  "alias": "Mi Versa",
  "plate": "ABC-123",
  "vehicleTypeCode": "2AxlesAuto",
  "fuelTypeCode": "MAGNA",
  "cargoTypeCode": "NONE",
  "engine": {
    "displacementCc": 1600,
    "cylinders": 4,
    "horsepower": 106
  },
  "year": 2022,
  "brand": "Nissan",
  "model": "Versa",
  "dimensions": {
    "weightKg": 1150,
    "heightM": 1.50,
    "lengthM": 4.37,
    "widthM": 1.70,
    "axles": 2
  },
  "efficiency": {
    "cityKmpl": 12.5,
    "hwyKmpl": 16.0,
    "tankCapacityL": 41
  },
  "tags": ["IAVE", "TAG_PASE"]
}
```

**Otros vehículos para probar:**

<details>
<summary>Motocicleta — Honda CB500</summary>

```json
{
  "alias": "Mi Moto",
  "plate": "MOT-456",
  "vehicleTypeCode": "2AxlesMotorcycle",
  "fuelTypeCode": "MAGNA",
  "cargoTypeCode": "NONE",
  "engine": { "displacementCc": 500, "cylinders": 2, "horsepower": 47 },
  "year": 2021,
  "brand": "Honda",
  "model": "CB500F",
  "dimensions": {
    "weightKg": 192,
    "heightM": 1.10,
    "lengthM": 2.07,
    "widthM": 0.75,
    "axles": 2
  },
  "efficiency": { "cityKmpl": 22.0, "hwyKmpl": 28.0, "tankCapacityL": 17.7 },
  "tags": []
}
```
</details>

<details>
<summary>Camioneta pickup — Ford F-150</summary>

```json
{
  "alias": "Troca",
  "plate": "TRK-789",
  "vehicleTypeCode": "2AxlesPickup",
  "fuelTypeCode": "PREMIUM",
  "cargoTypeCode": "NONE",
  "engine": { "displacementCc": 3500, "cylinders": 6, "horsepower": 400 },
  "year": 2023,
  "brand": "Ford",
  "model": "F-150 Raptor",
  "dimensions": {
    "weightKg": 2200,
    "heightM": 1.95,
    "lengthM": 5.89,
    "widthM": 2.08,
    "axles": 2
  },
  "efficiency": { "cityKmpl": 7.5, "hwyKmpl": 10.2, "tankCapacityL": 98 },
  "tags": ["IAVE"]
}
```
</details>

<details>
<summary>Camión de carga 5 ejes — Kenworth T680</summary>

```json
{
  "alias": "Tráiler Norte",
  "plate": "TRL-001",
  "vehicleTypeCode": "5AxlesTruck",
  "fuelTypeCode": "DIESEL",
  "cargoTypeCode": "DRY",
  "engine": { "displacementCc": 12900, "cylinders": 6, "horsepower": 510 },
  "year": 2020,
  "brand": "Kenworth",
  "model": "T680",
  "dimensions": {
    "weightKg": 36000,
    "heightM": 4.10,
    "lengthM": 22.0,
    "widthM": 2.59,
    "axles": 5
  },
  "efficiency": { "cityKmpl": 3.0, "hwyKmpl": 4.5, "tankCapacityL": 600 },
  "tags": []
}
```
</details>

**Casos de error para probar:**

| Scenario | Qué cambiar | Esperado |
|----------|-------------|----------|
| Placa duplicada | Crear dos vehículos con `"plate": "ABC-123"` | 409 Conflict |
| Código de vehículo inválido | `"vehicleTypeCode": "InvalidCode"` | 400 Bad Request |
| Sin campos requeridos | Body vacío `{}` | 400 Bad Request |

---

### GET /api/v1/vehicles

Sin body. Devuelve todos los vehículos del usuario autenticado.

---

### GET /api/v1/vehicles/:id

Usá `{{vehicleId}}` guardado en la variable de entorno.

---

### PUT /api/v1/vehicles/:id

```json
{
  "alias": "Versa Actualizado",
  "efficiency": {
    "cityKmpl": 13.0,
    "hwyKmpl": 17.5,
    "tankCapacityL": 41
  }
}
```

> Solo enviá los campos que querés actualizar.

---

### DELETE /api/v1/vehicles/:id

Sin body. Usá `{{vehicleId}}`.

---

## Catalogs

Todos estos endpoints son `@Public()` — no necesitan token.

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/v1/catalogs/vehicle-types` | Lista todos los tipos de vehículo (17 tipos TollGuru) |
| `GET /api/v1/catalogs/fuel-types` | Lista tipos de combustible con precio promedio MXN |
| `GET /api/v1/catalogs/tag-systems` | Lista sistemas de telepeaje (IAVE, TAG_PASE, TELEVIA, etc.) |
| `GET /api/v1/catalogs/cargo-types` | Lista tipos de carga |
| `GET /api/v1/catalogs/operators` | Lista operadores de autopistas |

---

## Tolls

> Requiere `{{vehicleId}}` guardado. Si no tenés uno, creá primero un vehículo.

### POST /api/v1/tolls/calculate — Ruta principal: Carmen → Monterrey

```json
{
  "origin": {
    "lat": 18.612621,
    "lng": -91.860885,
    "address": "Ciudad del Carmen, Campeche"
  },
  "destination": {
    "lat": 25.686614,
    "lng": -100.316113,
    "address": "Monterrey, Nuevo León"
  },
  "vehicleId": "{{vehicleId}}",
  "departureTime": "2025-06-01T08:00:00.000Z",
  "preferredPaymentMethod": "CASH"
}
```

**Respuesta esperada (mock provider activo):**
- 2 rutas devueltas
- Ruta 0: ~921 km, ~9h03m, MXN 360 cash / MXN 288 tag, labels: `["FASTEST", "SHORTEST"]`
- Ruta 1: ~978 km, ~9h58m, MXN 215 cash / MXN 172 tag, labels: `["CHEAPEST"]`

**Otras rutas para probar:**

| Origen | Destino | Coordenadas origen | Coordenadas destino |
|--------|---------|-------------------|---------------------|
| CDMX → Guadalajara | Via cuota | `19.4326, -99.1332` | `20.6597, -103.3496` |
| CDMX → Veracruz | Via 150D | `19.4326, -99.1332` | `19.1738, -96.1342` |
| Monterrey → Saltillo | Via 40D | `25.6866, -100.3161` | `25.4232, -101.0053` |
| Guadalajara → Puerto Vallarta | Via 200D | `20.6597, -103.3496` | `20.6534, -105.2253` |

**Con telepeaje (pagar menos):**

```json
{
  "origin": { "lat": 18.612621, "lng": -91.860885 },
  "destination": { "lat": 25.686614, "lng": -100.316113 },
  "vehicleId": "{{vehicleId}}",
  "preferredPaymentMethod": "TAG"
}
```

**Sin departureTime (usa `now` por defecto):**

```json
{
  "origin": { "lat": 19.4326, "lng": -99.1332, "address": "CDMX" },
  "destination": { "lat": 25.6866, "lng": -100.3161, "address": "Monterrey" },
  "vehicleId": "{{vehicleId}}"
}
```

**Con waypoint intermedio:**

```json
{
  "origin": { "lat": 19.4326, "lng": -99.1332, "address": "CDMX" },
  "destination": { "lat": 25.6866, "lng": -100.3161, "address": "Monterrey" },
  "vehicleId": "{{vehicleId}}",
  "waypoints": [
    { "lat": 21.8853, "lng": -102.2916, "address": "Aguascalientes" }
  ]
}
```

**Casos de error:**

| Scenario | Qué cambiar | Esperado |
|----------|-------------|----------|
| vehicleId inexistente | `"vehicleId": "00000000-0000-0000-0000-000000000000"` | 404 Not Found |
| Coordenadas inválidas | `"origin": { "lat": 999, "lng": -99 }` | 400 Bad Request |
| Sin vehicleId | Omitir el campo | 400 Bad Request |

---

### POST /api/v1/tolls/compare-routes

```json
{
  "origin": {
    "lat": 18.612621,
    "lng": -91.860885,
    "address": "Ciudad del Carmen, Campeche"
  },
  "destination": {
    "lat": 25.686614,
    "lng": -100.316113,
    "address": "Monterrey, Nuevo León"
  },
  "vehicleId": "{{vehicleId}}",
  "departureTime": "2025-06-01T08:00:00.000Z",
  "preferredPaymentMethod": "CASH"
}
```

**Respuesta esperada:** Comparación entre ruta más rápida (Ruta 0, MXN 360) y más barata (Ruta 1, MXN 215), con recomendación explicada y diferencia en tiempo + costo.

---

### GET /api/v1/tolls/history

Query params:

| Param | Valor de prueba | Descripción |
|-------|----------------|-------------|
| `page` | `1` | Página (empieza en 1) |
| `limit` | `10` | Items por página (máx 50) |

Ejemplos:
- `?page=1&limit=10` — primera página
- `?page=2&limit=5` — segunda página con 5 items
- `?page=1&limit=50` — máximo permitido
- `?page=1&limit=200` — se trunca silenciosamente a 50

---

### GET /api/v1/tolls/history/:id

Usá `{{calculationId}}` guardado automáticamente después de calcular.

**Caso de error:**
- UUID inexistente: `GET /api/v1/tolls/history/00000000-0000-0000-0000-000000000000` → 404

---

## Booths

### GET /api/v1/booths

Query params:

| Param | Valor | Descripción |
|-------|-------|-------------|
| `page` | `1` | Página (default: 1) |
| `limit` | `10` | Items por página (default: 10) |

---

### GET /api/v1/booths/nearby

Query params para buscar casetas cerca de Ciudad del Carmen:

| Param | Valor | Descripción |
|-------|-------|-------------|
| `lat` | `18.612621` | Latitud |
| `lng` | `-91.860885` | Longitud |
| `radiusKm` | `50` | Radio en km (máx 100) |

**Otras coordenadas para probar:**

| Ciudad | lat | lng | Descripción |
|--------|-----|-----|-------------|
| CDMX (Periférico) | `19.3647` | `-99.1775` | Casetas del Periférico |
| Monterrey | `25.5456` | `-100.0063` | Caseta Monterrey Sur |
| Veracruz | `19.3647` | `-96.3627` | Caseta Cardel |
| Tampico | `22.2416` | `-97.8612` | Casetas de Tampico |

**Caso de error:**
- `radiusKm=200` → 400 Bad Request (máximo es 100)

---

### GET /api/v1/booths/:id

Reemplazá `:id` por el UUID de una caseta obtenida en el listado.

---

## POIs

### GET /api/v1/pois/nearby

Query params:

| Param | Valor | Descripción |
|-------|-------|-------------|
| `lat` | `19.432608` | Latitud |
| `lng` | `-99.133209` | Longitud |
| `radiusKm` | `5` | Radio (default 10, máx 50) |
| `type` | `GAS_STATION` | Opcional — filtrar por tipo |

**Valores válidos para `type`:**

| Valor | Descripción |
|-------|-------------|
| `GAS_STATION` | Gasolineras |
| `REST_AREA` | Áreas de descanso |
| `RESTAURANT` | Restaurantes |
| `HOTEL` | Hoteles |
| `EV_CHARGING` | Cargadores eléctricos |

**Ejemplos de búsqueda:**

```
# Gasolineras en 5km alrededor de CDMX centro
GET /api/v1/pois/nearby?lat=19.432608&lng=-99.133209&radiusKm=5&type=GAS_STATION

# Todos los POIs en 10km (sin filtro de tipo)
GET /api/v1/pois/nearby?lat=19.432608&lng=-99.133209&radiusKm=10

# Hoteles en Monterrey
GET /api/v1/pois/nearby?lat=25.6866&lng=-100.3161&radiusKm=15&type=HOTEL
```

**Casos de error:**

| Scenario | Query | Esperado |
|----------|-------|----------|
| Radio muy grande | `radiusKm=100` | 400 (máx 50) |
| Tipo inválido | `type=FARMACIA` | 400 Bad Request |
| Sin lat/lng | Solo `radiusKm=5` | 400 Bad Request |

---

### GET /api/v1/pois/along-route

Query params:

| Param | Valor | Descripción |
|-------|-------|-------------|
| `polylines` | `(encoded polyline)` | Polyline(s) codificada(s) separadas por coma |
| `corridorMeters` | `500` | Ancho del corredor en metros (default 500, máx 2000) |
| `type` | `GAS_STATION` | Opcional |

> **Nota:** El valor de `polylines` se obtiene de la respuesta del endpoint `/tolls/calculate` — cada ruta devuelve un campo `polyline` codificado en formato Google Encoded Polyline. Copialo de ahí.

---

## Flujo completo de prueba recomendado

```
1. POST /auth/register          → guarda accessToken + refreshToken
2. POST /vehicles               → guarda vehicleId
3. GET  /catalogs/vehicle-types → verificar que hay datos seed
4. GET  /catalogs/fuel-types    → verificar que hay datos seed
5. POST /tolls/calculate        → guarda calculationId (usa mock: respuesta en ~500ms)
6. GET  /tolls/history          → ver historial paginado
7. GET  /tolls/history/:id      → ver detalle completo con rutas y casetas
8. POST /tolls/compare-routes   → comparar rutas (reutiliza caché del cálculo anterior)
9. GET  /booths/nearby          → casetas cerca de Carmen (lat=18.61, lng=-91.86, radiusKm=50)
10. GET /pois/nearby            → POIs cercanos (requiere seed data en DB)
11. POST /auth/refresh          → renovar token
12. POST /auth/logout           → revocar refresh token
```

---

## Notas sobre el entorno local

```env
# Variables requeridas en .env para levantar el proyecto
NODE_ENV=local
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=postgres
DB_NAME=api_peajes

# Proveedor de peajes (MOCK no requiere API key)
TOLL_PROVIDER=MOCK

# JWT
JWT_SECRET=dev-secret-key-cambiar-en-produccion
JWT_ACCESS_TTL=900
JWT_REFRESH_TTL=2592000
```

> Con `TOLL_PROVIDER=MOCK` todos los cálculos de peaje responden en ~500ms con datos hardcodeados de la ruta Carmen→Monterrey. Para usar TollGuru real: `TOLL_PROVIDER=TOLLGURU` + `TOLLGURU_API_KEY=tu_api_key`.
