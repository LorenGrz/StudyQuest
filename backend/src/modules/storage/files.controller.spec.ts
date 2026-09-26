import { NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { FilesController } from './files.controller';
import { StorageService } from './storage.service';

describe('FilesController', () => {
  const storageService = {
    isValidKey: jest.fn(),
    exists: jest.fn(),
    presignGet: jest.fn(),
  } as unknown as jest.Mocked<StorageService>;

  let controller: FilesController;
  let res: jest.Mocked<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FilesController(storageService);
    res = { redirect: jest.fn() } as unknown as jest.Mocked<Response>;
  });

  it('joins a wildcard array param and 302-redirects to a presigned URL', async () => {
    storageService.isValidKey.mockReturnValue(true);
    storageService.exists.mockResolvedValue(true);
    storageService.presignGet.mockResolvedValue(
      'https://signed.example/chat/party-1/a.webm',
    );

    await controller.redirectToFile(['chat', 'party-1', 'a.webm'], res);

    expect(storageService.isValidKey).toHaveBeenCalledWith(
      'chat/party-1/a.webm',
    );
    expect(storageService.presignGet).toHaveBeenCalledWith(
      'chat/party-1/a.webm',
    );
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://signed.example/chat/party-1/a.webm',
    );
  });

  it('404s when the key prefix is not allowed', async () => {
    storageService.isValidKey.mockReturnValue(false);

    await expect(
      controller.redirectToFile('borders/gold.svg', res),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageService.exists).not.toHaveBeenCalled();
  });

  it('404s (not 403/AccessDenied) when the object does not exist in S3', async () => {
    storageService.isValidKey.mockReturnValue(true);
    storageService.exists.mockResolvedValue(false);

    await expect(
      controller.redirectToFile('quests/missing.pdf', res),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(storageService.presignGet).not.toHaveBeenCalled();
  });
});
