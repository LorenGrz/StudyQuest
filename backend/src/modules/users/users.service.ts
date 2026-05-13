import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Subject } from '../subjects/subject.entity';
import { RegisterDto, UpdateProfileDto } from '../../common/dto';
import { DEFAULT_ELO } from '../../common/leagues';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: RegisterDto): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'username';
      throw new ConflictException(`El ${field} ya está en uso`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, passwordHash });
    return this.userRepo.save(user);
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['enrolledSubjects'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .addSelect('u.refreshTokens')
      .where('u.email = :email', { email })
      .getOne();
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    await this.userRepo.update(userId, dto as any);
    return this.findById(userId);
  }

  async enrollSubject(userId: string, subjectId: string): Promise<User> {
    const [user, subject] = await Promise.all([
      this.userRepo.findOne({
        where: { id: userId },
        relations: ['enrolledSubjects'],
      }),
      this.subjectRepo.findOneBy({ id: subjectId }),
    ]);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!subject) throw new NotFoundException('Materia no encontrada');

    const alreadyEnrolled = user.enrolledSubjects.some(
      (s) => s.id === subjectId,
    );
    if (alreadyEnrolled) return user;

    await this.dataSource.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .relation(User, 'enrolledSubjects')
        .of(userId)
        .add(subjectId);
      await em.increment(Subject, { id: subjectId }, 'enrolledCount', 1);
    });

    return this.findById(userId);
  }

  async unenrollSubject(userId: string, subjectId: string): Promise<User> {
    await this.dataSource.transaction(async (em) => {
      await em
        .createQueryBuilder()
        .relation(User, 'enrolledSubjects')
        .of(userId)
        .remove(subjectId);
      await em.decrement(Subject, { id: subjectId }, 'enrolledCount', 1);
    });
    return this.findById(userId);
  }

  async addXp(userId: string, xpAmount: number): Promise<void> {
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

  async updateStreak(userId: string): Promise<void> {
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

  async updateElo(userId: string, delta: number): Promise<void> {
    // Clamp so ELO never goes below 0
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        stats: () =>
          `jsonb_set(stats, '{elo}', to_jsonb(GREATEST(0, COALESCE((stats->>'elo')::int, ${DEFAULT_ELO}) + ${delta})))`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async getElo(userId: string): Promise<number> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .select(`COALESCE((u.stats->>'elo')::int, ${DEFAULT_ELO})`, 'elo')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ elo: number }>();
    return user?.elo ?? DEFAULT_ELO;
  }

  async getLeaderboard(
    subjectId: string,
    limit = 20,
  ): Promise<
    {
      rank: number;
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      elo: number;
    }[]
  > {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.enrolledSubjects', 's', 's.id = :subjectId', { subjectId })
      .select('u.id', 'userId')
      .addSelect('u.username', 'username')
      .addSelect('u.display_name', 'displayName')
      .addSelect('u.avatar_url', 'avatarUrl')
      .addSelect(`COALESCE((u.stats->>'elo')::int, ${DEFAULT_ELO})`, 'elo')
      .orderBy('elo', 'DESC')
      .limit(limit)
      .getRawMany<{
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        elo: number;
      }>();

    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  }

  async saveRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        refreshTokens: () =>
          `(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) FROM (
            SELECT t FROM jsonb_array_elements_text(
              COALESCE(refresh_tokens, '[]'::jsonb) || jsonb_build_array('${hashedToken}')
            ) WITH ORDINALITY AS arr(t, ord)
            ORDER BY ord DESC LIMIT 5
          ) sub)`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async removeRefreshToken(userId: string, hashedToken: string): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        refreshTokens: () =>
          `(SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
            FROM jsonb_array_elements_text(COALESCE(refresh_tokens, '[]'::jsonb)) AS t
            WHERE t <> '${hashedToken}')`,
      })
      .where('id = :id', { id: userId })
      .execute();
  }

  async validateRefreshToken(userId: string, token: string): Promise<boolean> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.refreshTokens')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user?.refreshTokens?.length) return false;
    for (const stored of user.refreshTokens) {
      if (await bcrypt.compare(token, stored)) return true;
    }
    return false;
  }
}
