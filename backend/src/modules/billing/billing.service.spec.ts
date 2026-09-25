import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { User } from '../users/user.entity';
import { Quest } from '../quests/quest.entity';
import { PromoCode } from './promo-code.entity';
import { PromoRedemption } from './promo-redemption.entity';

const DAY = 24 * 60 * 60 * 1000;

describe('BillingService', () => {
  let service: BillingService;
  let userRepo: any;
  let questRepo: any;
  let promoRepo: any;
  let redemptionRepo: any;
  let em: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    questRepo = { count: jest.fn().mockResolvedValue(0) };
    promoRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn((v) => v),
    };
    redemptionRepo = {};
    em = {
      findOne: jest.fn(),
      save: jest.fn((x) => x),
      create: jest.fn((_e, v) => v),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Quest), useValue: questRepo },
        { provide: getRepositoryToken(PromoCode), useValue: promoRepo },
        {
          provide: getRepositoryToken(PromoRedemption),
          useValue: redemptionRepo,
        },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn((cb: any) => cb(em)) },
        },
      ],
    }).compile();

    service = moduleRef.get(BillingService);
  });

  describe('effective plan', () => {
    it('is free for a free user', () => {
      expect(
        service.getPlanForUser({ plan: 'free', planExpiresAt: null }),
      ).toBe('free');
    });

    it('is pro while the expiry is in the future', () => {
      expect(
        service.getPlanForUser({
          plan: 'pro',
          planExpiresAt: new Date(Date.now() + DAY),
        }),
      ).toBe('pro');
    });

    it('lapses to free once the expiry passes', () => {
      expect(
        service.getPlanForUser({
          plan: 'pro',
          planExpiresAt: new Date(Date.now() - DAY),
        }),
      ).toBe('free');
    });

    it('exposes higher limits for pro', () => {
      const free = service.getLimits({ plan: 'free', planExpiresAt: null });
      const pro = service.getLimits({
        plan: 'pro',
        planExpiresAt: new Date(Date.now() + DAY),
      });
      expect(pro.questsPerDay).toBeGreaterThan(free.questsPerDay);
      expect(pro.aiModelTier).toBe('full');
    });
  });

  describe('redeemPromo', () => {
    const activePromo = {
      code: 'STUDYQUEST-PRO-30',
      plan: 'pro',
      durationDays: 30,
      maxRedemptions: 100,
      redeemedCount: 0,
      expiresAt: null,
      isActive: true,
    };

    it('upgrades the user and records the redemption', async () => {
      em.findOne
        .mockResolvedValueOnce({ ...activePromo }) // PromoCode
        .mockResolvedValueOnce(null) // existing redemption
        .mockResolvedValueOnce({ id: 'u1', plan: 'free', planExpiresAt: null }); // User

      await service.redeemPromo('u1', ' studyquest-pro-30 ');

      const savedUser = em.save.mock.calls.find(
        (c: any[]) => c[0]?.id === 'u1',
      )?.[0];
      expect(savedUser.plan).toBe('pro');
      expect(savedUser.planSource).toBe('promo');
      expect(savedUser.planExpiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(em.create).toHaveBeenCalledWith(
        PromoRedemption,
        expect.objectContaining({ userId: 'u1', code: 'STUDYQUEST-PRO-30' }),
      );
    });

    it('rejects an unknown code', async () => {
      em.findOne.mockResolvedValueOnce(null);
      await expect(service.redeemPromo('u1', 'NOPE')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a code already redeemed by the user', async () => {
      em.findOne
        .mockResolvedValueOnce({ ...activePromo })
        .mockResolvedValueOnce({ id: 'r1' });
      await expect(
        service.redeemPromo('u1', 'STUDYQUEST-PRO-30'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects an exhausted code', async () => {
      em.findOne.mockResolvedValueOnce({
        ...activePromo,
        redeemedCount: 100,
      });
      await expect(
        service.redeemPromo('u1', 'STUDYQUEST-PRO-30'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an expired code', async () => {
      em.findOne.mockResolvedValueOnce({
        ...activePromo,
        expiresAt: new Date(Date.now() - DAY),
      });
      await expect(
        service.redeemPromo('u1', 'STUDYQUEST-PRO-30'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('extends an existing pro subscription instead of shortening it', async () => {
      const existingExpiry = new Date(Date.now() + 10 * DAY);
      em.findOne
        .mockResolvedValueOnce({ ...activePromo, durationDays: 30 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'u1',
          plan: 'pro',
          planExpiresAt: existingExpiry,
        });

      await service.redeemPromo('u1', 'STUDYQUEST-PRO-30');

      const savedUser = em.save.mock.calls.find(
        (c: any[]) => c[0]?.id === 'u1',
      )?.[0];
      expect(savedUser.planExpiresAt.getTime()).toBeGreaterThan(
        existingExpiry.getTime(),
      );
    });
  });

  describe('grantPlan', () => {
    it('sets a pro plan with an expiry and admin source', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'u1', plan: 'free' });
      await service.grantPlan('u1', 'pro', 14);
      const saved = userRepo.save.mock.calls[0][0];
      expect(saved.plan).toBe('pro');
      expect(saved.planSource).toBe('admin');
      expect(saved.planExpiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('clears the plan back to free', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'u1',
        plan: 'pro',
        planExpiresAt: new Date(),
        planSource: 'promo',
      });
      await service.grantPlan('u1', 'free');
      const saved = userRepo.save.mock.calls[0][0];
      expect(saved.plan).toBe('free');
      expect(saved.planExpiresAt).toBeNull();
      expect(saved.planSource).toBeNull();
    });
  });
});
