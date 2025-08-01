// This module should only be imported on the server
import knex from 'knex';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true
});

export default db;