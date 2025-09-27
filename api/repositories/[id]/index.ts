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
    
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid repository ID' });
    }

    // Mock repository data
    const repository = {
      id: id,
      url: 'https://github.com/facebook/react',
      name: 'react',
      owner: 'facebook',
      status: 'completed',
      createdAt: new Date()
    };
    
    res.json(repository);
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}