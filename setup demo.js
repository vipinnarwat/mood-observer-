/**
 * setup-demo.js — Creates a demo user for testing
 * Run: node setup-demo.js
 */
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');
const path     = require('path');

const db = new Database(path.join(__dirname, 'moodobserver.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

async function main() {
  const hash = await bcrypt.hash('demo1234', 12);
  const id = uuid();
  try {
    db.prepare(`INSERT OR IGNORE INTO users (id,username,display_name,email,password_hash,avatar) VALUES (?,?,?,?,?,?)`)
      .run(id, 'vipin_demo', 'vipin', 'vipin@demo.com', hash, '🌙');
    console.log('✅ Demo user created: vipin@demo.com / demo1234');
  } catch(e) {
    console.log('ℹ️  Demo user already exists');
  }
  db.close();
}

main();