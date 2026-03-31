/**
 * Seed script — pobla la BD con datos de prueba
 * Uso: npx ts-node -r tsconfig-paths/register src/database/seeds/seed.ts
 *
 * Requiere que la BD esté corriendo (docker-compose up postgres)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';
import * as path from 'path';

// Carga el .env de la raíz del backend
config({ path: path.resolve(__dirname, '../../../.env') });

import { User } from '../../modules/users/user.entity';
import { Subject } from '../../modules/subjects/subject.entity';
import { Party } from '../../modules/parties/party.entity';
import { PartyMember } from '../../modules/parties/party-member.entity';

// ─── Conexión ──────────────────────────────────────────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  username: process.env.POSTGRES_USER ?? 'studyquest',
  password: process.env.POSTGRES_PASSWORD ?? 'studyquest_pass',
  database: process.env.POSTGRES_DB ?? 'studyquest',
  entities: [User, Subject, Party, PartyMember],
  synchronize: false,
  logging: false,
});

// ─── Datos de prueba ───────────────────────────────────────────────────────────
const UNIVERSITY = 'Universidad Nacional de Córdoba';
const CAREER = 'Ingeniería en Sistemas de Información';

const SUBJECTS_DATA = [
  { name: 'Análisis Matemático II', code: 'AM2', semester: 2, description: 'Cálculo diferencial e integral en varias variables.' },
  { name: 'Algoritmos y Estructuras de Datos', code: 'AED', semester: 3, description: 'Diseño y análisis de algoritmos, estructuras clásicas.' },
  { name: 'Bases de Datos', code: 'BD', semester: 4, description: 'Modelado relacional, SQL y bases NoSQL.' },
  { name: 'Sistemas Operativos', code: 'SO', semester: 4, description: 'Procesos, memoria, filesystem y concurrencia.' },
  { name: 'Redes de Computadoras', code: 'RC', semester: 5, description: 'Modelo OSI/TCP-IP, protocolos y seguridad.' },
];

const USERS_DATA = [
  {
    email: 'alice@studyquest.dev',
    username: 'alice_dev',
    displayName: 'Alice García',
    password: 'Password123!',
    university: UNIVERSITY,
    career: CAREER,
    semester: 4,
  },
  {
    email: 'bob@studyquest.dev',
    username: 'bobby_b',
    displayName: 'Bob Martínez',
    password: 'Password123!',
    university: UNIVERSITY,
    career: CAREER,
    semester: 3,
  },
  {
    email: 'carol@studyquest.dev',
    username: 'carol_dev',
    displayName: 'Carol López',
    password: 'Password123!',
    university: UNIVERSITY,
    career: CAREER,
    semester: 5,
  },
  {
    email: 'dave@studyquest.dev',
    username: 'dave_code',
    displayName: 'Dave Rodríguez',
    password: 'Password123!',
    university: UNIVERSITY,
    career: CAREER,
    semester: 4,
  },
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
      console.log(`   ⚠️   Materia "${sd.code}" ya existe — omitida`);
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
      console.log(`   ⚠️   Usuario "${ud.email}" ya existe — omitido`);
      savedUsers.push(existing);
      continue;
    }
    const passwordHash = await bcrypt.hash(ud.password, 12);
    const user = userRepo.create({
      ...ud,
      passwordHash,
      stats: { xp: 0, level: 0, quizzesPlayed: 0, quizzesWon: 0, currentStreak: 0, longestStreak: 0, lastPlayedAt: null },
      availability: [],
    });
    savedUsers.push(await userRepo.save(user));
    console.log(`   ✔  ${ud.displayName} (${ud.email}) — pass: ${ud.password}`);
  }

  // ── 3. Inscribir usuarios en materias ────────────────────────────────────────
  console.log('\n📝  Inscribiendo usuarios en materias...');
  // alice y bob en BD y AED
  const [alice, bob, carol, dave] = savedUsers;
  const [, aed, bd, , rc] = savedSubjects;

  await subjectRepo
    .createQueryBuilder()
    .relation(User, 'enrolledSubjects')
    .of(alice.id)
    .addAndRemove([aed.id, bd.id], [])
    .catch(() => {}); // ignora duplicados

  await subjectRepo
    .createQueryBuilder()
    .relation(User, 'enrolledSubjects')
    .of(bob.id)
    .addAndRemove([aed.id, bd.id], [])
    .catch(() => {});

  await subjectRepo
    .createQueryBuilder()
    .relation(User, 'enrolledSubjects')
    .of(carol.id)
    .addAndRemove([rc.id], [])
    .catch(() => {});

  await subjectRepo
    .createQueryBuilder()
    .relation(User, 'enrolledSubjects')
    .of(dave.id)
    .addAndRemove([bd.id], [])
    .catch(() => {});

  console.log('   ✔  Inscripciones realizadas');

  // ── 4. Parties ───────────────────────────────────────────────────────────────
  console.log('\n🎮  Creando parties...');

  // Party 1: BD — alice es host, bob es miembro
  let partyBD = await partyRepo.findOne({ where: { subjectId: bd.id, status: 'forming' } });
  if (!partyBD) {
    partyBD = await partyRepo.save(partyRepo.create({ subjectId: bd.id, status: 'forming', maxMembers: 4 }));
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: alice.id }));
    await memberRepo.save(memberRepo.create({ partyId: partyBD.id, userId: bob.id }));
    console.log(`   ✔  Party "Bases de Datos" (alice + bob)`);
  } else {
    console.log('   ⚠️   Party BD ya existe — omitida');
  }

  // Party 2: RC — carol es host, dave es miembro
  let partyRC = await partyRepo.findOne({ where: { subjectId: rc.id, status: 'forming' } });
  if (!partyRC) {
    partyRC = await partyRepo.save(partyRepo.create({ subjectId: rc.id, status: 'forming', maxMembers: 4 }));
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: carol.id }));
    await memberRepo.save(memberRepo.create({ partyId: partyRC.id, userId: dave.id }));
    console.log(`   ✔  Party "Redes de Computadoras" (carol + dave)`);
  } else {
    console.log('   ⚠️   Party RC ya existe — omitida');
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Seed completado!\n');
  console.log('Credenciales de prueba (todos con la misma contraseña):');
  console.log('  Email                     Password');
  console.log('  ─────────────────────── ─────────────');
  for (const ud of USERS_DATA) {
    console.log(`  ${ud.email.padEnd(25)} ${ud.password}`);
  }
  console.log('\nPara hacer login:');
  console.log('  POST http://localhost:3000/api/auth/login');
  console.log('  Body: { "email": "alice@studyquest.dev", "password": "Password123!" }');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌  Error en seed:', err);
  process.exit(1);
});
