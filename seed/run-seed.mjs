import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL environment variable");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();

  try {
    // Run schema
    const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
    console.log("Creating tables...");
    await client.query(schema);
    console.log("Tables created.");

    // Run seed in a transaction so partial failures don't leave bad state
    const seed = readFileSync(new URL("./seed.sql", import.meta.url), "utf8");
    console.log("Seeding data...");
    await client.query("BEGIN");
    try {
      await client.query("TRUNCATE tickets, products, customers CASCADE");
      await client.query(seed);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    console.log("Done!");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
