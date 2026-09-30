import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkillTreeService } from './skill-tree.service';
import { CommunitySubjectsService } from '../subjects/community-subjects.service';
import { CreateSkillNodeDto } from '../../common/dto';

@ApiTags('skill-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/skill-tree')
export class SkillTreeController {
  constructor(
    private readonly skillTreeService: SkillTreeService,
    private readonly communitySubjects: CommunitySubjectsService,
  ) {}

  @Get()
  getForUser(@Param('subjectId') subjectId: string, @Request() req: any) {
    return this.skillTreeService.getTreeForUser(subjectId, req.user.userId);
  }

  @Get('nodes')
  getNodes(@Param('subjectId') subjectId: string) {
    return this.skillTreeService.getTree(subjectId);
  }

  @Post('nodes')
  async createNode(
    @Request() req: any,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() dto: CreateSkillNodeDto,
  ) {
    // Visibility only (no enrollment rule here): 404 for subjects the user
    // can't see; merged ids attach to the target.
    const target = await this.communitySubjects.resolveAttachable(
      req.user.userId,
      subjectId,
      { requireEnrollment: false },
    );
    return this.skillTreeService.createNode({
      ...dto,
      subjectId: target,
    });
  }
}
