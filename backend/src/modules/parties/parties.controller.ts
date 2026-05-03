import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PartiesService } from './parties.service';
import { SendChatMessageDto, CreatePartyDto, UpdatePartyVisibilityDto } from '../../common/dto';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) { }

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

  @Get(':id/chat')
  getChat(@Param('id') id: string, @Query('limit') limit = 100) {
    return this.partiesService.getChatHistory(id, +limit);
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
    return this.partiesService.addChatMessage(id, req.user.userId, dto.text);
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
}
