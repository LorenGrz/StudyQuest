/**
 * Catálogo amplio de carreras y materias para el seed.
 *
 * Se recorre en `seed.ts` con la misma lógica de dedupe (código + universidad)
 * que `EXTRA_SUBJECTS`. Pensado para dar variedad al explorador de materias:
 * cada carrera trae ~8 materias de los primeros años.
 *
 * Reglas:
 *  - `code` <= 20 caracteres y único por universidad (constraint de la entidad).
 *    Convención: <TAG><NN>, TAG corto por carrera (ej. UBAMED01).
 *  - `semester` 1..6 aprox.
 */

export interface SubjectSeedRow {
  name: string;
  code: string;
  semester: number;
  description?: string;
  university: string;
  career: string;
}

type RawSubject = {
  name: string;
  code: string;
  semester: number;
  description?: string;
};

const career = (
  university: string,
  careerName: string,
  subjects: RawSubject[],
): SubjectSeedRow[] =>
  subjects.map((s) => ({ ...s, university, career: careerName }));

const UBA = 'Universidad de Buenos Aires';
const UNC = 'Universidad Nacional de Córdoba';
const UTN = 'Universidad Tecnológica Nacional';
const UNLP = 'Universidad Nacional de La Plata';
const UNR = 'Universidad Nacional de Rosario';

