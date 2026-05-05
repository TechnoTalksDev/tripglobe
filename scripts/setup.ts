#!/usr/bin/env bun
import "dotenv/config"
import { createClient } from "@libsql/client"

const url = process.env.DB_FILE_NAME ?? "file:local.db"

async function setup() {
  console.log(`\n→ Database: ${url}\n`)

  const client = createClient({ url })

  await client.execute(`
    CREATE TABLE IF NOT EXISTS locations (
      id           TEXT    PRIMARY KEY NOT NULL,
      name         TEXT    NOT NULL,
      lat          REAL    NOT NULL,
      lng          REAL    NOT NULL,
      country_code TEXT    NOT NULL,
      upvotes      INTEGER NOT NULL DEFAULT 0,
      created_at   INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  console.log("✓ Table ready")
  console.log("✓ Setup complete\n")
  process.exit(0)
}

setup().catch((err) => {
  console.error("✗ Setup failed:", err)
  process.exit(1)
})
