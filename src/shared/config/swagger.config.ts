// =====================================================================
// src/shared/config/swagger.config.ts
// =====================================================================

import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API Peajes')
    .setDescription('API de cálculo de peajes para carreteras de México')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('Auth', 'Registro, login y gestión de tokens')
    .addTag('Vehicles', 'Gestión de vehículos del usuario')
    .addTag('Tolls', 'Cálculo de peajes y rutas')
    .addTag('Booths', 'Catálogo de casetas')
    .addTag('POIs', 'Puntos de interés')
    .addTag('Catalogs', 'Catálogos del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Toll API — Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
    },
  });
}
