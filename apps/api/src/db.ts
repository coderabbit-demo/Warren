import pg from 'pg';

export interface Db {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export function connectDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return {
    async query<T>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
      const result = await pool.query(text, params);
      return { rows: result.rows as T[] };
    },
  };
}
