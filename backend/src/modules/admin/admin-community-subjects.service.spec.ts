import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminCommunitySubjectsService } from './admin-community-subjects.service';
import {
  AdminCommunitySubjectsStore,
  SubjectMergeError,
} from './admin-community-subjects.store';

describe('AdminCommunitySubjectsService', () => {
  let store: {
    listNew: jest.Mock;
    listReported: jest.Mock;
    listPrivateWithUsers: jest.Mock;
    findMeta: jest.Mock;
    findClash: jest.Mock;
    publish: jest.Mock;
    hide: jest.Mock;
    unhide: jest.Mock;
    rename: jest.Mock;
    transaction: jest.Mock;
  };
  let service: AdminCommunitySubjectsService;

  beforeEach(() => {
    store = {
      listNew: jest.fn().mockResolvedValue([]),
      listReported: jest.fn().mockResolvedValue([]),
      listPrivateWithUsers: jest.fn().mockResolvedValue([]),
      findMeta: jest.fn(),
      findClash: jest.fn().mockResolvedValue(null),
      publish: jest.fn().mockResolvedValue(true),
      hide: jest.fn().mockResolvedValue(true),
      unhide: jest.fn().mockResolvedValue(true),
      rename: jest.fn().mockResolvedValue(true),
      transaction: jest.fn((fn: any) => fn(store)),
    };
    service = new AdminCommunitySubjectsService(
      store as unknown as AdminCommunitySubjectsStore,
    );
  });

  describe('list', () => {
    it('dispatches each tab to its store method', async () => {
      await service.list('new');
      await service.list('reported');
      await service.list('private');
      expect(store.listNew).toHaveBeenCalledTimes(1);
      expect(store.listReported).toHaveBeenCalledTimes(1);
      expect(store.listPrivateWithUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('publish / hide / unhide', () => {
    it('publishes an active subject', async () => {
      await expect(service.publish('s1', 'admin-1')).resolves.toEqual({
        published: true,
      });
      expect(store.publish).toHaveBeenCalledWith('s1', 'admin-1');
    });

    it('404s when the subject is missing or not active', async () => {
      store.publish.mockResolvedValue(false);
      await expect(service.publish('s1', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('hides and unhides', async () => {
      await expect(service.hide('s1', 'admin-1')).resolves.toEqual({
        hidden: true,
      });
      await expect(service.unhide('s1', 'admin-1')).resolves.toEqual({
        hidden: false,
      });
    });
  });

  describe('rename', () => {
    it('sets name and name_normalized', async () => {
      store.findMeta.mockResolvedValue({
        id: 's1',
        universityId: 'uni-1',
        status: 'active',
      });
      const result = await service.rename('s1', '  Análisis   1 ', 'admin-1');
      expect(result).toEqual({ id: 's1', name: 'Análisis 1' });
      expect(store.rename).toHaveBeenCalledWith(
        's1',
        'Análisis 1',
        'analisis i',
        'admin-1',
      );
    });

    it('409s on a name clash within the university', async () => {
      store.findMeta.mockResolvedValue({
        id: 's1',
        universityId: 'uni-1',
        status: 'active',
      });
      store.findClash.mockResolvedValue({ id: 's2' });
      await expect(
        service.rename('s1', 'Análisis I', 'admin-1'),
      ).rejects.toThrow(ConflictException);
      expect(store.rename).not.toHaveBeenCalled();
    });

    it('404s on an unknown or merged subject', async () => {
      store.findMeta.mockResolvedValue(null);
      await expect(
        service.rename('nope', 'Análisis I', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an empty name', async () => {
      await expect(service.rename('s1', '   ', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(store.findMeta).not.toHaveBeenCalled();
    });
  });

  describe('merge', () => {
    it('delegates to the store inside one transaction', async () => {
      const mergeSubjects = jest.fn().mockResolvedValue({ enrolledCount: 5 });
      store.transaction.mockImplementation((fn: any) => fn({ mergeSubjects }));

      await expect(service.merge('s1', 's2', 'admin-1')).resolves.toEqual({
        enrolledCount: 5,
      });
      expect(mergeSubjects).toHaveBeenCalledWith('s1', 's2', 'admin-1');
    });

    it('maps NOT_FOUND to 404', async () => {
      store.transaction.mockImplementation(() =>
        Promise.reject(new SubjectMergeError('NOT_FOUND', 'nope')),
      );
      await expect(service.merge('s1', 's2', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it.each([
      'SAME_SUBJECT',
      'ALREADY_MERGED',
      'DIFFERENT_UNIVERSITY',
    ] as const)('maps %s to 409', async (code) => {
      store.transaction.mockImplementation(() =>
        Promise.reject(new SubjectMergeError(code, 'nope')),
      );
      await expect(service.merge('s1', 's2', 'admin-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('propagates unrelated errors', async () => {
      store.transaction.mockImplementation(() =>
        Promise.reject(new Error('boom')),
      );
      await expect(service.merge('s1', 's2', 'admin-1')).rejects.toThrow(
        'boom',
      );
    });
  });
});
