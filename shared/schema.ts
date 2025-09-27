import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const repositories = pgTable("repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, error
  createdAt: timestamp("created_at").defaultNow(),
});

export const commits = pgTable("commits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  repositoryId: varchar("repository_id").notNull().references(() => repositories.id),
  hash: text("hash").notNull(),
  message: text("message").notNull(),
  author: text("author").notNull(),
  authorEmail: text("author_email").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(), // major-feature, minor-feature, bug-fix, refactor, architecture
  filesChanged: jsonb("files_changed").notNull(), // array of file objects
  insertions: integer("insertions").default(0),
  deletions: integer("deletions").default(0),
});

export const insertRepositorySchema = createInsertSchema(repositories).pick({
  url: true,
  name: true,
  owner: true,
});

export const insertCommitSchema = createInsertSchema(commits).omit({
  id: true,
  repositoryId: true,
});

export type Repository = typeof repositories.$inferSelect;
export type InsertRepository = z.infer<typeof insertRepositorySchema>;
export type Commit = typeof commits.$inferSelect;
export type InsertCommit = z.infer<typeof insertCommitSchema>;

export const analyzeRepositorySchema = z.object({
  url: z.string().url().regex(/^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/, 
    "Must be a valid GitHub repository URL"),
});

export type AnalyzeRepositoryRequest = z.infer<typeof analyzeRepositorySchema>;
