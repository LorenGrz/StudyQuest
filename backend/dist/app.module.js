"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const event_emitter_1 = require("@nestjs/event-emitter");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const users_module_1 = require("./modules/users/users.module");
const auth_module_1 = require("./modules/auth/auth.module");
const subjects_module_1 = require("./modules/subjects/subjects.module");
const parties_module_1 = require("./modules/parties/parties.module");
const quests_module_1 = require("./modules/quests/quests.module");
const ai_module_1 = require("./modules/ai/ai.module");
const matchmaking_module_1 = require("./gateways/matchmaking/matchmaking.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (cfg) => ({
                    type: 'postgres',
                    host: cfg.get('POSTGRES_HOST', 'localhost'),
                    port: cfg.get('POSTGRES_PORT', 5432),
                    username: cfg.get('POSTGRES_USER', 'studyquest'),
                    password: cfg.get('POSTGRES_PASSWORD'),
                    database: cfg.get('POSTGRES_DB', 'studyquest'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                    synchronize: cfg.get('TYPEORM_SYNC') === 'true',
                    logging: cfg.get('TYPEORM_LOGGING') === 'true',
                    extra: { max: 10 },
                }),
            }),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            platform_express_1.MulterModule.register({
                storage: (0, multer_1.diskStorage)({
                    destination: './uploads',
                    filename: (_req, file, cb) => cb(null, `${(0, uuid_1.v4)()}${(0, path_1.extname)(file.originalname)}`),
                }),
                fileFilter: (_req, file, cb) => {
                    const allowed = ['application/pdf', 'text/plain'];
                    cb(null, allowed.includes(file.mimetype));
                },
                limits: { fileSize: 10 * 1024 * 1024 },
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            subjects_module_1.SubjectsModule,
            parties_module_1.PartiesModule,
            quests_module_1.QuestsModule,
            ai_module_1.AiModule,
            matchmaking_module_1.MatchmakingModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map