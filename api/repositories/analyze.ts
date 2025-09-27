import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

// Simple in-memory storage for the session
interface Repository {
  id: string;
  url: string;
  name: string;
  owner: string;
  status: string;
  createdAt: Date;
}

interface Commit {
  id: string;
  repositoryId: string;
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  type: string;
  filesChanged: any;
  insertions: number | null;
  deletions: number | null;
}

// In-memory storage (will be reset on each function invocation)
const repositories = new Map<string, Repository>();
const commits = new Map<string, Commit[]>();

interface GitLogEntry {
  hash: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
  files: Array<{
    filename: string;
    insertions: number;
    deletions: number;
  }>;
  insertions: number;
  deletions: number;
}

function categorizeCommit(message: string, files: Array<{ filename: string }>): string {
  const msg = message.toLowerCase();
  const fileCount = files.length;
  const hasArchFiles = files.some(f => 
    f.filename.includes('docker') || 
    f.filename.includes('config') || 
    f.filename.includes('migration') ||
    f.filename.includes('setup') ||
    f.filename.includes('infra')
  );

  if (hasArchFiles || msg.includes('migrate') || msg.includes('architecture') || 
      msg.includes('infrastructure') || msg.includes('docker') || msg.includes('deploy') ||
      fileCount > 15) {
    return 'architecture';
  }

  if (msg.includes('feat') || msg.includes('feature') || msg.includes('add') || 
      msg.includes('implement') || msg.includes('launch') || msg.includes('release') ||
      msg.includes('new') || fileCount > 8) {
    return 'major-feature';
  }

  if (msg.includes('fix') || msg.includes('bug') || msg.includes('error') || 
      msg.includes('issue') || msg.includes('patch')) {
    return 'bug-fix';
  }

  if (msg.includes('refactor') || msg.includes('optimize') || msg.includes('improve') || 
      msg.includes('clean') || msg.includes('restructure') || msg.includes('update')) {
    return 'refactor';
  }

  return 'minor-feature';
}

async function analyzeGitRepository(repoUrl: string, repoId: string): Promise<void> {
  let tempDir: string | null = null;
  
  try {
    const repo = repositories.get(repoId);
    if (repo) {
      repo.status = 'processing';
      repositories.set(repoId, repo);
    }
    
    tempDir = path.join('/tmp', randomUUID());
    await fs.mkdir(tempDir, { recursive: true });

    await execAsync(`git clone --depth 50 "${repoUrl}" "${tempDir}"`, {
      timeout: 30000,
    });

    const gitLogCmd = `cd "${tempDir}" && git log --pretty=format:'%H|%s|%an|%ae|%ai' --numstat --no-merges -n 50`;
    const { stdout } = await execAsync(gitLogCmd, {
      timeout: 15000,
    });

    const gitCommits: GitLogEntry[] = [];
    const lines = stdout.split('\n');
    let currentCommit: Partial<GitLogEntry> = {};
    let files: Array<{ filename: string; insertions: number; deletions: number }> = [];

    for (const line of lines) {
      if (line.includes('|')) {
        if (currentCommit.hash) {
          gitCommits.push({
            ...currentCommit as GitLogEntry,
            files,
            insertions: files.reduce((sum, f) => sum + f.insertions, 0),
            deletions: files.reduce((sum, f) => sum + f.deletions, 0)
          });
        }

        const [hash, message, author, authorEmail, date] = line.split('|');
        currentCommit = { hash, message, author, authorEmail, date };
        files = [];
      } else if (line.trim() && !line.includes('|')) {
        const parts = line.trim().split('\t');
        if (parts.length === 3) {
          const [insertions, deletions, filename] = parts;
          files.push({
            filename,
            insertions: insertions === '-' ? 0 : parseInt(insertions, 10) || 0,
            deletions: deletions === '-' ? 0 : parseInt(deletions, 10) || 0
          });
        }
      }
    }

    if (currentCommit.hash) {
      gitCommits.push({
        ...currentCommit as GitLogEntry,
        files,
        insertions: files.reduce((sum, f) => sum + f.insertions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0)
      });
    }

    // Store commits
    const repoCommits: Commit[] = [];
    for (const gitCommit of gitCommits) {
      const commitType = categorizeCommit(gitCommit.message, gitCommit.files);
      
      const commit: Commit = {
        id: randomUUID(),
        repositoryId: repoId,
        hash: gitCommit.hash,
        message: gitCommit.message,
        author: gitCommit.author,
        authorEmail: gitCommit.authorEmail,
        date: new Date(gitCommit.date),
        type: commitType,
        filesChanged: gitCommit.files,
        insertions: gitCommit.insertions,
        deletions: gitCommit.deletions
      };
      
      repoCommits.push(commit);
    }
    
    commits.set(repoId, repoCommits);

    // Update status
    if (repo) {
      repo.status = 'completed';
      repositories.set(repoId, repo);
    }

  } catch (error) {
    console.error('Repository analysis failed:', error);
    const repo = repositories.get(repoId);
    if (repo) {
      repo.status = 'error';
      repositories.set(repoId, repo);
    }
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { url } = req.body;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    if (!url.startsWith('https://github.com/')) {
      return res.status(400).json({ message: 'Only GitHub repositories are supported' });
    }
    
    const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?(?:\.git)?$/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub URL format' });
    }

    const [, owner, name] = match;
    const cleanName = name.replace(/\.git$/, '');

    // Check if repository already exists
    let repository = Array.from(repositories.values()).find(repo => repo.url === url);
    
    if (!repository) {
      const id = randomUUID();
      repository = {
        id,
        url,
        name: cleanName,
        owner,
        status: 'pending',
        createdAt: new Date()
      };
      repositories.set(id, repository);
    }

    // Start analysis in background (don't await)
    analyzeGitRepository(url, repository.id).catch(console.error);

    res.json(repository);
  } catch (error) {
    console.error('Repository analyze error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}

// Export the storage maps for other functions to access
export { repositories, commits };