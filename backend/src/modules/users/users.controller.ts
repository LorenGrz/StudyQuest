import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  EnrollSubjectDto,
  SetActiveCosmeticsDto,
} from '../../common/dto';

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

  @Get('me/inventory')
  getMyInventory(@Request() req: any): Promise<any> {
    return this.usersService.getInventory(req.user.userId);
  }

  @Patch('me/cosmetics')
  setMyCosmetics(@Request() req: any, @Body() dto: SetActiveCosmeticsDto) {
    return this.usersService.setActiveCosmetics(req.user.userId, dto);
  }

  @Get('leaderboard/:subjectId')
  getLeaderboard(
    @Param('subjectId') subjectId: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.getLeaderboard(subjectId, limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get('me/stats')
  getDashboardStats(@Request() req: any) {
    return this.usersService.getDashboardStats(req.user.userId);
  }

  @Get('me/friends')
  getFriends(@Request() req: any) {
    return this.usersService.listFriends(req.user.userId);
  }

  @Get('me/friends/requests')
  getFriendRequests(@Request() req: any) {
    return this.usersService.getIncomingFriendRequests(req.user.userId);
  }

  @Get('me/friends/requests/outgoing')
  getOutgoingFriendRequests(@Request() req: any) {
    return this.usersService.getOutgoingFriendRequests(req.user.userId);
  }

  @Post('me/friends/request/:username')
  sendFriendRequest(@Request() req: any, @Param('username') username: string) {
    return this.usersService.createFriendRequest(req.user.userId, username);
  }

  @Patch('me/friends/requests/:id/accept')
  acceptFriendRequest(@Request() req: any, @Param('id') id: string) {
    return this.usersService.respondFriendRequest(id, req.user.userId, true);
  }

  @Patch('me/friends/requests/:id/reject')
  rejectFriendRequest(@Request() req: any, @Param('id') id: string) {
    return this.usersService.respondFriendRequest(id, req.user.userId, false);
  }

  @Delete('me/friends/:friendId')
  removeFriend(@Request() req: any, @Param('friendId') friendId: string) {
    return this.usersService.removeFriend(req.user.userId, friendId);
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
