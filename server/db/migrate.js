'use strict'

/**
 * Spendly DB Migration Script
 * Runs schema.sql then seed.sql against the configured database.
 *
 * Usage:
 *   node server/db/migrate.js
 *
 * Reads DB credentials from server/.env
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

const DB_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'spendly',
  multipleStatements: true,
}

async function migrate() {
  console.log(`\n🔌 Connecting to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port} (db: ${DB_CONFIG.database})...`)

  let conn
  try {
    conn = await mysql.createConnection(DB_CONFIG)
    console.log('✅ Connected.\n')
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    console.error('\nCheck your DB_PASSWORD in server/.env and make sure MySQL is running.')
    process.exit(1)
  }

  const files = [
    { label: 'Schema', file: path.join(__dirname, 'schema.sql') },
    { label: 'Seed',   file: path.join(__dirname, 'seed.sql')   },
  ]

  for (const { label, file } of files) {
    try {
      const sql = fs.readFileSync(file, 'utf8')
      console.log(`📄 Running ${label} (${path.basename(file)})...`)
      await conn.query(sql)
      console.log(`✅ ${label} applied.\n`)
    } catch (err) {
      console.error(`❌ ${label} failed:`, err.message)
      await conn.end()
      process.exit(1)
    }
  }

  // Quick verification
  console.log('🔍 Verifying tables...')
  const [tables] = await conn.query(`SHOW TABLES`)
  const tableNames = tables.map(r => Object.values(r)[0])
  console.log('   Tables found:', tableNames.join(', '))

  const [[{ userCount }]] = await conn.query('SELECT COUNT(*) AS userCount FROM users')
  const [[{ txnCount }]]  = await conn.query('SELECT COUNT(*) AS txnCount  FROM transactions')
  console.log(`   Users: ${userCount} | Transactions: ${txnCount}`)

  await conn.end()
  console.log('\n🎉 Migration complete. Database is ready.')
}

migrate()
