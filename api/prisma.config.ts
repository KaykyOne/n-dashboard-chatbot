import { defineConfig } from "prisma/config";
import "dotenv/config";

const buildTimeDatabaseUrl =
  "postgresql://build:build@localhost:5432/build";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      buildTimeDatabaseUrl,
    shadowDatabaseUrl:
      process.env.DATABASE_URL ??
      process.env.DIRECT_URL ??
      buildTimeDatabaseUrl,
  },
});
