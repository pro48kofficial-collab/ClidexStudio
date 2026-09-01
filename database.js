import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL не встановлено");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

export function query(text, params = []) {
  return pool.query(text, params);
}

export async function setupDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      nickname VARCHAR(30) NOT NULL UNIQUE,
      avatar TEXT,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news (
      id UUID PRIMARY KEY,
      title VARCHAR(150) NOT NULL,
      content TEXT NOT NULL,
      image TEXT,
      game_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reactions (
      id UUID PRIMARY KEY,
      news_id UUID REFERENCES news(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      reaction VARCHAR(20) NOT NULL,
      UNIQUE(news_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      telegram_username VARCHAR(100) NOT NULL,
      wanted_role VARCHAR(30) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      owner_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(150) NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log("PostgreSQL: таблиці готові");
  }
