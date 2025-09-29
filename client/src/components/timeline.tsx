import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { Loader2, BarChart3, GitCommit, Bug, Wrench, Building2, Rocket, FileText, Settings, TestTube } from "lucide-react";

interface Author {
  name: string;
  email: string;
  avatar: string;
  username: string;
}

interface CommitStats {
  additions: number;
  deletions: number;
  total: number;
}

interface CommitFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface Commit {
  id: string;
  hash: string;
  message: string;
  author: Author;
  date: string;
  url: string;
  type: 'feature' | 'bugfix' | 'docs' | 'refactor' | 'test' | 'config' | 'initial';
  category: string;
  importance: 'high' | 'medium' | 'low';
  tags: string[];
  stats: CommitStats;
  files?: CommitFile[];
}

interface RepositoryData {
  repository: {
    id: string;
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    createdAt: string;
  };
  commits: Commit[];
  insights: any;
  onboarding: any;
}

interface TimelineProps {
  repositoryId: string | null;
  repositoryUrl: string | null;
  onEventSelect: (event: Commit | null, data?: RepositoryData) => void;
  selectedEvent: Commit | null;
}

const eventTypeConfig = {
  'initial': { 
    color: '#10b981', 
    bgColor: '#d1fae5',
    emoji: '🎯', 
    label: 'Initial Commit',
    icon: Rocket
  },
  'feature': { 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    emoji: '✨', 
    label: 'New Feature',
    icon: Rocket
  },
  'bugfix': { 
    color: '#ef4444', 
    bgColor: '#fee2e2',
    emoji: '�', 
    label: 'Bug Fix',
    icon: Bug
  },
  'docs': { 
    color: '#06b6d4', 
    bgColor: '#cffafe',
    emoji: '📝', 
    label: 'Documentation',
    icon: FileText
  },
  'refactor': { 
    color: '#f97316', 
    bgColor: '#fed7aa',
    emoji: '♻️', 
    label: 'Refactor',
    icon: Wrench
  },
  'test': { 
    color: '#8b5cf6', 
    bgColor: '#ede9fe',
    emoji: '🧪', 
    label: 'Tests',
    icon: TestTube
  },
  'config': { 
    color: '#6b7280', 
    bgColor: '#f3f4f6',
    emoji: '⚙️', 
    label: 'Configuration',
    icon: Settings
  },
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const getCommitTitle = (message: string) => {
  return message.split('\n')[0];
};

const getCommitDescription = (commit: Commit) => {
  return (
    <div className="space-y-1">
      <p className="text-xs text-gray-600 dark:text-gray-300">
        <strong>Author:</strong> {commit.author.name}
      </p>
      <div className="flex flex-wrap gap-1 mt-1">
        {commit.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function Timeline({ repositoryId, repositoryUrl, onEventSelect, selectedEvent }: TimelineProps) {
  const { data: repositoryData, isLoading, isError } = useQuery<RepositoryData>({
    queryKey: ["/api/repositories", repositoryId, "commits", repositoryUrl],
    queryFn: async () => {
      if (!repositoryId || !repositoryUrl) throw new Error('Repository ID and URL are required');
      
      // Build the URL with repository URL as query parameter
      const url = `/api/repositories/${repositoryId}/commits?url=${encodeURIComponent(repositoryUrl)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch commits');
      }
      const data = await response.json();
      
      // Debug: Log the first few commits to see their structure
      if (data.commits && data.commits.length > 0) {
        console.log('API Response - First commit structure:', data.commits[0]);
        console.log('API Response - First commit has files:', !!data.commits[0].files);
        console.log('API Response - First commit files length:', data.commits[0].files?.length || 'undefined');
      }
      
      return data;
    },
    enabled: !!repositoryId && !!repositoryUrl,
    refetchInterval: false
  });

  // Auto-selection disabled - let user manually select commits
  // useEffect(() => {
  //   if (repositoryData && repositoryData.commits && repositoryData.commits.length > 0 && !selectedEvent) {
  //     const sortedCommits = [...repositoryData.commits].sort((a, b) => 
  //       new Date(b.date).getTime() - new Date(a.date).getTime()
  //     );
  //     onEventSelect(sortedCommits[0], repositoryData);
  //   }
  // }, [repositoryData, selectedEvent, onEventSelect]);

  if (!repositoryId) {
    return (
      <div className="bg-card border-b border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Enter a GitHub repository URL in the sidebar to get started
          </p>
        </div>
        
        <div className="timeline-container bg-background rounded-lg border border-border p-6 flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No repository selected</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-card border-b border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">Failed to load repository data</p>
        </div>
        
        <div className="timeline-container bg-background rounded-lg border border-border p-6 flex items-center justify-center h-64">
          <div className="text-center text-destructive">
            <p className="text-sm">Failed to load timeline data</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || !repositoryData || !repositoryData.commits || repositoryData.commits.length === 0) {
    return (
      <div className="bg-card border-b border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Loading repository timeline and generating onboarding insights...
          </p>
        </div>
        
        <div className="timeline-container bg-background rounded-lg border border-border p-6">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Analyzing repository history...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const commits = repositoryData.commits;

  // Sort commits by date (most recent first)
  const sortedCommits = [...commits].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-card border-b border-border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {repositoryData.repository.name} Timeline
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          {repositoryData.repository.description || 'Repository timeline showing commit history and development insights'}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>⭐ {repositoryData.repository.stars} stars</span>
          <span>🍴 {repositoryData.repository.forks} forks</span>
          <span>💾 {repositoryData.repository.language}</span>
          <span>📅 {commits.length} commits analyzed</span>
        </div>
      </div>

      <div className="timeline-container bg-background rounded-lg border border-border p-6">
        <VerticalTimeline
          lineColor="var(--border)"
        >
          {sortedCommits.map((commit, index) => {
            const config = eventTypeConfig[commit.type] || eventTypeConfig['feature'];
            const IconComponent = config.icon;
            const isSelected = selectedEvent?.id === commit.id;
            
            return (
              <VerticalTimelineElement
                key={commit.id}
                className={`vertical-timeline-element--work ${isSelected ? 'selected-timeline-element' : ''}`}
                contentStyle={{
                  background: isSelected ? config.bgColor : 'var(--card)',
                  color: 'var(--foreground)',
                  border: isSelected ? `2px solid ${config.color}` : '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: isSelected 
                    ? `0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 2px ${config.color}20`
                    : '0 2px 8px rgba(0, 0, 0, 0.05)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  padding: '12px 16px'
                }}
                contentArrowStyle={{
                  borderRight: `7px solid ${isSelected ? config.color : 'var(--border)'}`,
                }}
                iconStyle={{
                  background: config.color,
                  color: '#fff',
                  border: `2px solid ${config.color}`,
                  width: '32px',
                  height: '32px',
                  marginLeft: '-16px'
                }}
                icon={<IconComponent size={16} />}
                onTimelineElementClick={() => {
                  // Toggle selection: if already selected, unselect it
                  if (selectedEvent?.id === commit.id) {
                    onEventSelect(null);
                  } else {
                    onEventSelect(commit, repositoryData);
                  }
                }}
              >
                <div className="timeline-content">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="vertical-timeline-element-title font-medium text-sm">
                      {config.emoji} {getCommitTitle(commit.message)}
                    </h3>
                    <div className="flex flex-col gap-1 items-end">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: config.bgColor,
                              color: config.color
                            }}>
                        {config.label}
                      </span>
                      {commit.importance === 'high' && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          High Impact
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="vertical-timeline-element-subtitle">
                    {getCommitDescription(commit)}
                  </div>
                  
                  {isSelected && (
                    <div className="mt-2 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        ✨ Selected - View details in the panel below
                      </p>
                    </div>
                  )}
                </div>
              </VerticalTimelineElement>
            );
          })}
        </VerticalTimeline>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-4 text-sm">
        {Object.entries(eventTypeConfig).map(([type, config]) => (
          <div key={type} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: config.color }}
            ></div>
            <span className="text-foreground font-medium">
              {config.emoji} {config.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
