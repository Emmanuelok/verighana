import {Pool, type PoolClient} from 'pg';
import {OperationError, type Database} from './core';
let pool: Pool|undefined;
export function databaseConfigured() { return process.env.FULLVIEW_OPERATIONS_ENABLED === 'true' && !!process.env.FULLVIEW_DATABASE_URL; }
export function getDatabase(): Database {
  if (!databaseConfigured()) throw new OperationError(503, 'operations_unavailable', 'Online project services are being connected. Please contact Fullview by email or phone.');
  pool ??= new Pool({connectionString: process.env.FULLVIEW_DATABASE_URL, max: 4, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000});
  return adapter(pool);
}
function adapter(connection: Pool|PoolClient): Database {
  return {
    async query<T>(sql: string, values: unknown[] = []) {const result=await connection.query(sql,values);return {rows:result.rows as T[],rowCount:result.rowCount};},
    async transaction<T>(work: (db: Database)=>Promise<T>) {
      const client=connection instanceof Pool ? await connection.connect() : connection;
      try {await client.query('BEGIN');const result=await work(adapter(client));await client.query('COMMIT');return result;}
      catch(error){await client.query('ROLLBACK');throw error;}
      finally {if(connection instanceof Pool)client.release();}
    },
  };
}
