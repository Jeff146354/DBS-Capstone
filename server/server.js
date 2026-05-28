'use strict'

require('dotenv').config()

const app = require('./app')
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const PORT = process.env.PORT || 3001

async function runMigration() {
  // Build connection config — supports both individual vars and a single DATABASE_URL
  const config = process.env.DATABASE_URL
    ? process.env.DATABASE_URL + '?multipleStatements=true'
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT || '3306', 10),
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME     || 'spendly',
        multipleStatements: true,
      }

  let conn
  try {
    conn = await mysql.createConnection(config)
    const schema   = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'),           'utf8')
    const pwMigr   = fs.readFileSync(path.join(__dirname, 'db', 'migrate_password.sql'), 'utf8')
    const seed     = fs.readFileSync(path.join(__dirname, 'db', 'seed.sql'),             'utf8')
    await conn.query(schema)
    await conn.query(pwMigr)
    await conn.query(seed)
    console.log('✅ Migration complete.')
  } catch (err) {
    console.error('⚠️  Migration error (non-fatal):', err.message)
  } finally {
    if (conn) await conn.end()
  }
}

async function start() {
  await runMigration()
  app.listen(PORT, () => {
    console.log(`Spendly API server running on http://localhost:${PORT}`)
  })
}

start()
