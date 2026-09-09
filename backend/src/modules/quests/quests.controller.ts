import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
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
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestsService } from './quests.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';
import { diskStorage } from 'multer';
import { safeUploadFilename } from '../../common/upload.util';

@ApiTags('quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quests')
export class QuestsController {
  private static questUploadStorage = diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => cb(null, safeUploadFilename(file)),
  });

  constructor(private readonly questsService: QuestsService) {}

  // AI generation is the expensive path: cap it hard per client.
  @Throttle({ strict: { limit: 15, ttl: 3_600_000 } })
  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(
    FileInterceptor('file', { storage: QuestsController.questUploadStorage }),
  )
  create(
    @Request() req: any,
    @Body() dto: CreateQuestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    if (file && file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Solo se permiten archivos PDF');
    }
    return this.questsService.createQuest(dto, req.user.userId, file);
  }

  @Get('party/:partyId')
  findByParty(@Param('partyId') partyId: string, @Request() req: any) {
    return this.questsService.findByParty(partyId, req.user.userId);
  }

  @Get(':id/play')
  getForPlay(@Param('id') id: string, @Request() req: any) {
    return this.questsService.getQuestForPlay(id, req.user.userId);
  }

  @Post(':id/start')
  start(@Param('id') id: string, @Request() req: any) {
    return this.questsService.startQuest(id, req.user.userId);
  }

  @Post('answer')
  submitAnswer(@Body() dto: SubmitAnswerDto, @Request() req: any) {
    return this.questsService.submitAnswer(dto, req.user.userId);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    return this.questsService.completeQuest(id, req.user.userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.questsService.deleteQuest(id, req.user.userId);
  }
}
