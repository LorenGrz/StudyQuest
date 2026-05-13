import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SkillNode } from './skill-node.entity';
import { UserSkillProgress } from './user-skill-progress.entity';
import { CreateSkillNodeDto, SkillNodeWithProgress } from '../../common/dto';

@Injectable()
export class SkillTreeService {
  constructor(
    @InjectRepository(SkillNode)
    private readonly nodeRepo: Repository<SkillNode>,
    @InjectRepository(UserSkillProgress)
    private readonly progressRepo: Repository<UserSkillProgress>,
  ) {}

  async getTree(subjectId: string): Promise<SkillNode[]> {
    return this.nodeRepo.find({
      where: { subjectId, isActive: true },
      order: { row: 'ASC', col: 'ASC' },
    });
  }

  async getTreeForUser(
    subjectId: string,
    userId: string,
  ): Promise<SkillNodeWithProgress[]> {
    const [nodes, progressRecords] = await Promise.all([
      this.getTree(subjectId),
      this.progressRepo.find({ where: { userId } }),
    ]);

    const progressMap = new Map(
      progressRecords.map((record) => [record.skillNodeId, record]),
    );
    const unlockedIds = new Set(
      progressRecords.filter((record) => record.unlocked).map((record) => record.skillNodeId),
    );

    return nodes.map((node) => {
      const progress = progressMap.get(node.id);
      const topicXp = progress?.topicXp ?? 0;
      const prerequisitesMet = node.prerequisiteIds.every((id) =>
        unlockedIds.has(id),
      );

      return {
        ...node,
        topicXp,
        unlocked: progress?.unlocked ?? false,
        progressPercent:
          node.xpThreshold > 0
            ? Math.min(100, Math.floor((topicXp / node.xpThreshold) * 100))
            : 100,
        prerequisitesMet,
      };
    });
  }

  async createNode(dto: CreateSkillNodeDto): Promise<SkillNode> {
    if (!dto.subjectId) {
      throw new BadRequestException('subjectId es requerido');
    }

    if (dto.prerequisiteIds?.length) {
      const prereqCount = await this.nodeRepo.count({
        where: {
          subjectId: dto.subjectId,
          id: In(dto.prerequisiteIds),
          isActive: true,
        },
      });
      if (prereqCount !== dto.prerequisiteIds.length) {
        throw new NotFoundException('Una o más prerequisitos no existen');
      }
    }

    const node = this.nodeRepo.create({
      subjectId: dto.subjectId,
      topic: dto.topic,
      name: dto.name,
      description: dto.description ?? null,
      iconKey: dto.iconKey ?? 'star',
      xpThreshold: dto.xpThreshold,
      prerequisiteIds: dto.prerequisiteIds ?? [],
      col: dto.col ?? 0,
      row: dto.row ?? 0,
    });

    return this.nodeRepo.save(node);
  }

  async awardTopicXp(
    userId: string,
    subjectId: string,
    topic: string | null,
    xpAmount: number,
  ): Promise<string[]> {
    if (!topic || xpAmount <= 0) {
      return [];
    }

    const matchingNodes = await this.nodeRepo
      .createQueryBuilder('node')
      .where('node.subject_id = :subjectId', { subjectId })
      .andWhere('LOWER(node.topic) = LOWER(:topic)', { topic })
      .andWhere('node.is_active = true')
      .orderBy('node.row', 'ASC')
      .addOrderBy('node.col', 'ASC')
      .getMany();

    if (matchingNodes.length === 0) {
      return [];
    }

    const existingProgress = await this.progressRepo.find({
      where: { userId },
    });
    const progressMap = new Map(
      existingProgress.map((record) => [record.skillNodeId, record]),
    );
    const unlockedIds = new Set(
      existingProgress
        .filter((record) => record.unlocked)
        .map((record) => record.skillNodeId),
    );

    const newlyUnlockedNodeIds: string[] = [];

    for (const node of matchingNodes) {
      let progress = progressMap.get(node.id);
      if (!progress) {
        progress = this.progressRepo.create({
          userId,
          skillNodeId: node.id,
          topicXp: 0,
          unlocked: false,
          unlockedAt: null,
        });
      }

      if (progress.unlocked) {
        continue;
      }

      progress.topicXp += xpAmount;

      const prerequisitesMet = node.prerequisiteIds.every((id) => unlockedIds.has(id));
      if (prerequisitesMet && progress.topicXp >= node.xpThreshold) {
        progress.unlocked = true;
        progress.unlockedAt = new Date();
        unlockedIds.add(node.id);
        newlyUnlockedNodeIds.push(node.id);
      }

      const saved = await this.progressRepo.save(progress);
      progressMap.set(saved.skillNodeId, saved);
    }

    return newlyUnlockedNodeIds;
  }
}
