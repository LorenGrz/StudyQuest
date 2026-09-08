import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import type { Dirent } from 'node:fs';
import { readdir, stat, unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Quest } from './quest.entity';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 7;
const UPLOADS_DIR = join(process.cwd(), 'uploads');

/**
 * Borra quests (y en cascada sus quiz_questions / quiz_options / player_results
 * vía FK ON DELETE CASCADE) y los PDFs subidos una vez superada la ventana de
 * retención. Mantiene acotado el uso de disco de Postgres y de ./uploads.
 */
@Injectable()
export class QuestRetentionService implements OnModuleInit {
  private readonly logger = new Logger(QuestRetentionService.name);
  private running = false;

  constructor(
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
  ) {}

  private get retentionDays(): number {
    const raw = Number(process.env.QUEST_RETENTION_DAYS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RETENTION_DAYS;
  }

  onModuleInit(): void {
    // En Render free la instancia se duerme, así que un cron a hora fija no es
    // confiable: corremos una pasada también en cada arranque en frío.
    void this.purgeExpired();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const cutoff = new Date(Date.now() - this.retentionDays * DAY_MS);

      const expired = await this.questRepo.find({
        where: { createdAt: LessThan(cutoff) },
        select: { id: true, sourcePdfUrl: true },
      });

      if (expired.length === 0) {
        await this.sweepOrphanUploads(cutoff);
        return;
      }

      // El FK ON DELETE CASCADE se encarga de quiz_questions, quiz_options y
      // player_results.
      await this.questRepo.delete({ createdAt: LessThan(cutoff) });

      let files = 0;
      for (const quest of expired) {
        if (await this.removeUpload(quest.sourcePdfUrl)) files += 1;
      }
      files += await this.sweepOrphanUploads(cutoff);

      this.logger.log(
        `retención: ${expired.length} quests y ${files} archivos borrados (corte ${cutoff.toISOString()})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`fallo la purga de retención: ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async removeUpload(sourcePdfUrl: string | null): Promise<boolean> {
    if (!sourcePdfUrl) return false;

    const file = join(UPLOADS_DIR, basename(sourcePdfUrl));
    try {
      await unlink(file);
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(
          `no se pudo borrar ${file}: ${(err as Error).message}`,
        );
      }
      return false;
    }
  }

  /**
   * Borra archivos sueltos directamente bajo uploads/ (PDFs de quests, adjuntos
   * de chat viejos) anteriores al corte. Ignora los subdirectorios borders/ y
   * avatars/, que guardan cosméticos y no subidas de usuario.
   */
  private async sweepOrphanUploads(cutoff: Date): Promise<number> {
    const entries = await this.readUploads();
    let removed = 0;

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const file = join(UPLOADS_DIR, entry.name);
      try {
        const info = await stat(file);
        if (info.mtime < cutoff) {
          await unlink(file);
          removed += 1;
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          this.logger.warn(
            `no se pudo revisar ${file}: ${(err as Error).message}`,
          );
        }
      }
    }

    return removed;
  }

  private async readUploads(): Promise<Dirent[]> {
    try {
      return await readdir(UPLOADS_DIR, { withFileTypes: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.warn(`no se pudo leer uploads/: ${(err as Error).message}`);
      }
      return [];
    }
  }
}
