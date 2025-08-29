// This module should only be imported on the server
import knex from 'knex';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath,
    // Fix SQLite locking issues in Docker
    // Use journal_mode=DELETE for better Docker compatibility
    flags: ['SQLITE_OPEN_READWRITE', 'SQLITE_OPEN_CREATE', 'SQLITE_OPEN_FULLMUTEX']
  },
  useNullAsDefault: true,
  pool: {
    min: 1,
    max: 1,
    afterCreate: (conn: any, cb: any) => {
      // Configure SQLite for better Docker compatibility
      conn.pragma('journal_mode = DELETE'); // More compatible than WAL in Docker
      conn.pragma('busy_timeout = 5000'); // Wait up to 5 seconds for locks
      conn.pragma('synchronous = NORMAL'); // Balance between safety and performance
      cb(null, conn);
    }
  }
});

export default db;