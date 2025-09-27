import { type Repository, type InsertRepository, type Commit, type InsertCommit } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getRepository(id: string): Promise<Repository | undefined>;
  getRepositoryByUrl(url: string): Promise<Repository | undefined>;
  createRepository(repo: InsertRepository): Promise<Repository>;
  updateRepositoryStatus(id: string, status: string): Promise<void>;
  getRepositoryCommits(repositoryId: string): Promise<Commit[]>;
  createCommit(commit: InsertCommit & { repositoryId: string }): Promise<Commit>;
  deleteRepositoryCommits(repositoryId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private repositories: Map<string, Repository>;
  private commits: Map<string, Commit>;

  constructor() {
    this.repositories = new Map();
    this.commits = new Map();
  }

  async getRepository(id: string): Promise<Repository | undefined> {
    return this.repositories.get(id);
  }

  async getRepositoryByUrl(url: string): Promise<Repository | undefined> {
    return Array.from(this.repositories.values()).find(
      (repo) => repo.url === url,
    );
  }

  async createRepository(insertRepo: InsertRepository): Promise<Repository> {
    const id = randomUUID();
    const repository: Repository = { 
      ...insertRepo, 
      id,
      status: "pending",
      createdAt: new Date()
    };
    this.repositories.set(id, repository);
    return repository;
  }

  async updateRepositoryStatus(id: string, status: string): Promise<void> {
    const repo = this.repositories.get(id);
    if (repo) {
      this.repositories.set(id, { ...repo, status });
    }
  }

  async getRepositoryCommits(repositoryId: string): Promise<Commit[]> {
    return Array.from(this.commits.values())
      .filter(commit => commit.repositoryId === repositoryId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async createCommit(insertCommit: InsertCommit & { repositoryId: string }): Promise<Commit> {
    const id = randomUUID();
    const commit: Commit = { 
      ...insertCommit, 
      id,
      insertions: insertCommit.insertions ?? 0,
      deletions: insertCommit.deletions ?? 0
    };
    this.commits.set(id, commit);
    return commit;
  }

  async deleteRepositoryCommits(repositoryId: string): Promise<void> {
    for (const [id, commit] of Array.from(this.commits.entries())) {
      if (commit.repositoryId === repositoryId) {
        this.commits.delete(id);
      }
    }
  }
}

export const storage = new MemStorage();
