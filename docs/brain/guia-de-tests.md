# Guía de testing — api-peajes

> Cómo funciona el sistema de tests de este proyecto, qué testear en cada capa y cómo escribir cada tipo de test desde cero.

---

## Índice

1. [[#Configuración]]
2. [[#Comandos]]
3. [[#La pirámide: qué testear en qué capa]]
4. [[#Tests unitarios — servicios de dominio]]
5. [[#Tests unitarios — servicios de aplicación]]
6. [[#Tests de integración — adaptadores]]
7. [[#Tests E2E — endpoints HTTP]]
8. [[#Fixtures y factories]]
9. [[#TDD: el flujo completo paso a paso]]
10. [[#Errores comunes]]

---

## Configuración

### Jest para tests unitarios e integración

La configuración vive en `package.json`, sección `"jest"`:

```json
{
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.(t|j)s$": "ts-jest" },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

Cosas importantes a saber:
- El `rootDir` es `src/` — por eso los specs en `test/` necesitan la config separada de e2e
- `testRegex` detecta cualquier archivo que termine en `.spec.ts`
- `ts-jest` compila TypeScript en tiempo de ejecución — no necesitás hacer build primero

### Jest para E2E

Configuración en `test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" }
}
```

La diferencia: `rootDir` es `.` (la raíz del proyecto) y busca archivos `.e2e-spec.ts`.

---

## Comandos

```bash
# Correr todos los tests unitarios
npm run test

# Modo watch (re-corre al guardar)
npm run test:watch

# Con reporte de cobertura
npm run test:cov

# Tests E2E
npm run test:e2e

# Un archivo específico
npx jest fuel-cost-calculator

# Un describe o test específico
npx jest --testNamePattern="FuelCostCalculator"

# Ver qué tests existen sin correrlos
npx jest --listTests
```

---

## La pirámide: qué testear en qué capa

```
              E2E (test/*.e2e-spec.ts)
         ────────────────────────────────
         Testean el stack completo HTTP→BD.
         Lentos, pocos, solo flujos críticos.

       Integración (test/integration/)
    ────────────────────────────────────────
    Testean adaptadores con BD real.
    Velocidad media. Necesitan Docker.

    Unitarios (test/unit/ o *.spec.ts en src/)
 ──────────────────────────────────────────────────
 Testean lógica pura. Sin BD, sin HTTP, sin NestJS.
 Son los más rápidos y los más valiosos.
```

### Regla de qué va dónde

| Qué estás testeando | Tipo |
|---|---|
| `FuelCostCalculator`, `RouteScorer`, `TollCostAggregator` | Unitario |
| `AuthApplicationService`, `VehicleApplicationService` | Unitario con mocks |
| `AuthUserRepositoryAdapter`, `BoothRepositoryAdapter` | Integración |
| `POST /auth/login → GET /tolls/calculate` | E2E |

---

## Tests unitarios — servicios de dominio

Son los más simples de escribir: no necesitan NestJS, no necesitan mocks, solo lógica pura.

### Estructura básica

```ts
// test/unit/routing/domain/services/fuel-cost-calculator.spec.ts
import { FuelCostCalculator } from '../../../../src/routing/domain/services/fuel-cost-calculator';

describe('FuelCostCalculator', () => {
  let calculator: FuelCostCalculator;

  beforeEach(() => {
    calculator = new FuelCostCalculator();
  });

  describe('calculate', () => {
    it('calcula el costo de combustible para un Versa 1600cc en autopista', () => {
      const result = calculator.calculate({
        distanceMeters: 800_000,  // 800 km
        cityRatio: 0.2,
        cityKmpl: 12,
        hwyKmpl: 18,
        fuelPricePerLiter: 24.5,
        currency: 'MXN',
      });

      // 800 km * 0.2 = 160 km ciudad → 160/12 = 13.33 L
      // 800 km * 0.8 = 640 km hwy    → 640/18 = 35.56 L
      // total = 48.89 L * $24.5 = $1197.78
      expect(result.amount).toBeCloseTo(1197.78, 1);
      expect(result.currency).toBe('MXN');
    });

    it('retorna costo cero si la distancia es cero', () => {
      const result = calculator.calculate({
        distanceMeters: 0,
        cityRatio: 0.5,
        cityKmpl: 12,
        hwyKmpl: 18,
        fuelPricePerLiter: 24.5,
        currency: 'MXN',
      });

      expect(result.amount).toBe(0);
    });

    it('retorna costo cero para vehículos eléctricos (kmpl = 0)', () => {
      const result = calculator.calculate({
        distanceMeters: 500_000,
        cityRatio: 0.5,
        cityKmpl: 0,
        hwyKmpl: 0,
        fuelPricePerLiter: 0,
        currency: 'MXN',
      });

      expect(result.amount).toBe(0);
    });
  });
});
```

### TollCostAggregator — ejemplo completo

```ts
// test/unit/routing/domain/services/toll-cost-aggregator.spec.ts
import { TollCostAggregator } from '../../../../src/routing/domain/services/toll-cost-aggregator';
import { TollEvent } from '../../../../src/routing/domain/model/toll-event.type';

describe('TollCostAggregator', () => {
  let aggregator: TollCostAggregator;

  beforeEach(() => {
    aggregator = new TollCostAggregator();
  });

  const makeBarrier = (cash: number, tag: number): TollEvent => ({
    type: 'BARRIER',
    name: 'Caseta Test',
    road: 'Mex-180',
    location: { lat: 0, lng: 0 },
    cashCost: { amount: cash, currency: 'MXN' },
    tagCost: { amount: tag, currency: 'MXN' },
    acceptedTags: [],
  });

  it('suma correctamente el efectivo y el tag de múltiples casetas', () => {
    const events: TollEvent[] = [
      makeBarrier(80, 64),
      makeBarrier(120, 96),
      makeBarrier(60, 48),
    ];

    const result = aggregator.aggregate(events, 'MXN');

    expect(result.cashCost.amount).toBe(260);
    expect(result.tagCost.amount).toBe(208);
  });

  it('minimumTollCost es el menor entre efectivo y tag', () => {
    const events: TollEvent[] = [makeBarrier(100, 80)];

    const result = aggregator.aggregate(events, 'MXN');

    expect(result.minimumTollCost.amount).toBe(80);
  });

  it('retorna ceros para una lista vacía de casetas', () => {
    const result = aggregator.aggregate([], 'MXN');

    expect(result.cashCost.amount).toBe(0);
    expect(result.tagCost.amount).toBe(0);
    expect(result.minimumTollCost.amount).toBe(0);
  });
});
```

### RouteScorer — ejemplo completo

```ts
// test/unit/routing/domain/services/route-scorer.spec.ts
import { RouteScorer } from '../../../../src/routing/domain/services/route-scorer';
import { RouteLabel } from '../../../../src/routing/domain/model/route-label.enum';
import { Route } from '../../../../src/routing/domain/model/route.model';

describe('RouteScorer', () => {
  let scorer: RouteScorer;

  beforeEach(() => {
    scorer = new RouteScorer();
  });

  const makeRoute = (
    name: string,
    grandTotal: number,
    durationSeconds: number,
    distanceMeters: number,
  ): Route => ({
    name,
    labels: [],
    distanceMeters,
    durationSeconds,
    tollCount: 0,
    tollEvents: [],
    costs: {
      fuelCost: { amount: 0, currency: 'MXN' },
      cashCost: { amount: 0, currency: 'MXN' },
      tagCost: { amount: 0, currency: 'MXN' },
      minimumTollCost: { amount: 0, currency: 'MXN' },
      grandTotal: { amount: grandTotal, currency: 'MXN' },
    },
    diffs: {
      cheapestDiff: { amount: 0, currency: 'MXN' },
      fastestDiffSeconds: 0,
      shortestDiffMeters: 0,
    },
    polyline: '',
    steps: [],
  });

  it('asigna CHEAPEST a la ruta con menor costo total', () => {
    const routes = [
      makeRoute('Ruta libre', 150, 3600, 400_000),
      makeRoute('Ruta cuota', 320, 2700, 380_000),
    ];

    const scored = scorer.score(routes);

    expect(scored[0].labels).toContain(RouteLabel.CHEAPEST);
    expect(scored[1].labels).not.toContain(RouteLabel.CHEAPEST);
  });

  it('asigna FASTEST a la ruta con menor duración', () => {
    const routes = [
      makeRoute('Ruta libre', 150, 3600, 400_000),
      makeRoute('Ruta cuota', 320, 2700, 380_000),
    ];

    const scored = scorer.score(routes);

    expect(scored[1].labels).toContain(RouteLabel.FASTEST);
  });

  it('asigna PRACTICAL a la primera ruta cuando no gana ninguna categoría', () => {
    const routes = [
      makeRoute('Práctica', 200, 3200, 390_000),  // ni la más barata, rápida, ni corta
      makeRoute('Barata', 150, 3600, 400_000),
      makeRoute('Rápida', 320, 2700, 380_000),
    ];

    const scored = scorer.score(routes);

    expect(scored[0].labels).toContain(RouteLabel.PRACTICAL);
  });

  it('calcula correctamente los diffs respecto a la mejor ruta de cada categoría', () => {
    const routes = [
      makeRoute('Barata', 150, 3600, 400_000),
      makeRoute('Cara', 300, 3600, 400_000),
    ];

    const scored = scorer.score(routes);

    // La ruta cara tiene 150 MXN más que la más barata
    expect(scored[1].diffs.cheapestDiff.amount).toBe(150);
    expect(scored[0].diffs.cheapestDiff.amount).toBe(0);
  });

  it('retorna arreglo vacío si no hay rutas', () => {
    expect(scorer.score([])).toEqual([]);
  });
});
```

---

## Tests unitarios — servicios de aplicación

Los servicios de aplicación (use cases) **orquestan** — no calculan. Sus tests verifican que la orquestación es correcta: qué llama, cuándo, con qué parámetros. Los puertos se mockean con `jest.fn()`.

### Patrón de mock para puertos

Un puerto en este proyecto es una `abstract class`. Para mockearlo:

```ts
// No hagas esto:
const userRepo = new AuthUserRepositoryPort(); // ← error, es abstract

// Hacé esto — objeto plano con jest.fn():
const userRepo = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  existsByEmail: jest.fn(),
  save: jest.fn(),
} as jest.Mocked<AuthUserRepositoryPort>;
```

### AuthApplicationService — ejemplo completo

```ts
// test/unit/auth/auth-application.service.spec.ts
import { AuthApplicationService } from '../../../src/auth/application/services/auth-application.service';
import { AuthUserRepositoryPort } from '../../../src/auth/domain/ports/out/auth-user-repository.port';
import { RefreshTokenRepositoryPort } from '../../../src/auth/domain/ports/out/refresh-token-repository.port';
import { PasswordEncoderPort } from '../../../src/auth/domain/ports/out/password-encoder.port';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '../../../src/auth/domain/model/auth-user.model';
import { EmailAlreadyExistsException } from '../../../src/auth/domain/exceptions/email-already-exists.exception';
import { InvalidCredentialsException } from '../../../src/auth/domain/exceptions/invalid-credentials.exception';

// ─── Helpers ───────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-uuid',
  email: 'juan@example.com',
  passwordHash: '$2b$10$hashedpassword',
  fullName: 'Juan Pérez',
  enabled: true,
  locked: false,
  failedLoginAttempts: 0,
  lastLoginAt: null,
  roles: ['ROLE_USER'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('AuthApplicationService', () => {
  let service: AuthApplicationService;
  let userRepo: jest.Mocked<AuthUserRepositoryPort>;
  let refreshTokenRepo: jest.Mocked<RefreshTokenRepositoryPort>;
  let passwordEncoder: jest.Mocked<PasswordEncoderPort>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    userRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
      save: jest.fn(),
    } as any;

    refreshTokenRepo = {
      findByTokenHash: jest.fn(),
      save: jest.fn(),
      revokeAllByUserId: jest.fn(),
    } as any;

    passwordEncoder = {
      encode: jest.fn(),
      matches: jest.fn(),
    } as any;

    jwtService = { sign: jest.fn().mockReturnValue('mock-jwt-token') } as any;
    configService = { get: jest.fn().mockReturnValue('30') } as any;

    service = new AuthApplicationService(
      userRepo,
      refreshTokenRepo,
      passwordEncoder,
      jwtService,
      configService,
    );
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('registra un usuario nuevo y retorna tokens', async () => {
      userRepo.existsByEmail.mockResolvedValue(false);
      passwordEncoder.encode.mockResolvedValue('hashed-pass');
      userRepo.save.mockImplementation(async (u) => u);
      refreshTokenRepo.save.mockResolvedValue(undefined as any);

      const result = await service.register({
        email: 'nuevo@example.com',
        password: 'contraseña123',
        fullName: 'Nuevo Usuario',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('nuevo@example.com');
      expect(userRepo.save).toHaveBeenCalledOnce();
    });

    it('lanza EmailAlreadyExistsException si el email ya existe', async () => {
      userRepo.existsByEmail.mockResolvedValue(true);

      await expect(
        service.register({ email: 'existe@example.com', password: '123', fullName: 'Test' }),
      ).rejects.toThrow(EmailAlreadyExistsException);

      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('hace login exitoso y retorna tokens', async () => {
      const user = makeUser();
      userRepo.findByEmail.mockResolvedValue(user);
      passwordEncoder.matches.mockResolvedValue(true);
      userRepo.save.mockImplementation(async (u) => u);
      refreshTokenRepo.save.mockResolvedValue(undefined as any);

      const result = await service.login({
        email: 'juan@example.com',
        password: 'correcta',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.id).toBe('user-uuid');
    });

    it('lanza InvalidCredentialsException si el usuario no existe', async () => {
      userRepo.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@example.com', password: '123' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('lanza InvalidCredentialsException si la contraseña es incorrecta', async () => {
      userRepo.findByEmail.mockResolvedValue(makeUser());
      passwordEncoder.matches.mockResolvedValue(false);
      userRepo.save.mockImplementation(async (u) => u);

      await expect(
        service.login({ email: 'juan@example.com', password: 'incorrecta' }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('bloquea la cuenta al llegar a 5 intentos fallidos', async () => {
      userRepo.findByEmail.mockResolvedValue(makeUser({ failedLoginAttempts: 4 }));
      passwordEncoder.matches.mockResolvedValue(false);

      let savedUser: AuthUser | undefined;
      userRepo.save.mockImplementation(async (u) => { savedUser = u; return u; });

      await expect(
        service.login({ email: 'juan@example.com', password: 'mal' }),
      ).rejects.toThrow(InvalidCredentialsException);

      expect(savedUser?.locked).toBe(true);
      expect(savedUser?.failedLoginAttempts).toBe(5);
    });

    it('lanza InvalidCredentialsException si la cuenta está bloqueada', async () => {
      userRepo.findByEmail.mockResolvedValue(makeUser({ locked: true }));

      await expect(
        service.login({ email: 'juan@example.com', password: '123' }),
      ).rejects.toThrow(InvalidCredentialsException);

      expect(passwordEncoder.matches).not.toHaveBeenCalled();
    });
  });
});
```

### Qué verificar en un servicio de aplicación

| Escenario | Qué assertar |
|---|---|
| Flujo feliz | El resultado tiene la forma esperada |
| Recurso no encontrado | Se lanza la excepción correcta |
| Regla de negocio violada | Se lanza la excepción correcta Y no se llama al repo |
| Side effects | `expect(repo.save).toHaveBeenCalledWith(...)` |
| Caché hit | El proveedor externo **no** fue llamado |
| Caché miss | El proveedor externo **sí** fue llamado y se guardó |

---

## Tests de integración — adaptadores

Estos tests verifican que tu SQL funciona, que PostGIS responde como esperás y que los mappers convierten correctamente las filas de la BD a modelos de dominio.

**Requieren** una base de datos PostgreSQL real. Dos opciones:

### Opción A: Docker Compose de test (recomendada)

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: peajes_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports: ["5433:5432"]
```

```bash
docker compose -f docker-compose.test.yml up -d
DATABASE_URL=postgresql://test:test@localhost:5433/peajes_test npm run test:e2e
```

### Estructura de un test de integración

```ts
// test/integration/auth/auth-user-repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthUserRepositoryAdapter } from '../../../src/auth/infrastructure/adapters/auth-user-repository.adapter';
import { AuthUserRepositoryPort } from '../../../src/auth/domain/ports/out/auth-user-repository.port';

describe('AuthUserRepositoryAdapter (integración)', () => {
  let module: TestingModule;
  let repo: AuthUserRepositoryPort;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          entities: [],
          synchronize: false,
        }),
      ],
      providers: [
        AuthUserRepositoryAdapter,
        { provide: AuthUserRepositoryPort, useClass: AuthUserRepositoryAdapter },
      ],
    }).compile();

    repo = module.get(AuthUserRepositoryPort);
  });

  afterAll(async () => {
    await module.close();
  });

  it('guarda y recupera un usuario por email', async () => {
    const user = { /* ... datos del usuario */ };
    const saved = await repo.save(user);
    const found = await repo.findByEmail(user.email);

    expect(found?.id).toBe(saved.id);
  });

  it('retorna null si el usuario no existe', async () => {
    const result = await repo.findByEmail('noexiste@example.com');
    expect(result).toBeNull();
  });
});
```

> **Nota:** en integración, limpiá la BD antes de cada test con `TRUNCATE users CASCADE;` para evitar que los tests se afecten entre sí.

---

## Tests E2E — endpoints HTTP

Los tests E2E levantan la app NestJS completa con Supertest y hacen requests HTTP reales contra una BD de test.

```ts
// test/auth.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registra un usuario nuevo y retorna 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Test User',
        });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('retorna 409 si el email ya existe', async () => {
      // primer registro
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: '123456789', fullName: 'Dup' });

      // segundo registro con el mismo email
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'dup@example.com', password: '123456789', fullName: 'Dup' });

      expect(res.status).toBe(409);
    });
  });

  describe('Flujo completo: register → login → endpoint protegido', () => {
    let accessToken: string;

    it('registra y hace login', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'flujo@example.com', password: 'password123', fullName: 'Flujo' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'flujo@example.com', password: 'password123' });

      expect(loginRes.status).toBe(200);
      accessToken = loginRes.body.accessToken;
    });

    it('accede a un endpoint protegido con el token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
    });

    it('retorna 401 sin token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/vehicles');
      expect(res.status).toBe(401);
    });
  });
});
```

---

## Fixtures y factories

Las fixtures son datos de prueba reutilizables. Evitan repetir la construcción de objetos en cada test.

### Factory function (patrón recomendado)

```ts
// test/fixtures/mock-user.fixture.ts
import { AuthUser } from '../../src/auth/domain/model/auth-user.model';

