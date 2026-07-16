/**
 * Seed script — pobla la BD con datos de prueba
 *
 * Uso (desde la carpeta backend/):
 *   pnpm run seed
 *
 * Requiere que la BD esté corriendo:
 *   docker-compose up postgres   (solo la BD)
 *   — o —
 *   docker-compose up            (todo el stack)
 */

// IMPORTANTE: config() debe llamarse ANTES de que se construya AppDataSource,
// porque el DataSource lee process.env.* en el momento de su definición.
// Con CommonJS esto es seguro: los imports se resuelven primero, luego
// el cuerpo del módulo corre de arriba hacia abajo:
//   1. config()           → carga .env en process.env
//   2. new DataSource(…)  → lee process.env ya cargado ✅
import '../../polyfill';
import { config } from 'dotenv';
config({ path: '../.env' }); // carga el .env desde la raíz del proyecto

import 'reflect-metadata';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/user.entity';
import { FriendRequest } from '../../modules/users/friend-request.entity';
import { Subject } from '../../modules/subjects/subject.entity';
import { SkillNode } from '../../modules/skill-tree/skill-node.entity';
import { Party } from '../../modules/parties/party.entity';
import { PartyMember } from '../../modules/parties/party-member.entity';
import { ChatMessage } from '../../modules/parties/chat-message.entity';
import { PartyActivity } from '../../modules/parties/party-activity.entity';
import { Quest } from '../../modules/quests/quest.entity';
import { QuizQuestion } from '../../modules/quests/quiz-question.entity';
import { QuizOption } from '../../modules/quests/quiz-option.entity';
import { PlayerResult } from '../../modules/quests/player-result.entity';
import { PartyInvitation } from '../../modules/parties/party-invitation.entity';
import { Achievement } from '../../modules/achievements/achievement.entity';
import { UserAchievement } from '../../modules/achievements/user-achievement.entity';
import { UserTitle } from '../../modules/cosmetics/user-title.entity';
import { UserInventory } from '../../modules/cosmetics/user-inventory.entity';
import { ProfileBorder } from '../../modules/cosmetics/profile-border.entity';
import { DEFAULT_ELO } from '../../common/leagues';

// ─── Conexión ──────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB ?? 'studyquest',
  entities: [
    User,
    FriendRequest,
    Subject,
    SkillNode,
    Party,
    PartyMember,
    ChatMessage,
    PartyActivity,
    Quest,
    QuizQuestion,
    QuizOption,
    PlayerResult,
    PartyInvitation,
    Achievement,
    UserAchievement,
    UserTitle,
    UserInventory,
    ProfileBorder,
  ],
  synchronize: false,
  logging: false,
});

async function ensureBootstrapSchema(): Promise<void> {
  await AppDataSource.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  await AppDataSource.query(`
    ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS active_cosmetics jsonb
    DEFAULT '{"titleCode":null,"titleText":null}'::jsonb;
  `);

  await AppDataSource.query(`
    ALTER TABLE IF EXISTS achievements
    ADD COLUMN IF NOT EXISTS reward_type varchar(20);
  `);

  await AppDataSource.query(`
    ALTER TABLE IF EXISTS achievements
    ADD COLUMN IF NOT EXISTS reward_code varchar(60);
  `);

  // Si quedaron tablas legado de pruebas manuales, las recreamos limpias.
  await AppDataSource.query('DROP TABLE IF EXISTS user_inventory CASCADE;');
  await AppDataSource.query('DROP TABLE IF EXISTS user_titles CASCADE;');
  await AppDataSource.query('DROP TABLE IF EXISTS profile_borders CASCADE;');

  await AppDataSource.synchronize();
}

// ─── Datos de prueba ───────────────────────────────────────────────────────────
const UNIVERSITY = 'Universidad Nacional de Córdoba';
const CAREER = 'Ingeniería en Sistemas de Información';

const SUBJECTS_DATA = [
  {
    name: 'Análisis Matemático II',
    code: 'AM2',
    semester: 2,
    description: 'Cálculo diferencial e integral en varias variables.',
  },
  {
    name: 'Algoritmos y Estructuras de Datos',
    code: 'AED',
    semester: 3,
    description: 'Diseño y análisis de algoritmos, estructuras clásicas.',
  },
  {
    name: 'Bases de Datos',
    code: 'BD',
    semester: 4,
    description: 'Modelado relacional, SQL y bases NoSQL.',
  },
  {
    name: 'Sistemas Operativos',
    code: 'SO',
    semester: 4,
    description: 'Procesos, memoria, filesystem y concurrencia.',
  },
  {
    name: 'Redes de Computadoras',
    code: 'RC',
    semester: 5,
    description: 'Modelo OSI/TCP-IP, protocolos y seguridad.',
  },
];

