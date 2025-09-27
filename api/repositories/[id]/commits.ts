import type { VercelRequest, VercelResponse } from '@vercel/node';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

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

async function analyzeGitRepository(repoUrl: string): Promise<any[]> {
  let tempDir: string | null = null;
  
  try {
    tempDir = path.join('/tmp', randomUUID());
    await fs.mkdir(tempDir, { recursive: true });

    await execAsync(`git clone --depth 50 "${repoUrl}" "${tempDir}"`, {
      timeout: 30000,
    });

    const gitLogCmd = `cd "${tempDir}" && git log --pretty=format:'%H|%s|%an|%ae|%ai' --numstat --no-merges -n 20`;
    const { stdout } = await execAsync(gitLogCmd, {
      timeout: 15000,
    });

    const commits: GitLogEntry[] = [];
    const lines = stdout.split('\n');
    let currentCommit: Partial<GitLogEntry> = {};
    let files: Array<{ filename: string; insertions: number; deletions: number }> = [];

    for (const line of lines) {
      if (line.includes('|')) {
        if (currentCommit.hash) {
          commits.push({
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
      commits.push({
        ...currentCommit as GitLogEntry,
        files,
        insertions: files.reduce((sum, f) => sum + f.insertions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0)
      });
    }

    return commits.map((gitCommit, index) => {
      const commitType = categorizeCommit(gitCommit.message, gitCommit.files);
      
      return {
        id: `${index + 1}`,
        repositoryId: '',
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
    });

  } catch (error) {
    console.error('Repository analysis failed:', error);
    throw error;
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id, url } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid repository ID' });
    }

    // If URL is provided in query, analyze that repository
    if (url && typeof url === 'string') {
      try {
        const commits = await analyzeGitRepository(url);
        const commitsWithRepoId = commits.map(commit => ({
          ...commit,
          repositoryId: id
        }));
        return res.json(commitsWithRepoId);
      } catch (error) {
        console.error('Failed to analyze repository:', error);
        return res.status(500).json({ message: 'Failed to analyze repository', error: String(error) });
      }
    }

    // If no URL provided, return empty array (repository not analyzed yet)
    res.json([]);
    
  } catch (error) {
    console.error('Get commits error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}