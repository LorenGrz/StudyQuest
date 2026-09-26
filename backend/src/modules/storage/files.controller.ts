import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';

/**
 * Public (no JWT) redirect from a stable `/api/v1/files/<key>` URL — the value
 * stored in `quest.sourcePdfUrl`, chat attachment `url`, and `user.avatarUrl`
 * — to a short-lived presigned S3 GET URL, so `<img>`/`<a>` tags keep working
 * without the frontend ever handling S3 credentials.
 */
@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get('*key')
  async redirectToFile(
    @Param('key') rawKey: string | string[],
    @Res() res: Response,
  ): Promise<void> {
    // Express 5 / path-to-regexp v8 gives a wildcard param as the array of
    // matched path segments, not a single joined string.
    const key = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;

    if (!this.storageService.isValidKey(key)) {
      throw new NotFoundException();
    }
    if (!(await this.storageService.exists(key))) {
      throw new NotFoundException();
    }

    const url = await this.storageService.presignGet(key);
    res.redirect(302, url);
  }
}