const USERS_DATA = [
  {
    email: 'admin@studyquest.dev',
    username: 'admin_sq',
    displayName: 'Admin',
    password: 'AdminPass123!',
    semester: 1,
    role: 'ADMIN',
  },
  {
    email: 'alice@studyquest.dev',
    username: 'alice_dev',
    displayName: 'Alice García',
    password: 'Password123!',
    semester: 4,
  },
  {
    email: 'bob@studyquest.dev',
    username: 'bobby_b',
    displayName: 'Bob Martínez',
    password: 'Password123!',
    semester: 3,
  },
  {
    email: 'carol@studyquest.dev',
    username: 'carol_dev',
    displayName: 'Carol López',
    password: 'Password123!',
    semester: 5,
  },
  {
    email: 'dave@studyquest.dev',
    username: 'dave_code',
    displayName: 'Dave Rodríguez',
    password: 'Password123!',
    semester: 4,
  },
  {
    email: 'eve@studyquest.dev',
    username: 'eve_hacker',
    displayName: 'Eve Fernández',
    password: 'Password123!',
    semester: 2,
  },
  {
    email: 'frank@studyquest.dev',
    username: 'frank_tank',
    displayName: 'Frank Gómez',
    password: 'Password123!',
    semester: 3,
  },
  {
    email: 'grace@studyquest.dev',
    username: 'grace_hopp',
    displayName: 'Grace Hopper',
    password: 'Password123!',
    semester: 4,
  },
];