export const makeAuthUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  id: 'user-uuid-default',
  email: 'usuario@example.com',
  passwordHash: '$2b$10$fakehashfortest',
  fullName: 'Usuario Test',
  enabled: true,
  locked: false,
  failedLoginAttempts: 0,
  lastLoginAt: null,
  roles: ['ROLE_USER'],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});
```

Uso en tests:

```ts
// Un usuario normal
const user = makeAuthUser();

// Un usuario bloqueado
const blockedUser = makeAuthUser({ locked: true, failedLoginAttempts: 5 });

// Un admin
const admin = makeAuthUser({ roles: ['ROLE_USER', 'ROLE_ADMIN'] });
```

### Factory para TollEvent

```ts
// test/fixtures/mock-toll-event.fixture.ts
import { TollEvent } from '../../src/routing/domain/model/toll-event.type';

export const makeBarrierEvent = (cash: number, tag: number): TollEvent => ({
  type: 'BARRIER',
  name: 'Caseta Test',
  road: 'Mex-180D',
  location: { lat: 19.0, lng: -96.0 },
  cashCost: { amount: cash, currency: 'MXN' },
  tagCost: { amount: tag, currency: 'MXN' },
  acceptedTags: [],
});
```

---

## TDD: el flujo completo paso a paso

TDD significa escribir el test **antes** que el código. La secuencia es:

```
1. Rojo  → escribir test que falle
2. Verde → escribir el mínimo código para que pase
3. Refactor → limpiar sin romper los tests
```

### Ejemplo real: agregar validación de coordenadas al `ArrivalTimeEstimator`

**Paso 1 — escribir el test que falla:**

```ts
// test/unit/routing/domain/services/arrival-time-estimator.spec.ts
import { ArrivalTimeEstimator } from '../../../../src/routing/domain/services/arrival-time-estimator';
import { makeBarrierEvent } from '../../../fixtures/mock-toll-event.fixture';

