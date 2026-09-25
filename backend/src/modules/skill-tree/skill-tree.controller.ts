import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkillTreeService } from './skill-tree.service';
import { CreateSkillNodeDto } from '../../common/dto';

@ApiTags('skill-tree')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subjects/:subjectId/skill-tree')
export class SkillTreeController {
  constructor(private readonly skillTreeService: SkillTreeService) {}

  @Get()
  getForUser(@Param('subjectId') subjectId: string, @Request() req: any) {
    return this.skillTreeService.getTreeForUser(subjectId, req.user.userId);
  }

  @Get('nodes')
  getNodes(@Param('subjectId') subjectId: string) {
    return this.skillTreeService.getTree(subjectId);
  }

  @Post('nodes')
  createNode(
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateSkillNodeDto,
  ) {
    return this.skillTreeService.createNode({
      ...dto,
      subjectId,
    });
  }
}