const ACHIEVEMENTS_DATA = [
  {
    code: 'FIRST_QUEST',
    name: 'Primera Quest',
    icon: '🎯',
    category: 'academic',
    description: 'Completaste tu primera quest.',
    points: 50,
  },
  {
    code: 'QUEST_STREAK_3',
    name: 'En Racha',
    icon: '🔥',
    category: 'academic',
    description: 'Mantuviste una racha de 3 días.',
    points: 100,
    rewardType: 'title',
    rewardCode: 'STREAK_3_TITLE',
  },
  {
    code: 'QUEST_STREAK_5',
    name: 'Imparable',
    icon: '⚡',
    category: 'academic',
    description: 'Mantuviste una racha de 5 días.',
    points: 200,
  },
  {
    code: 'FIRST_PARTY',
    name: 'Primera Party',
    icon: '🎉',
    category: 'social',
    description: 'Te uniste a tu primera party de estudio.',
    points: 50,
  },
  {
    code: 'SOCIAL_BUTTERFLY',
    name: 'Alma de la Fiesta',
    icon: '🦋',
    category: 'social',
    description: 'Participaste en 5 parties diferentes.',
    points: 150,
  },
  {
    code: 'LEVEL_5',
    name: 'Estudiante Aplicado',
    icon: '📚',
    category: 'progression',
    description: 'Alcanzaste el nivel 5.',
    points: 100,
  },
  {
    code: 'LEVEL_10',
    name: 'Maestro del Estudio',
    icon: '🏆',
    category: 'progression',
    description: 'Alcanzaste el nivel 10.',
    points: 250,
    rewardType: 'title',
    rewardCode: 'MASTER_TITLE',
  },

  {
    code: 'STREAK_3_BORDER',
    name: 'Marco de Fuego',
    icon: '🔥',
    category: 'cosmetic',
    description: 'Recompensa por racha de 3 días.',
    points: 0,
    rewardType: 'border',
    rewardCode: 'FIRE_BORDER',
  },
  {
    code: 'LEVEL_5_BORDER',
    name: 'Marco Estelar',
    icon: '⭐',
    category: 'cosmetic',
    description: 'Recompensa por nivel 5.',
    points: 0,
    rewardType: 'border',
    rewardCode: 'STAR_BORDER',
  },
  {
    code: 'LEVEL_10_BORDER',
    name: 'Marco de Campeón',
    icon: '👑',
    category: 'cosmetic',
    description: 'Recompensa por nivel 10.',
    points: 0,
    rewardType: 'border',
    rewardCode: 'CHAMPION_BORDER',
  },

  // ── League rank-up achievements ─────────────────────────────────────────────
  {
    code: 'LEAGUE_IRON',
    name: 'Bienvenido al Hierro',
    icon: '⚙️',
    category: 'league',
    description: 'Comenzaste tu camino en StudyQuest.',
    points: 0,
    rewardType: 'border',
    rewardCode: 'IRON_BORDER',
  },
  {
    code: 'LEAGUE_SILVER',
    name: 'Ascenso a Plata',
    icon: '🥈',
    category: 'league',
    description: 'Alcanzaste la liga Plata.',
    points: 50,
    rewardType: 'border',
    rewardCode: 'SILVER_BORDER',
  },
  {
    code: 'LEAGUE_GOLD',
    name: 'Ascenso a Oro',
    icon: '🥇',
    category: 'league',
    description: 'Alcanzaste la liga Oro.',
    points: 100,
    rewardType: 'border',
    rewardCode: 'GOLD_BORDER',
  },
  {
    code: 'LEAGUE_PLATINUM',
    name: 'Ascenso a Platino',
    icon: '💎',
    category: 'league',
    description: 'Alcanzaste la liga Platino.',
    points: 150,
    rewardType: 'border',
    rewardCode: 'PLATINUM_BORDER',
  },
  {
    code: 'LEAGUE_EMERALD',
    name: 'Ascenso a Esmeralda',
    icon: '💚',
    category: 'league',
    description: 'Alcanzaste la liga Esmeralda.',
    points: 200,
    rewardType: 'border',
    rewardCode: 'EMERALD_BORDER',
  },
  {
    code: 'LEAGUE_DIAMOND',
    name: 'Ascenso a Diamante',
    icon: '💠',
    category: 'league',
    description: 'Alcanzaste la liga Diamante.',
    points: 300,
    rewardType: 'border',
    rewardCode: 'DIAMOND_BORDER',
  },
  {
    code: 'LEAGUE_QUESTMASTER',
    name: '¡QuestMaster!',
    icon: '👑',
    category: 'league',
    description: 'Alcanzaste el rango máximo.',
    points: 500,
    rewardType: 'border',
    rewardCode: 'QUESTMASTER_BORDER',
  },

  // league title achievements
  {
    code: 'LEAGUE_IRON_TITLE',
    name: 'Título: Forjado en Hierro',
    icon: '⚙️',
    category: 'league',
    description: 'Título desbloqueado al iniciar.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'IRON_TITLE',
  },
  {
    code: 'LEAGUE_SILVER_TITLE',
    name: 'Título: De Plata',
    icon: '🥈',
    category: 'league',
    description: 'Título desbloqueado en Plata.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'SILVER_TITLE',
  },
  {
    code: 'LEAGUE_GOLD_TITLE',
    name: 'Título: Dorado',
    icon: '🥇',
    category: 'league',
    description: 'Título desbloqueado en Oro.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'GOLD_TITLE',
  },
  {
    code: 'LEAGUE_PLATINUM_TITLE',
    name: 'Título: Platinado',
    icon: '💎',
    category: 'league',
    description: 'Título desbloqueado en Platino.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'PLATINUM_TITLE',
  },
  {
    code: 'LEAGUE_EMERALD_TITLE',
    name: 'Título: Esmeralda',
    icon: '💚',
    category: 'league',
    description: 'Título desbloqueado en Esmeralda.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'EMERALD_TITLE',
  },
  {
    code: 'LEAGUE_DIAMOND_TITLE',
    name: 'Título: Diamante',
    icon: '💠',
    category: 'league',
    description: 'Título desbloqueado en Diamante.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'DIAMOND_TITLE',
  },
  {
    code: 'LEAGUE_QUESTMASTER_TITLE',
    name: 'Título: QuestMaster',
    icon: '👑',
    category: 'league',
    description: 'Título desbloqueado al ser QuestMaster.',
    points: 0,
    rewardType: 'title',
    rewardCode: 'QUESTMASTER_TITLE',
  },
];

