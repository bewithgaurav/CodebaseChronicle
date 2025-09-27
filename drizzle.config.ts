import { defineConfig } from "drizzle-kit";

// Simplified config for in-memory deployment
export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://placeholder@localhost:5432/placeholder",
  },
});
