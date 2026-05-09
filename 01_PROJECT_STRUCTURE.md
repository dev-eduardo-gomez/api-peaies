# Toll API — Estructura del Proyecto

> **Stack:** NestJS 10 · TypeScript 5 · PostgreSQL 16 + PostGIS · TypeORM (solo EntityManager.query()) · Passport JWT · Swagger · Bruno · Sentry
>
> **Enfoque de base de datos:** TypeORM administra la conexión y el pool. Todas las queries SQL se escriben a mano con `entityManager.query()`. No se usan entities `.entity.ts`, ni `Repository<>`, ni `QueryBuilder`. Las tablas se crean con migraciones SQL puras.

---

## ¿Por qué EntityManager.query() y no el ORM completo?

TypeORM tiene dos modos: el modo ORM (decoradores `@Entity`, `@Column`, métodos `find()`, `save()`) y el modo raw (`entityManager.query('SELECT ...')`). Este proyecto usa **solo el modo raw** porque:

- **Control total:** tú escribes cada query, sabes exactamente qué SQL se ejecuta.
- **PostGIS nativo:** queries con `ST_DWithin()`, `ST_MakePoint()`, `json_agg()` que son imposibles o muy forzadas con el ORM.
- **Sin magia:** no hay lazy loading oculto, no hay N+1 queries accidentales, no hay `synchronize: true` que borre tu base de datos.
- **Aprendizaje:** dominar SQL te sirve en cualquier lenguaje y framework.
- **TypeORM te da gratis:** el pool de conexiones, `@InjectEntityManager()` para inyección de dependencias, y `em.transaction()` para transacciones limpias (BEGIN/COMMIT/ROLLBACK automático).

---

## Estructura de archivos

