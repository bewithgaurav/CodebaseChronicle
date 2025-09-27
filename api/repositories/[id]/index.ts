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

    const repository = await storage.getRepository(id);
    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' });
    }
    
    res.json(repository);
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}