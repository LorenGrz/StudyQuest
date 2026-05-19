import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../common/roles';
import { AchievementsService } from './achievements.service';
import { Achievement } from './achievement.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get('achievements')
  findAll(): Promise<Achievement[]> {
    return this.achievementsService.findAll();
  }

  @Get('users/me/achievements')
  findMyAchievements(@Req() req: any) {
    return this.achievementsService.findByUser(req.user.userId);
  }

  @Post('achievements')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() body: Partial<Achievement>) {
    return this.achievementsService.create(body);
  }

  @Put('achievements/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: Partial<Achievement>) {
    return this.achievementsService.update(id, body);
  }

  @Delete('achievements/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.achievementsService.remove(id);
  }
}
