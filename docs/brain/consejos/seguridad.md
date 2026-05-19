# Seguridad

> Agujeros a cerrar antes de ir a producción. Ordenados por severidad.

---

## Crítico

### 1. Validación de variables de entorno al arrancar

Si `JWT_ACCESS_SECRET` está vacío o no existe, la app arranca y genera tokens con un secret vacío. Cualquier atacante puede forjar tokens.

**Solución:** validar todas las env vars requeridas al arrancar y crashear con un error claro si alguna falta. Ver [[ideas/features-pendientes]] ítem 2.

### 2. HTTPS no forzado

La app escucha en HTTP plano. En producción, esto significa que los tokens viajan en texto claro.

**Solución:**
- Terminar TLS en el load balancer / reverse proxy (nginx, AWS ALB, Cloudflare)
- Agregar header `HSTS` via Helmet: `Strict-Transport-Security: max-age=31536000`
- Redirigir HTTP a HTTPS a nivel del ingress

### 3. Sin integración de `helmet`

Headers como `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy` protegen contra XSS y clickjacking.

**Solución:**
```ts
// main.ts
import helmet from 'helmet';
app.use(helmet());
```

---

## Alto

### 4. CORS demasiado permisivo en desarrollo

El origen `*` en desarrollo está bien. En producción, CORS debe tener una whitelist explícita.

```ts
app.enableCors({
  origin: process.env.CORS_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
});
```

### 5. Brecha en la rotación del refresh token

Rotación actual: revocar el viejo → emitir el nuevo. Hay una pequeña ventana entre estas dos operaciones donde un atacante que robó el token viejo podría usarlo antes de que se revoque.

**Solución:** usar una transacción de BD que revoque el viejo e inserte el nuevo de forma atómica:

```ts
await this.em.transaction(async (tx) => {
  await tx.query(REVOKE_TOKEN, [tokenHash]);
  await tx.query(INSERT_REFRESH, [newHash, ...]);
});
```

### 6. Sin rate limiting en el registro

`/auth/register` no tiene throttle. Un atacante puede crear miles de cuentas falsas, llenando la tabla `users` y potencialmente usando enumeración de emails.

**Solución:** aplicar un throttle estricto a `/auth/register`:
```ts
@Throttle({ default: { limit: 3, ttl: 60000 } })
@Post('register')
```

### 7. Enumeración de emails via endpoint de registro

`POST /auth/register` con un email existente retorna `409 Conflict`. Esto le dice a un atacante qué emails están registrados.

**Opciones:**
- Retornar un `200 OK` genérico con "si este email es nuevo, recibirás una confirmación" (y enviar un email en cambio)
- Aceptar el tradeoff si la privacidad del email no es un requisito

### 8. Secrets en `.env` sin validación de fortaleza

`JWT_ACCESS_SECRET` puede setearse como `"secret"` y la app lo acepta.

**Solución:** validar entropía mínima en el esquema de env:
```ts
JWT_ACCESS_SECRET: Joi.string().min(32).required(),
```

---

## Medio

### 9. SQL injection via queries raw

SQL raw con `em.query(SQL, [params])` es seguro cuando los parámetros se pasan como segundo argumento (queries parametrizadas). **No es seguro** si alguna vez interpolás valores en el string SQL:

```ts
// SEGURO
await em.query(FIND_USER_BY_EMAIL, [email]);

// PELIGROSO — nunca hacer esto
await em.query(`SELECT * FROM users WHERE email = '${email}'`);
```

Auditar cada query en los archivos `*.queries.ts` para confirmar que no hay interpolación de strings.

### 10. Agujeros en el registro de auditoría

`audit_events` registra login y cálculo de peajes. Falta:
- `VEHICLE_CREATED`, `VEHICLE_DELETED`
- `TOKEN_REFRESHED`, `TOKEN_REVOKED`
- `ACCOUNT_LOCKED` (después de 5 logins fallidos)

Son esenciales para respuesta a incidentes — sin ellos, no podés reconstruir qué pasó cuando un usuario reporta actividad sospechosa.

### 11. Sin reseteo de contraseña

No hay `/auth/forgot-password` ni `/auth/reset-password`. Los usuarios que olvidan su contraseña no tienen forma de recuperarla.

Es una brecha significativa de UX que puede confundirse con un problema de seguridad ("mi cuenta fue comprometida").

---

## Checklist pre-lanzamiento

- [ ] Helmet habilitado
- [ ] Whitelist de CORS configurada para producción
- [ ] HTTPS forzado a nivel del ingress
- [ ] Todas las env vars validadas al arrancar
- [ ] Rate limits en todos los endpoints de auth
- [ ] Sin interpolación de strings SQL en ningún lado
- [ ] Entorno de Sentry seteado a `production` (no `development`)
- [ ] `npm audit` — sin vulnerabilidades altas/críticas
- [ ] `.env` no en git (verificar `.gitignore`)
- [ ] BD no accesible públicamente (detrás de VPC/subred privada)
