import type { VercelRequest, VercelResponse } from '@vercel/node';

// Mock commit data
const mockCommits = [
  {
    id: '1',
    repositoryId: '',
    hash: 'abc123',
    message: 'Add new timeline component',
    author: 'John Doe',
    authorEmail: 'john@example.com',
    date: new Date('2023-01-01'),
    type: 'major-feature',
    filesChanged: [],
    insertions: 150,
    deletions: 20
  },
  {
    id: '2',
    repositoryId: '',
    hash: 'def456',
    message: 'Fix timeline rendering bug',
    author: 'Jane Smith',
    authorEmail: 'jane@example.com',
    date: new Date('2023-01-02'),
    type: 'bug-fix',
    filesChanged: [],
    insertions: 25,
    deletions: 10
  },
  {
    id: '3',
    repositoryId: '',
    hash: 'ghi789',
    message: 'Refactor component structure',
    author: 'Bob Johnson',
    authorEmail: 'bob@example.com',
    date: new Date('2023-01-03'),
    type: 'refactor',
    filesChanged: [],
    insertions: 75,
    deletions: 100
  }
];

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

    // Return mock commits
    const commits = mockCommits.map(commit => ({
      ...commit,
      repositoryId: id
    }));
    
    res.json(commits);
  } catch (error) {
    console.error('Get commits error:', error);
    res.status(500).json({ message: 'Internal server error', error: String(error) });
  }
}