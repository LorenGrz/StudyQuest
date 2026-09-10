import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../common/roles';
import { BillingService } from './billing.service';
import {
  RedeemPromoDto,
  GrantPlanDto,
  CreatePromoCodeDto,
} from '../../common/dto';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  plans() {
    return this.billingService.getCatalog();
  }

  @Get('me')
  me(@Req() req: any) {
    return this.billingService.getState(req.user.userId);
  }

  @Throttle({ strict: { limit: 10, ttl: 60_000 } })
  @Post('redeem')
  redeem(@Req() req: any, @Body() dto: RedeemPromoDto) {
    return this.billingService.redeemPromo(req.user.userId, dto.code);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post('admin/grant')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  grant(@Body() dto: GrantPlanDto) {
    return this.billingService.grantPlan(dto.userId, dto.plan, dto.days);
  }

  @Get('admin/promos')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listPromos() {
    return this.billingService.listPromoCodes();
  }

  @Post('admin/promos')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createPromo(@Body() dto: CreatePromoCodeDto) {
    return this.billingService.createPromoCode(dto);
  }
}
