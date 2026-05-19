# Performance

> Dónde va a chocar esta API y qué hacer antes de que llegue.

---

## Cuellos de botella conocidos

### 1. Cálculo de peajes — profundidad de JOIN en BD

`toll_calculations → toll_calculation_routes → toll_events` es un JOIN de 3 niveles. A escala (miles de cálculos por usuario), `GET /tolls/calculations` se convierte en un full table scan lento.

**Solución:**
- Agregar índice en `toll_calculations(user_id, created_at DESC)`
- Usar paginación cursor-based (no `OFFSET`) — la paginación por offset escanea todas las filas anteriores
- Considerar una tabla desnormalizada `toll_calculation_summaries` para vistas de lista

---

### 2. Queries PostGIS sin índice espacial

`ST_DWithin` en `toll_booths.location` y `pois.location` es rápido solo si hay un índice GIST:

```sql
CREATE INDEX idx_toll_booths_location ON toll_booths USING GIST (location);
CREATE INDEX idx_pois_location ON pois USING GIST (location);
```

Sin estos índices, cada búsqueda cercana es un full table scan. Verificar que existan en `001_init.sql`.

---

### 3. Llamada HTTP a TollGuru — timeout de 30s por request

El cliente de TollGuru tiene timeout de 30s y 3 reintentos. En el peor caso, un cálculo de peaje bloquea un hilo durante 90 segundos.

**Solución:**
- Agregar un circuit breaker (ej: librería `cockatiel`) — después de N fallos en una ventana, fallar rápido y retornar 503 con `Retry-After`
- Mover las llamadas a TollGuru a un job de background (BullMQ) — aceptar el request de cálculo, retornar `202 Accepted` con un `calculationId`, y dejar que el cliente haga polling o use un webhook

---

### 4. Sin configuración del pool de conexiones

El pool de conexiones por defecto de TypeORM es de 10 conexiones. Bajo carga, esto se agota rápido.

Agregar a `TypeOrmModule.forRoot()`:
```ts
extra: {
  max: 20,                    // máximo de conexiones
  min: 2,                     // mantener siempre 2 activas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}
```

Monitorear `pg_stat_activity` para ajustar este número.

---

### 5. Endpoints de catálogo — sin caché

`GET /catalogs/vehicle-types` retorna datos estáticos que nunca cambian sin un cambio de código + migración. Sin embargo, golpea la BD en cada request.

**Solución:** cachear respuestas de catálogos en memoria (`CacheModule` de NestJS con `store: 'memory'`) durante 1 hora. Cuando se agregue Redis, moverlo ahí.

```ts
@CacheKey('catalog:vehicle-types')
@CacheTTL(3600)
@Get('vehicle-types')
```

---

## Reglas de higiene de queries

1. **Toda FK debe tener un índice.** TypeORM no los agrega automáticamente en modo raw.
2. **SELECT solo lo que necesitás.** No usar `SELECT *` en queries de producción — desperdicia ancho de banda de red y memoria.
3. **LIMIT en todas las queries de lista.** Nunca retornar resultados sin límite. Tamaño de página por defecto: 20, máximo: 100.
4. **Usar `EXPLAIN ANALYZE`** en cualquier query que tarde más de 100ms. Correrlo localmente con volumen de datos realista.

---

## Cuándo agregar Redis

No necesitás Redis hoy. Agregarlo cuando pase alguno de estos:
- Desplegás más de una instancia de la app (el throttler necesita estado compartido)
- Los costos de TollGuru aparecen en la factura (cachear resultados de cálculos)
- Auth se convierte en un cuello de botella (mover el almacenamiento de refresh tokens a Redis sets)

---

## Load testing

Antes de salir a producción, correr un test de carga básico con `k6`:

```js
// k6/toll-calculate.js
export default function() {
  const res = http.post('/api/v1/tolls/calculate', JSON.stringify({
    vehicleId: '...',
    origin: { lat: 18.6813, lng: -91.7973 },
    destination: { lat: 25.6714, lng: -100.3094 }
  }), { headers: { Authorization: `Bearer ${token}` } });

  check(res, { 'status es 200': (r) => r.status === 200 });
}
```

Baseline objetivo: 50 usuarios concurrentes, p95 < 500ms (cacheado), p95 < 5s (TollGuru).
