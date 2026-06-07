import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateTournamentDto {
  title: string;
  questId: string;
  startsAt: string;
  endsAt: string;
}

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Post()
  async create(@Body() dto: CreateTournamentDto, @Request() req: any) {
    return this.tournamentsService.create(
      {
        title: dto.title,
        questId: dto.questId,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      },
      req.user.id,
    );
  }

  @Get()
  async findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.tournamentsService.findById(id);
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Request() req: any) {
    return this.tournamentsService.join(id, req.user.id);
  }

  @Get(':id/scoreboard')
  async getScoreboard(@Param('id') id: string) {
    return this.tournamentsService.getScoreboard(id);
  }
}
