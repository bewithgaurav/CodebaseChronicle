import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

interface GitHubCommitDetail {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  author?: {
    login: string;
    avatar_url: string;
  };
  html_url: string;
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

interface Repository {
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  created_at: string;
  description: string;
  language: string;
  stargazers_count: number;
  forks_count: number;
}

// Helper function to categorize commit types for developer onboarding
function categorizeCommit(message: string, files: any[] = []): {
  type: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'config' | 'initial';
  category: string;
  importance: 'high' | 'medium' | 'low';
  tags: string[];
} {
  const lowerMessage = message.toLowerCase();
  const fileNames = files.map(f => f.filename?.toLowerCase() || '').join(' ');
  const tags: string[] = [];

  // Initial commit detection
  if (lowerMessage.includes('initial commit') || lowerMessage.includes('first commit')) {
    return { type: 'initial', category: 'Project Setup', importance: 'high', tags: ['setup'] };
  }

  // Feature detection
  if (lowerMessage.includes('feat') || lowerMessage.includes('feature') || lowerMessage.includes('add')) {
    tags.push('feature');
    if (fileNames.includes('api') || fileNames.includes('endpoint')) tags.push('api');
    if (fileNames.includes('ui') || fileNames.includes('component')) tags.push('ui');
    return { type: 'feature', category: 'New Feature', importance: 'high', tags };
  }

  // Bug fix detection
  if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('patch')) {
    tags.push('bugfix');
    return { type: 'bugfix', category: 'Bug Fix', importance: 'medium', tags };
  }

  // Documentation
  if (lowerMessage.includes('doc') || lowerMessage.includes('readme') || fileNames.includes('readme') || fileNames.includes('.md')) {
    tags.push('documentation');
    return { type: 'docs', category: 'Documentation', importance: 'low', tags };
  }

  // Configuration
  if (lowerMessage.includes('config') || fileNames.includes('package.json') || fileNames.includes('config')) {
    tags.push('configuration');
    return { type: 'config', category: 'Configuration', importance: 'medium', tags };
  }

  // Tests
  if (lowerMessage.includes('test') || fileNames.includes('test') || fileNames.includes('spec')) {
    tags.push('testing');
    return { type: 'test', category: 'Testing', importance: 'medium', tags };
  }

  // Refactoring
  if (lowerMessage.includes('refactor') || lowerMessage.includes('cleanup') || lowerMessage.includes('improve')) {
    tags.push('refactoring');
    return { type: 'refactor', category: 'Code Improvement', importance: 'medium', tags };
  }