// ── League cosmetics map (tier → codes) ─────────────────────────────────────
const LEAGUE_TIERS = [
  {
    tier: 1,
    minElo: 0,
    borderCode: 'IRON_BORDER',
    titleCode: 'IRON_TITLE',
    borderAchiev: 'LEAGUE_IRON',
    titleAchiev: 'LEAGUE_IRON_TITLE',
  },
  {
    tier: 2,
    minElo: 400,
    borderCode: 'SILVER_BORDER',
    titleCode: 'SILVER_TITLE',
    borderAchiev: 'LEAGUE_SILVER',
    titleAchiev: 'LEAGUE_SILVER_TITLE',
  },
  {
    tier: 3,
    minElo: 800,
    borderCode: 'GOLD_BORDER',
    titleCode: 'GOLD_TITLE',
    borderAchiev: 'LEAGUE_GOLD',
    titleAchiev: 'LEAGUE_GOLD_TITLE',
  },
  {
    tier: 4,
    minElo: 1200,
    borderCode: 'PLATINUM_BORDER',
    titleCode: 'PLATINUM_TITLE',
    borderAchiev: 'LEAGUE_PLATINUM',
    titleAchiev: 'LEAGUE_PLATINUM_TITLE',
  },
  {
    tier: 5,
    minElo: 1600,
    borderCode: 'EMERALD_BORDER',
    titleCode: 'EMERALD_TITLE',
    borderAchiev: 'LEAGUE_EMERALD',
    titleAchiev: 'LEAGUE_EMERALD_TITLE',
  },
  {
    tier: 6,
    minElo: 2000,
    borderCode: 'DIAMOND_BORDER',
    titleCode: 'DIAMOND_TITLE',
    borderAchiev: 'LEAGUE_DIAMOND',
    titleAchiev: 'LEAGUE_DIAMOND_TITLE',
  },
  {
    tier: 7,
    minElo: 2400,
    borderCode: 'QUESTMASTER_BORDER',
    titleCode: 'QUESTMASTER_TITLE',
    borderAchiev: 'LEAGUE_QUESTMASTER',
    titleAchiev: 'LEAGUE_QUESTMASTER_TITLE',
  },
];

const USER_TITLES_DATA = [
  {
    code: 'STREAK_3_TITLE',
    name: 'Racha Activa',
    text: 'Racha Activa',
    achievementCode: 'QUEST_STREAK_3',
  },
  {
    code: 'MASTER_TITLE',
    name: 'Maestro del Estudio',
    text: 'Maestro del Estudio',
    achievementCode: 'LEVEL_10',
  },
  // league titles
  {
    code: 'IRON_TITLE',
    name: 'Forjado en Hierro',
    text: 'Forjado en Hierro',
    achievementCode: 'LEAGUE_IRON_TITLE',
  },
  {
    code: 'SILVER_TITLE',
    name: 'De Plata',
    text: 'De Plata',
    achievementCode: 'LEAGUE_SILVER_TITLE',
  },
  {
    code: 'GOLD_TITLE',
    name: 'Dorado',
    text: 'Dorado',
    achievementCode: 'LEAGUE_GOLD_TITLE',
  },
  {
    code: 'PLATINUM_TITLE',
    name: 'Platinado',
    text: 'Platinado',
    achievementCode: 'LEAGUE_PLATINUM_TITLE',
  },
  {
    code: 'EMERALD_TITLE',
    name: 'Esmeralda',
    text: 'Esmeralda',
    achievementCode: 'LEAGUE_EMERALD_TITLE',
  },
  {
    code: 'DIAMOND_TITLE',
    name: 'Diamante',
    text: 'Diamante',
    achievementCode: 'LEAGUE_DIAMOND_TITLE',
  },
  {
    code: 'QUESTMASTER_TITLE',
    name: 'QuestMaster',
    text: 'QuestMaster',
    achievementCode: 'LEAGUE_QUESTMASTER_TITLE',
  },
];

