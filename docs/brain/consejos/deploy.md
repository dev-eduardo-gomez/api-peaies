# Deploy

> De Docker Compose a producción. Un camino por etapas que no requiere reescribir la app.

---

## Estado actual

El proyecto tiene un `docker-compose.yml` con PostgreSQL + PostGIS. La app corre localmente con `npm run start:dev`. No hay CI/CD, no hay Dockerfile para la app en sí, no hay entorno de staging.

---

## Etapa 1 — Containerizar la app

Agregar un `Dockerfile` en la raíz del proyecto:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["node", "dist/main"]
```

Actualizar `docker-compose.yml` para también correr la app:

```yaml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://user:pass@postgres:5432/peajes
      JWT_ACCESS_SECRET: ...
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgis/postgis:16-3.4
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      retries: 5
```

---

## Etapa 2 — CI/CD con GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:cov
      - run: npm run build
```

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy a staging
on:
  push:
    branches: [dev]
jobs:
  deploy:
    steps:
      - build imagen Docker
      - push a registry (ECR / Docker Hub / GHCR)
      - deploy a staging (ECS / Cloud Run / Railway)
```

---

## Etapa 3 — Opciones de hosting gestionado

### Opción A: Railway (más fácil, recomendado para etapa temprana)

- Conectar el repo de GitHub, Railway detecta el Dockerfile
- Agregar plugin de PostgreSQL (gestionado, PostGIS disponible)
- Setear env vars en el dashboard
- Deploys automáticos al hacer push a `main`
- Costo: ~$5/mes para un proyecto starter

### Opción B: AWS (nivel producción)

Arquitectura:
```
Internet → ALB (HTTPS) → ECS Fargate (app) → RDS PostgreSQL (PostGIS)
                                            → ElastiCache Redis (futuro)
```

Servicios necesarios:
- **ECS Fargate** — ejecuta el contenedor de la app, auto-scaling
- **ECR** — registro de imágenes Docker
- **RDS PostgreSQL** con extensión PostGIS
- **ALB** — terminación HTTPS, health checks
- **Secrets Manager** — env vars (nunca en plaintext en la task definition)

IaC: usar Terraform. Nunca hacer click en la consola de AWS para recursos de producción.

### Opción C: Google Cloud Run (simple, pago por request)

- Push a Artifact Registry, deploy a Cloud Run
- Escala a cero — sin costo en idle
- Cloud SQL para PostgreSQL + PostGIS
- Bueno para APIs de bajo tráfico

---

## Estrategia de migraciones para deploys

Agregar un paso de migración en CI/CD antes de que arranque la app:

```bash
# Antes de deployar el nuevo contenedor:
1. Correr migraciones SQL contra la BD
2. Verificar que la BD está sana
3. Deployar la nueva versión de la app
4. Health check pasa → rutear tráfico
5. Health check falla → rollback (mantener el contenedor viejo corriendo)
```

Nunca correr `synchronize: true` de TypeORM en ningún entorno que tenga datos.

---

## Checklist por entorno

| Config | Desarrollo | Staging | Producción |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| Swagger UI | ✅ habilitado | ✅ habilitado | ❌ deshabilitado o con auth |
| Sentry | opcional | ✅ | ✅ |
| CORS | `*` | whitelist dominio staging | whitelist dominio prod |
| Rate limits | relajados | valores de producción | valores de producción |
| BD | Docker local | gestionada, schema separado | gestionada, instancia separada |
| Migraciones | manual | CI/CD | CI/CD con aprobación |

---

## Plan de rollback

- **Rollback de app:** ECS / Cloud Run conserva la task definition anterior — redesployar el tag de imagen anterior
- **Rollback de BD:** las migraciones tienen comentarios `-- ROLLBACK:`. Para cambios destructivos (DROP TABLE, DROP COLUMN), siempre tener un script de restore probado antes del deploy

La estrategia de migración más segura para `ALTER TABLE` en tablas grandes: agregar la columna como nullable, hacer backfill por lotes, luego agregar la restricción NOT NULL como un paso separado.
