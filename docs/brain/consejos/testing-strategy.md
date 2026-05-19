# Estrategia de testing

## La pirámide

```
        /\
       /E2E\       ← pocos, lentos, costosos — solo flujos críticos
      /──────\
     /Integración\ ← testear el wiring de módulos, queries a BD, I/O real
    /──────────────\
   /  Tests unitarios\ ← rápidos, aislados, sin I/O — testear lógica de dominio
  /──────────────────\
```

**Estado actual del proyecto:**
- Unitarios: ✅ servicio de auth, servicios de dominio de routing, servicio de vehicles
- Integración: 🔶 existe pero está delgado
- E2E: 🔶 auth y toll calculation tienen specs pero necesitan fixtures

---

## Qué testear y dónde

### Dominio (unitarios) — mayor retorno sobre inversión

No tienen dependencias externas. Son rápidos y confiables.

```
routing/domain/services/
  fuel-cost-calculator.spec.ts   ✅ existe
  toll-cost-aggregator.spec.ts   ✅ existe
  route-scorer.spec.ts           ✅ existe
  arrival-time-estimator.spec.ts ❌ falta
```

Cada camino de cálculo (`FuelCostCalculator`, `TollCostAggregator`) debe tener tests de casos borde:
- Distancia cero
- Vehículo eléctrico (sin costo de combustible)
- Ruta sin tags disponibles (solo efectivo)
- Rutas idénticas (desempate en scoring)

### Servicios de aplicación (unitarios con mocks)

Mockear los puertos — testear solo la lógica de orquestación.

```ts
// Qué verificar en TollCalculationApplicationService:
// 1. Cache hit → retorna el cacheado, nunca llama al proveedor
// 2. Vehículo no encontrado → lanza VehicleNotFoundException
// 3. Proveedor falla → lanza TollProviderException (502)
// 4. Éxito → guarda en BD, retorna DTO mapeado
```

No testear el adaptador de BD ni el cliente HTTP aquí. Eso pertenece a integración.

### Adaptadores (integración)

Necesitan una base de datos real. Usar `testcontainers` o un Docker Compose local con una BD de test.

```
test/integration/
  auth-user-repository.spec.ts          ← INSERT, SELECT, restricción de unicidad
  toll-calculation-repository.spec.ts   ← caché por hash, queries con JOIN
  booth-repository.spec.ts              ← PostGIS ST_DWithin retorna resultados correctos
```

**Importante:** los tests de integración deben usar un esquema de BD separado o correr dentro de una transacción que haga rollback después de cada test. Nunca compartir estado entre tests.

### E2E (stack completo)

Testear la capa HTTP de punta a punta. Supertest + BD real (BD de test, no producción).

Flujos críticos a cubrir:
1. Registro → login → acceder endpoint protegido → refresh → logout
2. Crear vehículo → calcular peaje → ver historial → comparar rutas
3. Búsqueda de casetas cercanas con coordenadas conocidas

---

## Errores comunes a evitar

**No mockees lo que no es tuyo.** Mockear solo tus propios puertos (interfaces). Nunca mockear internals de TypeORM o NestJS — si necesitás testear eso, usá tests de integración.

**No hagas asserts sobre detalles de implementación.** Testear comportamiento: dado este input, esperar este output. No: "esperar que `save()` fue llamado una vez".

**No saltes los tests del dominio.** Los servicios de dominio son los tests más valiosos del proyecto. `FuelCostCalculator` con un vehículo conocido + ruta conocida siempre debe retornar el mismo número.

**No escribas tests después de los bugs.** Escribir un test que falle reproduciendo el bug, luego arreglarlo. Es la única manera de saber que el test realmente te protege.

---

## Objetivos de cobertura

| Capa | Objetivo |
|---|---|
| Modelos y servicios de dominio | 90%+ |
| Servicios de aplicación | 80%+ |
| Adaptadores de infraestructura | 60%+ (cubierto por integración) |
| Controladores | 50%+ (cubierto por E2E) |

La cobertura es una señal, no un objetivo. 100% de cobertura con malos tests da falsa confianza. 70% con tests de dominio sólidos es mejor.

---

## TDD en este proyecto

El Strict TDD está **activo** — lo que significa: primero escribir el test que falla, luego escribir el código.

Para features nuevas:
1. Definir la firma del método en el puerto
2. Escribir el test unitario para el servicio de aplicación (puerto mockeado)
3. Escribir el test unitario para la lógica de dominio
4. Implementar
5. Escribir el test de integración para el adaptador

Para corrección de bugs:
1. Reproducir el bug con un test que falle
2. Arreglar el código
3. Confirmar que el test pasa
4. Nunca borrar el test
