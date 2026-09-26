import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan, Repository } from 'typeorm';
import { Quest } from './quest.entity';
import { StorageService } from '../storage/storage.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RETENTION_DAYS = 30;

/**
 * Borra quests (y en cascada sus quiz_questions / quiz_options / player_results
 * vía FK ON DELETE CASCADE) y sus documentos fuente en S3 una vez superada la
 * ventana de retención. Los objetos S3 huérfanos (por ejemplo un upload cuya
 * quest nunca se llegó a guardar) quedan a cargo de una lifecycle policy del
 * bucket, no de este servicio.
 */
@Injectable()
export class QuestRetentionService implements OnModuleInit {
  private readonly logger = new Logger(QuestRetentionService.name);
  private running = false;

  constructor(
    @InjectRepository(Quest)
    private readonly questRepo: Repository<Quest>,
    private readonly storageService: StorageService,
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

      if (expired.length === 0) return;

      // El FK ON DELETE CASCADE se encarga de quiz_questions, quiz_options y
      // player_results.
      await this.questRepo.delete({ createdAt: LessThan(cutoff) });

      const keys = expired.map((quest) =>
        this.storageService.keyFromUrl(quest.sourcePdfUrl),
      );
      await this.storageService.deleteMany(keys);

      this.logger.log(
        `retención: ${expired.length} quests y ${keys.filter(Boolean).length} archivos borrados (corte ${cutoff.toISOString()})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`fallo la purga de retención: ${message}`);
    } finally {
      this.running = false;
    }
  }
}
