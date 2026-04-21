import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PartiesService } from './parties.service';
import { SendChatMessageDto, CreatePartyDto } from '../../common/dto';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get('discover')
  @ApiOperation({ summary: 'Parties abiertas en materias del usuario (async discovery)' })
  discover(@Request() req: any) {
    return this.partiesService.discover(req.user.userId);
  }

  @Get('mine')
  getMyParties(@Request() req: any) {
    return this.partiesService.findByUser(req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una party nueva (solo vos como líder)' })
  createParty(@Request() req: any, @Body() dto: CreatePartyDto) {
    return this.partiesService.createForUser(
      req.user.userId,
      dto.subjectId,
      dto.maxMembers ?? 4,
    );
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.partiesService.findById(id);
  }

  @Get(':id/chat')
  getChat(@Param('id') id: string, @Query('limit') limit = 100) {
    return this.partiesService.getChatHistory(id, +limit);
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
  @ApiOperation({ summary: 'Unirse a una party existente (async discovery)' })
  async join(@Param('id') id: string, @Request() req: any) {
    try {
      return await this.partiesService.joinParty(id, req.user.userId);
    } catch (error: any) {
      throw new BadRequestException(error.message + ' ||| STACK: ' + error.stack);
    }
  }
}



