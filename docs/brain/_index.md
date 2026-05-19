# Cerebro — api-peajes

> Este es el espacio de pensamiento del proyecto. No es código ni especificaciones — son ideas, preguntas, tradeoffs y consejos que dan forma a cómo crece el proyecto.

---

## Mapa de contenido

### Ideas
- [[ideas/features-pendientes]] — Qué no está construido todavía y por qué importa
- [[ideas/mejoras-arquitectura]] — Mejoras arquitectónicas que vale la pena considerar
- [[ideas/integraciones-futuras]] — Servicios externos y sistemas a conectar

### Consejos
- [[consejos/testing-strategy]] — Cómo construir una suite de tests que realmente te proteja
- [[consejos/performance]] — Dónde va a chocar esta API y cómo prevenirlo
- [[consejos/seguridad]] — Agujeros de seguridad a cerrar antes de ir a producción
- [[consejos/deploy]] — De Docker Compose a un deploy de nivel productivo

---

## Decisiones ya tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Arquitectura | Hexagonal / Screaming | El dominio queda limpio, testeable, sin acoplamiento a frameworks |
| Acceso a BD | SQL puro vía `em.query()` | PostGIS, control total, sin magia del ORM |
| Auth | JWT dual + rotación de refresh | Acceso stateless, refresh revocable |
| Hash de contraseñas | bcryptjs (10 rounds) | Battle-tested, suficiente para esta escala |
| Proveedor de peajes | Mock (v1) → TollGuru (v2) | Puerto intercambiable — cambio sin tocar el dominio |
| Testing | Jest unit + integration + E2E | Pirámide completa |

---

## Preguntas abiertas

- [ ] ¿Cuándo pasamos del proveedor mock a la API real de TollGuru?
- [ ] ¿Necesitamos Redis para la blacklist de refresh tokens a escala?
- [ ] ¿Deberíamos exponer un webhook cuando cambia una tarifa de peaje?
- [ ] ¿Necesitamos multi-tenancy (operadores de flotas B2B)?
- [ ] Conversión de moneda: MXN → USD es un stub — ¿qué proveedor usamos?
