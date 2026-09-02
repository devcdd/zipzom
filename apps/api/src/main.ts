import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

// 루트 .env 하나로 api/web 공유. 없으면(CI, 컨테이너) 실제 환경변수 사용
try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