describe('ArrivalTimeEstimator', () => {
  let estimator: ArrivalTimeEstimator;

  beforeEach(() => {
    estimator = new ArrivalTimeEstimator();
  });

  it('estima el horario de llegada a cada caseta', () => {
    const departure = new Date('2024-06-15T08:00:00');
    const events = [
      { ...makeBarrierEvent(80, 64), arrival: { distanceFromOriginMeters: 200_000, estimatedArrivalTime: new Date() } },
      { ...makeBarrierEvent(120, 96), arrival: { distanceFromOriginMeters: 500_000, estimatedArrivalTime: new Date() } },
    ];

    const result = estimator.estimate({
      tollEvents: events,
      distanceMeters: 800_000,
      durationSeconds: 28800, // 8 horas
      departureTime: departure,
    });

    // Vel promedio = 800km / 8h = 100km/h
    // Primera caseta a 200km → 2h → 10:00 AM
    const firstArrival = result[0].arrival!.estimatedArrivalTime;
    expect(firstArrival.getHours()).toBe(10);
  });

  it('no modifica casetas sin distanceFromOriginMeters', () => {
    const events = [makeBarrierEvent(80, 64)]; // sin arrival

    const result = estimator.estimate({
      tollEvents: events,
      distanceMeters: 800_000,
      durationSeconds: 28800,
      departureTime: new Date(),
    });

    expect(result[0].arrival).toBeUndefined();
  });
});
```

**Paso 2 — correr:** `npx jest arrival-time-estimator` → falla ❌

**Paso 3 — implementar** el mínimo necesario en `arrival-time-estimator.ts` para que pase.

**Paso 4 — correr de nuevo:** → pasa ✅

**Paso 5 — refactor** si hace falta, verificando que siga verde.

---

## Errores comunes

### ❌ Mockear lo que no es tuyo

```ts
// MAL: mockear TypeORM internamente
jest.mock('typeorm', () => ({ ... }));

