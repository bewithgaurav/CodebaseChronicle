import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
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
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Repository ID is required' });
    }

    // For now, return a basic repository structure
    // In a real app, you'd retrieve this from your database
    const repository = {
      id,
      name: 'react',
      owner: 'facebook',
      url: 'https://github.com/facebook/react',
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    res.json(repository);
  } catch (error) {
    console.error('Repository fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch repository', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}