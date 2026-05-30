import { readFileSync } from 'node:fs';
import mariadb from 'mariadb';

const sql = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf-8');

const conn = await mariadb.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  await conn.query(sql);
  console.log('✅ Schema applied successfully');
} catch (err) {
  console.error('❌ Migration failed:', err);
  process.exitCode = 1;
} finally {
  await conn.end();
}
