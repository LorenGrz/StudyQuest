import { ValidationPipe } from '@nestjs/common';

/** The app-wide ValidationPipe (main.ts). Exported so HTTP tests use the same one. */
export function globalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  });
}
