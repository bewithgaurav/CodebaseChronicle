import { useQuery } from "@tanstack/react-query";
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { Loader2, BarChart3, GitCommit, Bug, Wrench, Building2, Rocket } from "lucide-react";
import { type Commit } from "@shared/schema";

interface TimelineProps {
  repositoryId: string | null;
  onEventSelect: (event: Commit | null) => void;
  selectedEvent: Commit | null;
}

const eventTypeConfig = {
  'major-feature': { 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    emoji: '🚀', 
    label: 'Major Feature',
    icon: Rocket
  },
  'minor-feature': { 
    color: '#06b6d4', 
    bgColor: '#cffafe',
    emoji: '✏️', 
    label: 'Minor Feature',
    icon: GitCommit
  },
  'bug-fix': { 
    color: '#ef4444', 
    bgColor: '#fee2e2',
    emoji: '🐞', 
    label: 'Bug Fix',
    icon: Bug
  },
  'refactor': { 
    color: '#f97316', 
    bgColor: '#fed7aa',
    emoji: '🔧', 
    label: 'Refactor',
    icon: Wrench
  },
  'architecture': { 
    color: '#8b5cf6', 
    bgColor: '#ede9fe',
    emoji: '🏗', 
    label: 'Architecture',
    icon: Building2
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

const getCommitDescription = (commit: Commit) => {
  const changes = [];
  if (commit.insertions && commit.insertions > 0) {
    changes.push(`+${commit.insertions} additions`);
  }
  if (commit.deletions && commit.deletions > 0) {
    changes.push(`-${commit.deletions} deletions`);
  }
  
  const changeText = changes.length > 0 ? ` (${changes.join(', ')})` : '';
  
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        <strong>Author:</strong> {commit.author}
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        <strong>Commit:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">{commit.hash.substring(0, 8)}</code>
      </p>
      {changeText && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <strong>Changes:</strong> {changeText}
        </p>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-300">
        <strong>Date:</strong> {formatDate(new Date(commit.date))}
      </p>
    </div>
  );
};

export default function Timeline({ repositoryId, onEventSelect, selectedEvent }: TimelineProps) {

  const { data: repository } = useQuery<{ status: string; url?: string; name?: string; owner?: string }>({
    queryKey: ["/api/repositories", repositoryId],
    enabled: !!repositoryId,
  });

  const { data: commits, isLoading, isError } = useQuery<Commit[]>({
    queryKey: ["/api/repositories", repositoryId, "commits", repository?.url],
    queryFn: async () => {
      if (!repositoryId) return [];
      
      // If we have repository URL, pass it to get real commits
      if (repository?.url) {
        const response = await fetch(`/api/repositories/${repositoryId}/commits?url=${encodeURIComponent(repository.url)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch commits');
        }
        return response.json();
      }
      
      // Otherwise fetch without URL (will return empty array)
      const response = await fetch(`/api/repositories/${repositoryId}/commits`);
      if (!response.ok) {
        throw new Error('Failed to fetch commits');
      }
      return response.json();
    },
    enabled: !!repositoryId && !!repository,
    refetchInterval: (query) => {
      // Keep polling if no data yet (repository is being processed)
      const data = query.state.data;
      return data && data.length > 0 ? false : 2000;
    }
  });

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

  if (isLoading || !commits || commits.length === 0) {
    return (
      <div className="bg-card border-b border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">
            {repository?.status === 'processing' 
              ? 'Analyzing repository history...' 
              : 'Click on any event to see detailed information about the changes'
            }
          </p>
        </div>
        
        <div className="timeline-container bg-background rounded-lg border border-border p-6">
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading repository timeline...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sort commits by date (most recent first)
  const sortedCommits = [...commits].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Auto-select the most recent commit
  if (!selectedEvent && sortedCommits.length > 0) {
    onEventSelect(sortedCommits[0]);
  }

  return (
    <div className="bg-card border-b border-border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Multi-lane timeline showing the evolution of your repository. Click on any commit to see detailed information.
        </p>
      </div>

      <div className="timeline-container bg-background rounded-lg border border-border p-6 max-h-[600px] overflow-y-auto">
        <VerticalTimeline
          lineColor="var(--border)"
        >
          {sortedCommits.map((commit, index) => {
            const config = eventTypeConfig[commit.type as keyof typeof eventTypeConfig] || eventTypeConfig['minor-feature'];
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
                }}
                contentArrowStyle={{
                  borderRight: `7px solid ${isSelected ? config.color : 'var(--border)'}`,
                }}
                date={formatDate(new Date(commit.date))}
                dateClassName="timeline-date"
                iconStyle={{
                  background: config.color,
                  color: '#fff',
                  border: `2px solid ${config.color}`,
                }}
                icon={<IconComponent size={20} />}
                onTimelineElementClick={() => onEventSelect(commit)}
              >
                <div className="timeline-content">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="vertical-timeline-element-title font-semibold text-base">
                      {config.emoji} {commit.message}
                    </h3>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: config.bgColor,
                            color: config.color
                          }}>
                      {config.label}
                    </span>
                  </div>
                  
                  <div className="vertical-timeline-element-subtitle mb-3">
                    {getCommitDescription(commit)}
                  </div>
                  
                  {isSelected && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
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