```text
toll-api/
│
├── src/
│   ├── main.ts                                           # Bootstrap: Sentry.init() + Swagger + ValidationPipe + CORS
│   ├── app.module.ts                                     # Módulo raíz: TypeORM (entities:[], synchronize:false), guards globales, filters, interceptors
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  SHARED — Código transversal (config, seguridad, utils)
│   │ ════════════════════════════════════════════════════
│   │
│   ├── shared/
│   │   ├── config/
│   │   │   ├── swagger.config.ts                         # DocumentBuilder + SwaggerModule.setup('/docs')
│   │   │   │                                             #   - Tags: Auth, Vehicles, Tolls, Booths, POIs, Catalogs
│   │   │   │                                             #   - BearerAuth para probar endpoints protegidos
│   │   │   │                                             #   - persistAuthorization: recuerda el token entre recargas
│   │   │   │
│   │   │   └── sentry.config.ts                          # SentryConfigModule (placeholder para cuando agregues @sentry/nestjs/setup)
│   │   │
│   │   ├── exceptions/
│   │   │   └── global-exception.filter.ts                # @Catch() que atrapa TODAS las excepciones:
│   │   │                                                 #   - HttpException → extrae status + message
│   │   │                                                 #   - class-validator errors → array de validationErrors
│   │   │                                                 #   - 5xx → Sentry.captureException() + log.error
│   │   │                                                 #   - 4xx → solo log.warn (no es bug, es uso normal)
│   │   │                                                 #   - Response: { timestamp, status, error, message, path, validationErrors? }
│   │   │
│   │   ├── interceptors/
│   │   │   ├── sentry.interceptor.ts                     # APP_INTERCEPTOR global:
│   │   │   │                                             #   - Agrega tags: http.method, http.url, userId
│   │   │   │                                             #   - Agrega breadcrumb por cada request
│   │   │   │                                             #   - Captura excepciones en el pipe de RxJS
│   │   │   │
│   │   │   └── logging.interceptor.ts                    # APP_INTERCEPTOR global:
│   │   │                                                 #   - Loguea: "POST /api/v1/auth/login → 200 (45ms)"
│   │   │                                                 #   - Útil en desarrollo, se puede desactivar en prod
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts                         # APP_GUARD global — extends AuthGuard('jwt'):
│   │   │   │                                             #   - Verifica JWT en TODOS los endpoints
│   │   │   │                                             #   - EXCEPTO los marcados con @Public()
│   │   │   │                                             #   - Si no hay token o es inválido → 401 Unauthorized
│   │   │   │
│   │   │   └── roles.guard.ts                            # APP_GUARD global — lee @Roles('ROLE_ADMIN'):
│   │   │                                                 #   - Si el endpoint tiene @Roles(), verifica que request.user.roles lo incluya
│   │   │                                                 #   - Si no tiene @Roles(), deja pasar (ya validó JWT)
│   │   │                                                 #   - Si no tiene el rol → 403 Forbidden
│   │   │
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts                       # @Public() → SetMetadata('isPublic', true)
│   │   │   │                                             #   Uso: @Public() en endpoints de auth (register, login, refresh)
│   │   │   │
│   │   │   ├── roles.decorator.ts                        # @Roles('ROLE_ADMIN') → SetMetadata('roles', [...])
│   │   │   │                                             #   Uso: @Roles('ROLE_ADMIN') en endpoints de administración
│   │   │   │
│   │   │   └── current-user.decorator.ts                 # @CurrentUser() → extrae request.user del JWT
│   │   │                                                 #   Retorna: { userId: string, roles: string[] }
│   │   │                                                 #   Uso: calculate(@CurrentUser() user, @Body() dto)
│   │   │
│   │   └── util/
│   │       ├── hash.util.ts                              # sha256(input) → string hex
│   │       │                                             #   Se usa para: hashear refresh tokens, generar cache keys
│   │       │                                             #   Usa crypto nativo de Node.js (sin npm install)
│   │       │
│   │       ├── money.util.ts                             # roundMoney(n), sumMoney(a,b) con precisión de 2 decimales
│   │       │                                             #   Evita el problema 0.1 + 0.2 = 0.30000000000004
│   │       │
│   │       ├── geo.util.ts                               # haversineDistance(coord1, coord2) → km
│   │       │                                             #   Cálculo de distancia entre dos puntos GPS
│   │       │
│   │       └── polyline-decoder.util.ts                  # decode(encodedString) → Coordinate[]
│   │                                                     #   Decodifica polylines de Google Maps / TollGuru
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  AUTH — Registro, login, JWT, refresh tokens
│   │ ════════════════════════════════════════════════════
│   │
│   ├── auth/
│   │   ├── auth.module.ts                                # Imports: PassportModule, JwtModule
│   │   │                                                 # Providers: puerto → adaptador para cada dependencia
│   │   │                                                 # Exports: AuthServicePort, JwtModule, PassportModule
│   │   │
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── register-request.dto.ts               # { email, password, fullName } + @IsEmail, @MinLength(8), @IsNotEmpty
│   │   │   │   ├── login-request.dto.ts                  # { email, password } + @IsEmail, @IsNotEmpty
│   │   │   │   ├── refresh-token-request.dto.ts          # { refreshToken } + @IsNotEmpty
│   │   │   │   └── auth-response.dto.ts                  # { accessToken, refreshToken, tokenType, expiresInSeconds, user: UserInfoDto }
│   │   │   │                                             #   UserInfoDto: { id, email, fullName, roles[] }
│   │   │   └── services/
│   │   │       └── auth-application.service.ts           # Implementa AuthServicePort con 4 métodos:
│   │   │                                                 #   register() → verifica email único, hashea password, guarda user, genera tokens
│   │   │                                                 #   login() → busca user, valida password, controla intentos fallidos (bloquea a los 5)
│   │   │                                                 #   refresh() → busca token por hash, valida no revocado/expirado, rotation (revoca y genera nuevo)
│   │   │                                                 #   logout() → revoca el refresh token
│   │   │
│   │   ├── domain/
│   │   │   ├── exceptions/
│   │   │   │   ├── invalid-credentials.exception.ts      # extends UnauthorizedException (401)
│   │   │   │   ├── email-already-exists.exception.ts     # extends ConflictException (409)
│   │   │   │   └── token-expired.exception.ts            # extends UnauthorizedException (401)
│   │   │   │
│   │   │   ├── model/
│   │   │   │   ├── auth-user.model.ts                    # interface AuthUser { id, email, passwordHash, fullName, enabled, locked,
│   │   │   │   │                                         #   failedLoginAttempts, lastLoginAt, roles[], createdAt, updatedAt }
│   │   │   │   └── refresh-token.model.ts                # interface RefreshToken { id, userId, tokenHash, expiresAt, revoked, revokedAt, createdAt }
│   │   │   │
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   └── auth-service.port.ts              # abstract class: register(), login(), refresh(), logout()
│   │   │       └── out/
│   │   │           ├── auth-user-repository.port.ts      # abstract class: findByEmail(), findById(), existsByEmail(), save()
│   │   │           ├── refresh-token-repository.port.ts  # abstract class: findByTokenHash(), save(), revokeAllByUserId()
│   │   │           └── password-encoder.port.ts          # abstract class: encode(), matches()
│   │   │
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   ├── bcrypt-password-encoder.adapter.ts    # BCrypt con 10 salt rounds
│   │       │   ├── auth-user-repository.adapter.ts       # em.query() + em.transaction() + toDomain() mapper
│   │       │   └── refresh-token-repository.adapter.ts   # em.query() + toDomain() mapper
│   │       ├── api/
│   │       │   └── auth.controller.ts                    # POST register, login, refresh, logout — todos @Public()
│   │       ├── config/
│   │       │   └── jwt.strategy.ts                       # PassportStrategy: lee Bearer token, valida firma, retorna { userId, roles }
│   │       └── persistence/
│   │           └── auth.queries.ts                       # 10 queries SQL: FIND_USER_BY_EMAIL, INSERT_USER, ASSIGN_ROLE,
│   │                                                     #   FIND_REFRESH_BY_HASH, INSERT_REFRESH, REVOKE_REFRESH, etc.
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  VEHICLES — Vehículos del usuario
│   │ ════════════════════════════════════════════════════
│   │
│   ├── vehicles/
│   │   ├── vehicles.module.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── create-vehicle-request.dto.ts         # alias, plate, vehicleTypeCode, fuelTypeCode, engine{cc,cyl,hp}, dimensions{kg,m,axles}, tags[]
│   │   │   │   ├── update-vehicle-request.dto.ts         # mismos campos opcionales (Partial)
│   │   │   │   └── vehicle-response.dto.ts               # id + todos los campos + vehicleType{}, fuelType{}, createdAt
│   │   │   └── services/
│   │   │       └── vehicle-application.service.ts        # create(), findAllByUserId(), findById(), update(), delete()
│   │   ├── domain/
│   │   │   ├── exceptions/
│   │   │   │   ├── vehicle-not-found.exception.ts        # 404
│   │   │   │   └── duplicate-plate.exception.ts          # 409 — misma placa para el mismo usuario
│   │   │   ├── model/
│   │   │   │   ├── vehicle.model.ts                      # interface Vehicle { id, userId, alias, plate, type, fuel, engine, dimensions, efficiency, tags[] }
│   │   │   │   ├── vehicle-type.enum.ts                  # 2AxlesAuto, 5AxlesTruck, 2AxlesMotorcycle... con tollGuruCode
│   │   │   │   ├── fuel-type.enum.ts                     # MAGNA, PREMIUM, DIESEL, ELECTRIC, LPG
│   │   │   │   ├── cargo-type.enum.ts                    # NONE, DRY, REFRIGERATED, HAZMAT, LIQUID, LIVESTOCK
│   │   │   │   ├── engine.model.ts                       # interface { displacementCc, cylinders, horsepower }
│   │   │   │   ├── dimensions.model.ts                   # interface { weightKg, heightM, lengthM, widthM, axles }
│   │   │   │   └── fuel-efficiency.model.ts              # interface { cityKmpl, hwyKmpl, tankCapacityL }
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   └── vehicle-service.port.ts
│   │   │       └── out/
│   │   │           └── vehicle-repository.port.ts        # save(), findById(), findAllByUserId(), delete(), existsByUserIdAndPlate()
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   └── vehicle-repository.adapter.ts         # em.query() con JOINs a vehicle_types, fuel_types
│   │       ├── api/
│   │       │   └── vehicle.controller.ts                 # GET /, GET /:id, POST /, PUT /:id, DELETE /:id — todos requieren JWT
│   │       └── persistence/
│   │           └── vehicle.queries.ts                    # INSERT_VEHICLE, FIND_BY_USER_ID, UPDATE_VEHICLE, DELETE_VEHICLE, etc.
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  CATALOGS — Tipos de vehículo, combustible, tags
│   │ ════════════════════════════════════════════════════
│   │
│   ├── catalogs/
│   │   ├── catalogs.module.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── vehicle-type-response.dto.ts          # { code, description, axles, category }
│   │   │   │   ├── fuel-type-response.dto.ts             # { code, name, unit, avgPriceMxn }
│   │   │   │   ├── tag-system-response.dto.ts            # { code, name, country, operator }
│   │   │   │   ├── cargo-type-response.dto.ts            # { code, name, requiresSpecialPermit }
│   │   │   │   └── toll-operator-response.dto.ts         # { code, name, country }
│   │   │   └── services/
│   │   │       └── catalog-application.service.ts        # 5 getters, todos cachéables
│   │   ├── domain/
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   └── catalog-service.port.ts
│   │   │       └── out/
│   │   │           └── catalog-repository.port.ts
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   └── catalog-repository.adapter.ts         # em.query() simples — SELECT * FROM vehicle_types ORDER BY code
│   │       ├── api/
│   │       │   └── catalog.controller.ts                 # GET /vehicle-types, /fuel-types, /tag-systems — todos @Public()
│   │       └── persistence/
│   │           └── catalog.queries.ts
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  ROUTING — ★ NÚCLEO: cálculo de peajes
│   │ ════════════════════════════════════════════════════
│   │
│   ├── routing/
│   │   ├── routing.module.ts                             # Wiring del mock/tollguru provider, servicios de dominio, repos
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── calculate-toll-request.dto.ts         # vehicleId, origin{lat,lng,address}, destination{}, departureTime, currency
│   │   │   │   ├── toll-calculation-response.dto.ts      # id, provider, currency, origin, destination, totalRoutes, routes[]
│   │   │   │   ├── route.dto.ts                          # name, labels[], distance{}, duration{}, tollCount, costs{}, diffs{}, tolls[]
│   │   │   │   ├── toll-event.dto.ts                     # type (BARRIER|TICKET_SYSTEM), name, road, location{}, costs{}, tags{}, arrival{}
│   │   │   │   ├── cost-breakdown.dto.ts                 # fuel, cash, tag, prepaidCard, minimumTollCost, grandTotal
│   │   │   │   ├── compare-routes-request.dto.ts         # calculationIds[]
│   │   │   │   └── compare-routes-response.dto.ts        # comparisons[], summary{ cheapest, savings }
│   │   │   └── services/
│   │   │       ├── toll-calculation-application.service.ts    # ★ Orquesta: carga vehículo → cache → provider → fuel → aggregator → scorer → save
│   │   │       ├── calculation-history-application.service.ts # findByUserId(paginado), findById()
│   │   │       └── route-comparison-application.service.ts    # compare(ids[]) → quién es más barato/rápido
│   │   ├── domain/
│   │   │   ├── exceptions/
│   │   │   │   ├── calculation-not-found.exception.ts
│   │   │   │   ├── invalid-coordinate.exception.ts
│   │   │   │   └── toll-provider.exception.ts            # 502 cuando TollGuru no responde
│   │   │   ├── model/
│   │   │   │   ├── toll-calculation.model.ts             # Agregado raíz: id, userId, vehicleId, hash, origin, destination, routes[], provider
│   │   │   │   ├── route.model.ts                        # name, labels, distance, duration, tollCount, tollEvents[], costs, diffs, polyline
│   │   │   │   ├── route-label.enum.ts                   # PRACTICAL, CHEAPEST, FASTEST, SHORTEST, ALTERNATE
│   │   │   │   ├── route-diff.model.ts                   # cheapestDiff, fastestDiffSeconds, shortestDiffMeters
│   │   │   │   ├── toll-event.type.ts                    # type TollEvent = TollBooth | TollSection (union discriminada con campo type)
│   │   │   │   ├── toll-booth.model.ts                   # Sistema abierto (barrier): externalId, name, road, location, costs, tags, arrival
│   │   │   │   ├── toll-section.model.ts                 # Sistema cerrado (ticketSystem): startName, startLocation, endName, endLocation, costs
│   │   │   │   ├── toll-system-type.enum.ts              # BARRIER, TICKET_SYSTEM_1, TICKET_SYSTEM_2, TICKET_SYSTEM_3
│   │   │   │   ├── payment-method.enum.ts                # CASH, TAG_PRIMARY, TAG_SECONDARY, PREPAID_CARD, LICENSE_PLATE
│   │   │   │   ├── tag-system.enum.ts                    # IAVE, TAG_PASE, TELEVIA, VIAPASS, SIGO, TELEPEAJE_CHIHUAHUA, TAG_QUICKPASS
│   │   │   │   ├── cost-breakdown.model.ts               # fuelCost, cashCost, tagCost, minimumTollCost, grandTotal, currency
│   │   │   │   ├── arrival-info.model.ts                 # distanceFromOriginMeters, estimatedArrivalTime
│   │   │   │   ├── direction-step.model.ts               # lat, lng, instruction, distanceMeters, durationSeconds
│   │   │   │   ├── coordinate.model.ts                   # { lat: number, lng: number }
│   │   │   │   └── money.model.ts                        # { amount: number, currency: string }
│   │   │   ├── services/                                 # Lógica pura sin NestJS — solo @Injectable() para DI
│   │   │   │   ├── fuel-cost-calculator.ts               # Calcula consumo con cilindrada + carga + ratio ciudad/carretera
│   │   │   │   ├── toll-cost-aggregator.ts               # Suma costos por método de pago, calcula minimumTollCost y tagAndCash
│   │   │   │   ├── route-scorer.ts                       # Asigna labels CHEAPEST/FASTEST/SHORTEST/PRACTICAL/ALTERNATE + diffs
│   │   │   │   └── arrival-time-estimator.ts             # Estima ETA por caseta basado en velocidad promedio de la ruta
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   ├── calculate-toll.use-case.ts        # abstract class: calculate(command) → TollCalculation
│   │   │       │   ├── get-calculation-history.use-case.ts
│   │   │       │   └── compare-routes.use-case.ts
│   │   │       └── out/
│   │   │           ├── toll-provider.port.ts             # abstract class: fetchRoutes(request) → Route[] — mock o TollGuru
│   │   │           ├── toll-calculation-repository.port.ts
│   │   │           └── currency-converter.port.ts        # Para futuro: convertir MXN → USD
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   └── toll-calculation-repository.adapter.ts # em.query() con JOINs: calculations → routes → booths
│   │       ├── api/
│   │       │   ├── toll.controller.ts                    # POST /tolls/calculate — requiere JWT, usa @CurrentUser()
│   │       │   ├── history.controller.ts                 # GET /tolls/calculations, GET .../​:id, GET .../​:id/cheapest-route
│   │       │   └── mapper/
│   │       │       └── toll-web.mapper.ts                # TollCalculation (domain) → TollCalculationResponseDto
│   │       ├── toll-provider/
│   │       │   ├── mock-toll-provider.adapter.ts         # ★ v1: 15 casetas reales Carmen→Monterrey + 2 rutas
│   │       │   ├── tollguru-provider.adapter.ts          # ★ v2: HTTP POST a TollGuru API
│   │       │   └── tollguru/
│   │       │       ├── tollguru.client.ts                # HttpService con retry 3x y timeout 30s
│   │       │       ├── tollguru-request.builder.ts       # Construye body: { from, to, vehicle{ type, weight }, fuelOptions }
│   │       │       ├── tollguru-response.mapper.ts       # JSON TollGuru → domain models
│   │       │       └── dto/
│   │       │           ├── tollguru-request.dto.ts
│   │       │           ├── tollguru-response.dto.ts
│   │       │           ├── tollguru-route.dto.ts
│   │       │           └── tollguru-toll.dto.ts
│   │       └── persistence/
│   │           └── routing.queries.ts                    # INSERT calculation + routes + booths, FIND_BY_HASH (cache), PostGIS queries
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  BOOTHS — Catálogo de casetas y tarifas
│   │ ════════════════════════════════════════════════════
│   │
│   ├── booths/
│   │   ├── booths.module.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── toll-booth-response.dto.ts            # id, name, road, state, location, operator, rates[], tags
│   │   │   │   ├── toll-booth-rate.dto.ts                # vehicleType, cash, tagPrimary, validFrom, source
│   │   │   │   ├── nearby-booths-query.dto.ts            # lat, lng, radiusKm — validación con @IsNumber, @Min, @Max
│   │   │   │   └── toll-booth-summary.dto.ts             # Versión ligera para listados
│   │   │   └── services/
│   │   │       └── booth-catalog-application.service.ts  # findAll(paginado), findById(), findNearby(lat, lng, radius)
│   │   ├── domain/
│   │   │   ├── exceptions/
│   │   │   │   └── booth-not-found.exception.ts
│   │   │   ├── model/
│   │   │   │   ├── toll-booth-catalog.model.ts
│   │   │   │   ├── toll-booth-rate.model.ts
│   │   │   │   └── toll-operator.model.ts
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   └── booth-catalog-service.port.ts
│   │   │       └── out/
│   │   │           └── booth-repository.port.ts          # findNearby usa PostGIS ST_DWithin()
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   └── booth-repository.adapter.ts           # em.query() con ST_DWithin(), ST_Distance(), ST_MakePoint()
│   │       ├── api/
│   │       │   └── booth.controller.ts                   # GET /booths, GET /booths/:id, GET /booths/nearby?lat=&lng=&radiusKm=
│   │       └── persistence/
│   │           └── booth.queries.ts                      # FIND_NEARBY (PostGIS), FIND_BEST_RATE (prioridad OFFICIAL > TOLLGURU)
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  POIS — Gasolineras, paradas, restaurantes
│   │ ════════════════════════════════════════════════════
│   │
│   ├── pois/
│   │   ├── pois.module.ts
│   │   ├── application/
│   │   │   ├── dto/
│   │   │   │   ├── poi-response.dto.ts                   # id, name, type, brand, location, distanceKm, metadata{}
│   │   │   │   ├── nearby-pois-query.dto.ts              # lat, lng, radiusKm, type (GAS_STATION, REST_AREA, ...)
│   │   │   │   └── pois-along-route-query.dto.ts         # calculationId, type, corridorMeters
│   │   │   └── services/
│   │   │       ├── poi-application.service.ts            # findNearby(lat, lng, radius, type)
│   │   │       └── route-enrichment-application.service.ts # findAlongRoute(calculationId) — usa polyline + PostGIS
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   │   ├── poi.model.ts                          # interface { id, name, type, brand, lat, lng, address, metadata }
│   │   │   │   └── poi-type.enum.ts                      # GAS_STATION, REST_AREA, RESTAURANT, HOTEL, EV_CHARGING
│   │   │   └── ports/
│   │   │       ├── in/
│   │   │       │   └── poi-service.port.ts
│   │   │       └── out/
│   │   │           └── poi-repository.port.ts
│   │   └── infrastructure/
│   │       ├── adapters/
│   │       │   └── poi-repository.adapter.ts             # ST_DWithin() para nearby, ST_Buffer() + ST_Intersects() para along-route
│   │       ├── api/
│   │       │   └── poi.controller.ts                     # GET /pois/nearby, GET /pois/along-route/:calculationId
│   │       └── persistence/
│   │           └── poi.queries.ts
│   │
│   │
│   │ ════════════════════════════════════════════════════
│   │  AUDITS — Registro de eventos del sistema
│   │ ════════════════════════════════════════════════════
│   │
│   └── audits/
│       ├── audits.module.ts
│       ├── application/
│       │   └── services/
│       │       └── audit-application.service.ts          # logEvent(userId, type, entityType, entityId, metadata)
│       ├── domain/
│       │   ├── model/
│       │   │   ├── audit-event.model.ts
│       │   │   └── audit-event-type.enum.ts              # LOGIN, LOGIN_FAILED, REGISTER, CALCULATE_TOLL, RATE_CHANGE
│       │   └── ports/
│       │       └── out/
│       │           └── audit-repository.port.ts
│       └── infrastructure/
│           ├── adapters/
│           │   └── audit-repository.adapter.ts
│           └── persistence/
│               └── audit.queries.ts                      # INSERT_EVENT, FIND_BY_USER, FIND_BY_TYPE
│
│
│ ════════════════════════════════════════════════════════
│  BRUNO — Colección de requests (reemplaza Postman)
│ ════════════════════════════════════════════════════════
│
├── bruno/
│   ├── bruno.json                                        # { name: "Toll API", version: "1", type: "collection" }
│   ├── environments/
│   │   ├── local.bru                                     # baseUrl=http://localhost:3000/api/v1
│   │   ├── dev.bru
│   │   └── prod.bru
│   ├── auth/
│   │   ├── register.bru                                  # POST + script que guarda tokens automáticamente
│   │   ├── login.bru
│   │   ├── refresh.bru
│   │   └── logout.bru
│   ├── vehicles/
│   │   ├── create-vehicle.bru                            # Nissan Versa 1600cc ejemplo
│   │   ├── list-vehicles.bru
│   │   ├── get-vehicle.bru
│   │   ├── update-vehicle.bru
│   │   └── delete-vehicle.bru
│   ├── tolls/
│   │   ├── calculate.bru                                 # Carmen → Monterrey ejemplo
│   │   ├── get-calculation.bru
│   │   ├── calculation-history.bru
│   │   ├── cheapest-route.bru
│   │   └── compare-routes.bru
│   ├── booths/
│   │   ├── list-booths.bru
│   │   ├── get-booth.bru
│   │   └── nearby-booths.bru
│   ├── pois/
│   │   ├── nearby-pois.bru
│   │   └── pois-along-route.bru
│   └── catalogs/
│       ├── vehicle-types.bru
│       ├── fuel-types.bru
│       ├── tag-systems.bru
│       ├── cargo-types.bru
│       └── operators.bru
│
│
│ ════════════════════════════════════════════════════════
│  MIGRACIONES, TESTS, CONFIG
│ ════════════════════════════════════════════════════════
│
├── migrations/
│   ├── 001_init.sql                                      # CREATE EXTENSION uuid-ossp, postgis; tablas users, roles, vehicles, toll_booths, toll_calculations, pois, audit_events
│   ├── 002_seed-catalogs.sql                             # INSERT roles, vehicle_types (17), fuel_types (5), cargo_types (7), toll_tag_systems (7), toll_operators (6)
│   └── 003_seed-toll-booths.sql                          # 15 casetas reales Carmen→Monterrey con tarifas y tags
│
├── test/
│   ├── unit/
│   │   ├── auth/
│   │   │   └── auth-application.service.spec.ts          # 8 tests: register ok/duplicado, login ok/no encontrado/wrong password/bloqueo/bloqueado, refresh ok/revocado
│   │   ├── routing/domain/services/
│   │   │   ├── fuel-cost-calculator.spec.ts              # Versa 1600cc vs Tráiler 12000cc, distancia cero, EV con kWh
│   │   │   ├── toll-cost-aggregator.spec.ts              # 15 casetas = $1,946, caseta sin tag → tagAndCash
│   │   │   └── route-scorer.spec.ts                      # Ruta 180 gana todo, libre más barata vs cuota más rápida
│   │   └── vehicles/
│   │       └── vehicle-application.service.spec.ts
│   ├── integration/
│   │   ├── auth.e2e-spec.ts                              # Register → login → endpoint protegido → refresh → logout
│   │   └── toll-calculation.e2e-spec.ts
│   └── fixtures/
│       ├── tollguru-carmen-monterrey.json                 # JSON real de TollGuru (el que me compartiste)
│       ├── mock-user.fixture.ts
│       └── mock-vehicle.fixture.ts
│
├── .env.example
├── .env                                                  # NO va a git
├── .gitignore                                            # node_modules/, dist/, .env, *.log
├── .eslintrc.js
├── .prettierrc
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── package.json                                          # scripts: start:dev, build, test, migrate:up, migrate:down
├── docker-compose.yml                                    # postgres:16 + postgis + pgadmin
└── README.md

Total: ~160 archivos
```

