/**
 * Postgres connection options for code that runs outside Nest (TypeORM
 * migrations CLI, one-off scripts). Mirrors the logic in app.module.ts:
 * `DATABASE_URL` (prod: Aiven/Neon/Supabase) wins over the POSTGRES_* vars.
 *
 * pg >=8.16 treats `sslmode=require` as `verify-full`, which rejects the
 * self-signed CA chains those providers present, so the parameter is stripped
 * and TLS is forced without CA verification — same as the app.
 */
export type PostgresConnectionOptions =
  | { url: string; ssl: { rejectUnauthorized: false } }
  | {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
    };

export function postgresConnectionOptions(
  env: NodeJS.ProcessEnv = process.env,
): PostgresConnectionOptions {
  const url = env.DATABASE_URL?.trim();
  if (url) {
    const parsed = new URL(url);
    parsed.searchParams.delete('sslmode');
    parsed.searchParams.delete('ssl');
    return { url: parsed.toString(), ssl: { rejectUnauthorized: false } };
  }
  return {
    host: env.POSTGRES_HOST ?? 'localhost',
    port: Number(env.POSTGRES_PORT ?? 5432),
    username: env.POSTGRES_USER ?? 'studyquest',
    password: env.POSTGRES_PASSWORD ?? 'studyquest_pass',
    database: env.POSTGRES_DB ?? 'studyquest',
  };
}
