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
import { Subject } from '../../modules/subjects/subject.entity';
import { Party } from '../../modules/parties/party.entity';
import { PartyMember } from '../../modules/parties/party-member.entity';
import { ChatMessage } from '../../modules/parties/chat-message.entity';
import { Quest } from '../../modules/quests/quest.entity';
import { QuizQuestion } from '../../modules/quests/quiz-question.entity';
import { QuizOption } from '../../modules/quests/quiz-option.entity';
import { PlayerResult } from '../../modules/quests/player-result.entity';

// ─── Conexión ──────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.POSTGRES_HOST     ?? 'localhost',
  port:     Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER     ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB       ?? 'studyquest',
  entities: [
    User, Subject, Party, PartyMember, ChatMessage,
    Quest, QuizQuestion, QuizOption, PlayerResult
  ],
  synchronize: false,
  logging: false,
});

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
  { email: 'alice@studyquest.dev', username: 'alice_dev',  displayName: 'Alice García',   password: 'Password123!', semester: 4 },
  { email: 'bob@studyquest.dev',   username: 'bobby_b',    displayName: 'Bob Martínez',   password: 'Password123!', semester: 3 },
  { email: 'carol@studyquest.dev', username: 'carol_dev',  displayName: 'Carol López',    password: 'Password123!', semester: 5 },
  { email: 'dave@studyquest.dev',  username: 'dave_code',  displayName: 'Dave Rodríguez', password: 'Password123!', semester: 4 },
];

// ─── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱  Conectando a la base de datos...');
  await AppDataSource.initialize();
  console.log('✅  Conexión exitosa\n');

  const userRepo    = AppDataSource.getRepository(User);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const partyRepo   = AppDataSource.getRepository(Party);
  const memberRepo  = AppDataSource.getRepository(PartyMember);

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
      passwordHash,
      stats: {
        xp: 0, level: 0, quizzesPlayed: 0, quizzesWon: 0,
        currentStreak: 0, longestStreak: 0, lastPlayedAt: null,
      },
      availability: [],
    });
    savedUsers.push(await userRepo.save(user));
    console.log(`   ✔  ${ud.displayName} (${ud.email})`);
  }

  // ── 3. Inscribir usuarios en materias ────────────────────────────────────────
  console.log('\n📝  Inscribiendo usuarios en materias...');
  const [alice, bob, carol, dave] = savedUsers;
  const [, aed, bd, , rc] = savedSubjects;

  // CORRECTO: AppDataSource.createQueryBuilder().relation(...)
  // INCORRECTO (bug original): subjectRepo.createQueryBuilder().relation(...)
  //   → subjectRepo.createQueryBuilder() devuelve SelectQueryBuilder, que NO tiene .relation()
  //   → AppDataSource.createQueryBuilder().relation() devuelve RelationQueryBuilder ✅
  const rel = () => AppDataSource.createQueryBuilder().relation(User, 'enrolledSubjects');

  await rel().of(alice.id).add([aed.id, bd.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(bob.id).add([aed.id, bd.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(carol.id).add([rc.id]).catch(() => { /* duplicado, ignorar */ });
  await rel().of(dave.id).add([bd.id]).catch(() => { /* duplicado, ignorar */ });

  console.log('   ✔  Inscripciones realizadas');

  // ── 4. Parties ───────────────────────────────────────────────────────────────
  console.log('\n🎮  Creando parties...');

  // Party 1: Bases de Datos — alice + bob
  let partyBD = await partyRepo.findOne({ where: { subjectId: bd.id, status: 'forming' } });
  if (!partyBD) {
    partyBD = await partyRepo.save(
      partyRepo.create({ subjectId: bd.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: alice.id }));
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: bob.id }));
    console.log('   ✔  Party "Bases de Datos" (alice + bob)');
  } else {
    console.log('   ⚠️  Party BD ya existe — omitida');
  }

  // Party 2: Redes de Computadoras — carol + dave
  let partyRC = await partyRepo.findOne({ where: { subjectId: rc.id, status: 'forming' } });
  if (!partyRC) {
    partyRC = await partyRepo.save(
      partyRepo.create({ subjectId: rc.id, status: 'forming', maxMembers: 4 }),
    );
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: carol.id }));
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: dave.id }));
    console.log('   ✔  Party "Redes de Computadoras" (carol + dave)');
  } else {
    console.log('   ⚠️  Party RC ya existe — omitida');
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
