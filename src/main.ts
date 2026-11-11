import 'dotenv/config';
import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'node:path';
import { AppModule } from './app.module';

/** Configuração compartilhada entre a API real e os testes de integração. */
export function configurarApp(app: INestApplication): void {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarApp(app);
  // RF08: painel web em http://localhost:3000/ (public/index.html)
  app.useStaticAssets(join(__dirname, '..', 'public'));
  const doc = new DocumentBuilder()
    .setTitle('FlagLab API')
    .setDescription('Feature flags com configuração versionada: laboratório de Gerência de Configuração')
    .setVersion(process.env.npm_package_version ?? '0.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'api-key')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
  const porta = Number(process.env.PORT ?? 3000);
  await app.listen(porta);
  console.log(`FlagLab em http://localhost:${porta} (painel) · documentação em /docs`);
}

if (require.main === module) {
  void bootstrap();
}
