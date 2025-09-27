import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory storage for testing
interface Repository {
  id: string;
  url: string;
  name: string;
  owner: string;
  status: string;
  createdAt: Date;
}

// Mock storage - this will be reset on each function invocation
const mockRepositories = new Map<string, Repository>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
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
    let repository = Array.from(mockRepositories.values()).find(repo => repo.url === url);
    
    if (!repository) {
      const id = generateId();
      repository = {
        id,
        url,
        name: cleanName,
        owner,
        status: 'pending',
        createdAt: new Date()
      };
      mockRepositories.set(id, repository);
    }

    res.json(repository);
  } catch (error) {
    console.error('Repository analyze error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}