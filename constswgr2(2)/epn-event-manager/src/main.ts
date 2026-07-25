import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3002;
  const logger = new Logger('Bootstrap');

  await app.listen(port, () => {
    logger.log(
      JSON.stringify({
        context: 'Bootstrap',
        operation: 'listen',
        status: 'started',
        message: `Event Manager running on http://localhost:${port}`,
      }),
    );
  });
}

void bootstrap();
