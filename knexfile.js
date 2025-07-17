module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './data/dev.sqlite3'
    },
    migrations: {
      directory: './src/lib/migrations'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: './data/prod.sqlite3'
    },
    migrations: {
      directory: './src/lib/migrations'
    },
    useNullAsDefault: true
  }
};