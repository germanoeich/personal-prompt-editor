module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/database.sqlite'
    },
    migrations: {
      directory: './src/lib/migrations'
    },
    seeds: {
      directory: './src/lib/seeds'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'better-sqlite3',
    connection: {
      filename: './data/database.sqlite'
    },
    migrations: {
      directory: './src/lib/migrations'
    },
    seeds: {
      directory: './src/lib/seeds'
    },
    useNullAsDefault: true
  }
};