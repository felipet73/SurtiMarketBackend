import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';



async function bootstrap() {  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
    setHeaders: (res) => {
      // ✅ permite que el frontend (8100) use imágenes del backend (3000)
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      // opcional: caching
      res.setHeader('Cache-Control', 'public, max-age=86400');
    },
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();