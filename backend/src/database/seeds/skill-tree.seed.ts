import '../../polyfill';
import { config } from 'dotenv';
config({ path: '../.env' });

import 'reflect-metadata';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { Subject } from '../../modules/subjects/subject.entity';
import { SkillNode } from '../../modules/skill-tree/skill-node.entity';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB ?? 'studyquest',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: true,
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

function resolveTemplatePath(code?: string): string {
  if (code) {
    const perSubject = join(__dirname, 'skill-trees', `${code}.json`);
    if (existsSync(perSubject)) {
      return perSubject;
    }
  }
  return join(__dirname, 'skill-tree.template.json');
}

function loadTemplate(code?: string): NodeTemplate[] {
  const templatePath = resolveTemplatePath(code);
  const raw = readFileSync(templatePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${templatePath} debe contener un arreglo de nodos`);
  }

  return parsed as NodeTemplate[];
}

async function seedSkillTreeForSubject(subjectId: string) {
  const subjectRepo = AppDataSource.getRepository(Subject);
  const nodeRepo = AppDataSource.getRepository(SkillNode);

  const subject = await subjectRepo.findOneBy({ id: subjectId });
  if (!subject) {
    throw new Error(`Materia no encontrada: ${subjectId}`);
  }

  const template = loadTemplate(subject.code);
  const force = process.argv.includes('--force');

  const existing = await nodeRepo.count({ where: { subjectId } });
  if (existing > 0) {
    if (!force) {
      console.log(`⚠️  La materia ${subject.name} ya tiene nodos. Se omite (usá --force para regenerar).`);
      return;
    }
    await nodeRepo.delete({ subjectId });
    console.log(`♻️  ${subject.name}: ${existing} nodos previos eliminados (--force).`);
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

  const subjectIdArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
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
