import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto, EnrollSubjectDto } from '../../common/dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req: any) {
    return this.usersService.findById(req.user.userId);
  }

  @Patch('me')
  updateMe(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post('me/subjects')
  enroll(@Request() req: any, @Body() dto: EnrollSubjectDto) {
    return this.usersService.enrollSubject(req.user.userId, dto.subjectId);
  }

  @Delete('me/subjects/:subjectId')
  unenroll(@Request() req: any, @Param('subjectId') subjectId: string) {
    return this.usersService.unenrollSubject(req.user.userId, subjectId);
  }
}
