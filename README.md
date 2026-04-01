# StudyQuest 🎮📚 — PostgreSQL Edition

Plataforma de estudio colaborativo con matchmaking y quizzes generados por IA.
**Esta versión usa PostgreSQL 16 + TypeORM** en lugar de MongoDB + Mongoose.

---

## Estructura del Proyecto

El proyecto está dividido en componentes principales diseñados siguiendo heurísticas limpias (separación de responsabilidades):

- **`backend/`**: API RESTful y WebSockets construida con NestJS. Maneja la lógica de dominio, matchmaking, IA (OpenAI) y persistencia usando el patrón Repository a través de TypeORM.
- **`frontend/`**: Aplicación de Single Page Application (SPA) construida con React 18 y TypeScript. Utiliza una arquitectura orientada a componentes, estilos de Tailwind CSS y manejo de estado centralizado (Zustand).
- **`docker-compose.yml`**: Orquestación contenida de la infraestructura de las bases de datos externas que garantizan la fácil portabilidad del proyecto en fase de desarrollo.

---

## ¿Qué es Redis y para qué se usa?

[Redis](https://redis.io/) es un motor de base de datos en memoria sumamente rápido (en lugar de guardar filas en un disco sólido, opera de las memorias RAM otorgando latencias de sub-milisegundos).

En **StudyQuest**, Redis es el corazón del desempeño para estados temporales:
1. **Matchmaking en tiempo real**: Alberga y procesa la cola activa de jugadores buscando partidas sin generar un "cuello de botella" leyendo y escribiendo repetidamente en PostgreSQL.
2. **Caché Efímero o Volátil**: Registra estados de sesiones activas, emitiendo y recibiendo eventos provenientes de WebSockets (Socket.IO).

---

## Cómo Levantar el Proyecto Localmente

No necesitas instalar PostgreSQL ni Redis directamente. Sigue estos pasos para arrancar el entorno usando los módulos acoplados.

### 1. Variables de Entorno

Asegúrate de copiar el archivo `environment` de ejemplo para que los servicios tengan las contraseñas base y credenciales de IA:

```bash
cp .env.example .env
```

### 2. Levantar la Infraestructura (Bases de Datos con Docker)

Levantaremos las bases de datos base utilizando Docker. Ejecuta en la raíz del proyecto el siguiente comando:

```bash
docker compose up -d postgres redis
```
*(Si deseas correr todo con contenedores también puedes omitir especificar los servicios, pero para un entorno dev es preferible sólo virtualizar las DBs y correr el código manual).*

### 3. Ejecutar el Backend (NestJS)

Abre una terminal, muévete a la ruta del servidor e instala dependencias:

```bash
cd backend
npm install
npm run start:dev
```
*Tip: Al activar el servidor por primera vez, TypeORM se comunicará con PostgreSQL para generar o **sincronizar (migrar)** los esquemas vacíos automáticamente según tus Entidades configuradas (esto ocurre si `TYPEORM_SYNC=true` en tu `.env`).*

### 4. Poblado de Datos Base (Seed)

**¿La semilla va antes o después del backend?**  
Debe ir **DESPUÉS** de que tu backend procese el punto anterior por primera vez. Una semilla inyecta registros en tablas que primero deben existir.

Tras asegurarte de que el backend haya sincronizado la estructura local en la DB, y manteniendo este encendido, abre otra terminal dentro de la ruta del `backend/` y corre el script poblador:

```bash
npm run seed
```
*(Esto insertará universidades, materias de prueba, usuarios y administradores clave listos para probar).*

### 5. Levantar el Frontend (Interfaz React)

Con el backend y las bases de soporte operando, sólo nos queda montar la parte visible. En una tercera consola:

```bash
cd frontend
npm install
npm run dev
```

El portal cargará e iniciará disponible desde tu navegador.
- **Portal URL**: [http://localhost:5173](http://localhost:5173)
- **API URL (Base)**: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

---

## Aspectos Técnicos

### Razones Técnicas de la Migración a PostgreSQL (en vez de Mongo)

| Aspecto | PostgreSQL | MongoDB |
|---|---|---|
| Mapeo Relacional | Nativas con Foreign Keys y Reglas | Referencias enlazadas pero manuales |
| Reglas de Transacciones | ACID completo en cada movimiento | Requiere un esquema Replica-Set robusto |
| Tablas de Posiciones (Leaderboard) | Funciones de orden estricto nativas (`ORDER BY`) | Pipelines y operaciones agresivas por stages |
| Híbrido Estructurado | Combina Tablas Estrictas con Columnas `JSONB` flexibles | Puramente Documental Libre |

*(Utilizamos un diseño híbrido: Columnas como `availability` o perfiles de `stats` residen como objetos `JSONB` ágiles, mientras las entidades inter-relacionadas permanecen normalizadas estrictamente para consistencia)*.