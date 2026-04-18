import { defineConfig } from "prisma/config";

// In Docker, DATABASE_URL is injected by docker-compose — dotenv is irrelevant.
// In local dev, dotenv loads the .env file. The try/catch makes this safe in both contexts.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv/config");
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
