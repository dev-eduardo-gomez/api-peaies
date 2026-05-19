# Features pendientes

> Cosas que el proyecto necesita pero todavía no tiene. Ordenadas por impacto.

---

## 1. Pipeline CI/CD

**Impacto: crítico**

No hay ningún workflow de GitHub Actions. Hoy nada impide que un PR roto llegue a `dev`.

Pipeline mínimo:
```yaml
# .github/workflows/ci.yml
jobs:
  ci:
    steps:
      - npm ci
      - npm run lint
      - npx tsc --noEmit
      - npm run test:cov
      - npm run build
```

Agregar después: `npm audit`, build de Docker, deploy a staging en merge a `dev`.

---

## 2. Validación de variables de entorno al arrancar

**Impacto: alto**

`process.env` se lee directamente en varios lugares sin validación. Si `JWT_ACCESS_SECRET` no está, la app arranca pero falla silenciosamente cuando alguien intenta loguearse.

Solución: usar `@nestjs/config` + un esquema Joi o `class-validator` validado en `AppModule`. El servidor **debe negarse a arrancar** si falta una variable crítica.

```ts
// config/env.validation.ts
export const envValidationSchema = Joi.object({
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  ...
});
```

---

## 3. Soft delete para vehículos

**Impacto: medio**

Hoy `DELETE /vehicles/:id` hace un hard delete. Si un vehículo tiene historial de cálculos, la FK rompe o hace cascada de formas inesperadas.

Agregar `deleted_at TIMESTAMPTZ` a `vehicles` y filtrar `WHERE deleted_at IS NULL` en todas las queries.

---

## 4. Paginación para el historial de cálculos

**Impacto: medio**

`GET /tolls/calculations` va a crecer sin límite. Necesita paginación cursor-based u offset desde el día uno.

Recomendación: **cursor-based** (usando `created_at` + `id`) — es estable bajo inserts concurrentes, a diferencia de offset que puede saltear o duplicar filas.

---

## 5. Rate limiting por endpoint

**Impacto: medio**

`@nestjs/throttler` está instalado pero probablemente aplicado globalmente con una sola regla. Los endpoints de auth (especialmente `/login`) necesitan límites agresivos (ej: 5 req/min por IP). Los endpoints de cálculo pueden ser más permisivos (20/min por usuario).

Usar el decorador `@Throttle()` por controlador o ruta para sobreescribir el default global.

---

## 6. Webhook / evento al cambiar una tarifa de peaje

**Impacto: medio — futuro**

Cuando se actualiza `toll_booth_rates` (las tarifas cambian estacionalmente en México), los clientes con datos cacheados quedan desactualizados. Un webhook o endpoint de polling (`GET /booths/:id/rates?updatedSince=`) permitiría a los clientes mantenerse sincronizados sin hacer scraping.

---

## 7. Soporte de flotas / multi-tenancy

**Impacto: alto — futuro**

Si los operadores de flotas B2B se convierten en el segmento objetivo, el modelo de propiedad actual por `user_id` necesita una capa de `tenant_id` (u `organization_id`). Toda query que filtra por `user_id` también filtraría por `tenant_id`.

Este es un cambio grande de esquema — el momento correcto de planificarlo es **antes** de tener datos en producción.

---

## 8. Conversión de moneda (MXN → USD)

**Impacto: bajo ahora, alto después**

`CurrencyConverterPort` existe en el dominio pero no tiene implementación real. El stub siempre retorna el monto en MXN tal cual.

Proveedores candidatos: Open Exchange Rates, Fixer.io, API del Banco de México (gratuita, oficial).

---

## 9. Endpoints de health check

**Impacto: medio**

NestJS tiene `@nestjs/terminus` para health checks estructurados. Necesarios para:
- `healthcheck` de Docker Compose
- Probes de liveness / readiness de Kubernetes
- Monitoreo de uptime

Mínimo: `GET /health` → verifica conexión a BD. Mejor: `/health/live` (proceso vivo) y `/health/ready` (BD + deps externas alcanzables).

---

## 10. Persistencia de autorización en Swagger

**Impacto: bajo — experiencia de desarrollo**

La UI de Swagger olvida el Bearer token al recargar la página. Solución: agregar `persistAuthorization: true` al setup de Swagger en `swagger.config.ts`.

```ts
SwaggerModule.setup('api/docs', app, document, {
  swaggerOptions: { persistAuthorization: true },
});
```
