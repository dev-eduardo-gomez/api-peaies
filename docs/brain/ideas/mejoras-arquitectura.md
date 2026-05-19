# Mejoras de arquitectura

> Mejoras que vale la pena hacer antes de que el proyecto crezca demasiado como para refactorizar sin dolor.

---

## 1. Eventos de dominio para comunicación entre módulos

**Estado actual:** los módulos se llaman directamente entre sí cuando necesitan coordinarse (ej: routing llama a vehicles). Esto crea acoplamiento.

**Mejor:** emitir eventos de dominio después de cambios de estado significativos y dejar que otros módulos reaccionen:

```
TollCalculatedEvent  → AuditModule lo registra
UserRegisteredEvent  → Enviar email de bienvenida (futuro EmailModule)
RateUpdatedEvent     → Invalidar caché, notificar suscriptores
```

NestJS tiene `EventEmitter2` para eventos en proceso. Para sistemas distribuidos, reemplazar con SQS/Kafka — pero el dominio no cambia.

**Por qué importa:** cuando agregues el próximo módulo (notificaciones, gestión de flotas), no vas a tener que tocar el módulo de routing para conectarlo.

---

## 2. Capa de caché para cálculos de peaje

**Estado actual:** el cacheo por hash del request existe en la BD (columna `request_hash`). Funciona, pero es un hit a la BD en cada request para verificar el caché.

**Mejor:** agregar Redis como caché de primer nivel:

```
Request → Redis (hit? retornar) → BD (hit? retornar, escribir en Redis) → Proveedor
```

Clave de caché: `toll:calc:{hash}`
TTL: 24h (las tarifas cambian poco, pero no nunca)

**Cuándo agregar:** cuando cambies a TollGuru y empieces a pagar por llamada a la API.

---

## 3. Modelos de lectura separados para queries pesadas

**Estado actual:** `findAllByUserId` y el historial de cálculos usan las mismas queries que las escrituras. A medida que crecen los datos (miles de cálculos por usuario), los JOINs en `toll_calculations → routes → events` se vuelven lentos.

**Considerar:** queries de lectura dedicadas con vistas materializadas o tablas desnormalizadas de resumen:
- `toll_calculation_summaries` — totales pre-agregados por cálculo
- Actualizadas por un trigger o job de background al guardar un cálculo

Este es el comienzo de CQRS — no necesario hoy, pero vale saber que existe como salida de emergencia.

---

## 4. Errores tipados en el dominio

**Estado actual:** las excepciones de dominio extienden excepciones HTTP de NestJS (`UnauthorizedException`, `ConflictException`). Esto acopla el dominio a semántica HTTP.

**Mejor:** definir errores de dominio puros que no saben nada de HTTP:

```ts
// domain/exceptions/invalid-credentials.exception.ts
export class InvalidCredentialsException extends Error {
  constructor() { super('Invalid credentials'); }
}
```

Y luego mapearlos a HTTP en el filtro global de excepciones:

```ts
if (err instanceof InvalidCredentialsException) {
  return res.status(401).json({ ... });
}
```

**Por qué importa:** si alguna vez agregás transporte gRPC o WebSocket, las excepciones de dominio no cambian — solo cambia el adaptador de transporte.

---

## 5. Runner de migraciones

**Estado actual:** las migraciones son archivos `.sql` que se aplican manualmente. No hay runner automatizado.

**Opciones:**
- `node-pg-migrate` — simple, no requiere ORM
- Runner de migraciones propio de TypeORM — ya instalado, pero necesita migraciones en `.ts`
- Flyway o Liquibase — si vas hacia tooling Java-adjacent

Recomendación: agregar un script `migrate:up` en npm que ejecute `node-pg-migrate up` en CI/CD antes de cada deploy. Esto elimina "¿corrimos la migración?" de los checklists de deploy.

---

## 6. Propagación de Request ID

**Estado actual:** los logs del interceptor no incluyen un ID de correlación del request.

**Agregar:**
1. Generar `X-Request-Id` (UUID) en el interceptor de logging si no viene en los headers
2. Adjuntarlo al contexto `AsyncLocalStorage` de NestJS
3. Incluirlo en cada línea de log y en el contexto de Sentry

Esto hace posible el debugging distribuido — podés trazar un request único a través de todos sus logs.

---

## 7. Capa de mappers separada entre filas de BD y modelos de dominio

**Estado actual:** los adaptadores tienen lógica de mapeo inline (métodos `toDomain()` dentro de la clase del adaptador).

**Mejor:** extraer a archivos de mapper dedicados:

```
infrastructure/mappers/
  auth-user.mapper.ts        → fila BD → modelo de dominio AuthUser
  vehicle.mapper.ts          → fila BD → modelo de dominio Vehicle
  toll-calculation.mapper.ts
```

**Por qué:** cuando el esquema de BD cambia (agregar columna, renombrar campo), solo tocás el mapper — no la lógica del adaptador. Responsabilidad única.
