import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeSubjectName } from '../../common/subject-name';
import { cleanSubjectName } from '../../common/subject-name.validator';
import {
  AdminCommunitySubjectsStore,
  AdminSubjectRow,
  SubjectMergeError,
} from './admin-community-subjects.store';
import type { AdminCommunitySubjectTab } from './admin-community-subjects.tabs';

/**
 * Admin panel (W3): review new/reported/still-private community subjects —
 * publish, rename, hide/unhide, merge A → B. `subjects.moderation.admin`
 * records every action (who, what, when); the R1 backfill only re-hides
 * `source='legacy' AND moderation IS NULL`, so a reviewed row is never
 * touched again by a re-run.
 */
@Injectable()
export class AdminCommunitySubjectsService {
  constructor(private readonly store: AdminCommunitySubjectsStore) {}

  list(tab: AdminCommunitySubjectTab): Promise<AdminSubjectRow[]> {
    if (tab === 'new') return this.store.listNew();
    if (tab === 'reported') return this.store.listReported();
    return this.store.listPrivateWithUsers();
  }

  async publish(id: string, adminId: string): Promise<{ published: true }> {
    const ok = await this.store.publish(id, adminId);
    if (!ok)
      throw new NotFoundException('Materia no encontrada o ya no está activa');
    return { published: true };
  }

  async hide(id: string, adminId: string): Promise<{ hidden: true }> {
    const ok = await this.store.hide(id, adminId);
    if (!ok)
      throw new NotFoundException('Materia no encontrada o ya no está activa');
    return { hidden: true };
  }

  async unhide(id: string, adminId: string): Promise<{ hidden: false }> {
    const ok = await this.store.unhide(id, adminId);
    if (!ok)
      throw new NotFoundException('Materia no encontrada o no está oculta');
    return { hidden: false };
  }

  async rename(
    id: string,
    rawName: string,
    adminId: string,
  ): Promise<{ id: string; name: string }> {
    const name = cleanSubjectName(rawName);
    const nameNormalized = normalizeSubjectName(name);
    if (!nameNormalized)
      throw new BadRequestException('Escribí un nombre para la materia');

    const meta = await this.store.findMeta(id);
    if (!meta || meta.status === 'merged')
      throw new NotFoundException('Materia no encontrada');

    if (meta.universityId) {
      const clash = await this.store.findClash(
        meta.universityId,
        nameNormalized,
        id,
      );
      if (clash)
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: 'NAME_CLASH',
          message: 'Ya existe otra materia con ese nombre en esa universidad',
        });
    }

    await this.store.rename(id, name, nameNormalized, adminId);
    return { id, name };
  }

  async merge(
    fromId: string,
    toId: string,
    adminId: string,
  ): Promise<{ enrolledCount: number }> {
    try {
      return await this.store.transaction((tx) =>
        tx.mergeSubjects(fromId, toId, adminId),
      );
    } catch (err) {
      if (err instanceof SubjectMergeError) {
        if (err.code === 'NOT_FOUND') throw new NotFoundException(err.message);
        throw new ConflictException({
          statusCode: 409,
          error: 'Conflict',
          code: err.code,
          message: err.message,
        });
      }
      throw err;
    }
  }
}
