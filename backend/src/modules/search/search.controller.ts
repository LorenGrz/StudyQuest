import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { GlobalSearchQueryDto, GlobalSearchResponseDto } from '../../common/dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('global')
  @ApiOkResponse({
    type: GlobalSearchResponseDto,
    description: 'Resultados de búsqueda global categorizados',
  })
  async searchGlobal(@Query() query: GlobalSearchQueryDto) {
    return this.searchService.searchGlobal(query.q, query.limit);
  }
}
