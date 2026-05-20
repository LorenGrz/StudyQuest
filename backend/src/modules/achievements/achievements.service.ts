import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { Achievement } from './achievement.entity';
import { UserAchievement } from './user-achievement.entity';
import { UsersService } from '../users/users.service';
import { PartyMember } from '../parties/party-member.entity';
import { UserTitle } from '../cosmetics/user-title.entity';
import { UserInventory } from '../cosmetics/user-inventory.entity';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(PartyMember)
    private readonly partyMemberRepo: Repository<PartyMember>,
    @InjectRepository(UserTitle)
    private readonly userTitleRepo: Repository<UserTitle>,
    @InjectRepository(UserInventory)
    private readonly userInventoryRepo: Repository<UserInventory>,
    private readonly usersService: UsersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────────

  async findAll(): Promise<Achievement[]> {
    return this.achievementRepo.find({ order: { category: 'ASC', code: 'ASC' } });
  }

  async findByUser(userId: string): Promise<UserAchievement[]> {
    return this.userAchievementRepo.find({
      where: { userId },
      relations: ['achievement'],
      order: { unlockedAt: 'DESC' },
    });
  }

  async create(data: Partial<Achievement>): Promise<Achievement> {
    const achievement = this.achievementRepo.create(data);
    return this.achievementRepo.save(achievement);
  }

  async update(id: string, data: Partial<Achievement>): Promise<Achievement> {
    const achievement = await this.achievementRepo.findOneBy({ id });
    if (!achievement) throw new NotFoundException('Logro no encontrado');
    Object.assign(achievement, data);
    return this.achievementRepo.save(achievement);
  }

  async remove(id: string): Promise<void> {
    const result = await this.achievementRepo.delete(id);
    if (result.affected === 0) throw new NotFoundException('Logro no encontrado');
  }

  // ─── Event Listeners ───────────────────────────────────────────────────────────

  @OnEvent('quest.completed')
  async onQuestCompleted({ userId }: { userId: string }) {
    try {
      const user = await this.usersService.findById(userId);
      const stats = user.stats;

      await this.tryUnlock(userId, 'FIRST_QUEST', stats.quizzesPlayed >= 1);
      await this.tryUnlock(userId, 'QUEST_STREAK_3', stats.currentStreak >= 3);
      await this.tryUnlock(userId, 'QUEST_STREAK_5', stats.currentStreak >= 5);

      // Level-based achievements
      await this.tryUnlock(userId, 'LEVEL_5', stats.level >= 5);
      await this.tryUnlock(userId, 'LEVEL_10', stats.level >= 10);
    } catch (err) {
      this.logger.error(`Error evaluando logros para quest.completed (user=${userId}):`, err);
    }
  }

  @OnEvent('party.member_joined')
  async onPartyJoined({ userId }: { userId: string }) {
    try {
      const partyCount = await this.partyMemberRepo.count({ where: { userId } });
      await this.tryUnlock(userId, 'FIRST_PARTY', partyCount >= 1);
      await this.tryUnlock(userId, 'SOCIAL_BUTTERFLY', partyCount >= 5);
    } catch (err) {
      this.logger.error(`Error evaluando logros para party.member_joined (user=${userId}):`, err);
    }
  }

  // ─── Unlock logic ──────────────────────────────────────────────────────────────

  private async tryUnlock(userId: string, code: string, condition: boolean): Promise<void> {
    if (!condition) return;

    const achievement = await this.achievementRepo.findOneBy({ code });
    if (!achievement) return;

    // Check if already unlocked
    const existing = await this.userAchievementRepo.findOneBy({
      userId,
      achievementId: achievement.id,
    });
    if (existing) return;

    const userAchievement = this.userAchievementRepo.create({
      userId,
      achievementId: achievement.id,
    });
    await this.userAchievementRepo.save(userAchievement);
    await this.grantRewardToInventory(userId, achievement);

    this.logger.log(`🏆 Logro desbloqueado: ${achievement.icon} ${achievement.name} para user=${userId}`);

    this.eventEmitter.emit('achievement.unlocked', {
      userId,
      achievement: {
        id: achievement.id,
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        category: achievement.category,
        points: achievement.points,
      },
    });
  }

  private async grantRewardToInventory(userId: string, achievement: Achievement): Promise<void> {
    if (!achievement.rewardType || !achievement.rewardCode) return;

    if (achievement.rewardType === 'title') {
      const title = await this.userTitleRepo.findOneBy({ code: achievement.rewardCode });
      if (!title) {
        this.logger.warn(
          `Logro ${achievement.code} tiene reward title=${achievement.rewardCode} sin catálogo`,
        );
        return;
      }
    }

    const existing = await this.userInventoryRepo.findOneBy({
      userId,
      itemType: achievement.rewardType,
      itemCode: achievement.rewardCode,
    });
    if (existing) return;

    await this.userInventoryRepo.save(
      this.userInventoryRepo.create({
        userId,
        itemType: achievement.rewardType,
        itemCode: achievement.rewardCode,
      }),
    );
  }
}
