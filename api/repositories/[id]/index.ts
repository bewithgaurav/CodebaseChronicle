import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the storage from the analyze function
// Note: This is a limitation of serverless functions - shared state doesn't persist
// Each function invocation starts fresh, so we'll need to return basic info
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
    const { id } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ message: 'Invalid repository ID' });
    }

    // Since serverless functions don't share state, we'll return a completed status
    // The frontend will know to fetch commits immediately
    const repository = {
      id: id,
      url: 'https://github.com/repository/url', // This would be from storage in a real app
      name: 'repository',
      owner: 'owner',
      status: 'completed', // Always return completed so frontend fetches commits
      createdAt: new Date()
    };
    
    res.json(repository);
  } catch (error) {
    console.error('Get repository error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}