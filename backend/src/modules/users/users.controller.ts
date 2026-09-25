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
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { mkdirSync } from 'fs';
import { ApiBearerAuth, ApiTags, ApiQuery, ApiOkResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  ChangePasswordDto,
  EnrollSubjectDto,
  SetActiveCosmeticsDto,
  RecommendedQuestsQueryDto,
  RecommendedQuestsResponseDto,
  RecommendedQuestDto,
} from '../../common/dto';

const AVATAR_DIR = join(process.cwd(), 'uploads', 'avatars');

const ALLOWED_AVATAR_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
// Browsers/OSes report inconsistent mimetypes for the same file (e.g. `image/jpg`
// for .jpg, or an empty/generic type when none is detected). Validate the
// extension as the source of truth and only use the mimetype as a hint.
function isAllowedAvatar(file: {
  originalname?: string;
  mimetype?: string;
}): boolean {
  const ext = extname(file.originalname || '').toLowerCase();
  if (ALLOWED_AVATAR_EXTS.includes(ext)) return true;
  return /^image\/(jpe?g|png|webp)$/.test(file.mimetype || '');
}

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

  @Patch('me/password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(AVATAR_DIR, { recursive: true });
          cb(null, AVATAR_DIR);
        },
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      fileFilter: (_req, file, cb) => {
        if (isAllowedAvatar(file)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Solo se permiten imágenes jpeg, png o webp'),
            false,
          );
        }
      },
    }),
  )
  uploadAvatar(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.setAvatar(
      req.user.userId,
      `/uploads/avatars/${file.filename}`,
    );
  }

  @Get('me/inventory')
  getMyInventory(@Request() req: any): Promise<any> {
    return this.usersService.getInventory(req.user.userId);
  }

  @Get('me/recommended-quests')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiOkResponse({ type: RecommendedQuestsResponseDto })
  getRecommendedQuests(
    @Request() req: any,
    @Query() query: RecommendedQuestsQueryDto,
  ) {
    return this.usersService.getRecommendedQuests(
      req.user.userId,
      query.page,
      query.limit,
      query.subjectId,
    );
  }

  @Get('me/quests-today')
  @ApiOkResponse({
    type: [RecommendedQuestDto],
    description: 'Lista de quests sugeridas para hoy',
  })
  getQuestsForToday(@Request() req: any) {
    return this.usersService.getQuestsForToday(req.user.userId);
  }

  @Patch('me/cosmetics')
  setMyCosmetics(@Request() req: any, @Body() dto: SetActiveCosmeticsDto) {
    return this.usersService.setActiveCosmetics(req.user.userId, dto);
  }

  @Get('leaderboard/global')
  getGlobalLeaderboard(@Query('limit') limit?: string) {
    return this.usersService.getGlobalLeaderboard(limit ? parseInt(limit, 10) : 20);
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
