import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestsService } from './quests.service';
import { CreateQuestDto, SubmitAnswerDto } from '../../common/dto';

@ApiTags('quests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quests')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Post()
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Request() req: any,
    @Body() dto: CreateQuestDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: 'application/pdf' }),
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
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
}
