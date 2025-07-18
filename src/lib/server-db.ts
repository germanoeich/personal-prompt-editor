// This module should only be imported on the server
const knex = require('knex');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'database.sqlite');

const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true
});

export default db;