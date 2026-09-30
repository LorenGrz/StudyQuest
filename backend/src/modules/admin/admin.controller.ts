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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles, Role } from '../../common/roles';
import {
  AdminCareerRequestsQueryDto,
  AdminCommunitySubjectsQueryDto,
  AdminMergeSubjectsDto,
  AdminRenameSubjectDto,
  ApproveCareerRequestDto,
  RejectCareerRequestDto,
} from '../../common/dto';
import { AdminCareerRequestsService } from './admin-career-requests.service';
import { AdminCommunitySubjectsService } from './admin-community-subjects.service';

/** W3: `/admin/*`, ADMIN role only. */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly careerRequests: AdminCareerRequestsService,
    private readonly communitySubjects: AdminCommunitySubjectsService,
  ) {}

  // ─── Pedidos de carrera ────────────────────────────────────────────────────

  @Get('career-requests')
  listCareerRequests(@Query() query: AdminCareerRequestsQueryDto) {
    return this.careerRequests.list(query.status);
  }

  @Post('career-requests/:id/approve')
  approveCareerRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveCareerRequestDto,
  ) {
    return this.careerRequests.approve(id, dto);
  }

  @Post('career-requests/:id/reject')
  rejectCareerRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectCareerRequestDto,
  ) {
    return this.careerRequests.reject(id, dto.adminNote);
  }

  // ─── Materias de la comunidad ──────────────────────────────────────────────

  @Get('community-subjects')
  listCommunitySubjects(@Query() query: AdminCommunitySubjectsQueryDto) {
    return this.communitySubjects.list(query.tab);
  }

  @Post('community-subjects/:id/publish')
  publishSubject(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.communitySubjects.publish(id, req.user.userId);
  }

  @Post('community-subjects/:id/hide')
  hideSubject(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.communitySubjects.hide(id, req.user.userId);
  }

  @Post('community-subjects/:id/unhide')
  unhideSubject(@Request() req: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.communitySubjects.unhide(id, req.user.userId);
  }

  @Post('community-subjects/:id/rename')
  renameSubject(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminRenameSubjectDto,
  ) {
    return this.communitySubjects.rename(id, dto.name, req.user.userId);
  }

  @Post('community-subjects/merge')
  mergeSubjects(@Request() req: any, @Body() dto: AdminMergeSubjectsDto) {
    return this.communitySubjects.merge(dto.fromId, dto.toId, req.user.userId);
  }
}