const PROFILE_BORDERS_DATA = [
  {
    code: 'FIRE_BORDER',
    name: 'Llamas',
    imageFile: 'fire.svg',
    achievementCode: 'STREAK_3_BORDER',
  },
  {
    code: 'STAR_BORDER',
    name: 'Estrella',
    imageFile: 'star.svg',
    achievementCode: 'LEVEL_5_BORDER',
  },
  {
    code: 'CHAMPION_BORDER',
    name: 'Campeón',
    imageFile: 'champion.svg',
    achievementCode: 'LEVEL_10_BORDER',
  },
  // league borders
  {
    code: 'IRON_BORDER',
    name: 'Hierro',
    imageFile: 'iron.svg',
    achievementCode: 'LEAGUE_IRON',
  },
  {
    code: 'SILVER_BORDER',
    name: 'Plata',
    imageFile: 'silver.svg',
    achievementCode: 'LEAGUE_SILVER',
  },
  {
    code: 'GOLD_BORDER',
    name: 'Oro',
    imageFile: 'gold.svg',
    achievementCode: 'LEAGUE_GOLD',
  },
  {
    code: 'PLATINUM_BORDER',
    name: 'Platino',
    imageFile: 'platinum.svg',
    achievementCode: 'LEAGUE_PLATINUM',
  },
  {
    code: 'EMERALD_BORDER',
    name: 'Esmeralda',
    imageFile: 'emerald.svg',
    achievementCode: 'LEAGUE_EMERALD',
  },
  {
    code: 'DIAMOND_BORDER',
    name: 'Diamante',
    imageFile: 'diamond.svg',
    achievementCode: 'LEAGUE_DIAMOND',
  },
  {
    code: 'QUESTMASTER_BORDER',
    name: 'QuestMaster',
    imageFile: 'questmaster.svg',
    achievementCode: 'LEAGUE_QUESTMASTER',
  },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
type SkillTreeNodeTemplate = {
  topic: string;
  name: string;
  description?: string;
  iconKey: string;
  xpThreshold: number;
  col: number;
  row: number;
  dependsOn?: string[];
};

function resolveSkillTreeTemplatePath(code?: string): string {
  if (code) {
    const perSubject = join(__dirname, 'skill-trees', `${code}.json`);
    if (existsSync(perSubject)) {
      return perSubject;
    }
  }
  return join(__dirname, 'skill-tree.template.json');
}

function loadSkillTreeTemplate(code?: string): SkillTreeNodeTemplate[] {
  const templatePath = resolveSkillTreeTemplatePath(code);
  const raw = readFileSync(templatePath, 'utf-8');
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`${templatePath} debe contener un arreglo de nodos`);
  }

  return parsed as SkillTreeNodeTemplate[];
}

