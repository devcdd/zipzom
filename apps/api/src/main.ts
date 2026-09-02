import { NestFactory } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AppModule } from './app.module.js';
import { refreshSessionIfNeeded } from './auth/auth.js';

// 루트 .env 하나로 api/web 공유. 없으면(CI, 컨테이너) 실제 환경변수 사용
try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  // 세션 슬라이딩 갱신. 라우트보다 먼저 돌아야 응답 헤더에 쿠키가 실린다
  app.use((req: Request, res: Response, next: () => void) => {
    refreshSessionIfNeeded(req, res);
    next();
  });
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173' });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
