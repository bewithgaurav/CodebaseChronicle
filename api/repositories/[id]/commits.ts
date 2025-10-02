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
    const { id, url, page } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'Repository ID is required' });
    }

    // Get repository URL from query param - it's required
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ message: 'Repository URL is required as query parameter' });
    }
    
    // Get page number for pagination (default to 1)
    const pageNumber = page && typeof page === 'string' ? parseInt(page, 10) : 1;
    
    // Get GitHub token from environment (optional, but recommended to avoid rate limits)
    const githubToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
    console.log('GitHub token available:', !!githubToken, githubToken ? `(${githubToken.substring(0, 10)}...)` : 'NO TOKEN');
    
    const headers: HeadersInit = githubToken 
      ? { 
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      : {
          'Accept': 'application/vnd.github.v3+json'
        };
    
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
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
    
    // Log rate limit info
    console.log('Rate limit remaining:', repoResponse.headers.get('x-ratelimit-remaining'));
    console.log('Rate limit reset:', repoResponse.headers.get('x-ratelimit-reset'));
    
    if (!repoResponse.ok) {
      const errorData = await repoResponse.json().catch(() => ({}));
      console.error('GitHub API error:', repoResponse.status, errorData);
      
      // Check for enterprise/organization token restrictions
      if (repoResponse.status === 403 && errorData.message?.includes('fine-grained personal access token')) {
        return res.status(403).json({ 
          message: 'GitHub token type not allowed for this repository', 
          error: 'token_type_restricted',
          rateLimitInfo: 'This repository requires a Classic Personal Access Token, not a fine-grained token. Please create a Classic token at: https://github.com/settings/tokens'
        });
      }
      
      if (repoResponse.status === 403 && errorData.message?.includes('rate limit')) {
        return res.status(403).json({ 
          message: 'GitHub API rate limit exceeded', 
          error: 'rate_limit_exceeded',
          rateLimitInfo: 'You\'ve hit GitHub\'s API rate limit (60 requests/hour). Please add a GitHub Personal Access Token to increase the limit to 5000 requests/hour.'
        });
      }
      throw new Error(`GitHub API error: ${repoResponse.status} - ${repoResponse.statusText}`);
    }
    const repoData: Repository = await repoResponse.json();

    // Fetch commits with basic info first (30 per page for better UX)
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=30&page=${pageNumber}`,
      { headers }
    );
    if (!commitsResponse.ok) {
      const errorData = await commitsResponse.json().catch(() => ({}));
      
      // Check for enterprise/organization token restrictions
      if (commitsResponse.status === 403 && errorData.message?.includes('fine-grained personal access token')) {
        return res.status(403).json({ 
          message: 'GitHub token type not allowed for this repository', 
          error: 'token_type_restricted',
          rateLimitInfo: 'This repository requires a Classic Personal Access Token, not a fine-grained token. Please create a Classic token at: https://github.com/settings/tokens'
        });
      }
      
      if (commitsResponse.status === 403 && errorData.message?.includes('rate limit')) {
        return res.status(403).json({ 
          message: 'GitHub API rate limit exceeded', 
          error: 'rate_limit_exceeded',
          rateLimitInfo: 'You\'ve hit GitHub\'s API rate limit (60 requests/hour). Please add a GitHub Personal Access Token to increase the limit to 5000 requests/hour.'
        });
      }
      throw new Error(`GitHub API error: ${commitsResponse.status} - ${commitsResponse.statusText}`);
    }
    const commitsData: GitHubCommit[] = await commitsResponse.json();

    // Fetch detailed commit info with file changes in PARALLEL for speed
    // Fetch only first 10 commits with full details to speed up initial load
    const detailPromises = commitsData.slice(0, 10).map(async (commit) => {
      try {
        const detailUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits/${commit.sha}`;
        const detailResponse = await fetch(detailUrl, { headers });
        
        if (detailResponse.ok) {
          const detail: GitHubCommitDetail = await detailResponse.json();
          return { ...commit, stats: detail.stats, files: detail.files };
        } else {
          return commit;
        }
      } catch (error) {
        console.error(`Failed to fetch details for commit ${commit.sha.substring(0, 7)}:`, error);
        return commit;
      }
    });

    // Wait for all parallel requests to complete
    const detailedCommits = await Promise.all(detailPromises);
    
    // For remaining commits, use basic info (no file details)
    const remainingCommits = commitsData.slice(10);
    
    // Combine detailed and basic commits
    const allCommits = [...detailedCommits, ...remainingCommits];

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
      onboarding: onboardingTips,
      pagination: {
        page: pageNumber,
        perPage: 30,
        hasMore: commits.length === 30 // If we got full page, there might be more
      }
    });
  } catch (error) {
    console.error('Commits fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a rate limit error
    if (errorMessage.includes('rate limit') || errorMessage.includes('403')) {
      return res.status(403).json({ 
        message: 'GitHub API rate limit exceeded', 
        error: 'rate_limit_exceeded',
        rateLimitInfo: 'You\'ve hit GitHub\'s API rate limit. To fix this, add a GITHUB_TOKEN environment variable with a GitHub Personal Access Token.',
        details: errorMessage
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to fetch commits', 
      error: errorMessage
    });
  }
}