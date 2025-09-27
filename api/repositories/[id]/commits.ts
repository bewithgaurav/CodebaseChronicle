import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid repository ID' });
    }

    const commits = await storage.getRepositoryCommits(id);
    res.json(commits);
  } catch (error) {
    console.error('Get commits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}