import * as mariadb from 'mariadb';

// DB 연결 pool
const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5 // 최대 동시 연결 수
});

export async function executeQuery(query: string, params?: any[]) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query(query, params);
    return rows;
  } catch (err) {
    console.error("데이터베이스 쿼리 에러:", err);
    throw err;
  } finally {
    if (conn) conn.release(); // 연결 반환
  }
}

export default pool;