---

## Reglas de arquitectura

1. **`domain/`** no importa nada de NestJS, TypeORM ni infraestructura. Es TypeScript puro (interfaces, enums, lógica de cálculo).
2. **`application/`** solo importa de `domain/` y de DTOs propios. Nunca de `infrastructure/`.
3. **`infrastructure/`** importa de `domain/` (puertos) y de `application/` (DTOs). Aquí vive todo lo que depende de frameworks.
4. Los puertos son `abstract class` (no `interface`) para que NestJS los inyecte como tokens.
5. Cada módulo tiene su archivo `*.queries.ts` que centraliza todas las queries SQL.
6. Los adapters usan `@InjectEntityManager()` + `em.query()` para ejecutar SQL puro.
7. Las transacciones usan `em.transaction(async (tx) => { ... })` — COMMIT/ROLLBACK automático.

---

## Orden de implementación

| Semana | Módulos | Archivos |
|---|---|---|
| 1 | Raíz + shared + migraciones | ~20 archivos |
| 2 | auth + catalogs | ~25 archivos |
| 3 | vehicles + bruno (auth, vehicles, catalogs) | ~18 archivos |
| 4 | routing (dominio: modelos + 4 servicios de cálculo) | ~20 archivos |
| 5 | routing (infra: mock provider + controller + queries) | ~15 archivos |
| 6 | booths + pois + audits | ~20 archivos |
| 7 | tests + bruno completo + README | ~15 archivos |
