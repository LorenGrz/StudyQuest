import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto, SubjectQueryDto } from '../../common/dto';

@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  findAll(@Query() query: SubjectQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Get('universities')
  getUniversities(@Query('search') search?: string) {
    return this.subjectsService.getUniversities(search);
  }

  @Get('careers')
  getCareers(@Query('university') university: string) {
    return this.subjectsService.getCareers(university);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subjectsService.findById(id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateSubjectDto) {
    return this.subjectsService.create(dto);
  }
}