export const CAREER_CATALOG: SubjectSeedRow[] = [
  // ─────────────────────────── UBA ───────────────────────────
  ...career(UBA, 'Medicina', [
    {
      code: 'UBAMED01',
      semester: 1,
      name: 'Biología e Introducción a la Biología Celular',
      description: 'Célula, tejidos y organización del cuerpo humano.',
    },
    {
      code: 'UBAMED02',
      semester: 1,
      name: 'Química General',
      description: 'Enlaces, soluciones y reacciones aplicadas a lo biológico.',
    },
    {
      code: 'UBAMED03',
      semester: 2,
      name: 'Física e Introducción a la Biofísica',
      description: 'Mecánica, fluidos y fenómenos eléctricos en el cuerpo.',
    },
    {
      code: 'UBAMED04',
      semester: 2,
      name: 'Anatomía',
      description: 'Anatomía macroscópica por aparatos y sistemas.',
    },
    {
      code: 'UBAMED05',
      semester: 3,
      name: 'Histología, Embriología, Biología Celular y Genética',
      description: 'Tejidos, desarrollo embrionario y herencia.',
    },
    {
      code: 'UBAMED06',
      semester: 3,
      name: 'Bioquímica',
      description: 'Metabolismo, enzimas y bioenergética.',
    },
    {
      code: 'UBAMED07',
      semester: 4,
      name: 'Fisiología y Biofísica',
      description: 'Funcionamiento integrado de órganos y sistemas.',
    },
    {
      code: 'UBAMED08',
      semester: 5,
      name: 'Microbiología, Parasitología e Inmunología',
      description: 'Agentes infecciosos y respuesta inmune.',
    },
  ]),
  ...career(UBA, 'Abogacía', [
    {
      code: 'UBAABO01',
      semester: 1,
      name: 'Introducción al Derecho',
      description: 'Concepto de derecho, normas, fuentes e interpretación.',
    },
    {
      code: 'UBAABO02',
      semester: 1,
      name: 'Teoría del Estado',
      description: 'Poder, soberanía, formas de Estado y de gobierno.',
    },
    {
      code: 'UBAABO03',
      semester: 2,
      name: 'Derecho Romano',
      description: 'Instituciones del derecho privado romano.',
    },
    {
      code: 'UBAABO04',
      semester: 2,
      name: 'Derechos Humanos y Garantías',
      description: 'Sistema constitucional de derechos y su tutela.',
    },
    {
      code: 'UBAABO05',
      semester: 3,
      name: 'Obligaciones Civiles y Comerciales',
      description: 'Fuentes, efectos y extinción de las obligaciones.',
    },
    {
      code: 'UBAABO06',
      semester: 3,
      name: 'Derecho Constitucional',
      description: 'Organización del poder y control de constitucionalidad.',
    },
    {
      code: 'UBAABO07',
      semester: 4,
      name: 'Contratos Civiles y Comerciales',
      description: 'Teoría general y contratos en particular.',
    },
    {
      code: 'UBAABO08',
      semester: 4,
      name: 'Derecho Penal y Procesal Penal',
      description: 'Teoría del delito y proceso penal.',
    },
  ]),
  ...career(UBA, 'Contador Público', [
    {
      code: 'UBACPN01',
      semester: 1,
      name: 'Introducción a la Contabilidad Patrimonial',
      description: 'Patrimonio, cuentas y registración básica.',
    },
    {
      code: 'UBACPN02',
      semester: 1,
      name: 'Principios de Administración',
      description: 'Organizaciones, proceso administrativo y funciones.',
    },
    {
      code: 'UBACPN03',
      semester: 2,
      name: 'Análisis Matemático I',
      description: 'Funciones, límites, derivadas e integrales.',
    },
    {
      code: 'UBACPN04',
      semester: 2,
      name: 'Contabilidad Patrimonial',
      description: 'Estados contables y valuación de rubros.',
    },
    {
      code: 'UBACPN05',
      semester: 3,
      name: 'Álgebra',
      description: 'Matrices, sistemas lineales y programación lineal.',
    },
    {
      code: 'UBACPN06',
      semester: 3,
      name: 'Microeconomía',
      description: 'Consumidor, empresa y mercados.',
    },
    {
      code: 'UBACPN07',
      semester: 4,
      name: 'Estadística I',
      description: 'Descriptiva, probabilidad e inferencia básica.',
    },
    {
      code: 'UBACPN08',
      semester: 4,
      name: 'Derecho Constitucional y Administrativo',
      description: 'Marco jurídico del Estado y la administración.',
    },
  ]),
  ...career(UBA, 'Psicología', [
    {
      code: 'UBAPSI01',
      semester: 1,
      name: 'Introducción a la Psicología',
      description: 'Objeto, métodos y corrientes de la psicología.',
    },
    {
      code: 'UBAPSI02',
      semester: 1,
      name: 'Historia de la Psicología',
      description: 'Desarrollo del campo desde la filosofía a la ciencia.',
    },
    {
      code: 'UBAPSI03',
      semester: 2,
      name: 'Psicoanálisis: Freud',
      description: 'Inconsciente, pulsión, transferencia y método.',
    },
    {
      code: 'UBAPSI04',
      semester: 2,
      name: 'Estadística',
      description: 'Análisis de datos aplicado a la investigación psicológica.',
    },
    {
      code: 'UBAPSI05',
      semester: 3,
      name: 'Neurofisiología',
      description: 'Bases biológicas de la conducta y los procesos mentales.',
    },
    {
      code: 'UBAPSI06',
      semester: 3,
      name: 'Psicología Evolutiva: Niñez',
      description: 'Desarrollo cognitivo, afectivo y social en la infancia.',
    },
    {
      code: 'UBAPSI07',
      semester: 4,
      name: 'Teoría y Técnica de Exploración Psicológica',
      description: 'Entrevista y técnicas de evaluación.',
    },
    {
      code: 'UBAPSI08',
      semester: 5,
      name: 'Psicopatología',
      description: 'Cuadros clínicos y criterios diagnósticos.',
    },
  ]),
  ...career(UBA, 'Ingeniería en Informática', [
    {
      code: 'UBAINF01',
      semester: 1,
      name: 'Análisis Matemático II',
      description: 'Cálculo en varias variables y series.',
    },
    {
      code: 'UBAINF02',
      semester: 1,
      name: 'Álgebra Lineal',
      description: 'Espacios vectoriales, transformaciones y autovalores.',
    },
    {
      code: 'UBAINF03',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica clásica y ondas.',
    },
    {
      code: 'UBAINF04',
      semester: 2,
      name: 'Algoritmos y Programación I',
      description: 'Programación estructurada y resolución de problemas.',
    },
    {
      code: 'UBAINF05',
      semester: 3,
      name: 'Análisis Numérico',
      description: 'Métodos numéricos y análisis de error.',
    },
    {
      code: 'UBAINF06',
      semester: 3,
      name: 'Algoritmos y Programación II',
      description: 'TADs, estructuras de datos y complejidad.',
    },
    {
      code: 'UBAINF07',
      semester: 4,
      name: 'Organización de Computadoras',
      description: 'Arquitectura, ensamblador y jerarquía de memoria.',
    },
    {
      code: 'UBAINF08',
      semester: 5,
      name: 'Base de Datos',
      description: 'Modelo relacional, SQL y diseño normalizado.',
    },
  ]),
  ...career(UBA, 'Licenciatura en Economía', [
    {
      code: 'UBAECO01',
      semester: 1,
      name: 'Introducción a la Economía',
      description: 'Escasez, mercados y agregados macroeconómicos.',
    },
    {
      code: 'UBAECO02',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Cálculo de una variable con aplicaciones económicas.',
    },
    {
      code: 'UBAECO03',
      semester: 2,
      name: 'Microeconomía I',
      description: 'Teoría del consumidor, de la firma y equilibrio parcial.',
    },
    {
      code: 'UBAECO04',
      semester: 2,
      name: 'Historia Económica',
      description: 'Transformaciones económicas de los siglos XIX y XX.',
    },
    {
      code: 'UBAECO05',
      semester: 3,
      name: 'Macroeconomía I',
      description: 'Modelos IS-LM, mercado de trabajo y política económica.',
    },
    {
      code: 'UBAECO06',
      semester: 3,
      name: 'Estadística',
      description: 'Probabilidad e inferencia para análisis económico.',
    },
    {
      code: 'UBAECO07',
      semester: 4,
      name: 'Econometría I',
      description: 'Regresión lineal y contrastes de hipótesis.',
    },
    {
      code: 'UBAECO08',
      semester: 5,
      name: 'Finanzas Públicas',
      description: 'Gasto público, impuestos y déficit fiscal.',
    },
  ]),
  ...career(UBA, 'Ciencias de la Comunicación', [
    {
      code: 'UBACOM01',
      semester: 1,
      name: 'Introducción al Conocimiento de la Sociedad y el Estado',
      description: 'Sociedad, poder y formación del Estado moderno.',
    },
    {
      code: 'UBACOM02',
      semester: 1,
      name: 'Teorías y Prácticas de la Comunicación I',
      description: 'Escuelas clásicas de la comunicación.',
    },
    {
      code: 'UBACOM03',
      semester: 2,
      name: 'Semiótica',
      description: 'Signo, significación y análisis del discurso.',
    },
    {
      code: 'UBACOM04',
      semester: 2,
      name: 'Principales Corrientes del Pensamiento Contemporáneo',
      description: 'Filosofía y teoría social del siglo XX.',
    },
    {
      code: 'UBACOM05',
      semester: 3,
      name: 'Historia de los Medios',
      description: 'Prensa, radio, cine y televisión.',
    },
    {
      code: 'UBACOM06',
      semester: 3,
      name: 'Comunicación y Cultura',
      description: 'Industrias culturales y consumos.',
    },
    {
      code: 'UBACOM07',
      semester: 4,
      name: 'Teorías sobre el Periodismo',
      description: 'Noticia, agenda y rutinas productivas.',
    },
    {
      code: 'UBACOM08',
      semester: 5,
      name: 'Opinión Pública',
      description: 'Formación de la opinión y sondeos.',
    },
  ]),
  ...career(UBA, 'Arquitectura', [
    {
      code: 'UBAARQ01',
      semester: 1,
      name: 'Arquitectura I',
      description: 'Introducción al proyecto arquitectónico.',
    },
    {
      code: 'UBAARQ02',
      semester: 1,
      name: 'Introducción a la Historia de la Arquitectura',
      description: 'Panorama histórico de la arquitectura y la ciudad.',
    },
    {
      code: 'UBAARQ03',
      semester: 2,
      name: 'Matemática I',
      description: 'Geometría, funciones y nociones de cálculo.',
    },
    {
      code: 'UBAARQ04',
      semester: 2,
      name: 'Sistemas de Representación Geométrica',
      description: 'Proyecciones, perspectiva y normas de dibujo.',
    },
    {
      code: 'UBAARQ05',
      semester: 3,
      name: 'Estructuras I',
      description: 'Estática, cargas y comportamiento estructural.',
    },
    {
      code: 'UBAARQ06',
      semester: 3,
      name: 'Construcciones I',
      description: 'Materiales y técnicas constructivas básicas.',
    },
    {
      code: 'UBAARQ07',
      semester: 4,
      name: 'Arquitectura II',
      description: 'Proyecto de programas de mediana complejidad.',
    },
    {
      code: 'UBAARQ08',
      semester: 4,
      name: 'Instalaciones I',
      description: 'Instalaciones sanitarias y de agua.',
    },
  ]),
  ...career(UBA, 'Licenciatura en Biología', [
    {
      code: 'UBABIO01',
      semester: 1,
      name: 'Introducción a la Biología',
      description: 'Diversidad, evolución y niveles de organización.',
    },
    {
      code: 'UBABIO02',
      semester: 1,
      name: 'Química General e Inorgánica',
      description: 'Estructura atómica, enlaces y reacciones.',
    },
    {
      code: 'UBABIO03',
      semester: 2,
      name: 'Matemática',
      description: 'Cálculo y modelos aplicados a lo biológico.',
    },
    {
      code: 'UBABIO04',
      semester: 2,
      name: 'Física',
      description: 'Mecánica, termodinámica y fenómenos ondulatorios.',
    },
    {
      code: 'UBABIO05',
      semester: 3,
      name: 'Química Orgánica',
      description: 'Grupos funcionales y reactividad.',
    },
    {
      code: 'UBABIO06',
      semester: 3,
      name: 'Biología Celular y Molecular',
      description: 'Organelas, membranas y expresión génica.',
    },
    {
      code: 'UBABIO07',
      semester: 4,
      name: 'Genética',
      description: 'Herencia mendeliana, ligamiento y genética de poblaciones.',
    },
    {
      code: 'UBABIO08',
      semester: 5,
      name: 'Ecología General',
      description: 'Poblaciones, comunidades y ecosistemas.',
    },
  ]),

  // ─────────────────────────── UNC ───────────────────────────
  ...career(UNC, 'Medicina', [
    {
      code: 'UNCMED01',
      semester: 1,
      name: 'Introducción a la Medicina',
      description: 'Salud, enfermedad y método clínico.',
    },
    {
      code: 'UNCMED02',
      semester: 1,
      name: 'Química Biológica',
      description: 'Biomoléculas y metabolismo.',
    },
    {
      code: 'UNCMED03',
      semester: 2,
      name: 'Anatomía',
      description: 'Anatomía por regiones y sistemas.',
    },
    {
      code: 'UNCMED04',
      semester: 2,
      name: 'Histología y Embriología',
      description: 'Tejidos y desarrollo prenatal.',
    },
    {
      code: 'UNCMED05',
      semester: 3,
      name: 'Fisiología Humana',
      description: 'Funciones de órganos y sistemas.',
    },
    {
      code: 'UNCMED06',
      semester: 3,
      name: 'Bioquímica',
      description: 'Rutas metabólicas y su regulación.',
    },
    {
      code: 'UNCMED07',
      semester: 4,
      name: 'Microbiología e Inmunología',
      description: 'Microorganismos y defensa del huésped.',
    },
    {
      code: 'UNCMED08',
      semester: 5,
      name: 'Patología',
      description: 'Mecanismos de daño celular y tisular.',
    },
  ]),
  ...career(UNC, 'Derecho', [
    {
      code: 'UNCDER01',
      semester: 1,
      name: 'Introducción al Derecho',
      description: 'Norma jurídica, fuentes e interpretación.',
    },
    {
      code: 'UNCDER02',
      semester: 1,
      name: 'Derecho Privado I (Parte General)',
      description: 'Persona, hecho y acto jurídico.',
    },
    {
      code: 'UNCDER03',
      semester: 2,
      name: 'Derecho Romano',
      description: 'Bases históricas del derecho privado.',
    },
    {
      code: 'UNCDER04',
      semester: 2,
      name: 'Derecho Constitucional',
      description: 'Estructura del poder y derechos fundamentales.',
    },
    {
      code: 'UNCDER05',
      semester: 3,
      name: 'Derecho Privado II (Obligaciones)',
      description: 'Nacimiento, efectos y extinción de obligaciones.',
    },
    {
      code: 'UNCDER06',
      semester: 3,
      name: 'Derecho Penal I',
      description: 'Teoría del delito y de la pena.',
    },
    {
      code: 'UNCDER07',
      semester: 4,
      name: 'Derecho Privado III (Contratos)',
      description: 'Contratos civiles y comerciales.',
    },
    {
      code: 'UNCDER08',
      semester: 4,
      name: 'Derecho Procesal Civil',
      description: 'Proceso, jurisdicción y competencia.',
    },
  ]),
  ...career(UNC, 'Contador Público', [
    {
      code: 'UNCCPN01',
      semester: 1,
      name: 'Introducción a la Contabilidad',
      description: 'Ecuación patrimonial y ciclo contable.',
    },
    {
      code: 'UNCCPN02',
      semester: 1,
      name: 'Introducción a la Administración',
      description: 'Organizaciones y proceso administrativo.',
    },
    {
      code: 'UNCCPN03',
      semester: 2,
      name: 'Análisis Matemático I',
      description: 'Funciones, derivadas e integrales.',
    },
    {
      code: 'UNCCPN04',
      semester: 2,
      name: 'Contabilidad I',
      description: 'Registración y estados contables básicos.',
    },
    {
      code: 'UNCCPN05',
      semester: 3,
      name: 'Microeconomía',
      description: 'Precios, mercados y bienestar.',
    },
    {
      code: 'UNCCPN06',
      semester: 3,
      name: 'Estadística I',
      description: 'Descripción de datos y probabilidad.',
    },
    {
      code: 'UNCCPN07',
      semester: 4,
      name: 'Contabilidad II',
      description: 'Valuación y exposición de rubros.',
    },
    {
      code: 'UNCCPN08',
      semester: 4,
      name: 'Derecho Comercial',
      description: 'Sociedades, títulos de crédito y contratos.',
    },
  ]),
  ...career(UNC, 'Psicología', [
    {
      code: 'UNCPSI01',
      semester: 1,
      name: 'Introducción a la Psicología',
      description: 'Corrientes, objeto y método.',
    },
    {
      code: 'UNCPSI02',
      semester: 1,
      name: 'Biología Evolutiva Humana',
      description: 'Evolución, genética y comportamiento.',
    },
    {
      code: 'UNCPSI03',
      semester: 2,
      name: 'Psicoestadística Descriptiva',
      description: 'Medidas, gráficos y correlación.',
    },
    {
      code: 'UNCPSI04',
      semester: 2,
      name: 'Psicología Evolutiva de la Niñez',
      description: 'Desarrollo infantil y teorías del desarrollo.',
    },
    {
      code: 'UNCPSI05',
      semester: 3,
      name: 'Neuropsicología',
      description: 'Relación cerebro-conducta.',
    },
    {
      code: 'UNCPSI06',
      semester: 3,
      name: 'Psicología Social',
      description: 'Grupos, actitudes e influencia social.',
    },
    {
      code: 'UNCPSI07',
      semester: 4,
      name: 'Psicopatología I',
      description: 'Semiología y grandes cuadros clínicos.',
    },
    {
      code: 'UNCPSI08',
      semester: 4,
      name: 'Técnicas Psicométricas',
      description: 'Construcción y aplicación de tests.',
    },
  ]),
  ...career(UNC, 'Arquitectura', [
    {
      code: 'UNCARQ01',
      semester: 1,
      name: 'Introducción a la Arquitectura',
      description: 'Lenguaje y problemas del proyecto.',
    },
    {
      code: 'UNCARQ02',
      semester: 1,
      name: 'Arquitectura I',
      description: 'Ejercicios proyectuales iniciales.',
    },
    {
      code: 'UNCARQ03',
      semester: 2,
      name: 'Matemática I',
      description: 'Geometría y funciones aplicadas al diseño.',
    },
    {
      code: 'UNCARQ04',
      semester: 2,
      name: 'Sistemas Gráficos de Expresión',
      description: 'Representación técnica y expresiva.',
    },
    {
      code: 'UNCARQ05',
      semester: 3,
      name: 'Estructuras I',
      description: 'Equilibrio, esfuerzos y tipologías estructurales.',
    },
    {
      code: 'UNCARQ06',
      semester: 3,
      name: 'Historia de la Arquitectura I',
      description: 'De la antigüedad al Renacimiento.',
    },
    {
      code: 'UNCARQ07',
      semester: 4,
      name: 'Construcciones I',
      description: 'Sistemas constructivos y materiales.',
    },
    {
      code: 'UNCARQ08',
      semester: 4,
      name: 'Instalaciones I',
      description: 'Agua, cloacas y desagües.',
    },
  ]),
  ...career(UNC, 'Ingeniería Civil', [
    {
      code: 'UNCCIV01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Cálculo diferencial e integral en una variable.',
    },
    {
      code: 'UNCCIV02',
      semester: 1,
      name: 'Álgebra Lineal y Geometría Analítica',
      description: 'Vectores, matrices y cónicas.',
    },
    {
      code: 'UNCCIV03',
      semester: 2,
      name: 'Física I',
      description: 'Cinemática, dinámica y estática.',
    },
    {
      code: 'UNCCIV04',
      semester: 2,
      name: 'Química Aplicada',
      description: 'Materiales y reacciones de interés en obra.',
    },
    {
      code: 'UNCCIV05',
      semester: 3,
      name: 'Estática y Resistencia de Materiales',
      description: 'Tensiones, deformaciones y diagramas.',
    },
    {
      code: 'UNCCIV06',
      semester: 3,
      name: 'Análisis Matemático II',
      description: 'Cálculo en varias variables y ecuaciones diferenciales.',
    },
    {
      code: 'UNCCIV07',
      semester: 4,
      name: 'Geotecnia I',
      description: 'Propiedades y comportamiento del suelo.',
    },
    {
      code: 'UNCCIV08',
      semester: 5,
      name: 'Hidráulica General',
      description: 'Hidrostática e hidrodinámica.',
    },
  ]),
  ...career(UNC, 'Ingeniería Mecánica', [
    {
      code: 'UNCMEC01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Límites, derivadas e integrales.',
    },
    {
      code: 'UNCMEC02',
      semester: 1,
      name: 'Álgebra Lineal y Geometría Analítica',
      description: 'Sistemas lineales y geometría del espacio.',
    },
    {
      code: 'UNCMEC03',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica de la partícula y del sólido rígido.',
    },
    {
      code: 'UNCMEC04',
      semester: 2,
      name: 'Dibujo Técnico',
      description: 'Normas, vistas y acotación.',
    },
    {
      code: 'UNCMEC05',
      semester: 3,
      name: 'Termodinámica',
      description: 'Primer y segundo principio, ciclos.',
    },
    {
      code: 'UNCMEC06',
      semester: 3,
      name: 'Mecánica Racional',
      description: 'Dinámica de sistemas y cuerpos rígidos.',
    },
    {
      code: 'UNCMEC07',
      semester: 4,
      name: 'Mecánica de los Fluidos',
      description: 'Estática, dinámica y flujo en conductos.',
    },
    {
      code: 'UNCMEC08',
      semester: 5,
      name: 'Elementos de Máquinas',
      description: 'Diseño de uniones, ejes y engranajes.',
    },
  ]),
  ...career(UNC, 'Licenciatura en Química', [
    {
      code: 'UNCQUI01',
      semester: 1,
      name: 'Química General',
      description: 'Estructura de la materia y estequiometría.',
    },
    {
      code: 'UNCQUI02',
      semester: 1,
      name: 'Matemática I',
      description: 'Cálculo aplicado a la química.',
    },
    {
      code: 'UNCQUI03',
      semester: 2,
      name: 'Química Inorgánica',
      description: 'Tabla periódica, enlaces y compuestos.',
    },
    {
      code: 'UNCQUI04',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica y termodinámica básica.',
    },
    {
      code: 'UNCQUI05',
      semester: 3,
      name: 'Química Orgánica I',
      description: 'Hidrocarburos y grupos funcionales.',
    },
    {
      code: 'UNCQUI06',
      semester: 3,
      name: 'Química Analítica',
      description: 'Equilibrios y análisis cuantitativo.',
    },
    {
      code: 'UNCQUI07',
      semester: 4,
      name: 'Fisicoquímica I',
      description: 'Termodinámica química y equilibrio.',
    },
    {
      code: 'UNCQUI08',
      semester: 4,
      name: 'Química Orgánica II',
      description: 'Mecanismos de reacción y síntesis.',
    },
  ]),

  // ─────────────────────────── UTN ───────────────────────────
  ...career(UTN, 'Ingeniería Industrial', [
    {
      code: 'UTNIND01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Cálculo de una variable.',
    },
    {
      code: 'UTNIND02',
      semester: 1,
      name: 'Álgebra y Geometría Analítica',
      description: 'Matrices, vectores y geometría.',
    },
    {
      code: 'UTNIND03',
      semester: 1,
      name: 'Química General',
      description: 'Fundamentos de química para ingeniería.',
    },
    {
      code: 'UTNIND04',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica y calor.',
    },
    {
      code: 'UTNIND05',
      semester: 2,
      name: 'Análisis Matemático II',
      description: 'Cálculo en varias variables.',
    },
    {
      code: 'UTNIND06',
      semester: 3,
      name: 'Estabilidad',
      description: 'Estática y resistencia de materiales.',
    },
    {
      code: 'UTNIND07',
      semester: 3,
      name: 'Termodinámica',
      description: 'Energía, ciclos y aplicaciones.',
    },
    {
      code: 'UTNIND08',
      semester: 4,
      name: 'Investigación Operativa',
      description: 'Modelado, optimización lineal y colas.',
    },
  ]),
  ...career(UTN, 'Ingeniería Electrónica', [
    {
      code: 'UTNELE01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Cálculo diferencial e integral.',
    },
    {
      code: 'UTNELE02',
      semester: 1,
      name: 'Álgebra y Geometría Analítica',
      description: 'Sistemas lineales y números complejos.',
    },
    {
      code: 'UTNELE03',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica y ondas.',
    },
    {
      code: 'UTNELE04',
      semester: 2,
      name: 'Fundamentos de Informática',
      description: 'Programación y algoritmos básicos.',
    },
    {
      code: 'UTNELE05',
      semester: 3,
      name: 'Análisis Matemático II',
      description: 'Cálculo vectorial y ecuaciones diferenciales.',
    },
    {
      code: 'UTNELE06',
      semester: 3,
      name: 'Teoría de los Circuitos I',
      description: 'Análisis de circuitos en CC y CA.',
    },
    {
      code: 'UTNELE07',
      semester: 4,
      name: 'Dispositivos Electrónicos',
      description: 'Diodos, transistores y amplificación.',
    },
    {
      code: 'UTNELE08',
      semester: 4,
      name: 'Medidas Electrónicas I',
      description: 'Instrumentos, errores y mediciones.',
    },
  ]),
  ...career(UTN, 'Ingeniería Mecánica', [
    {
      code: 'UTNMEC01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Funciones, derivadas e integrales.',
    },
    {
      code: 'UTNMEC02',
      semester: 1,
      name: 'Álgebra y Geometría Analítica',
      description: 'Vectores, matrices y geometría del espacio.',
    },
    {
      code: 'UTNMEC03',
      semester: 1,
      name: 'Química General',
      description: 'Química aplicada a materiales.',
    },
    {
      code: 'UTNMEC04',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica del punto y del rígido.',
    },
    {
      code: 'UTNMEC05',
      semester: 3,
      name: 'Estabilidad I',
      description: 'Equilibrio y esfuerzos internos.',
    },
    {
      code: 'UTNMEC06',
      semester: 3,
      name: 'Termodinámica',
      description: 'Principios y ciclos térmicos.',
    },
    {
      code: 'UTNMEC07',
      semester: 4,
      name: 'Tecnología de los Materiales',
      description: 'Metales, polímeros y ensayos.',
    },
    {
      code: 'UTNMEC08',
      semester: 4,
      name: 'Mecánica de los Fluidos',
      description: 'Estática y dinámica de fluidos.',
    },
  ]),
  ...career(UTN, 'Ingeniería Química', [
    {
      code: 'UTNQUI01',
      semester: 1,
      name: 'Análisis Matemático I',
      description: 'Cálculo en una variable.',
    },
    {
      code: 'UTNQUI02',
      semester: 1,
      name: 'Química General',
      description: 'Estequiometría y estados de la materia.',
    },
    {
      code: 'UTNQUI03',
      semester: 2,
      name: 'Física I',
      description: 'Mecánica y termodinámica.',
    },
    {
      code: 'UTNQUI04',
      semester: 2,
      name: 'Química Inorgánica',
      description: 'Compuestos y reacciones inorgánicas.',
    },
    {
      code: 'UTNQUI05',
      semester: 3,
      name: 'Química Orgánica',
      description: 'Estructura, nomenclatura y reactividad.',
    },
    {
      code: 'UTNQUI06',
      semester: 3,
      name: 'Fisicoquímica',
      description: 'Equilibrio, cinética y electroquímica.',
    },
    {
      code: 'UTNQUI07',
      semester: 4,
      name: 'Operaciones Unitarias I',
      description: 'Balances de materia y energía, transferencia.',
    },
    {
      code: 'UTNQUI08',
      semester: 4,
      name: 'Termodinámica de los Procesos',
      description: 'Equilibrio de fases y ciclos industriales.',
    },
  ]),

  // ─────────────────────────── UNLP ──────────────────────────
  ...career(UNLP, 'Licenciatura en Informática', [
    {
      code: 'UNLPINF01',
      semester: 1,
      name: 'Conceptos de Algoritmos, Datos y Programas',
      description: 'Nociones de algoritmo, dato y programa.',
    },
    {
      code: 'UNLPINF02',
      semester: 1,
      name: 'Expresión de Problemas y Algoritmos',
      description: 'Análisis de problemas y diseño descendente.',
    },
    {
      code: 'UNLPINF03',
      semester: 1,
      name: 'Matemática 1',
      description: 'Lógica, conjuntos, relaciones y funciones.',
    },
    {
      code: 'UNLPINF04',
      semester: 2,
      name: 'Organización de Computadoras',
      description: 'Representación, arquitectura y ensamblador.',
    },
    {
      code: 'UNLPINF05',
      semester: 2,
      name: 'Análisis Matemático I',
      description: 'Cálculo diferencial e integral.',
    },
    {
      code: 'UNLPINF06',
      semester: 3,
      name: 'Algoritmos y Estructuras de Datos',
      description: 'Listas, árboles, grafos y complejidad.',
    },
    {
      code: 'UNLPINF07',
      semester: 4,
      name: 'Bases de Datos I',
      description: 'Modelo relacional, SQL y diseño.',
    },
    {
      code: 'UNLPINF08',
      semester: 5,
      name: 'Ingeniería de Software I',
      description: 'Procesos, requisitos y modelado.',
    },
  ]),
  ...career(UNLP, 'Abogacía', [
    {
      code: 'UNLPABO01',
      semester: 1,
      name: 'Introducción al Derecho',
      description: 'Concepto, fuentes y ramas del derecho.',
    },
    {
      code: 'UNLPABO02',
      semester: 1,
      name: 'Historia Constitucional',
      description: 'Formación institucional argentina.',
    },
    {
      code: 'UNLPABO03',
      semester: 2,
      name: 'Derecho Romano',
      description: 'Instituciones jurídicas romanas.',
    },
    {
      code: 'UNLPABO04',
      semester: 2,
      name: 'Derecho Político',
      description: 'Teoría del Estado y del poder.',
    },
    {
      code: 'UNLPABO05',
      semester: 3,
      name: 'Derecho Civil I',
      description: 'Parte general: persona y acto jurídico.',
    },
    {
      code: 'UNLPABO06',
      semester: 3,
      name: 'Derecho Constitucional',
      description: 'Organización del poder y derechos.',
    },
    {
      code: 'UNLPABO07',
      semester: 4,
      name: 'Derecho Civil II',
      description: 'Obligaciones y su régimen.',
    },
    {
      code: 'UNLPABO08',
      semester: 4,
      name: 'Derecho Penal I',
      description: 'Teoría del delito.',
    },
  ]),
  ...career(UNLP, 'Contador Público', [
    {
      code: 'UNLPCPN01',
      semester: 1,
      name: 'Introducción a la Contabilidad',
      description: 'Patrimonio y registración.',
    },
    {
      code: 'UNLPCPN02',
      semester: 1,
      name: 'Administración I',
      description: 'Organizaciones y funciones administrativas.',
    },
    {
      code: 'UNLPCPN03',
      semester: 2,
      name: 'Matemática I',
      description: 'Álgebra y cálculo aplicados.',
    },
    {
      code: 'UNLPCPN04',
      semester: 2,
      name: 'Contabilidad I',
      description: 'Estados contables y valuación.',
    },
    {
      code: 'UNLPCPN05',
      semester: 3,
      name: 'Economía Política',
      description: 'Micro y macroeconomía introductoria.',
    },
    {
      code: 'UNLPCPN06',
      semester: 3,
      name: 'Estadística I',
      description: 'Descripción de datos e inferencia.',
    },
    {
      code: 'UNLPCPN07',
      semester: 4,
      name: 'Contabilidad II',
      description: 'Rubros patrimoniales y de resultado.',
    },
    {
      code: 'UNLPCPN08',
      semester: 4,
      name: 'Derecho Comercial I',
      description: 'Sociedades y contratos comerciales.',
    },
  ]),
  ...career(UNLP, 'Medicina Veterinaria', [
    {
      code: 'UNLPVET01',
      semester: 1,
      name: 'Anatomía I',
      description: 'Anatomía de los animales domésticos.',
    },
    {
      code: 'UNLPVET02',
      semester: 1,
      name: 'Química Biológica',
      description: 'Biomoléculas y metabolismo animal.',
    },
    {
      code: 'UNLPVET03',
      semester: 2,
      name: 'Histología y Embriología',
      description: 'Tejidos y desarrollo embrionario.',
    },
    {
      code: 'UNLPVET04',
      semester: 2,
      name: 'Física Biológica',
      description: 'Principios físicos aplicados a la biología.',
    },
    {
      code: 'UNLPVET05',
      semester: 3,
      name: 'Fisiología',
      description: 'Funciones orgánicas en distintas especies.',
    },
    {
      code: 'UNLPVET06',
      semester: 3,
      name: 'Microbiología',
      description: 'Bacterias, virus y hongos de interés veterinario.',
    },
    {
      code: 'UNLPVET07',
      semester: 4,
      name: 'Farmacología',
      description: 'Fármacos, dosis y vías de administración.',
    },
    {
      code: 'UNLPVET08',
      semester: 4,
      name: 'Patología General',
      description: 'Mecanismos de enfermedad.',
    },
  ]),

  // ─────────────────────────── UNR ───────────────────────────
  ...career(UNR, 'Medicina', [
    {
      code: 'UNRMED01',
      semester: 1,
      name: 'Introducción a la Problemática Médica',
      description: 'Salud, sociedad y práctica médica.',
    },
    {
      code: 'UNRMED02',
      semester: 1,
      name: 'Biología Celular y Molecular',
      description: 'Célula, ADN y expresión génica.',
    },
    {
      code: 'UNRMED03',
      semester: 2,
      name: 'Anatomía Normal',
      description: 'Anatomía descriptiva y topográfica.',
    },
    {
      code: 'UNRMED04',
      semester: 2,
      name: 'Bioquímica',
      description: 'Metabolismo y regulación.',
    },
    {
      code: 'UNRMED05',
      semester: 3,
      name: 'Fisiología Humana',
      description: 'Funciones integradas del organismo.',
    },
    {
      code: 'UNRMED06',
      semester: 3,
      name: 'Histología y Embriología',
      description: 'Microanatomía y desarrollo.',
    },
    {
      code: 'UNRMED07',
      semester: 4,
      name: 'Microbiología',
      description: 'Agentes infecciosos y su diagnóstico.',
    },
    {
      code: 'UNRMED08',
      semester: 5,
      name: 'Anatomía Patológica',
      description: 'Lesiones y correlación clínico-patológica.',
    },
  ]),
  ...career(UNR, 'Odontología', [
    {
      code: 'UNRODO01',
      semester: 1,
      name: 'Anatomía General y Dentaria',
      description: 'Cabeza, cuello y morfología dentaria.',
    },
    {
      code: 'UNRODO02',
      semester: 1,
      name: 'Histología y Embriología',
      description: 'Tejidos y desarrollo bucodental.',
    },
    {
      code: 'UNRODO03',
      semester: 2,
      name: 'Bioquímica Estomatológica',
      description: 'Bioquímica de tejidos duros y saliva.',
    },
    {
      code: 'UNRODO04',
      semester: 2,
      name: 'Fisiología',
      description: 'Funciones del organismo y del sistema estomatognático.',
    },
    {
      code: 'UNRODO05',
      semester: 3,
      name: 'Microbiología',
      description: 'Microbiota bucal y patógenos.',
    },
    {
      code: 'UNRODO06',
      semester: 3,
      name: 'Operatoria Dental I',
      description: 'Preparaciones cavitarias y restauraciones.',
    },
    {
      code: 'UNRODO07',
      semester: 4,
      name: 'Materiales Dentales',
      description: 'Propiedades y manipulación de biomateriales.',
    },
    {
      code: 'UNRODO08',
      semester: 4,
      name: 'Periodoncia I',
      description: 'Encía, periodonto y enfermedad periodontal.',
    },
  ]),
  ...career(UNR, 'Psicología', [
    {
      code: 'UNRPSI01',
      semester: 1,
      name: 'Introducción a la Psicología',
      description: 'Campos y perspectivas de la disciplina.',
    },
    {
      code: 'UNRPSI02',
      semester: 1,
      name: 'Antropología',
      description: 'Cultura, sociedad y diversidad humana.',
    },
    {
      code: 'UNRPSI03',
      semester: 2,
      name: 'Estructura Biológica del Sujeto I',
      description: 'Sistema nervioso y bases biológicas.',
    },
    {
      code: 'UNRPSI04',
      semester: 2,
      name: 'Psicoanálisis I',
      description: 'Conceptos fundamentales del psicoanálisis.',
    },
    {
      code: 'UNRPSI05',
      semester: 3,
      name: 'Psicología Evolutiva I',
      description: 'Desarrollo desde la infancia a la adolescencia.',
    },
    {
      code: 'UNRPSI06',
      semester: 3,
      name: 'Psicoestadística',
      description: 'Estadística aplicada a la investigación.',
    },
    {
      code: 'UNRPSI07',
      semester: 4,
      name: 'Psicopatología I',
      description: 'Nosografía y semiología psicopatológica.',
    },
    {
      code: 'UNRPSI08',
      semester: 4,
      name: 'Psicología Social',
      description: 'Procesos grupales e institucionales.',
    },
  ]),
  ...career(UNR, 'Licenciatura en Administración', [
    {
      code: 'UNRADM01',
      semester: 1,
      name: 'Introducción a la Administración',
      description: 'Teorías y proceso administrativo.',
    },
    {
      code: 'UNRADM02',
      semester: 1,
      name: 'Contabilidad I',
      description: 'Registración y estados contables.',
    },
    {
      code: 'UNRADM03',
      semester: 2,
      name: 'Matemática I',
      description: 'Álgebra y cálculo para la gestión.',
    },
    {
      code: 'UNRADM04',
      semester: 2,
      name: 'Microeconomía',
      description: 'Mercados, precios y decisiones de la firma.',
    },
    {
      code: 'UNRADM05',
      semester: 3,
      name: 'Administración de Personal',
      description: 'Gestión de recursos humanos.',
    },
    {
      code: 'UNRADM06',
      semester: 3,
      name: 'Estadística',
      description: 'Análisis de datos para decisiones.',
    },
    {
      code: 'UNRADM07',
      semester: 4,
      name: 'Comercialización',
      description: 'Marketing, producto, precio y canales.',
    },
    {
      code: 'UNRADM08',
      semester: 4,
      name: 'Finanzas de Empresas',
      description: 'Inversión, financiamiento y valor.',
    },
  ]),
];
