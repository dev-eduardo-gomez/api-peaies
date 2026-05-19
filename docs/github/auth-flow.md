# Flujo de autenticación

## Registro

```
POST /api/v1/auth/register
  { email, password, fullName }

1. Verificar unicidad del email → 409 si ya existe
2. Hashear contraseña (bcryptjs, 10 rounds)
3. INSERT usuario + ASSIGN rol ROLE_USER
4. Generar access token (15min) + refresh token (7d)
5. Almacenar refresh token como hash SHA-256 en BD
6. Retornar AuthResponseDto
```

## Login

```
POST /api/v1/auth/login
  { email, password }

1. Buscar usuario por email → 401 si no existe
2. Verificar si la cuenta está bloqueada → 401 si true
3. Comparar contraseña con hash
4. En fallo: incrementar failed_login_attempts → bloquear al llegar a 5
5. En éxito: resetear failed_login_attempts, actualizar last_login_at
6. Generar y retornar tokens
```

## Renovar token (refresh)

```
POST /api/v1/auth/refresh
  { refreshToken }

1. Calcular hash SHA-256 del token recibido
2. Buscar por hash en BD → 401 si no existe
3. Verificar flag revoked → 401 si revocado
4. Verificar expiración → 401 si expirado
5. Marcar token viejo como revocado (rotación)
6. Generar nuevos access + refresh tokens
7. Almacenar nuevo hash
8. Retornar nuevos tokens
```

## Logout

```
POST /api/v1/auth/logout
  { refreshToken }

1. Calcular hash SHA-256 del token
2. Buscar por hash → no hacer nada si no existe (idempotente)
3. Marcar como revocado
4. Retornar 200
```

## Payload del JWT

```json
{
  "sub": "uuid",
  "roles": ["ROLE_USER"],
  "iat": 1234567890,
  "exp": 1234568790
}
```

Sin datos sensibles en el payload. El `sub` es un UUID, no un email ni nombre de usuario.

## Guards

**JwtAuthGuard** está registrado como `APP_GUARD` global. Por defecto todos los endpoints están protegidos. Los endpoints públicos se marcan con `@Public()`:

```ts
@Public()
@Post('login')
login(@Body() dto: LoginRequestDto) { ... }
```

**RolesGuard** es un segundo guard global. Los endpoints de administración usan:

```ts
@Roles('ROLE_ADMIN')
@Get('recurso-admin')
soloAdmin() { ... }
```

## Notas de seguridad

- Los refresh tokens **nunca se almacenan en texto plano** — solo su hash SHA-256.
- La rotación de tokens impide la reutilización del refresh token.
- El bloqueo de cuenta tras 5 intentos fallidos previene ataques de fuerza bruta.
- Todos los endpoints de auth son `@Public()` (exentos del guard JWT) pero están cubiertos por el rate limiting global (`@nestjs/throttler`).