// BIEN: mockear tu propio puerto
const repo = { findByEmail: jest.fn() } as jest.Mocked<AuthUserRepositoryPort>;
```

### ❌ Assertar sobre implementación en lugar de comportamiento

```ts
// MAL: verificar cómo se hace
expect(passwordEncoder.encode).toHaveBeenCalledWith('rawpassword');

// BIEN: verificar qué resulta
expect(result.user.email).toBe('test@example.com');
```

Excepción válida: en servicios de aplicación sí tiene sentido verificar que `repo.save` fue llamado — porque eso es parte del contrato del caso de uso.

### ❌ Tests que dependen de orden de ejecución

```ts
// MAL: el segundo test depende del estado que dejó el primero
it('test 1', () => { globalState = 'X'; });
it('test 2', () => { expect(globalState).toBe('X'); }); // falla si no corrés test 1

// BIEN: cada test es independiente con beforeEach
beforeEach(() => { globalState = null; });
```

### ❌ No limpiar mocks entre tests

```ts
// Agregar en beforeEach para resetear los contadores de llamadas
beforeEach(() => {
  jest.clearAllMocks();
});
```

### ❌ Ignorar los casos borde

Siempre testear:
- Lista vacía / arreglo vacío
- Valor cero o negativo
- Valor nulo/undefined en campos opcionales
- El límite exacto de una regla (ej: 5 intentos fallidos → exactamente 5)
