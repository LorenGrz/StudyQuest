"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const cfg = app.get(config_1.ConfigService);
    const port = cfg.get('PORT', 3000);
    const corsOrigin = cfg.get('CORS_ORIGIN', 'http://localhost:5173');
    app.use((0, helmet_1.default)());
    app.enableCors({ origin: corsOrigin, credentials: true });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    app.setGlobalPrefix('api/v1');
    if (cfg.get('NODE_ENV') !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('StudyQuest API')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        swagger_1.SwaggerModule.setup('docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    }
    await app.listen(port);
    console.log(`🚀 API corriendo en http://localhost:${port}/api/v1`);
    console.log(`📚 Swagger en http://localhost:${port}/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map