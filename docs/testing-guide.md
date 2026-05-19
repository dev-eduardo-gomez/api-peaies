# Guía de Testing — api-peajes

> **Objetivo:** Entender qué es un test, por qué existe, y cómo escribirlo. Con ejemplos reales de este proyecto.

---

## Índice

1. [¿Para qué sirve un test?](#1-para-qué-sirve-un-test)
2. [La pirámide de testing](#2-la-pirámide-de-testing)
3. [Anatomía de un test](#3-anatomía-de-un-test)
4. [Matchers — las aserciones](#4-matchers--las-aserciones)
5. [Unit tests — servicios de dominio](#5-unit-tests--servicios-de-dominio)
6. [Mocks — simular dependencias](#6-mocks--simular-dependencias)
7. [Unit tests — use cases con dependencias](#7-unit-tests--use-cases-con-dependencias)
8. [Integration tests — NestJS Testing Module](#8-integration-tests--nestjs-testing-module)
9. [E2E tests — HTTP con Supertest](#9-e2e-tests--http-con-supertest)
10. [TDD — escribir el test primero](#10-tdd--escribir-el-test-primero)
11. [Comandos de Jest](#11-comandos-de-jest)
12. [Cobertura de código](#12-cobertura-de-código)
13. [Checklist antes de hacer PR](#13-checklist-antes-de-hacer-pr)

---

## 1. ¿Para qué sirve un test?

Un test es código que verifica que otro código hace lo que se espera. Eso es todo.

**Sin tests:**
- Cada vez que cambiás algo, rezás para que no rompió nada
- El QA manual no escala
- Refactorizar da miedo porque no sabés si rompiste algo
- Los bugs llegan a producción

**Con tests:**
- Sabés instantáneamente si un cambio rompe algo existente
- Podés refactorizar con confianza
- Los bugs se detectan antes de llegar a producción
- La documentación viva del comportamiento esperado está en los tests

> **Concepto clave:** Un test no prueba que el código *funciona*. Prueba que el código *cumple un contrato específico* bajo condiciones específicas. No es lo mismo.

---

## 2. La pirámide de testing

```
           ▲
          /▓▓\
         / E2E \          ← pocos (5-10), lentos (segundos), costosos de mantener
        /▓▓▓▓▓▓▓\         → prueban flujos completos de usuario
       /───────────\
      /▓▓▓▓▓▓▓▓▓▓▓▓\
     / Integración   \    ← medios (~30), más lentos, necesitan DB real
    /▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\   → prueban que los módulos se conectan bien
   /──────────────────────\
  /▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\
 /       Unit Tests         \ ← muchos (+100), rápidos (ms), fáciles de mantener
/▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\ → prueban una función/clase en aislamiento
```

| Nivel | Qué prueba | Velocidad | En este proyecto |
|-------|-----------|-----------|-----------------|
| **Unit** | Una función o clase sola, sin DB ni HTTP | ~1ms | `FuelCostCalculator`, `RouteScorer`, use cases |
| **Integración** | Un módulo completo con sus dependencias reales | ~100ms | Controller + DB real |
| **E2E** | Todo el sistema de punta a punta | ~1s | HTTP real contra la app corriendo |

**Regla práctica:** Cuanto más arriba en la pirámide, menos tests. Los unit tests son los más baratos — escribí muchos.

---

## 3. Anatomía de un test

Todo test en Jest tiene la misma estructura:

```typescript
// describe → agrupa tests relacionados (es el "contexto")
describe('FuelCostCalculator', () => {

  // it / test → un caso concreto (es la "especificación")
  it('should return zero when distance is zero', () => {

    // Arrange — preparar los datos
    const calculator = new FuelCostCalculator();
    const params = {
      distanceMeters: 0,
      cityRatio: 0.2,
      cityKmpl: 10,
      hwyKmpl: 14,
      fuelPricePerLiter: 22.5,
      currency: 'MXN' as const,
    };

    // Act — ejecutar la acción
    const result = calculator.calculate(params);

    // Assert — verificar el resultado
    expect(result.amount).toBe(0);
  });
});
```

### Las tres partes de un test (AAA)

```
Arrange → Act → Assert
   │         │       │
preparar  ejecutar  verificar
los datos  el código  el resultado
```

Esta separación no es opcional. Si no podés distinguir las tres partes en un test, el test está mal escrito.

### Nombres de tests

El nombre del test es su documentación. Debe leerse como una oración:

```typescript
// MAL — no dice qué se espera
it('fuel cost', () => { ... })

// BIEN — describe el comportamiento esperado
it('should return zero fuel cost when distance is zero', () => { ... })
it('should calculate higher cost for city driving vs highway', () => { ... })
it('should throw InvalidCoordinateException when lat is out of range', () => { ... })
```

Formato recomendado: `should [resultado esperado] when [condición]`

---

## 4. Matchers — las aserciones

Un matcher es lo que va después de `expect(valor)`. Es la verificación.

### Los más usados

```typescript
// Igualdad exacta (usa === internamente)
expect(result).toBe(42);
expect(result).toBe('MXN');

// Igualdad profunda (compara objetos y arrays)
expect(result).toEqual({ amount: 100, currency: 'MXN' });

// Negación — el NOT de cualquier matcher
expect(result).not.toBe(0);
expect(result).not.toBeNull();

// Verdad / falsedad
expect(result).toBeTruthy();    // cualquier valor truthy
expect(result).toBeFalsy();     // null, undefined, 0, ''
expect(result).toBeNull();
expect(result).toBeUndefined();
expect(result).toBeDefined();

// Números
expect(result).toBeGreaterThan(0);
expect(result).toBeGreaterThanOrEqual(10);
expect(result).toBeLessThan(100);
expect(result).toBeCloseTo(1562.85, 2);  // 2 decimales — para floats

// Strings
expect(message).toContain('error');
expect(message).toMatch(/^Error:/);    // regex

// Arrays
expect(labels).toHaveLength(2);
expect(labels).toContain('FASTEST');
expect(labels).toEqual(expect.arrayContaining(['FASTEST', 'CHEAPEST']));

// Objetos
expect(route).toHaveProperty('labels');
expect(route).toHaveProperty('costs.grandTotal.amount', 360);

// Excepciones
expect(() => calculator.calculate(params)).toThrow();
expect(() => calculator.calculate(params)).toThrow(InvalidCoordinateException);
expect(() => calculator.calculate(params)).toThrow('distance must be positive');

// Promesas que lanzan error
await expect(service.execute(command)).rejects.toThrow(NotFoundException);
await expect(service.execute(command)).rejects.toThrow('Vehicle not found');

// Promesas que resuelven
await expect(service.execute(command)).resolves.toEqual({ id: 'abc' });
```

---

## 5. Unit tests — servicios de dominio

Los servicios de dominio (`domain/services/`) son la parte más fácil de testear porque son **funciones puras**: reciben parámetros, devuelven un resultado, sin efectos secundarios, sin base de datos, sin HTTP.

### Ejemplo: FuelCostCalculator

Archivo: `src/routing/domain/services/fuel-cost-calculator.spec.ts`

```typescript
import { FuelCostCalculator } from './fuel-cost-calculator';

describe('FuelCostCalculator', () => {
  let calculator: FuelCostCalculator;

  // beforeEach → se ejecuta ANTES de cada test
  // Crea una instancia fresca para que los tests no se contaminen entre sí
  beforeEach(() => {
    calculator = new FuelCostCalculator();
  });

  describe('when distance is zero or negative', () => {
    it('should return zero cost when distanceMeters is 0', () => {
      const result = calculator.calculate({
        distanceMeters: 0,
        cityRatio: 0.2,
        cityKmpl: 10,
        hwyKmpl: 14,
        fuelPricePerLiter: 22.5,
        currency: 'MXN',
      });

      expect(result.amount).toBe(0);
      expect(result.currency).toBe('MXN');
    });

    it('should return zero cost when distanceMeters is negative', () => {
      const result = calculator.calculate({
        distanceMeters: -100,
        cityRatio: 0.2,
        cityKmpl: 10,
        hwyKmpl: 14,
        fuelPricePerLiter: 22.5,
        currency: 'MXN',
      });

      expect(result.amount).toBe(0);
    });
  });

  describe('when efficiency is zero', () => {
    it('should return zero cost when both kmpl values are zero', () => {
      const result = calculator.calculate({
        distanceMeters: 100_000,
        cityRatio: 0.2,
        cityKmpl: 0,   // ← sin datos de eficiencia
        hwyKmpl: 0,
        fuelPricePerLiter: 22.5,
        currency: 'MXN',
      });

      expect(result.amount).toBe(0);
    });
  });

  describe('CDMX to Monterrey example', () => {
    it('should calculate correct fuel cost for a 921km route', () => {
      // Arrange
      const params = {
        distanceMeters: 921_400,
        cityRatio: 0.2,        // 20% ciudad, 80% carretera
        cityKmpl: 10.5,
        hwyKmpl: 14.2,
        fuelPricePerLiter: 22.5,
        currency: 'MXN' as const,
      };

      // Act
      const result = calculator.calculate(params);

      // Assert — usamos toBeCloseTo porque es un float
      // distanceKm = 921.4
      // cityKm = 184.28 → 17.55 L
      // hwyKm  = 737.12 → 51.91 L
      // total  = 69.46 L × 22.5 = 1562.85
      expect(result.amount).toBeCloseTo(1562.85, 1);
      expect(result.currency).toBe('MXN');
    });
  });

  describe('cityRatio edge cases', () => {
    it('should clamp cityRatio to 1 when it exceeds 1', () => {
      const result = calculator.calculate({
        distanceMeters: 100_000,
        cityRatio: 1.5,   // inválido — debería tratarse como 1
        cityKmpl: 10,
        hwyKmpl: 14,
        fuelPricePerLiter: 22.5,
        currency: 'MXN',
      });

      // Con cityRatio = 1: todo es ciudad, 0 km de carretera
      // 100 km / 10 kmpl = 10 L × 22.5 = 225
      expect(result.amount).toBeCloseTo(225, 1);
    });
  });
});
```

**Para correr solo este test:**
```bash
npm test -- fuel-cost-calculator
```

---

## 6. Mocks — simular dependencias

Un **mock** reemplaza una dependencia real por una versión falsa que vos controlás.

### ¿Cuándo mockear?

```
MOCKEAR cuando la dependencia:
  ✅ hace llamadas HTTP (TollguruClient)
  ✅ lee/escribe en DB (TollCalculationRepositoryPort)
  ✅ tiene side effects (emails, logs, eventos)
  ✅ es lenta (> 10ms)
  ✅ es no-determinista (fechas, UUIDs, randoms)

NO MOCKEAR cuando:
  ❌ es lógica de dominio pura (FuelCostCalculator, RouteScorer)
  ❌ es una utilidad sin efectos (hashObject, roundMxn)
```

### Tipos de mock en Jest

#### 1. jest.fn() — función falsa

```typescript
// Crea una función que no hace nada por defecto
const mockFn = jest.fn();

// Podés decirle qué devolver
mockFn.mockReturnValue(42);
mockFn.mockReturnValueOnce(100);   // solo la primera vez

// Para promesas
mockFn.mockResolvedValue({ id: 'abc' });
mockFn.mockRejectedValue(new Error('DB error'));

// Verificar que fue llamada
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(1);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

#### 2. jest.spyOn() — espiar un método real

```typescript
// Espía el método pero lo deja funcionar normalmente
const spy = jest.spyOn(calculator, 'calculate');

// O lo reemplaza
jest.spyOn(calculator, 'calculate').mockReturnValue({ amount: 0, currency: 'MXN' });

// Verificar que fue llamado
expect(spy).toHaveBeenCalledWith(expect.objectContaining({ distanceMeters: 921400 }));

// Restaurar el original
spy.mockRestore();
```

#### 3. Mock de un módulo completo

```typescript
// Mockea todo el módulo uuid
jest.mock('uuid', () => ({
  v4: () => 'fixed-uuid-for-testing',
}));
```

### Cómo crear un mock de un port (repositorio)

En arquitectura hexagonal, los ports son abstract classes. Para mockearlos:

```typescript
// Forma recomendada: objeto con jest.fn() por cada método
const mockCalcRepo = {
  save: jest.fn(),
  findById: jest.fn(),
  findByHash: jest.fn(),
  findByUser: jest.fn(),
};
```

---

## 7. Unit tests — use cases con dependencias

Los use cases (application services) tienen dependencias: repositorios, providers, config. Los mockeamos para testear la lógica en aislamiento.

### Ejemplo: CalculationHistoryApplicationService

Archivo: `src/routing/application/services/calculation-history-application.service.spec.ts`

```typescript
import { CalculationHistoryApplicationService } from './calculation-history-application.service';
import { TollCalculationRepositoryPort } from '../../domain/ports/out/toll-calculation-repository.port';

describe('CalculationHistoryApplicationService', () => {
  let service: CalculationHistoryApplicationService;
  let mockCalcRepo: jest.Mocked<TollCalculationRepositoryPort>;

  beforeEach(() => {
    // Crear el mock del repositorio
    mockCalcRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByHash: jest.fn(),
      findByUser: jest.fn(),
    } as unknown as jest.Mocked<TollCalculationRepositoryPort>;

    // Instanciar el servicio con el mock inyectado
    service = new CalculationHistoryApplicationService(mockCalcRepo);
  });

  // Limpiar mocks después de cada test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should delegate to repository with correct pagination', async () => {
      // Arrange
      const userId = 'user-uuid';
      const page = 1;
      const limit = 10;
      const fakeResult = { data: [], total: 0 };

      mockCalcRepo.findByUser.mockResolvedValue(fakeResult);

      // Act
      const result = await service.execute({ userId, page, limit });

      // Assert — verificar que se llamó al repo con los parámetros correctos
      expect(mockCalcRepo.findByUser).toHaveBeenCalledWith(userId, page, limit);
      expect(result).toEqual(fakeResult);
    });

    it('should cap limit at 50 when a higher value is provided', async () => {
      // Arrange
      mockCalcRepo.findByUser.mockResolvedValue({ data: [], total: 0 });

      // Act
      await service.execute({ userId: 'u1', page: 1, limit: 200 });

      // Assert — el limit que llega al repo debe ser máximo 50
      expect(mockCalcRepo.findByUser).toHaveBeenCalledWith('u1', 1, 50);
    });

    it('should return data and total from repository', async () => {
      // Arrange
      const mockData = [{ id: 'calc-1', userId: 'u1', routes: [] }] as any;
      mockCalcRepo.findByUser.mockResolvedValue({ data: mockData, total: 1 });

      // Act
      const result = await service.execute({ userId: 'u1', page: 1, limit: 10 });

      // Assert
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });
});
```

### Ejemplo con múltiples dependencias y error esperado

```typescript
describe('when vehicle does not exist', () => {
  it('should throw NotFoundException', async () => {
    // Arrange — el repo de vehículos devuelve null
    mockVehicleRepo.findById.mockResolvedValue(null);

    const command = { userId: 'u1', vehicleId: 'v-not-found', /* ... */ };

    // Assert — verificar que lanza la excepción correcta
    await expect(service.execute(command)).rejects.toThrow('Vehicle not found');

    // Verificar que NO se llamó al provider (short-circuit correcto)
    expect(mockTollProvider.calculateRoute).not.toHaveBeenCalled();
  });
});
```

---

## 8. Integration tests — NestJS Testing Module

Los tests de integración usan el `TestingModule` de NestJS para levantar una porción del sistema con dependencias reales (o semi-reales). Son más lentos pero prueban que todo se conecta bien.

### Estructura básica

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TollController } from './toll.controller';
import { CalculateTollUseCase } from '../../domain/ports/in/calculate-toll.use-case';
import { CompareRoutesUseCase } from '../../domain/ports/in/compare-routes.use-case';

describe('TollController (integration)', () => {
  let controller: TollController;
  let mockCalculateToll: jest.Mocked<CalculateTollUseCase>;

  beforeEach(async () => {
    // Crear los mocks
    mockCalculateToll = { execute: jest.fn() } as any;

    // Crear el módulo de testing con providers mockeados
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TollController],
      providers: [
        {
          provide: CalculateTollUseCase,
          useValue: mockCalculateToll,    // ← inyectar el mock
        },
        {
          provide: CompareRoutesUseCase,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<TollController>(TollController);
  });

  it('should call execute with the correct command', async () => {
    // Arrange
    const mockResult = { id: 'calc-1', routes: [] } as any;
    mockCalculateToll.execute.mockResolvedValue(mockResult);

    const dto = {
      origin: { lat: 19.4326, lng: -99.1332 },
      destination: { lat: 25.6866, lng: -100.3161 },
      vehicleId: 'vehicle-uuid',
    };
    const req = { user: { id: 'user-uuid' } } as any;

    // Act
    await controller.calculate(dto as any, req);

    // Assert
    expect(mockCalculateToll.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-uuid',
        vehicleId: 'vehicle-uuid',
      }),
    );
  });
});
```

### Cuándo usar TestingModule vs instanciación directa

| Situación | Herramienta |
|-----------|-------------|
| Testear lógica de dominio pura | `new FuelCostCalculator()` directo |
| Testear use case con mocks | `new MyService(mockRepo, mockProvider)` directo |
| Testear controller con DI | `TestingModule` de NestJS |
| Testear guards, interceptors, pipes | `TestingModule` de NestJS |

---

## 9. E2E tests — HTTP con Supertest

Los tests E2E levantan la aplicación completa y hacen requests HTTP reales. Viven en `/test/` (fuera de `src/`).

```typescript
// test/routing.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Routing (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  // Levantar la app una sola vez para todos los tests
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],   // módulo raíz completo
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Login para obtener token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'password123' });

    jwtToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tolls/calculate', () => {
    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tolls/calculate')
        .send({})
        .expect(401);
    });

    it('should return 400 when body is missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tolls/calculate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({})          // body vacío
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 with valid request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/tolls/calculate')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          origin: { lat: 19.4326, lng: -99.1332 },
          destination: { lat: 25.6866, lng: -100.3161 },
          vehicleId: 'existing-vehicle-uuid',
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('routes');
      expect(response.body.data.routes).toBeInstanceOf(Array);
    });
  });
});
```

---

## 10. TDD — escribir el test primero

TDD (Test-Driven Development) invierte el orden: **primero el test, después el código**.

### El ciclo Red → Green → Refactor

```
🔴 RED    → escribir un test que FALLA (la funcionalidad no existe aún)
    ↓
🟢 GREEN  → escribir el MÍNIMO código para que el test pase
    ↓
🔵 REFACTOR → mejorar el código sin romper el test
    ↓
🔴 RED    → (siguiente test)
```

### Ejemplo paso a paso

**Quiero implementar: `RouteScorer` que asigna el label CHEAPEST**

**Paso 1 — 🔴 Escribir el test (falla porque el scorer no existe)**

```typescript
// route-scorer.spec.ts
import { RouteScorer } from './route-scorer';

describe('RouteScorer', () => {
  it('should label the route with lowest grandTotal as CHEAPEST', () => {
    const scorer = new RouteScorer();
    const routes = [
      { routeIndex: 0, costs: { grandTotal: { amount: 500 } }, /* ... */ },
      { routeIndex: 1, costs: { grandTotal: { amount: 300 } }, /* ... */ },
    ] as any;

    const scored = scorer.score(routes);

    expect(scored[1].labels).toContain('CHEAPEST');
    expect(scored[0].labels).not.toContain('CHEAPEST');
  });
});
```

```bash
npm test -- route-scorer  # → FALLA ✗ (expected behavior)
```

**Paso 2 — 🟢 Código mínimo para que pase**

```typescript
// route-scorer.ts
export class RouteScorer {
  score(routes: Route[]): Route[] {
    const cheapest = routes.reduce((min, r) =>
      r.costs.grandTotal.amount < min.costs.grandTotal.amount ? r : min
    );
    return routes.map(r => ({
      ...r,
      labels: r === cheapest ? ['CHEAPEST'] : [],
    }));
  }
}
```

```bash
npm test -- route-scorer  # → PASA ✓
```

**Paso 3 — 🔵 Agregar el siguiente test (FASTEST)**

```typescript
it('should label the route with lowest durationSeconds as FASTEST', () => {
  // ... nuevo test
});
```

Y así sucesivamente hasta tener el comportamiento completo.

---

## 11. Comandos de Jest

```bash
# Correr todos los tests
npm test

# Correr en modo watch (re-corre cuando cambia un archivo)
npm run test:watch

# Correr un archivo específico (por nombre parcial)
npm test -- fuel-cost-calculator
npm test -- toll-calculation.service

# Correr tests que matcheen un patrón en el nombre
npm test -- -t "should return zero"

# Correr con cobertura
npm run test:cov

# Correr tests E2E
npm run test:e2e

# Correr un test específico y ver logs
npm test -- --verbose fuel-cost-calculator

# Correr tests en un directorio
npm test -- src/routing/domain
```

### Flags útiles

```bash
--runInBand        # correr en secuencia (sin paralelismo) — útil para debug
--forceExit        # forzar salida cuando terminan (útil si quedan handles abiertos)
--no-coverage      # ignorar cobertura aunque esté configurada
--bail             # parar al primer fallo
```

---

## 12. Cobertura de código

La cobertura mide qué porcentaje del código fue ejecutado durante los tests.

```bash
npm run test:cov
```

Genera un reporte en `/coverage/lcov-report/index.html` — abrilo en el browser.

### Qué mide cada métrica

| Métrica | Qué cuenta |
|---------|-----------|
| **Statements** | Sentencias ejecutadas |
| **Branches** | Ramas de if/else/switch ejecutadas |
| **Functions** | Funciones llamadas |
| **Lines** | Líneas ejecutadas |

### Interpretación

```
100% en domain/services ← OBLIGATORIO (lógica pura, fácil de testear)
 90% en application/    ← objetivo realista
 70% en infrastructure/ ← difícil por la DB; integration tests lo cubren
```

**Advertencia:** 100% de cobertura ≠ 0 bugs. Podés ejecutar todas las líneas con tests malos que no verifican nada. La cobertura es una métrica de higiene, no de calidad.

---

## 13. Checklist antes de hacer PR

Antes de abrir un Pull Request con nueva funcionalidad:

**Tests**
- [ ] Escribí tests para el happy path (el flujo normal que funciona)
- [ ] Escribí tests para los casos borde (input vacío, null, límites)
- [ ] Escribí tests para los errores esperados (excepciones que deben lanzarse)
- [ ] `npm test` pasa sin errores
- [ ] Cobertura de domain services ≥ 90%

**Calidad**
- [ ] Cada test tiene un nombre descriptivo (`should ... when ...`)
- [ ] Las tres partes AAA son distinguibles (Arrange / Act / Assert)
- [ ] No hay tests que siempre pasan aunque el código esté roto (falsos positivos)
- [ ] Los mocks están en `beforeEach`, no a nivel de módulo

**Comandos a correr antes del PR**
```bash
npm run test:cov   # ver cobertura
npx tsc --noEmit   # verificar tipos
npm run lint       # verificar estilo
```

---

## Referencia rápida: estructura de archivos de test

```
src/
├── routing/
│   ├── domain/
│   │   └── services/
│   │       ├── fuel-cost-calculator.ts
│   │       ├── fuel-cost-calculator.spec.ts     ← unit test
│   │       ├── route-scorer.ts
│   │       └── route-scorer.spec.ts             ← unit test
│   ├── application/
│   │   └── services/
│   │       ├── toll-calculation-application.service.ts
│   │       └── toll-calculation-application.service.spec.ts  ← unit test con mocks
│   └── infrastructure/
│       └── api/
│           ├── toll.controller.ts
│           └── toll.controller.spec.ts          ← integration test con TestingModule
│
test/                                            ← E2E tests (fuera de src/)
└── routing.e2e-spec.ts
```

**Regla:** El archivo `.spec.ts` vive al lado del archivo que testea. Misma carpeta, mismo nombre, diferente extensión.
