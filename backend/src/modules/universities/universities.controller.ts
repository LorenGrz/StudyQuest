import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UniversitiesService } from './universities.service';
import { CreateCareerRequestDto } from '../../common/dto';

@ApiTags('universities')
@Controller('universities')
export class UniversitiesController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Get()
  findAll(@Query('search') search?: string) {
    return this.universitiesService.listUniversities(search);
  }

  @Get(':id/careers')
  findCareers(@Param('id', ParseUUIDPipe) id: string) {
    return this.universitiesService.listCareers(id);
  }
}

@ApiTags('universities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('career-requests')
export class CareerRequestsController {
  constructor(private readonly universitiesService: UniversitiesService) {}

  @Throttle({ strict: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Request() req: any, @Body() dto: CreateCareerRequestDto) {
    return this.universitiesService.requestCareer(
      req.user.userId,
      dto.universityId,
      dto.name,
    );
  }

  @Get('mine')
  findMine(@Request() req: any) {
    return this.universitiesService.findMyCareerRequests(req.user.userId);
  }
}
