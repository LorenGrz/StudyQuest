import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { Subject } from '../subjects/subject.entity';
import { FriendRequest } from './friend-request.entity';
import {
  RegisterDto,
  UpdateProfileDto,
  SetActiveCosmeticsDto,
  ChangePasswordDto,
} from '../../common/dto';
import { DEFAULT_ELO } from '../../common/leagues';
import { UserTitle } from '../cosmetics/user-title.entity';
import { UserInventory } from '../cosmetics/user-inventory.entity';
import { ProfileBorder } from '../cosmetics/profile-border.entity';
import { Quest } from '../quests/quest.entity';
import { PlayerResult } from '../quests/player-result.entity';

interface InventoryTitleItem {
  code: string;
  name: string;
  text: string;
  unlockedAt: Date;
}

interface InventoryBorderItem {
  code: string;
  name: string;
  imageUrl: string;
  unlockedAt: Date;
}

interface InventoryPayload {
  titles: InventoryTitleItem[];
  borders: InventoryBorderItem[];
}

import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(FriendRequest)
    private readonly friendRequestRepo: Repository<FriendRequest>,
    @InjectRepository(UserTitle)
    private readonly userTitleRepo: Repository<UserTitle>,
    @InjectRepository(UserInventory)
    private readonly userInventoryRepo: Repository<UserInventory>,
    @InjectRepository(ProfileBorder)
    private readonly profileBorderRepo: Repository<ProfileBorder>,
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    @InjectRepository(PlayerResult)
    private readonly playerResultRepo: Repository<PlayerResult>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
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

  async getDashboardStats(userId: string) {
    const totalResult = await this.dataSource.query(
      `SELECT COALESCE(SUM(total_time_ms), 0) AS total_time_ms
       FROM player_results
       WHERE user_id = $1`,
      [userId],
    );

    const subjectRows = await this.dataSource.query(
      `SELECT
         q.subject_id,
         s.name AS subject_name,
         SUM(pr.correct_answers)::int AS correct_answers,
         SUM(qc.question_count)::int AS total_questions,
         SUM(pr.total_time_ms)::int AS total_time_ms,
         COUNT(pr.id)::int AS quizzes_played
       FROM player_results pr
       JOIN quests q ON q.id = pr.quest_id
       JOIN subjects s ON s.id = q.subject_id
       JOIN (
         SELECT quest_id, COUNT(*) AS question_count
         FROM quiz_questions
         GROUP BY quest_id
       ) qc ON qc.quest_id = q.id
       WHERE pr.user_id = $1
       GROUP BY q.subject_id, s.name
       ORDER BY quizzes_played DESC`,
      [userId],
    );

    const weeklyRows = await this.dataSource.query(
      `SELECT
         date_trunc('day', created_at)::date AS day,
         SUM(total_time_ms)::int AS total_time_ms
       FROM player_results
       WHERE user_id = $1
         AND created_at >= now() - interval '6 days'
       GROUP BY day
       ORDER BY day`,
      [userId],
    );

    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      const iso = date.toISOString().slice(0, 10);
      const row = weeklyRows.find((r: any) => String(r.day).slice(0, 10) === iso);
      const minutes = row ? Math.round(row.total_time_ms / 60000) : 0;
      return { day: iso, minutes, totalTimeMs: row?.total_time_ms ?? 0 };
    });

    return {
      totalStudyMinutes: Math.round(totalResult[0]?.total_time_ms / 60000) || 0,
      weeklyStudy: days,
      subjectPerformance: subjectRows.map((row: any) => ({
        subjectId: row.subject_id,
        subjectName: row.subject_name,
        accuracy:
          row.total_questions > 0
            ? Number((row.correct_answers / row.total_questions).toFixed(3))
            : 0,
        totalQuestions: row.total_questions,
        correctAnswers: row.correct_answers,
        totalStudyMinutes: Math.round(row.total_time_ms / 60000),
        quizzesPlayed: row.quizzes_played,
      })),
    };
  }

  async createFriendRequest(requesterId: string, requesteeUsername: string): Promise<FriendRequest> {
    if (requesterId === requesteeUsername) {
      throw new BadRequestException('No podés enviarte una solicitud a vos mismo');
    }

    const targetUser = await this.userRepo.findOneBy({ username: requesteeUsername });
    if (!targetUser) {
      throw new NotFoundException('Usuario destino no encontrado');
    }

    const requesteeId = targetUser.id;

    const existingAccepted = await this.friendRequestRepo.findOne({
      where: [
        { requesterId: requesterId, requesteeId, status: 'accepted' },
        { requesterId: requesteeId, requesteeId: requesterId, status: 'accepted' },
      ],
    });
    if (existingAccepted) {
      throw new ConflictException('Ya son amigos');
    }

    const reverseRequest = await this.friendRequestRepo.findOne({
      where: { requesterId: requesteeId, requesteeId: requesterId },
    });
    if (reverseRequest?.status === 'pending') {
      reverseRequest.status = 'accepted';
      reverseRequest.respondedAt = new Date();
      return this.friendRequestRepo.save(reverseRequest);
    }

    const duplicate = await this.friendRequestRepo.findOne({
      where: { requesterId, requesteeId },
    });
    if (duplicate) {
      if (duplicate.status === 'pending') {
        throw new ConflictException('Ya enviaste esta solicitud');
      }
      duplicate.status = 'pending';
      duplicate.respondedAt = null;
      return this.friendRequestRepo.save(duplicate);
    }

    const request = this.friendRequestRepo.create({
      requesterId,
      requesteeId,
      status: 'pending',
    });
    return this.friendRequestRepo.save(request);
  }

  async getIncomingFriendRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepo.find({
      where: { requesteeId: userId, status: 'pending' },
      relations: ['requester'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOutgoingFriendRequests(userId: string): Promise<FriendRequest[]> {
    return this.friendRequestRepo.find({
      where: { requesterId: userId, status: 'pending' },
      relations: ['requestee'],
      order: { createdAt: 'DESC' },
    });
  }

  async respondFriendRequest(requestId: string, userId: string, accept: boolean): Promise<FriendRequest> {
    const request = await this.friendRequestRepo.findOne({
      where: { id: requestId },
      relations: ['requestee', 'requester'],
    });
    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (request.requesteeId !== userId) {
      throw new ForbiddenException('No podés responder esta solicitud');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('La solicitud ya fue respondida');
    }

    request.status = accept ? 'accepted' : 'rejected';
    request.respondedAt = new Date();
    return this.friendRequestRepo.save(request);
  }

  async listFriends(userId: string): Promise<User[]> {
    const acceptedRequests = await this.friendRequestRepo.find({
      where: [
        { requesterId: userId, status: 'accepted' },
        { requesteeId: userId, status: 'accepted' },
      ],
    });

    const friendIds = acceptedRequests.map((request) =>
      request.requesterId === userId ? request.requesteeId : request.requesterId,
    );
    if (!friendIds.length) return [];

    return this.userRepo.findBy({ id: In(friendIds) });
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    const existing = await this.friendRequestRepo.findOne({
      where: [
        { requesterId: userId, requesteeId: friendId, status: 'accepted' },
        { requesterId: friendId, requesteeId: userId, status: 'accepted' },
      ],
    });
    if (!existing) {
      throw new NotFoundException('No existe esa amistad');
    }
    await this.friendRequestRepo.remove(existing);
  }

  async areFriends(userA: string, userB: string): Promise<boolean> {
    if (userA === userB) return false;
    const existing = await this.friendRequestRepo.findOne({
      where: [
        { requesterId: userA, requesteeId: userB, status: 'accepted' },
        { requesterId: userB, requesteeId: userA, status: 'accepted' },
      ],
    });
    return !!existing;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    if (dto.username) {
      const existing = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }
    await this.userRepo.update(userId, dto as any);
    return this.findById(userId);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ ok: true }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepo.update(userId, { passwordHash, refreshTokens: [] });
    return { ok: true };
  }

  async setAvatar(userId: string, avatarUrl: string): Promise<User> {
    await this.userRepo.update(userId, { avatarUrl });
    return this.findById(userId);
  }

  async getInventory(userId: string): Promise<InventoryPayload> {
    const [inventory, titles, borders] = await Promise.all([
      this.userInventoryRepo.find({
        where: { userId },
        order: { unlockedAt: 'DESC' },
      }),
      this.userTitleRepo.find(),
      this.profileBorderRepo.find(),
    ]);

    const titleByCode = new Map(titles.map((item) => [item.code, item]));
    const borderByCode = new Map(borders.map((item) => [item.code, item]));

    const titleItems: InventoryTitleItem[] = [];
    const borderItems: InventoryBorderItem[] = [];

    for (const item of inventory) {
      if (item.itemType === 'title') {
        const title = titleByCode.get(item.itemCode);
        if (!title) continue;
        titleItems.push({
          code: title.code,
          name: title.name,
          text: title.text,
          unlockedAt: item.unlockedAt,
        });
      } else if (item.itemType === 'border') {
        const border = borderByCode.get(item.itemCode);
        if (!border) continue;
        borderItems.push({
          code: border.code,
          name: border.name,
          imageUrl: `/uploads/borders/${border.imageFile}`,
          unlockedAt: item.unlockedAt,
        });
      }
    }

    return { titles: titleItems, borders: borderItems };
  }

  async setActiveCosmetics(userId: string, dto: SetActiveCosmeticsDto): Promise<User> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const current = user.activeCosmetics ?? {
      titleCode: null,
      titleText: null,
      borderCode: null,
      borderImageUrl: null,
    };

    const requestedTitleCode = dto.titleCode === undefined ? current.titleCode : (dto.titleCode || null);
    const requestedBorderCode = dto.borderCode === undefined ? current.borderCode : (dto.borderCode || null);

    let titleText = current.titleText;
    let borderImageUrl = current.borderImageUrl;

    if (requestedTitleCode) {
      const [ownsTitle, title] = await Promise.all([
        this.userInventoryRepo.findOneBy({
          userId,
          itemType: 'title',
          itemCode: requestedTitleCode,
        }),
        this.userTitleRepo.findOneBy({ code: requestedTitleCode }),
      ]);
      if (!ownsTitle || !title) {
        throw new ForbiddenException('No tenés ese título desbloqueado');
      }
      titleText = title.text;
    } else {
      titleText = null;
    }

    if (requestedBorderCode) {
      const [ownsBorder, border] = await Promise.all([
        this.userInventoryRepo.findOneBy({
          userId,
          itemType: 'border',
          itemCode: requestedBorderCode,
        }),
        this.profileBorderRepo.findOneBy({ code: requestedBorderCode }),
      ]);
      if (!ownsBorder || !border) {
        throw new ForbiddenException('No tenés ese borde desbloqueado');
      }
      borderImageUrl = `/uploads/borders/${border.imageFile}`;
    } else {
      borderImageUrl = null;
    }

    user.activeCosmetics = {
      titleCode: requestedTitleCode,
      titleText,
      borderCode: requestedBorderCode,
      borderImageUrl,
    };

    await this.userRepo.save(user);
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

  async addCoins(userId: string, coinsAmount: number): Promise<void> {
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        stats: () => `jsonb_set(
          stats,
          '{coins}', to_jsonb(COALESCE((stats->>'coins')::int, 0) + ${coinsAmount})
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
    // 1. Read current ELO before update
    const before = await this.getElo(userId);

    // 2. Apply ELO change (clamp >= 0)
    await this.userRepo
      .createQueryBuilder()
      .update()
      .set({
        stats: () =>
          `jsonb_set(stats, '{elo}', to_jsonb(GREATEST(0, COALESCE((stats->>'elo')::int, ${DEFAULT_ELO}) + ${delta})))`,
      })
      .where('id = :id', { id: userId })
      .execute();

    // 3. Emit event so achievements service can process league promotions
    if (delta > 0) {
      const after = await this.getElo(userId);
      this.eventEmitter.emit('user.elo_updated', { userId, eloBefore: before, eloAfter: after });
    }
  }

  async getElo(userId: string): Promise<number> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .select(`COALESCE((u.stats->>'elo')::int, ${DEFAULT_ELO})`, 'elo')
      .where('u.id = :id', { id: userId })
      .getRawOne<{ elo: number }>();
    return user?.elo ?? DEFAULT_ELO;
  }

  async getGlobalLeaderboard(
    limit = 20,
  ): Promise<
    {
      rank: number;
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
      activeCosmetics: any;
      elo: number;
    }[]
  > {
    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select('u.id', 'userId')
      .addSelect('u.username', 'username')
      .addSelect('u.display_name', 'displayName')
      .addSelect('u.avatar_url', 'avatarUrl')
      .addSelect('u.active_cosmetics', 'activeCosmetics')
      .addSelect(`COALESCE((u.stats->>'elo')::int, ${DEFAULT_ELO})`, 'elo')
      .orderBy('elo', 'DESC')
      .limit(limit)
      .getRawMany<{
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        activeCosmetics: any;
        elo: number;
      }>();

    return rows.map((row, index) => ({ rank: index + 1, ...row }));
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
      activeCosmetics: any;
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
      .addSelect('u.active_cosmetics', 'activeCosmetics')
      .addSelect(`COALESCE((u.stats->>'elo')::int, ${DEFAULT_ELO})`, 'elo')
      .orderBy('elo', 'DESC')
      .limit(limit)
      .getRawMany<{
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
        activeCosmetics: any;
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

  async getRecommendedQuests(
    userId: string,
    page = 1,
    limit = 10,
    subjectId?: string,
  ) {
    // 1. Cargar usuario con materias inscriptas
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['enrolledSubjects'],
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const enrolledSubjectIds = user.enrolledSubjects.map((s) => s.id);
    if (enrolledSubjectIds.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 2. Obtener IDs de quests ya jugadas por el usuario (deduplicación en BD)
    const playedQuestResults = await this.playerResultRepo
      .createQueryBuilder('result')
      .select('DISTINCT result.questId', 'questId')
      .where('result.userId = :userId', { userId })
      .getRawMany<{ questId: string }>();
    const playedQuestIds = playedQuestResults.map((r) => r.questId);

    // Parámetros comunes para ambas queries
    const queryParams = {
      enrolledSubjectIds,
      validStatuses: ['ready', 'active', 'completed'],
      userId,
    };
    if (subjectId) {
      queryParams['subjectId'] = subjectId;
    }

    // 3. Query 1: Contar total de quests disponibles (COUNT DISTINCT sin GROUP BY)
    let countQb = this.questRepo
      .createQueryBuilder('q')
      .select('COUNT(DISTINCT q.id)', 'total')
      .leftJoin('q.subject', 'subject')
      .where('q.subjectId IN (:...enrolledSubjectIds)', queryParams)
      .andWhere('q.status IN (:...validStatuses)', queryParams)
      .andWhere('subject.isActive = true', queryParams);

    if (playedQuestIds.length > 0) {
      countQb = countQb.andWhere('q.id NOT IN (:...playedQuestIds)', {
        ...queryParams,
        playedQuestIds,
      });
    }

    if (subjectId) {
      countQb = countQb.andWhere('q.subjectId = :subjectId', queryParams);
    }

    const countResult = await countQb.getRawOne<{ total: string }>();
    const total = parseInt(countResult?.total ?? '0', 10);

    // Si total es 0, retornar respuesta vacía
    if (total === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
      };
    }

    // 4. Query 2: Obtener quests con play count (GROUP BY para aggregación)
    const offset = (page - 1) * limit;
    let dataQb = this.questRepo
      .createQueryBuilder('q')
      .leftJoin('q.results', 'result')
      .leftJoin('q.subject', 'subject')
      .select('q.id', 'id')
      .addSelect('q.title', 'title')
      .addSelect('q.subjectId', 'subjectId')
      .addSelect('subject.name', 'subjectName')
      .addSelect('q.partyId', 'partyId')
      .addSelect('q.status', 'status')
      .addSelect('q.createdAt', 'createdAt')
      .addSelect('COUNT(DISTINCT result.id)', 'playCount')
      .where('q.subjectId IN (:...enrolledSubjectIds)', queryParams)
      .andWhere('q.status IN (:...validStatuses)', queryParams)
      .andWhere('subject.isActive = true', queryParams)
      .groupBy('q.id')
      .addGroupBy('subject.id')
      .orderBy('playCount', 'DESC')
      .addOrderBy('q.createdAt', 'DESC')
      .offset(offset)
      .limit(limit);

    if (playedQuestIds.length > 0) {
      dataQb = dataQb.andWhere('q.id NOT IN (:...playedQuestIds)', {
        ...queryParams,
        playedQuestIds,
      });
    }

    if (subjectId) {
      dataQb = dataQb.andWhere('q.subjectId = :subjectId', queryParams);
    }

    const rawQuests = await dataQb.getRawMany<{
      id: string;
      title: string;
      subjectId: string;
      subjectName: string;
      partyId: string;
      status: string;
      createdAt: Date;
      playCount: string;
    }>();

    // 5. Transformar raw results a DTOs con playCount como número
    const items = rawQuests.map((quest) => ({
      id: quest.id,
      title: quest.title,
      subjectId: quest.subjectId,
      subjectName: quest.subjectName,
      partyId: quest.partyId,
      status: quest.status,
      createdAt: quest.createdAt,
      playCount: parseInt(quest.playCount, 10),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getQuestsForToday(userId: string): Promise<any[]> {
    const result = await this.getRecommendedQuests(userId, 1, 10);
    return result.items;
  }
}
