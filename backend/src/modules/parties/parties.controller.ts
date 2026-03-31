import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PartiesService } from './parties.service';
import { SendChatMessageDto } from '../../common/dto';

@ApiTags('parties')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('parties')
export class PartiesController {
  constructor(private readonly partiesService: PartiesService) {}

  @Get('mine')
  getMyParties(@Request() req: any) {
    return this.partiesService.findByUser(req.user.userId);
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
}