async function seedSkillTreesForSubjects(subjects: Subject[]) {
  const nodeRepo = AppDataSource.getRepository(SkillNode);

  for (const subject of subjects) {
    const existing = await nodeRepo.count({ where: { subjectId: subject.id } });
    if (existing > 0) {
      console.log(`   ⚠️  ${subject.code}: ya hay nodos cargados — omitido`);
      continue;
    }

    const template = loadSkillTreeTemplate(subject.code);
    const topicToId = new Map<string, string>();

    for (const node of template) {
      const prerequisiteIds = (node.dependsOn ?? [])
        .map((topic) => topicToId.get(topic))
        .filter((id): id is string => Boolean(id));

      const saved = await nodeRepo.save(
        nodeRepo.create({
          subjectId: subject.id,
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

    console.log(`   ✔  ${subject.code}: ${template.length} nodos cargados`);
  }
}

async function seed() {
  console.log('🌱  Conectando a la base de datos...');
  await AppDataSource.initialize();
  await ensureBootstrapSchema();
  console.log('✅  Conexión exitosa\n');

  const userRepo = AppDataSource.getRepository(User);
  const friendRequestRepo = AppDataSource.getRepository(FriendRequest);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const partyRepo = AppDataSource.getRepository(Party);
  const memberRepo = AppDataSource.getRepository(PartyMember);
  const userTitleRepo = AppDataSource.getRepository(UserTitle);

  // ── 1. Materias ──────────────────────────────────────────────────────────────
  console.log('📚  Creando materias...');
  const savedSubjects: Subject[] = [];

  for (const sd of SUBJECTS_DATA) {
    const existing = await subjectRepo.findOneBy({
      code: sd.code,
      university: UNIVERSITY,
    });
    if (existing) {
      console.log(`   ⚠️  Materia "${sd.code}" ya existe — omitida`);
      savedSubjects.push(existing);
      continue;
    }
    const subject = subjectRepo.create({
      ...sd,
      university: UNIVERSITY,
      career: CAREER,
    });
    savedSubjects.push(await subjectRepo.save(subject));
    console.log(`   ✔  ${sd.name}`);
  }

  console.log('\n🧭  Cargando árboles de habilidades...');
  await seedSkillTreesForSubjects(savedSubjects);

  // ── 2. Usuarios ──────────────────────────────────────────────────────────────
  console.log('\n👥  Creando usuarios...');
  const savedUsers: User[] = [];

  for (const ud of USERS_DATA) {
    const existing = await userRepo.findOneBy({ email: ud.email });
    if (existing) {
      console.log(`   ⚠️  Usuario "${ud.email}" ya existe — omitido`);
      savedUsers.push(existing);
      continue;
    }
    const passwordHash = await bcrypt.hash(ud.password, 12);
    const user = userRepo.create({
      email: ud.email,
      username: ud.username,
      displayName: ud.displayName,
      university: UNIVERSITY,
      career: CAREER,
      semester: ud.semester,
      role: (ud as any).role ?? 'USER',
      passwordHash,
      stats: {
        xp: 0,
        level: 0,
        elo: DEFAULT_ELO,
        quizzesPlayed: 0,
        quizzesWon: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastPlayedAt: null,
      },
      availability: [],
    });
    savedUsers.push(await userRepo.save(user));
    console.log(`   ✔  ${ud.displayName} (${ud.email})`);
  }

  // ── 3. Inscribir usuarios en materias ────────────────────────────────────────
  console.log('\n📝  Inscribiendo usuarios en materias...');
  const [_admin, alice, bob, carol, dave, eve, frank, grace] = savedUsers;
  const [am2, aed, bd, so, rc] = savedSubjects;

  console.log('\n🤝  Creando amistades de prueba...');
  const friendSeeds = [
    { requesterId: alice.id, requesteeId: bob.id, status: 'accepted' as const },
    { requesterId: eve.id, requesteeId: grace.id, status: 'pending' as const },
  ];

  for (const fr of friendSeeds) {
    const existing = await friendRequestRepo.findOne({
      where: [
        { requesterId: fr.requesterId, requesteeId: fr.requesteeId },
        { requesterId: fr.requesteeId, requesteeId: fr.requesterId },
      ],
    });
    if (existing) continue;
    await friendRequestRepo.save(friendRequestRepo.create(fr));
  }
  console.log('   ✔  Solicitudes de amistad seeded');

  // ── 3b. Logros ──────────────────────────────────────────────────────────────────
  console.log('\n🏆  Creando logros...');
  const achievementRepo = AppDataSource.getRepository(Achievement);

  for (const ad of ACHIEVEMENTS_DATA) {
    const existing = await achievementRepo.findOneBy({ code: ad.code });
    if (existing) {
      await achievementRepo.save(
        achievementRepo.create({
          ...existing,
          rewardType: (ad as any).rewardType ?? null,
          rewardCode: (ad as any).rewardCode ?? null,
        }),
      );
      console.log(`   ⚠️  Logro "${ad.code}" ya existe — actualizado`);
      continue;
    }
    await achievementRepo.save(
      achievementRepo.create({
        ...ad,
        rewardType: (ad as any).rewardType ?? null,
        rewardCode: (ad as any).rewardCode ?? null,
      }),
    );
    console.log(`   ✔  ${ad.icon} ${ad.name}`);
  }

  console.log('\n🏷️  Creando catálogo de títulos...');
  for (const td of USER_TITLES_DATA) {
    const existing = await userTitleRepo.findOneBy({ code: td.code });
    if (existing) {
      await userTitleRepo.save(userTitleRepo.create({ ...existing, ...td }));
      console.log(`   ⚠️  Título "${td.code}" ya existe — actualizado`);
      continue;
    }
    await userTitleRepo.save(userTitleRepo.create(td));
    console.log(`   ✔  ${td.name}`);
  }

  console.log('\n🖼️  Creando catálogo de bordes...');
  const profileBorderRepo = AppDataSource.getRepository(ProfileBorder);
  for (const bd of PROFILE_BORDERS_DATA) {
    const existing = await profileBorderRepo.findOneBy({ code: bd.code });
    if (existing) {
      await profileBorderRepo.save(
        profileBorderRepo.create({ ...existing, ...bd }),
      );
      console.log(`   ⚠️  Borde "${bd.code}" ya existe — actualizado`);
      continue;
    }
    await profileBorderRepo.save(profileBorderRepo.create(bd));
    console.log(`   ✔  ${bd.name}`);
  }

  // CORRECTO: AppDataSource.createQueryBuilder().relation(...)
  // INCORRECTO (bug original): subjectRepo.createQueryBuilder().relation(...)
  //   → subjectRepo.createQueryBuilder() devuelve SelectQueryBuilder, que NO tiene .relation()
  //   → AppDataSource.createQueryBuilder().relation() devuelve RelationQueryBuilder ✅
  const rel = () =>
    AppDataSource.createQueryBuilder().relation(User, 'enrolledSubjects');

  // Dave se inscribe en todas para probar el feed completo
  await rel()
    .of(dave.id)
    .add([am2.id, aed.id, bd.id, so.id, rc.id])
    .catch(() => {
      /* duplicado, ignorar */
    });

  await rel()
    .of(alice.id)
    .add([aed.id, bd.id])
    .catch(() => {
      /* duplicado, ignorar */
    });
  await rel()
    .of(bob.id)
    .add([aed.id, bd.id, so.id])
    .catch(() => {
      /* duplicado, ignorar */
    });
  await rel()
    .of(carol.id)
    .add([rc.id, so.id])
    .catch(() => {
      /* duplicado, ignorar */
    });
  await rel()
    .of(eve.id)
    .add([am2.id, aed.id])
    .catch(() => {
      /* duplicado, ignorar */
    });
  await rel()
    .of(frank.id)
    .add([so.id, rc.id])
    .catch(() => {
      /* duplicado, ignorar */
    });
  await rel()
    .of(grace.id)
    .add([bd.id, so.id, aed.id])
    .catch(() => {
      /* duplicado, ignorar */
    });

  console.log('   ✔  Inscripciones realizadas');

  // ── 4. Parties ───────────────────────────────────────────────────────────────
  console.log('\n🎮  Creando parties...');

  // Party 1: Bases de Datos — alice + bob
  let partyBD = await partyRepo.findOne({
    where: { subjectId: bd.id, status: 'forming' },
  });
  if (!partyBD) {
    partyBD = await partyRepo.save(
      partyRepo.create({ subjectId: bd.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(
      memberRepo.create({
        partyId: partyBD.id,
        userId: alice.id,
        role: 'leader',
      }),
    );
    await memberRepo.save(
      memberRepo.create({ partyId: partyBD.id, userId: bob.id }),
    );
    console.log('   ✔  Party "Bases de Datos" (alice + bob)');
  } else {
    console.log('   ⚠️  Party BD ya existe — omitida');
  }

  // Party 2: Redes de Computadoras — carol + frank
  let partyRC = await partyRepo.findOne({
    where: { subjectId: rc.id, status: 'forming' },
  });
  if (!partyRC) {
    partyRC = await partyRepo.save(
      partyRepo.create({ subjectId: rc.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(
      memberRepo.create({
        partyId: partyRC.id,
        userId: carol.id,
        role: 'leader',
      }),
    );
    await memberRepo.save(
      memberRepo.create({ partyId: partyRC.id, userId: frank.id }),
    );
    console.log('   ✔  Party "Redes de Computadoras" (carol + frank)');
  } else {
    console.log('   ⚠️  Party RC ya existe — omitida');
  }

  // Party 3: Algoritmos y Estructuras de Datos — eve + grace
  let partyAED = await partyRepo.findOne({
    where: { subjectId: aed.id, status: 'forming' },
  });
  if (!partyAED) {
    partyAED = await partyRepo.save(
      partyRepo.create({ subjectId: aed.id, status: 'forming', maxMembers: 3 }),
    );
    await memberRepo.save(
      memberRepo.create({
        partyId: partyAED.id,
        userId: eve.id,
        role: 'leader',
      }),
    );
    await memberRepo.save(
      memberRepo.create({ partyId: partyAED.id, userId: grace.id }),
    );
    console.log('   ✔  Party "Algoritmos y Estructuras" (eve + grace)');
  } else {
    console.log('   ⚠️  Party AED ya existe — omitida');
  }

  // Party 4: Sistemas Operativos — grace + bob + carol
  let partySO = await partyRepo.findOne({
    where: { subjectId: so.id, status: 'forming' },
  });
  if (!partySO) {
    partySO = await partyRepo.save(
      partyRepo.create({ subjectId: so.id, status: 'forming', maxMembers: 5 }),
    );
    await memberRepo.save(
      memberRepo.create({
        partyId: partySO.id,
        userId: grace.id,
        role: 'leader',
      }),
    );
    await memberRepo.save(
      memberRepo.create({ partyId: partySO.id, userId: bob.id }),
    );
    await memberRepo.save(
      memberRepo.create({ partyId: partySO.id, userId: carol.id }),
    );
    console.log('   ✔  Party "Sistemas Operativos" (grace + bob + carol)');
  } else {
    console.log('   ⚠️  Party SO ya existe — omitida');
  }

  // Party 5: Análisis Matemático II — eve
  let partyAM2 = await partyRepo.findOne({
    where: { subjectId: am2.id, status: 'forming' },
  });
  if (!partyAM2) {
    partyAM2 = await partyRepo.save(
      partyRepo.create({ subjectId: am2.id, status: 'forming', maxMembers: 2 }),
    );
    await memberRepo.save(
      memberRepo.create({
        partyId: partyAM2.id,
        userId: eve.id,
        role: 'leader',
      }),
    );
    console.log('   ✔  Party "Análisis Matemático II" (eve)');
  } else {
    console.log('   ⚠️  Party AM2 ya existe — omitida');
  }

  // ── Cosmetics y logros retroactivos por liga ────────────────────────────────
  console.log('\n🎨  Otorgando cosmetics y logros de liga retroactivos...');
  const inventoryRepo = AppDataSource.getRepository(UserInventory);
  const userAchievementRepo = AppDataSource.getRepository(UserAchievement);
  const allUsers = await userRepo.find();

  for (const u of allUsers) {
    const elo: number = (u.stats as any)?.elo ?? DEFAULT_ELO;

    // grant all tiers the user has reached (cumulative)
    const earnedTiers = LEAGUE_TIERS.filter((lt) => elo >= lt.minElo);

    for (const lt of earnedTiers) {
      // border cosmetic
      const hasBorder = await inventoryRepo.findOneBy({
        userId: u.id,
        itemType: 'border',
        itemCode: lt.borderCode,
      });
      if (!hasBorder) {
        await inventoryRepo.save(
          inventoryRepo.create({
            userId: u.id,
            itemType: 'border',
            itemCode: lt.borderCode,
          }),
        );
      }
      // title cosmetic
      const hasTitle = await inventoryRepo.findOneBy({
        userId: u.id,
        itemType: 'title',
        itemCode: lt.titleCode,
      });
      if (!hasTitle) {
        await inventoryRepo.save(
          inventoryRepo.create({
            userId: u.id,
            itemType: 'title',
            itemCode: lt.titleCode,
          }),
        );
      }

      // border achievement
      const borderAch = await achievementRepo.findOneBy({
        code: lt.borderAchiev,
      });
      if (borderAch) {
        const hasBorderAch = await userAchievementRepo.findOneBy({
          userId: u.id,
          achievementId: borderAch.id,
        });
        if (!hasBorderAch) {
          await userAchievementRepo.save(
            userAchievementRepo.create({
              userId: u.id,
              achievementId: borderAch.id,
            }),
          );
        }
      }

      // title achievement
      const titleAch = await achievementRepo.findOneBy({
        code: lt.titleAchiev,
      });
      if (titleAch) {
        const hasTitleAch = await userAchievementRepo.findOneBy({
          userId: u.id,
          achievementId: titleAch.id,
        });
        if (!hasTitleAch) {
          await userAchievementRepo.save(
            userAchievementRepo.create({
              userId: u.id,
              achievementId: titleAch.id,
            }),
          );
        }
      }
    }

    const highestTier = earnedTiers[earnedTiers.length - 1];
    console.log(
      `   ✔  ${u.displayName} (ELO ${elo}) → hasta ${highestTier?.borderCode ?? 'ninguno'}`,
    );
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seed completado!\n');
  console.log('Credenciales de prueba (mismo password para todos):');
  console.log('  Email                       Password');
  console.log('  ──────────────────────────  ─────────────');
  for (const ud of USERS_DATA) {
    console.log(`  ${ud.email.padEnd(28)} ${ud.password}`);
  }
  console.log('\nLogin de prueba:');
  console.log('  POST http://localhost:3000/api/auth/login');
  console.log(
    '  Body: { "email": "alice@studyquest.dev", "password": "Password123!" }',
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await AppDataSource.destroy();
}

seed().catch((err: unknown) => {
  console.error('❌  Error en seed:', err);
  process.exit(1);
});
