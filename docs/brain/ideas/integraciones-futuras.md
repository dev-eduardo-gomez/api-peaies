# Integraciones futuras

> Servicios externos que vale la pena integrar. Cada entrada tiene una señal de "cuándo agregar" — no agregar antes de que aparezca la señal.

---

## Redis

**Casos de uso:**
- Blacklist de refresh tokens (hoy en PostgreSQL — funciona, pero cada refresh es una escritura + lectura a la BD)
- Almacenamiento del rate limiting (reemplazar el throttler en memoria con Redis para deploys multi-instancia)
- Caché de primer nivel para cálculos de peaje (antes de ir a la BD)

**Cuándo agregar:** cuando deples más de una instancia de la API, o cuando los costos de TollGuru se vuelvan significativos.

**Integración NestJS:** `@nestjs/cache-manager` + `cache-manager-redis-yet`

---

## API de TollGuru

**Estado:** el adaptador existe (`tollguru-provider.adapter.ts`), el puerto está definido. El mock está activo.

**Qué se necesita para salir a producción:**
1. `TOLLGURU_API_KEY` en `.env`
2. Cambiar el binding del proveedor en `routing.module.ts` del mock al adaptador de TollGuru
3. Agregar circuit breaker (el adaptador tiene reintento 3x, pero no tiene circuit breaker)
4. Monitorear costos de la API — TollGuru cobra por request

**Cuándo agregar:** cuando tengas usuarios reales que necesiten rutas reales más allá de Carmen→Monterrey.

---

## Servicio de email

**Casos de uso:**
- Email de bienvenida al registrarse
- Reseteo de contraseña (todavía no implementado)
- Notificación de cuenta bloqueada
- Alerta de cambio de tarifa de peaje (para usuarios suscritos)

**Opciones:**
- AWS SES — más barato a escala, requiere verificación de dominio
- Resend.com — API moderna, tier gratuito generoso, excelente DX
- SendGrid — el más ampliamente soportado

**Puerto a definir:**
```ts
// domain/ports/out/email-service.port.ts
abstract class EmailServicePort {
  abstract sendWelcome(to: string, name: string): Promise<void>;
  abstract sendPasswordReset(to: string, token: string): Promise<void>;
}
```

**Cuándo agregar:** cuando agregues reseteo de contraseña o cualquier notificación al usuario.

---

## API del Banco de México (tipo de cambio)

**Caso de uso:** stub de `CurrencyConverterPort` — convertir costos de peaje de MXN a USD.

**API:** `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/oportuno`

Gratuita, oficial, sin API key. Retorna el tipo de cambio MXN/USD actual.

**Cuándo agregar:** cuando tengas usuarios internacionales o clientes B2B que reportan en USD.

---

## Google Maps / OpenRouteService (polylines de ruta)

**Caso de uso:** en lugar de que TollGuru provea la polyline, podrías obtener la ruta desde una API de mapas primero y luego calcular los peajes en esa polyline.

Esto te da:
- Mejores opciones de ruta (panorámica, evitar autopistas, etc.)
- Direcciones giro a giro reales
- ETA por punto intermedio

**Punto de integración:** `TollProviderPort` ya recibe origen/destino — podrías pre-obtener la polyline y pasársela al endpoint de polyline de TollGuru.

**Cuándo agregar:** cuando la UX requiera giro a giro o necesites rutas que TollGuru no soporta.

---

## Notificaciones push (Firebase Cloud Messaging)

**Casos de uso:**
- "Tu ruta ahora tiene una opción más barata" (bajó una tarifa)
- "Tráfico en tu ruta guardada" (feature de tiempo real futuro)

**Punto de integración:** agregar tabla `devices` (user_id, fcm_token), conectar a un `NotificationServicePort`.

**Cuándo agregar:** cuando tengas una app móvil consumiendo la API.

---

## Sistema de entrega de webhooks

**Caso de uso:** los operadores de flotas B2B quieren recibir eventos (cálculo completo, cambio de tarifa) en sus propios sistemas.

**Implementación:**
- Tabla `webhooks`: `id, tenant_id, url, secret, events[]`
- Al emitir evento de dominio: encolar HTTP POST a las URLs registradas
- Usar cola de jobs (BullMQ + Redis) para confiabilidad y reintentos

**Cuándo agregar:** cuando el primer cliente B2B lo pida.

---

## OpenTelemetry (trazas distribuidas)

**Observabilidad actual:** Sentry para errores, logging en consola para requests.

**Qué falta:** trazas distribuidas — saber no solo que un request falló, sino exactamente qué query de BD, qué llamada externa, y cuánto tardó cada paso.

`@opentelemetry/sdk-node` + Jaeger o Grafana Tempo puede darte trazas completas del request sin cambios en el código de tus servicios.

**Cuándo agregar:** cuando integres llamadas a TollGuru y necesites diagnosticar latencia.
