"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("./user.entity");
const subject_entity_1 = require("../subjects/subject.entity");
let UsersService = class UsersService {
    userRepo;
    subjectRepo;
    dataSource;
    constructor(userRepo, subjectRepo, dataSource) {
        this.userRepo = userRepo;
        this.subjectRepo = subjectRepo;
        this.dataSource = dataSource;
    }
    async create(dto) {
        const existing = await this.userRepo.findOne({
            where: [{ email: dto.email }, { username: dto.username }],
        });
        if (existing) {
            const field = existing.email === dto.email ? 'email' : 'username';
            throw new common_1.ConflictException(`El ${field} ya está en uso`);
        }
        const passwordHash = await bcrypt.hash(dto.password, 12);
        const user = this.userRepo.create({ ...dto, passwordHash });
        return this.userRepo.save(user);
    }
    async findById(id) {
        const user = await this.userRepo.findOne({
            where: { id },
            relations: ['enrolledSubjects'],
        });
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        return user;
    }
    async findByEmail(email) {
        return this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.passwordHash')
            .addSelect('u.refreshTokens')
            .where('u.email = :email', { email })
            .getOne();
    }
    async updateProfile(userId, dto) {
        await this.userRepo.update(userId, dto);
        return this.findById(userId);
    }
    async enrollSubject(userId, subjectId) {
        const [user, subject] = await Promise.all([
            this.userRepo.findOne({
                where: { id: userId },
                relations: ['enrolledSubjects'],
            }),
            this.subjectRepo.findOneBy({ id: subjectId }),
        ]);
        if (!user)
            throw new common_1.NotFoundException('Usuario no encontrado');
        if (!subject)
            throw new common_1.NotFoundException('Materia no encontrada');
        const alreadyEnrolled = user.enrolledSubjects.some((s) => s.id === subjectId);
        if (alreadyEnrolled)
            return user;
        await this.dataSource.transaction(async (em) => {
            await em
                .createQueryBuilder()
                .relation(user_entity_1.User, 'enrolledSubjects')
                .of(userId)
                .add(subjectId);
            await em.increment(subject_entity_1.Subject, { id: subjectId }, 'enrolledCount', 1);
        });
        return this.findById(userId);
    }
    async unenrollSubject(userId, subjectId) {
        await this.dataSource.transaction(async (em) => {
            await em
                .createQueryBuilder()
                .relation(user_entity_1.User, 'enrolledSubjects')
                .of(userId)
                .remove(subjectId);
            await em.decrement(subject_entity_1.Subject, { id: subjectId }, 'enrolledCount', 1);
        });
        return this.findById(userId);
    }
    async addXp(userId, xpAmount) {
        await this.userRepo
            .createQueryBuilder()
            .update()
            .set({
            stats: () => `jsonb_set(
          jsonb_set(
            jsonb_set(stats, '{xp}', to_jsonb((stats->>'xp')::int + ${xpAmount})),
            '{quizzesPlayed}', to_jsonb((stats->>'quizzesPlayed')::int + 1)
          ),
          '{level}', to_jsonb(floor(sqrt(((stats->>'xp')::int + ${xpAmount}) / 100.0))::int)
        )`,
        })
            .where('id = :id', { id: userId })
            .execute();
    }
    async updateStreak(userId) {
        await this.userRepo
            .createQueryBuilder()
            .update()
            .set({
            stats: () => `
          CASE
            WHEN (stats->>'lastPlayedAt') IS NULL
              OR NOW() - (stats->>'lastPlayedAt')::timestamptz > INTERVAL '48 hours'
            THEN jsonb_set(jsonb_set(stats,
                '{currentStreak}', '1'::jsonb),
                '{lastPlayedAt}', to_jsonb(NOW()::text))
            WHEN NOW() - (stats->>'lastPlayedAt')::timestamptz > INTERVAL '24 hours'
            THEN jsonb_set(jsonb_set(jsonb_set(stats,
                '{currentStreak}', to_jsonb((stats->>'currentStreak')::int + 1)),
                '{longestStreak}', to_jsonb(GREATEST((stats->>'longestStreak')::int, (stats->>'currentStreak')::int + 1))),
                '{lastPlayedAt}', to_jsonb(NOW()::text))
            ELSE stats
          END
        `,
        })
            .where('id = :id', { id: userId })
            .execute();
    }
    async saveRefreshToken(userId, hashedToken) {
        await this.userRepo
            .createQueryBuilder()
            .update()
            .set({
            refreshTokens: () => `(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
            SELECT t FROM jsonb_array_elements_text(
              COALESCE(refresh_tokens, '[]'::jsonb) || jsonb_build_array('${hashedToken}')
            ) WITH ORDINALITY AS arr(t, ord)
            ORDER BY ord DESC LIMIT 5
          ) sub)`,
        })
            .where('id = :id', { id: userId })
            .execute();
    }
    async removeRefreshToken(userId, hashedToken) {
        await this.userRepo
            .createQueryBuilder()
            .update()
            .set({
            refreshTokens: () => `(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
            FROM jsonb_array_elements_text(COALESCE(refresh_tokens, '[]'::jsonb)) AS t
            WHERE t <> '${hashedToken}')`,
        })
            .where('id = :id', { id: userId })
            .execute();
    }
    async validateRefreshToken(userId, token) {
        const user = await this.userRepo
            .createQueryBuilder('u')
            .addSelect('u.refreshTokens')
            .where('u.id = :id', { id: userId })
            .getOne();
        if (!user?.refreshTokens?.length)
            return false;
        for (const stored of user.refreshTokens) {
            if (await bcrypt.compare(token, stored))
                return true;
        }
        return false;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(subject_entity_1.Subject)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], UsersService);
//# sourceMappingURL=users.service.js.map