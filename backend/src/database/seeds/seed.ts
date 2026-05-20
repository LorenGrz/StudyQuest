/**
 * Seed script — pobla la BD con datos de prueba
 *
 * Uso (desde la carpeta backend/):
 *   npm run seed
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
import { config } from 'dotenv';
config({ path: '../.env' }); // carga el .env desde la raíz del proyecto

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../modules/users/user.entity';
import { FriendRequest } from '../../modules/users/friend-request.entity';
import { Subject } from '../../modules/subjects/subject.entity';
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
import { UserTitle } from '../../modules/cosmetics/user-title.entity';
import { UserInventory } from '../../modules/cosmetics/user-inventory.entity';

// ─── Conexión ──────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.POSTGRES_HOST     ?? 'localhost',
  port:     Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER     ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB       ?? 'studyquest',
  entities: [
    User, FriendRequest, Subject, Party, PartyMember, ChatMessage, PartyActivity,
    Quest, QuizQuestion, QuizOption, PlayerResult, PartyInvitation, Achievement,
    UserTitle, UserInventory
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

  await AppDataSource.synchronize();
}

// ─── Datos de prueba ───────────────────────────────────────────────────────────
const UNIVERSITY = 'Universidad Nacional de Córdoba';
const CAREER     = 'Ingeniería en Sistemas de Información';

const SUBJECTS_DATA = [
  { name: 'Análisis Matemático II',           code: 'AM2', semester: 2, description: 'Cálculo diferencial e integral en varias variables.' },
  { name: 'Algoritmos y Estructuras de Datos', code: 'AED', semester: 3, description: 'Diseño y análisis de algoritmos, estructuras clásicas.' },
  { name: 'Bases de Datos',                   code: 'BD',  semester: 4, description: 'Modelado relacional, SQL y bases NoSQL.' },
  { name: 'Sistemas Operativos',              code: 'SO',  semester: 4, description: 'Procesos, memoria, filesystem y concurrencia.' },
  { name: 'Redes de Computadoras',            code: 'RC',  semester: 5, description: 'Modelo OSI/TCP-IP, protocolos y seguridad.' },
];

const USERS_DATA = [
  { email: 'admin@studyquest.dev', username: 'admin_sq',   displayName: 'Admin',           password: 'AdminPass123!', semester: 1, role: 'ADMIN' },
  { email: 'alice@studyquest.dev', username: 'alice_dev',  displayName: 'Alice García',   password: 'Password123!', semester: 4 },
  { email: 'bob@studyquest.dev',   username: 'bobby_b',    displayName: 'Bob Martínez',   password: 'Password123!', semester: 3 },
  { email: 'carol@studyquest.dev', username: 'carol_dev',  displayName: 'Carol López',    password: 'Password123!', semester: 5 },
  { email: 'dave@studyquest.dev',  username: 'dave_code',  displayName: 'Dave Rodríguez', password: 'Password123!', semester: 4 },
  { email: 'eve@studyquest.dev',   username: 'eve_hacker', displayName: 'Eve Fernández',  password: 'Password123!', semester: 2 },
  { email: 'frank@studyquest.dev', username: 'frank_tank', displayName: 'Frank Gómez',    password: 'Password123!', semester: 3 },
  { email: 'grace@studyquest.dev', username: 'grace_hopp', displayName: 'Grace Hopper',   password: 'Password123!', semester: 4 },
];

const ACHIEVEMENTS_DATA = [
  { code: 'FIRST_QUEST',      name: 'Primera Quest',        icon: '🎯', category: 'academic',    description: 'Completaste tu primera quest.',          points: 50 },
  { code: 'QUEST_STREAK_3',   name: 'En Racha',             icon: '🔥', category: 'academic',    description: 'Mantuviste una racha de 3 días.',         points: 100, rewardType: 'title', rewardCode: 'STREAK_3_TITLE' },
  { code: 'QUEST_STREAK_5',   name: 'Imparable',            icon: '⚡', category: 'academic',    description: 'Mantuviste una racha de 5 días.',         points: 200 },
  { code: 'FIRST_PARTY',      name: 'Primera Party',        icon: '🎉', category: 'social',      description: 'Te uniste a tu primera party de estudio.', points: 50 },
  { code: 'SOCIAL_BUTTERFLY', name: 'Alma de la Fiesta',    icon: '🦋', category: 'social',      description: 'Participaste en 5 parties diferentes.',    points: 150 },
  { code: 'LEVEL_5',          name: 'Estudiante Aplicado',  icon: '📚', category: 'progression', description: 'Alcanzaste el nivel 5.',                    points: 100 },
  { code: 'LEVEL_10',         name: 'Maestro del Estudio',  icon: '🏆', category: 'progression', description: 'Alcanzaste el nivel 10.',                   points: 250, rewardType: 'title', rewardCode: 'MASTER_TITLE' },
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
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱  Conectando a la base de datos...');
  await AppDataSource.initialize();
  await ensureBootstrapSchema();
  console.log('✅  Conexión exitosa\n');

  const userRepo        = AppDataSource.getRepository(User);
  const friendRequestRepo = AppDataSource.getRepository(FriendRequest);
  const subjectRepo     = AppDataSource.getRepository(Subject);
  const partyRepo       = AppDataSource.getRepository(Party);
  const memberRepo      = AppDataSource.getRepository(PartyMember);
  const userTitleRepo = AppDataSource.getRepository(UserTitle);

  // ── 1. Materias ──────────────────────────────────────────────────────────────
  console.log('📚  Creando materias...');
  const savedSubjects: Subject[] = [];

  for (const sd of SUBJECTS_DATA) {
    const existing = await subjectRepo.findOneBy({ code: sd.code, university: UNIVERSITY });
    if (existing) {
      console.log(`   ⚠️  Materia "${sd.code}" ya existe — omitida`);
      savedSubjects.push(existing);
      continue;
    }
    const subject = subjectRepo.create({ ...sd, university: UNIVERSITY, career: CAREER });
    savedSubjects.push(await subjectRepo.save(subject));
    console.log(`   ✔  ${sd.name}`);
  }

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
      email:        ud.email,
      username:     ud.username,
      displayName:  ud.displayName,
      university:   UNIVERSITY,
      career:       CAREER,
      semester:     ud.semester,
      role:         (ud as any).role ?? 'USER',
      passwordHash,
      stats: {
        xp: 0, level: 0, elo: 1200, quizzesPlayed: 0, quizzesWon: 0,
        currentStreak: 0, longestStreak: 0, lastPlayedAt: null,
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

  // CORRECTO: AppDataSource.createQueryBuilder().relation(...)
  // INCORRECTO (bug original): subjectRepo.createQueryBuilder().relation(...)
  //   → subjectRepo.createQueryBuilder() devuelve SelectQueryBuilder, que NO tiene .relation()
  //   → AppDataSource.createQueryBuilder().relation() devuelve RelationQueryBuilder ✅
  const rel = () => AppDataSource.createQueryBuilder().relation(User, 'enrolledSubjects');

  // Dave se inscribe en todas para probar el feed completo
  await rel().of(dave.id).add([am2.id, aed.id, bd.id, so.id, rc.id]).catch(() => { /* duplicado, ignorar */ });
  
  await rel().of(alice.id).add([aed.id, bd.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(bob.id).add([aed.id, bd.id, so.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(carol.id).add([rc.id, so.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(eve.id).add([am2.id, aed.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(frank.id).add([so.id, rc.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(grace.id).add([bd.id, so.id, aed.id]).catch(() => { /* duplicado, ignorar */ });

  console.log('   ✔  Inscripciones realizadas');

  // ── 4. Parties ───────────────────────────────────────────────────────────────
  console.log('\n🎮  Creando parties...');

  // Party 1: Bases de Datos — alice + bob
  let partyBD = await partyRepo.findOne({ where: { subjectId: bd.id, status: 'forming' } });
  if (!partyBD) {
    partyBD = await partyRepo.save(
      partyRepo.create({ subjectId: bd.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: alice.id, role: 'leader' }));
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: bob.id }));
    console.log('   ✔  Party "Bases de Datos" (alice + bob)');
  } else {
    console.log('   ⚠️  Party BD ya existe — omitida');
  }

  // Party 2: Redes de Computadoras — carol + frank
  let partyRC = await partyRepo.findOne({ where: { subjectId: rc.id, status: 'forming' } });
  if (!partyRC) {
    partyRC = await partyRepo.save(
      partyRepo.create({ subjectId: rc.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: carol.id, role: 'leader' }));
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: frank.id }));
    console.log('   ✔  Party "Redes de Computadoras" (carol + frank)');
  } else {
    console.log('   ⚠️  Party RC ya existe — omitida');
  }

  // Party 3: Algoritmos y Estructuras de Datos — eve + grace
  let partyAED = await partyRepo.findOne({ where: { subjectId: aed.id, status: 'forming' } });
  if (!partyAED) {
    partyAED = await partyRepo.save(
      partyRepo.create({ subjectId: aed.id, status: 'forming', maxMembers: 3 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyAED.id, userId: eve.id, role: 'leader' }));
    await memberRepo.save(memberRepo.create({ partyId: partyAED.id, userId: grace.id }));
    console.log('   ✔  Party "Algoritmos y Estructuras" (eve + grace)');
  } else {
    console.log('   ⚠️  Party AED ya existe — omitida');
  }

  // Party 4: Sistemas Operativos — grace + bob + carol
  let partySO = await partyRepo.findOne({ where: { subjectId: so.id, status: 'forming' } });
  if (!partySO) {
    partySO = await partyRepo.save(
      partyRepo.create({ subjectId: so.id, status: 'forming', maxMembers: 5 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partySO.id, userId: grace.id, role: 'leader' }));
    await memberRepo.save(memberRepo.create({ partyId: partySO.id, userId: bob.id }));
    await memberRepo.save(memberRepo.create({ partyId: partySO.id, userId: carol.id }));
    console.log('   ✔  Party "Sistemas Operativos" (grace + bob + carol)');
  } else {
    console.log('   ⚠️  Party SO ya existe — omitida');
  }

  // Party 5: Análisis Matemático II — eve
  let partyAM2 = await partyRepo.findOne({ where: { subjectId: am2.id, status: 'forming' } });
  if (!partyAM2) {
    partyAM2 = await partyRepo.save(
      partyRepo.create({ subjectId: am2.id, status: 'forming', maxMembers: 2 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyAM2.id, userId: eve.id, role: 'leader' }));
    console.log('   ✔  Party "Análisis Matemático II" (eve)');
  } else {
    console.log('   ⚠️  Party AM2 ya existe — omitida');
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
  console.log('  Body: { "email": "alice@studyquest.dev", "password": "Password123!" }');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await AppDataSource.destroy();
}

seed().catch((err: unknown) => {
  console.error('❌  Error en seed:', err);
  process.exit(1);
});
