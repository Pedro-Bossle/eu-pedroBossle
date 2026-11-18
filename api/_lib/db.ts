import { Pool, type PoolClient } from "@neondatabase/serverless";

let pool: Pool | null = null;

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não configurada");
  }
  if (!pool) {
    pool = new Pool({ connectionString: url });
  }
  return pool;
}

/** Sessão autenticada: liga a flag usada pelas policies RLS. */
export async function withAuth<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    // Uma ida ao banco só (protocolo simples aceita os dois comandos juntos)
    await client.query(
      "BEGIN; SELECT set_config('app.authenticated', 'true', true)",
    );
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Consultas sem RLS (apenas funções SECURITY DEFINER / bootstrap). */
export async function withDb<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
