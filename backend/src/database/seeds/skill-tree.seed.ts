import '../../polyfill';
import { config } from 'dotenv';
config({ path: '../.env' });

import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { User } from '../../modules/users/user.entity';
import { Subject } from '../../modules/subjects/subject.entity';
import { Party } from '../../modules/parties/party.entity';
import { PartyMember } from '../../modules/parties/party-member.entity';
import { ChatMessage } from '../../modules/parties/chat-message.entity';
import { PartyActivity } from '../../modules/parties/party-activity.entity';
import { Quest } from '../../modules/quests/quest.entity';
import { QuizQuestion } from '../../modules/quests/quiz-question.entity';
import { QuizOption } from '../../modules/quests/quiz-option.entity';
import { PlayerResult } from '../../modules/quests/player-result.entity';
import { SkillNode } from '../../modules/skill-tree/skill-node.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB ?? 'studyquest',
  entities: [
    User,
    Subject,
    Party,
    PartyMember,
    ChatMessage,
    PartyActivity,
    Quest,
    QuizQuestion,
    QuizOption,
    PlayerResult,
    SkillNode,
  ],
  synchronize: false,
  logging: false,
});

type NodeTemplate = {
  topic: string;
  name: string;
  description?: string;
  iconKey: string;
  xpThreshold: number;
  col: number;
  row: number;
  dependsOn?: string[];
};

function loadTemplate(): NodeTemplate[] {
  const templatePath = join(__dirname, 'skill-tree.template.json');
  const raw = readFileSync(templatePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('skill-tree.template.json debe contener un arreglo de nodos');
  }

  return parsed as NodeTemplate[];
}

async function seedSkillTreeForSubject(subjectId: string) {
  const subjectRepo = AppDataSource.getRepository(Subject);
  const nodeRepo = AppDataSource.getRepository(SkillNode);
  const template = loadTemplate();

  const subject = await subjectRepo.findOneBy({ id: subjectId });
  if (!subject) {
    throw new Error(`Materia no encontrada: ${subjectId}`);
  }

  const existing = await nodeRepo.count({ where: { subjectId } });
  if (existing > 0) {
    console.log(`⚠️  La materia ${subject.name} ya tiene nodos. Se omite.`);
    return;
  }

  const topicToId = new Map<string, string>();

  for (const node of template) {
    const prerequisiteIds = (node.dependsOn ?? [])
      .map((topic) => topicToId.get(topic))
      .filter((id): id is string => Boolean(id));

    const saved = await nodeRepo.save(
      nodeRepo.create({
        subjectId,
        topic: node.topic,
        name: node.name,
        description: node.description ?? null,
        iconKey: node.iconKey,
        xpThreshold: node.xpThreshold,
        prerequisiteIds,
        col: node.col,
        row: node.row,
      }),
    );

    topicToId.set(node.topic, saved.id);
  }

  console.log(`✅ Árbol creado para ${subject.name}`);
}

async function seedSkillTreeAllSubjects() {
  const subjectRepo = AppDataSource.getRepository(Subject);
  const subjects = await subjectRepo.find({ where: { isActive: true } });

  for (const subject of subjects) {
    await seedSkillTreeForSubject(subject.id);
  }
}

async function main() {
  await AppDataSource.initialize();

  const subjectIdArg = process.argv[2];
  if (subjectIdArg) {
    await seedSkillTreeForSubject(subjectIdArg);
  } else {
    await seedSkillTreeAllSubjects();
  }

  await AppDataSource.destroy();
}

main().catch((error: unknown) => {
  console.error('❌ Error al poblar árbol de habilidades:', error);
  process.exit(1);
});
