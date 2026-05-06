#!/usr/bin/env bun
import "dotenv/config"
import { createClient } from "@libsql/client"

const url = process.env.DB_FILE_NAME ?? "file:local.db"

async function reset() {
  console.log(`\n→ Database: ${url}\n`)

  const client = createClient({ url })

  await client.execute(`DELETE FROM locations`)

  console.log("✓ Cleared: locations")
  console.log("✓ Reset complete\n")
  process.exit(0)
}

reset().catch((err) => {
  console.error("✗ Reset failed:", err)
  process.exit(1)
})
