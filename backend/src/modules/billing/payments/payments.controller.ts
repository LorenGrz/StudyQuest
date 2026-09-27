import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** Current ARS price of 30 days of Pro, or `{ available: false }`. */
  @Get('quote')
  quote() {
    return this.payments.quote();
  }

  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @Post('checkout')
  checkout(@Req() req: { user: { userId: string } }) {
    return this.payments.createCheckout(req.user.userId);
  }

  @Get(':id')
  get(
    @Req() req: { user: { userId: string } },
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.payments.getForUser(req.user.userId, id);
  }
}
