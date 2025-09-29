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
    const { id, url } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Repository ID is required' });
    }

    // If URL is provided, parse it to get repository info
    if (url && typeof url === 'string') {
      const repositoryUrl = decodeURIComponent(url);
      const match = repositoryUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?(?:\.git)?$/);
      
      if (match) {
        const [, owner, name] = match;
        const cleanName = name.replace(/\.git$/, '');
        
        const response = {
          id,
          name: cleanName,
          owner,
          url: repositoryUrl,
          status: 'completed',
          createdAt: new Date().toISOString()
        };

        return res.json(response);
      }
    }

    // Fallback - return basic info (this shouldn't happen in production)
    const repository = {
      id,
      name: 'Unknown Repository',
      owner: 'Unknown Owner',
      url: '',
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