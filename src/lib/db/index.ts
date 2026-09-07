import { Pool, types } from "pg";

// Return DATE columns as their raw "YYYY-MM-DD" string instead of pg's default
// JS Date conversion (which shifts by local timezone and isn't a valid React child).
types.setTypeParser(types.builtins.DATE, (value: string) => value);

declare global {
  var _pgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Copy .env.local.example to .env.local and fill it in.");
  }
  if (!global._pgPool) {
    global._pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return global._pgPool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query(text, params);
  return result.rows as T[];
}
