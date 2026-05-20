import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Patch,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PartiesService } from './parties.service';
import {
  SendChatMessageDto,
  CreatePartyDto,
  UpdatePartyVisibilityDto,
  UploadAudioMessageDto,
} from '../../common/dto';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) { }

  private static readonly allowedChatFileMimeTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  private static readonly allowedChatAudioMimeTypes = [
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
  ]

  private static chatUploadStorage = diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
  })

  // ─── Rutas sin parámetro :id primero (evitar conflictos de orden) ────────────

  @Get('discover')
  @ApiOperation({ summary: 'Parties abiertas en materias del usuario' })
  discover(@Request() req: any) {
    return this.partiesService.discover(req.user.userId);
  }

  @Get('mine')
  getMyParties(@Request() req: any) {
    return this.partiesService.findByUser(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una party nueva (vos como líder)' })
  createParty(@Request() req: any, @Body() dto: CreatePartyDto) {
    return this.partiesService.createForUser(
      req.user.userId,
      dto.subjectId,
      dto.maxMembers ?? 4,
      dto.isPrivate ?? false,
    );
  }

  @Post('join-invite/:token')
  @ApiOperation({ summary: 'Unirse a una party mediante link de invitación' })
  async joinByInvite(@Param('token') token: string, @Request() req: any) {
    try {
      return await this.partiesService.joinByInviteToken(token, req.user.userId);
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get('invitations')
  @ApiOperation({ summary: 'Invitaciones directas a parties que te hicieron' })
  getInvitations(@Request() req: any) {
    return this.partiesService.getPartyInvitations(req.user.userId);
  }

  @Post('invitations/:id/accept')
  @ApiOperation({ summary: 'Aceptar invitación directa a una party' })
  acceptInvitation(@Param('id') id: string, @Request() req: any) {
    return this.partiesService.acceptPartyInvitation(id, req.user.userId);
  }

  @Post('invitations/:id/reject')
  @ApiOperation({ summary: 'Rechazar invitación directa a una party' })
  rejectInvitation(@Param('id') id: string, @Request() req: any) {
    return this.partiesService.rejectPartyInvitation(id, req.user.userId);
  }

  // ─── Rutas con :id ───────────────────────────────────────────────────────────

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partiesService.findById(id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Generar link de invitación (cualquier miembro)' })
  async generateInvite(@Param('id') id: string, @Request() req: any) {
    const token = await this.partiesService.generateInviteToken(id, req.user.userId);
    return { token, expiresInHours: 24 };
  }

  @Post(':id/invite-friend')
  @ApiOperation({ summary: 'Invitar a un amigo a la party' })
  async inviteFriend(
    @Param('id') id: string,
    @Request() req: any,
    @Body('inviteeId') inviteeId: string,
  ) {
    return this.partiesService.inviteFriendToParty(id, req.user.userId, inviteeId);
  }

  @Get(':id/chat')
  getChat(@Param('id') id: string, @Query('limit') limit = 100) {
    return this.partiesService.getChatHistory(id, +limit);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Historial de actividades de la party' })
  getActivity(@Param('id') id: string, @Query('limit') limit = 50) {
    return this.partiesService.getActivityHistory(id, +limit);
  }

  @Patch(':id/visibility')
  @ApiOperation({ summary: 'Cambiar visibilidad de la party (solo líder)' })
  updateVisibility(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UpdatePartyVisibilityDto,
  ) {
    return this.partiesService.updateVisibility(id, req.user.userId, dto.isPrivate);
  }

  @Post(':id/chat')
  sendMessage(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.partiesService.addTextChatMessage(id, req.user.userId, dto.text);
  }

  @Post(':id/chat/file')
  @UseInterceptors(FileInterceptor('file', { storage: PartiesController.chatUploadStorage }))
  uploadChatFile(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!PartiesController.allowedChatFileMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten PDF, TXT, DOC o DOCX en el chat');
    }
    return this.partiesService.addBinaryChatMessage(id, req.user.userId, {
      type: 'file',
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });
  }

  @Post(':id/chat/audio')
  @UseInterceptors(FileInterceptor('file', { storage: PartiesController.chatUploadStorage }))
  uploadChatAudio(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: UploadAudioMessageDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!PartiesController.allowedChatAudioMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten audios WEBM, OGG, MP4 o MP3');
    }
    return this.partiesService.addBinaryChatMessage(id, req.user.userId, {
      type: 'audio',
      url: `/uploads/${file.filename}`,
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      durationMs: dto.durationMs,
    });
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Unirse a una party existente (discovery)' })
  async join(@Param('id') id: string, @Request() req: any) {
    try {
      return await this.partiesService.joinParty(id, req.user.userId);
    } catch (error: any) {
      throw new BadRequestException(error.message + ' ||| STACK: ' + error.stack);
    }
  }

  // ─── Acciones administrativas ─────────────────────────────────────────────

  @Post(':id/leave')
  @ApiOperation({ summary: 'Salir de la party (cualquier miembro)' })
  async leaveParty(@Param('id') id: string, @Request() req: any) {
    try {
      await this.partiesService.leaveParty(id, req.user.userId);
      return { message: 'Saliste de la party' };
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remover miembro de la party (solo líder)' })
  async removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Request() req: any,
  ) {
    try {
      await this.partiesService.removeMember(id, req.user.userId, targetUserId);
      return { message: 'Miembro removido' };
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cerrar la party (solo líder)' })
  async closeParty(@Param('id') id: string, @Request() req: any) {
    try {
      await this.partiesService.closePartyAsHost(id, req.user.userId);
      return { message: 'Party cerrada' };
    } catch (error: any) {
      if (error instanceof ForbiddenException || error instanceof NotFoundException) throw error;
      throw new BadRequestException(error.message);
    }
  }
}
