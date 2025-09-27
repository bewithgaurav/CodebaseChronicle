import express from 'express';
import { storage } from '../server/storage';
import { analyzeRepositorySchema } from '../shared/schema';
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

  // Architecture changes
  if (hasArchFiles || msg.includes('migrate') || msg.includes('architecture') || 
      msg.includes('infrastructure') || msg.includes('docker') || msg.includes('deploy') ||
      fileCount > 15) {
    return 'architecture';
  }

  // Major features
  if (msg.includes('feat') || msg.includes('feature') || msg.includes('add') || 
      msg.includes('implement') || msg.includes('launch') || msg.includes('release') ||
      msg.includes('new') || fileCount > 8) {
    return 'major-feature';
  }

  // Bug fixes
  if (msg.includes('fix') || msg.includes('bug') || msg.includes('error') || 
      msg.includes('issue') || msg.includes('patch')) {
    return 'bug-fix';
  }

  // Refactor
  if (msg.includes('refactor') || msg.includes('optimize') || msg.includes('improve') || 
      msg.includes('clean') || msg.includes('restructure') || msg.includes('update')) {
    return 'refactor';
  }

  // Default to minor feature
  return 'minor-feature';
}

async function analyzeGitRepository(repoUrl: string, repoId: string): Promise<void> {
  let tempDir: string | null = null;
  
  try {
    await storage.updateRepositoryStatus(repoId, 'processing');
    
    // Create temporary directory
    tempDir = path.join('/tmp', randomUUID());
    await fs.mkdir(tempDir, { recursive: true });

    // Clone repository with timeout
    await execAsync(`git clone --depth 50 "${repoUrl}" "${tempDir}"`, {
      timeout: 30000, // 30 second timeout
    });

    // Get git log with file statistics
    const gitLogCmd = `cd "${tempDir}" && git log --pretty=format:'%H|%s|%an|%ae|%ai' --numstat --no-merges -n 100`;
    const { stdout } = await execAsync(gitLogCmd, {
      timeout: 15000, // 15 second timeout
    });

      // Parse git log output
      const commits: GitLogEntry[] = [];
      const lines = stdout.split('\n');
      let currentCommit: Partial<GitLogEntry> = {};
      let files: Array<{ filename: string; insertions: number; deletions: number }> = [];

      for (const line of lines) {
        if (line.includes('|')) {
          // If we have a current commit, save it
          if (currentCommit.hash) {
            commits.push({
              ...currentCommit as GitLogEntry,
              files,
              insertions: files.reduce((sum, f) => sum + f.insertions, 0),
              deletions: files.reduce((sum, f) => sum + f.deletions, 0)
            });
          }

          // Start new commit
          const [hash, message, author, authorEmail, date] = line.split('|');
          currentCommit = { hash, message, author, authorEmail, date };
          files = [];
        } else if (line.trim() && !line.includes('|')) {
          // Parse file stats
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

      // Add the last commit
      if (currentCommit.hash) {
        commits.push({
          ...currentCommit as GitLogEntry,
          files,
          insertions: files.reduce((sum, f) => sum + f.insertions, 0),
          deletions: files.reduce((sum, f) => sum + f.deletions, 0)
        });
      }

      // Clear existing commits
      await storage.deleteRepositoryCommits(repoId);

      // Save commits to storage
      for (const gitCommit of commits) {
        const commitType = categorizeCommit(gitCommit.message, gitCommit.files);
        
        await storage.createCommit({
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
        });
      }

      await storage.updateRepositoryStatus(repoId, 'completed');

  } catch (error) {
    console.error('Repository analysis failed:', error);
    await storage.updateRepositoryStatus(repoId, 'error');
  } finally {
    // Clean up temporary directory
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// API Routes
app.post('/api/repositories/analyze', async (req, res) => {
  try {
    const { url } = analyzeRepositorySchema.parse(req.body);
    
    // Additional security validation - ensure it's a GitHub URL
    if (!url.startsWith('https://github.com/')) {
      return res.status(400).json({ message: 'Only GitHub repositories are supported' });
    }
    
    // Extract owner and repo name from URL
    const match = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?(?:\.git)?$/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub URL format' });
    }

    const [, owner, name] = match;
    const cleanName = name.replace(/\.git$/, '');

    // Check if repository already exists
    let repository = await storage.getRepositoryByUrl(url);
    
    if (!repository) {
      // Create new repository entry
      repository = await storage.createRepository({
        url,
        name: cleanName,
        owner
      });
    }

    // Start analysis in background
    analyzeGitRepository(url, repository.id);

    res.json(repository);
  } catch (error) {
    console.error('Repository analyze error:', error);
    res.status(400).json({ message: 'Invalid request data' });
  }
});

app.get('/api/repositories/:id', async (req, res) => {
  try {
    const repository = await storage.getRepository(req.params.id);
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }
    res.json(repository);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/repositories/:id/commits', async (req, res) => {
  try {
    const commits = await storage.getRepositoryCommits(req.params.id);
    res.json(commits);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/repositories/:id/status', async (req, res) => {
  try {
    const repository = await storage.getRepository(req.params.id);
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }
    res.json({ status: repository.status });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default app;