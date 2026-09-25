/**
 * Lista cerrada de carreras. Única fuente de verdad:
 *  - `@IsIn(CAREERS)` en los DTO de registro / perfil / materias.
 *  - `GET /subjects/careers` la devuelve tal cual al frontend.
 *
 * Debe contener TODOS los `career` que aparecen en el seed
 * (`SUBJECTS_DATA`, `EXTRA_SUBJECTS`, `CAREER_CATALOG`), o `@IsIn` rechazaría
 * materias/usuarios legítimos. `backend/src/common/careers.spec.ts` lo verifica.
 */
export const CAREERS = [
  'Abogacía',
  'Arquitectura',
  'Ciencia Política',
  'Ciencias de la Comunicación',
  'Ciencias de la Computación',
  'Contador Público',
  'Derecho',
  'Farmacia',
  'Informática',
  'Ingeniería Ambiental',
  'Ingeniería Biomédica',
  'Ingeniería Civil',
  'Ingeniería Electrónica',
  'Ingeniería Industrial',
  'Ingeniería Mecánica',
  'Ingeniería Química',
  'Ingeniería en Energía',
  'Ingeniería en Informática',
  'Ingeniería en Sistemas de Información',
  'Ingeniería en Telecomunicaciones',
  'Licenciatura en Administración',
  'Licenciatura en Biología',
  'Licenciatura en Biotecnología',
  'Licenciatura en Ciencia de Datos',
  'Licenciatura en Ciencias Físicas',
  'Licenciatura en Ciencias Matemáticas',
  'Licenciatura en Economía',
  'Licenciatura en Física Médica',
  'Licenciatura en Informática',
  'Licenciatura en Kinesiología y Fisiatría',
  'Licenciatura en Nutrición',
  'Licenciatura en Química',
  'Licenciatura en Relaciones Internacionales',
  'Medicina',
  'Medicina Veterinaria',
  'Odontología',
  'Psicología',
  'Sociología',
] as const;

export type Career = (typeof CAREERS)[number];
