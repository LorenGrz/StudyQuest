import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProPlanGuard } from '../../common/pro-plan.guard';
import { AskStudyBotDto } from '../../common/dto';
import { StudyBotService } from './study-bot.service';

@ApiTags('study-bot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ProPlanGuard)
@Controller('study-bot')
export class StudyBotController {
  constructor(private readonly studyBotService: StudyBotService) {}

  // Each call hits an LLM with the user's own history — cap it like the
  // other AI-generation routes (see QuestsController).
  @Throttle({ strict: { limit: 20, ttl: 3_600_000 } })
  @Post('ask')
  ask(@Request() req: any, @Body() dto: AskStudyBotDto) {
    return this.studyBotService.ask(req.user.userId, dto.question);
  }
}
