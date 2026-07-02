import './instrument';
import { NestFactory } from '@nestjs/core';
import {
  LoggerService,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, {
      bufferLogs: true,
      rawBody: true,
    });
    app.enableShutdownHooks();
    // Use Winston logger
    const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
    app.useLogger(logger);

    // Enable validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        exceptionFactory: (errors) => {
          // Pass validation errors to the global exception filter for formatting
          return new BadRequestException(errors);
        },
      }),
    );

    // Global exception filter for consistent error responses
    app.useGlobalFilters(new GlobalExceptionFilter());

    // Enable CORS for frontend
    app.enableCors();

    const nodeEnv = (process.env.NODE_ENV ?? 'development').toLowerCase();
    if (nodeEnv !== 'uat') {
      const config = new DocumentBuilder()
        .setTitle('BSP API')
        .setDescription('BSP API Documentation')
        .setVersion('1.0')
        .addTag('BSP')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter Cognito JWT token',
          },
          'bearer',
        )
        .build();
      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, documentFactory);
    } else {
      logger.log('Swagger disabled in UAT (NODE_ENV=uat)', 'Bootstrap');
    }

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`BSP API is running on: http://0.0.0.0:${port}`, 'Bootstrap');
  } catch (error) {
    // Use console.error as fallback if logger is not available
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}
void bootstrap();
