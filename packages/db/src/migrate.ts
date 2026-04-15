import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  console.log("Running migrations...");
  const sql = neon(url);
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations complete!");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
