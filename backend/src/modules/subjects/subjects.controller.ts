import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { RolesGuard, Roles, Role } from '../../common/roles';
import {
  CreateCommunitySubjectDto,
  CreateSubjectDto,
  ReportSubjectDto,
  SubjectQueryDto,
  SuggestSubjectsQueryDto,
} from '../../common/dto';
import { CommunitySubjectsService } from './community-subjects.service';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(
    private readonly subjectsService: SubjectsService,
    private readonly communitySubjects: CommunitySubjectsService,
  ) {}

  @Get()
  findAll(@Query() query: SubjectQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Get('universities')
  getUniversities(@Query('search') search?: string) {
    return this.subjectsService.getUniversities(search);
  }

  /** @deprecated use GET /universities/:id/careers */
  @ApiOperation({ deprecated: true })
  @Get('careers')
  getCareers(@Query('university') university?: string) {
    return this.subjectsService.getCareers(university);
  }

  /** Autocomplete in my university: official + public + my private ones. */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('suggest')
  suggest(@Request() req: any, @Query() query: SuggestSubjectsQueryDto) {
    return this.communitySubjects.suggest(
      req.user.userId,
      query.q,
      query.limit ?? 10,
    );
  }

  /**
   * Create (or reuse) a community subject and enroll me. The DB count
   * enforces the 10/day limit per user; this throttle only caps bursts
   * (and model calls) per client.
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: { limit: 30, ttl: 3_600_000 } })
  @Post('community')
  createCommunity(@Request() req: any, @Body() dto: CreateCommunitySubjectDto) {
    return this.communitySubjects.create(req.user.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ strict: { limit: 20, ttl: 3_600_000 } })
  @HttpCode(200)
  @Post(':id/report')
  report(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportSubjectDto,
  ) {
    return this.communitySubjects.report(req.user.userId, id, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectsService.findById(id);
  }

  /** Admin only; students create subjects via POST /subjects/community (R2). */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }
}
