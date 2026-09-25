import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, MoreThan, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Quest } from '../quests/quest.entity';
import { PromoCode } from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';
import {
  Plan,
  PlanLimits,
  PlanSource,
  effectivePlan,
  planCatalog,
  planLimits,
} from '../../common/plans';
import { CreatePromoCodeDto } from '../../common/dto';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface BillingState {
  plan: Plan;
  effectivePlan: Plan;
  planExpiresAt: Date | null;
  planSource: PlanSource | null;
  limits: PlanLimits;
  usage: { questsToday: number; questsPerDay: number };
}

@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Quest) private readonly questRepo: Repository<Quest>,
    @InjectRepository(PromoCode)
    private readonly promoRepo: Repository<PromoCode>,
    @InjectRepository(PromoRedemption)
    private readonly redemptionRepo: Repository<PromoRedemption>,
    private readonly dataSource: DataSource,
  ) {}

  onModuleInit(): void {
    void this.expireLapsedPlans();
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

  getPlanForUser(user: Pick<User, 'plan' | 'planExpiresAt'>): Plan {
    return effectivePlan(user);
  }

  getLimits(user: Pick<User, 'plan' | 'planExpiresAt'>): PlanLimits {
    return planLimits(this.getPlanForUser(user));
  }

  getCatalog() {
    return planCatalog();
  }

  async getState(userId: string): Promise<BillingState> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.buildState(user);
  }

  private async buildState(user: User): Promise<BillingState> {
    const plan = this.getPlanForUser(user);
    const limits = planLimits(plan);
    const questsToday = await this.questRepo.count({
      where: {
        createdBy: user.id,
        createdAt: MoreThan(new Date(Date.now() - DAY_MS)),
      },
    });
    return {
      plan: (user.plan as Plan) ?? 'free',
      effectivePlan: plan,
      planExpiresAt: user.planExpiresAt ?? null,
      planSource: (user.planSource as PlanSource) ?? null,
      limits,
      usage: { questsToday, questsPerDay: limits.questsPerDay },
    };
  }

  // ─── Promo redemption ─────────────────────────────────────────────────────

  async redeemPromo(userId: string, rawCode: string): Promise<BillingState> {
    const code = rawCode.trim().toUpperCase();

    const user = await this.dataSource.transaction(async (em) => {
      const promo = await em.findOne(PromoCode, { where: { code } });
      const now = new Date();

      if (!promo || !promo.isActive) {
        throw new NotFoundException('El código no existe o ya no está activo');
      }
      if (promo.expiresAt && promo.expiresAt <= now) {
        throw new BadRequestException('El código venció');
      }
      if (promo.redeemedCount >= promo.maxRedemptions) {
        throw new BadRequestException('El código llegó a su límite de usos');
      }

      const already = await em.findOne(PromoRedemption, {
        where: { userId, code },
      });
      if (already) {
        throw new ConflictException('Ya canjeaste este código');
      }

      const u = await em.findOne(User, { where: { id: userId } });
      if (!u) throw new NotFoundException('Usuario no encontrado');

      const base =
        u.planExpiresAt && u.planExpiresAt > now ? u.planExpiresAt : now;
      u.plan = promo.plan;
      u.planExpiresAt = new Date(base.getTime() + promo.durationDays * DAY_MS);
      u.planSource = 'promo';
      await em.save(u);

      promo.redeemedCount += 1;
      await em.save(promo);

      await em.save(
        em.create(PromoRedemption, {
          userId,
          code,
          grantedDays: promo.durationDays,
        }),
      );

      this.logger.log(
        `Usuario ${userId} canjeó "${code}" → ${promo.plan} hasta ${u.planExpiresAt.toISOString()}`,
      );
      return u;
    });

    return this.buildState(user);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async grantPlan(
    userId: string,
    plan: string,
    days?: number,
  ): Promise<BillingState> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (plan === 'free') {
      user.plan = 'free';
      user.planExpiresAt = null;
      user.planSource = null;
    } else {
      user.plan = plan;
      user.planExpiresAt =
        days && days > 0 ? new Date(Date.now() + days * DAY_MS) : null;
      user.planSource = 'admin';
    }
    await this.userRepo.save(user);
    this.logger.log(
      `Admin asignó plan ${plan} a ${userId} (días: ${days ?? '∞'})`,
    );
    return this.buildState(user);
  }

  async listPromoCodes(): Promise<PromoCode[]> {
    return this.promoRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createPromoCode(dto: CreatePromoCodeDto): Promise<PromoCode> {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.promoRepo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException('Ya existe un código con ese nombre');
    }
    return this.promoRepo.save(
      this.promoRepo.create({
        code,
        plan: dto.plan ?? 'pro',
        durationDays: dto.durationDays,
        maxRedemptions: dto.maxRedemptions ?? 1,
        expiresAt: dto.expiresInDays
          ? new Date(Date.now() + dto.expiresInDays * DAY_MS)
          : null,
        isActive: true,
      }),
    );
  }

  // ─── Housekeeping ─────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async expireLapsedPlans(): Promise<void> {
    const res = await this.userRepo
      .createQueryBuilder()
      .update(User)
      .set({ plan: 'free', planExpiresAt: null, planSource: null })
      .where('plan <> :free', { free: 'free' })
      .andWhere('plan_expires_at IS NOT NULL')
      .andWhere('plan_expires_at < now()')
      .execute();
    if (res.affected) {
      this.logger.log(`Planes vencidos revertidos a free: ${res.affected}`);
    }
  }
}