  // Default to feature for uncategorized commits
  return { type: 'feature', category: 'Code Change', importance: 'low', tags: ['general'] };
}

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

    // Get repository URL from query param - it's required
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'Repository URL is required as query parameter' });
    }
    
    let repositoryUrl = decodeURIComponent(url);
    
    // Validate and parse GitHub URL
    const match = repositoryUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?(?:\.git)?$/);
    if (!match) {
      return res.status(400).json({ message: 'Invalid GitHub URL format' });
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    console.log(`Fetching commits for ${owner}/${cleanRepo}`);

    // Fetch repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`);
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status} - ${repoResponse.statusText}`);
    }
    const repoData: Repository = await repoResponse.json();

    // Fetch commits with basic info first
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=15`
    );
    if (!commitsResponse.ok) {
      throw new Error(`GitHub API error: ${commitsResponse.status} - ${commitsResponse.statusText}`);
    }
    const commitsData: GitHubCommit[] = await commitsResponse.json();

    // Fetch detailed commit info with file changes for ALL commits
    // but limit the total to avoid hitting rate limits
    const detailedCommits = [];
    for (let i = 0; i < commitsData.length; i++) {
      const commit = commitsData[i];
      try {
        const detailUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits/${commit.sha}`;
        console.log(`Fetching details for commit ${commit.sha.substring(0, 7)} from:`, detailUrl);
        
        const detailResponse = await fetch(detailUrl);
        console.log(`Response status for ${commit.sha.substring(0, 7)}:`, detailResponse.status);
        
        if (detailResponse.ok) {
          const detail: GitHubCommitDetail = await detailResponse.json();
          console.log(`SUCCESS - Got ${detail.files?.length || 0} files for commit ${commit.sha.substring(0, 7)}`);
          console.log(`SUCCESS - Stats for commit ${commit.sha.substring(0, 7)}:`, detail.stats);
          console.log(`SUCCESS - Has files array:`, Array.isArray(detail.files));
          console.log(`SUCCESS - First file:`, detail.files?.[0]?.filename || 'No files');
          
          detailedCommits.push({ ...commit, stats: detail.stats, files: detail.files });
        } else {
          console.warn(`FAILED - Response ${detailResponse.status} for commit ${commit.sha.substring(0, 7)}`);
          const errorText = await detailResponse.text();
          console.warn(`FAILED - Error:`, errorText);
          detailedCommits.push(commit);
        }
      } catch (error) {
        console.error(`EXCEPTION - Failed to fetch details for commit ${commit.sha.substring(0, 7)}:`, error);
        detailedCommits.push(commit);
      }
    }

    // Use all detailed commits
    const allCommits = detailedCommits;

    // Transform commits for our timeline with onboarding insights
    const commits = allCommits.map((commit, index) => {
      const analysis = categorizeCommit(commit.commit.message, commit.files || []);
      
      const transformedCommit = {
        id: commit.sha,
        hash: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: {
          name: commit.commit.author.name,
          email: commit.commit.author.email,
          avatar: commit.author?.avatar_url || `https://github.com/${commit.author?.login}.png`,
          username: commit.author?.login || commit.commit.author.name
        },
        date: commit.commit.author.date,
        url: commit.html_url,
        type: analysis.type,
        category: analysis.category,
        importance: analysis.importance,
        tags: analysis.tags,
        stats: commit.stats || { additions: 0, deletions: 0, total: 0 },
        files: commit.files || []
      };
      
      if (index < 5) {
        console.log(`Commit ${transformedCommit.hash} has ${transformedCommit.files.length} files`);
        console.log(`Commit ${transformedCommit.hash} files:`, transformedCommit.files.map(f => ({ 
          filename: f.filename, 
          additions: f.additions, 
          deletions: f.deletions,
          hasPatch: !!f.patch 
        })));
      }
      
      return transformedCommit;
    });

    // Generate onboarding insights
    const insights = {
      timeline: {
        totalCommits: commits.length,
        firstCommit: commits[commits.length - 1]?.date,
        lastCommit: commits[0]?.date,
        activeContributors: Array.from(new Set(commits.map(c => c.author.username))).length
      },
      categories: commits.reduce((acc, commit) => {
        acc[commit.type] = (acc[commit.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      contributors: commits.reduce((acc, commit) => {
        const username = commit.author.username;
        if (!acc[username]) {
          acc[username] = {
            name: commit.author.name,
            username,
            avatar: commit.author.avatar,
            commits: 0,
            expertise: []
          };
        }
        acc[username].commits++;
        acc[username].expertise = Array.from(new Set([...acc[username].expertise, ...commit.tags]));
        return acc;
      }, {} as Record<string, any>),
      hotSpots: {
        mostActive: commits
          .reduce((acc, commit) => {
            commit.tags.forEach(tag => {
              acc[tag] = (acc[tag] || 0) + 1;
            });
            return acc;
          }, {} as Record<string, number>),
        recentTrends: commits
          .slice(0, 10)
          .map(c => ({ type: c.type, date: c.date, message: c.message }))
      }
    };

    // Onboarding recommendations
    const onboardingTips = {
      projectStory: `This project started ${new Date(repoData.created_at).toLocaleDateString()} and has evolved through ${commits.length} commits by ${insights.timeline.activeContributors} contributors.`,
      expertContacts: Object.values(insights.contributors)
        .sort((a: any, b: any) => b.commits - a.commits)
        .slice(0, 3)
        .map((contributor: any) => ({
          username: contributor.username,
          expertise: contributor.expertise.slice(0, 3),
          commits: contributor.commits
        })),
      focusAreas: Object.entries(insights.categories)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count, percentage: Math.round((count / commits.length) * 100) }))
    };

    res.json({
      repository: {
        id,
        name: repoData.name,
        fullName: repoData.full_name,
        description: repoData.description,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        createdAt: repoData.created_at
      },
      commits,
      insights,
      onboarding: onboardingTips
    });
  } catch (error) {
    console.error('Commits fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch commits', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}