import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BarChart3 } from "lucide-react";
import { type Commit } from "@shared/schema";
import * as d3 from "d3";

interface MultiLaneTimelineProps {
  repositoryId: string | null;
  onEventSelect: (event: Commit | null) => void;
  selectedEvent: Commit | null;
}

const eventTypeConfig = {
  'major-feature': { 
    color: 'var(--major-feature)', 
    emoji: '🚀', 
    label: 'Major Features',
    className: 'features'
  },
  'minor-feature': { 
    color: 'var(--minor-feature)', 
    emoji: '✏️', 
    label: 'Minor Features',
    className: 'features'
  },
  'bug-fix': { 
    color: 'var(--bug-fix)', 
    emoji: '🐞', 
    label: 'Bug Fixes',
    className: 'bugs'
  },
  'refactor': { 
    color: 'var(--refactor)', 
    emoji: '🔧', 
    label: 'Refactoring',
    className: 'refactors'
  },
  'architecture': { 
    color: 'var(--architecture)', 
    emoji: '🏗', 
    label: 'Architecture',
    className: 'architecture'
  },
};

interface LaneData {
  type: string;
  label: string;
  emoji: string;
  className: string;
  commits: Commit[];
}

export default function MultiLaneTimeline({ repositoryId, onEventSelect, selectedEvent }: MultiLaneTimelineProps) {
  const [lanes, setLanes] = useState<LaneData[]>([]);

  const { data: commits, isLoading, isError } = useQuery<Commit[]>({
    queryKey: ["/api/repositories", repositoryId, "commits"],
    enabled: !!repositoryId,
    refetchInterval: (data) => {
      return data && data.length > 0 ? false : 2000;
    }
  });

  const { data: repository } = useQuery<{ status: string }>({
    queryKey: ["/api/repositories", repositoryId],
    enabled: !!repositoryId,
  });

  useEffect(() => {
    if (!commits || commits.length === 0) {
      setLanes([]);
      return;
    }

    // Group commits by type into lanes
    const laneMap = new Map<string, Commit[]>();
    
    commits.forEach(commit => {
      const config = eventTypeConfig[commit.type as keyof typeof eventTypeConfig];
      if (config) {
        const laneKey = config.className;
        if (!laneMap.has(laneKey)) {
          laneMap.set(laneKey, []);
        }
        laneMap.get(laneKey)!.push(commit);
      }
    });

    // Convert to lane data and sort commits by date
    const laneData: LaneData[] = [];
    
    // Define lane order
    const laneOrder = ['features', 'bugs', 'refactors', 'architecture'];
    const laneLabels = {
      'features': { label: 'Features', emoji: '🚀' },
      'bugs': { label: 'Bug Fixes', emoji: '🐞' },
      'refactors': { label: 'Refactoring', emoji: '🔧' },
      'architecture': { label: 'Architecture', emoji: '🏗' }
    };

    laneOrder.forEach(laneType => {
      const laneCommits = laneMap.get(laneType) || [];
      if (laneCommits.length > 0) {
        laneCommits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        laneData.push({
          type: laneType,
          label: laneLabels[laneType as keyof typeof laneLabels].label,
          emoji: laneLabels[laneType as keyof typeof laneLabels].emoji,
          className: laneType,
          commits: laneCommits
        });
      }
    });

    setLanes(laneData);

    // Auto-select the most recent commit if none selected
    if (!selectedEvent && commits.length > 0) {
      const mostRecent = commits.reduce((latest, commit) => 
        new Date(commit.date) > new Date(latest.date) ? commit : latest
      );
      onEventSelect(mostRecent);
    }
  }, [commits, selectedEvent, onEventSelect]);

  const handleEventClick = (commit: Commit) => {
    onEventSelect(commit);
  };

  const showTooltip = (event: React.MouseEvent, commit: Commit) => {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
      tooltip.innerHTML = `
        <strong>${commit.message}</strong><br>
        ${d3.timeFormat("%B %d, %Y")(new Date(commit.date))}<br>
        ${commit.author}
      `;
      tooltip.style.left = (event.pageX + 10) + 'px';
      tooltip.style.top = (event.pageY - 10) + 'px';
      tooltip.style.opacity = '1';
    }
  };

  const hideTooltip = () => {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
      tooltip.style.opacity = '0';
    }
  };

  if (!repositoryId) {
    return (
      <div className="bg-card border-b border-border p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">🌳 Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">
            Enter a GitHub repository URL in the sidebar to explore its evolution
          </p>
        </div>
        
        <div className="bg-background rounded-lg border border-border p-6 flex items-center justify-center h-64">
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
          <h2 className="text-lg font-semibold text-foreground mb-2">🌳 Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">Failed to load repository data</p>
        </div>
        
        <div className="bg-background rounded-lg border border-border p-6 flex items-center justify-center h-64">
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
          <h2 className="text-lg font-semibold text-foreground mb-2">🌳 Repository Timeline</h2>
          <p className="text-sm text-muted-foreground">
            {repository?.status === 'processing' 
              ? 'Analyzing repository history...' 
              : 'Loading repository timeline...'
            }
          </p>
        </div>
        
        <div className="bg-background rounded-lg border border-border p-6">
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

  return (
    <div className="bg-card border-b border-border p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">🌳 Repository Timeline - Multi-Lane View</h2>
        <p className="text-sm text-muted-foreground">
          Each lane shows a different type of change. Click on any event to see detailed information.
        </p>
      </div>
      
      <div className="lanes-container">
        {lanes.map((lane) => (
          <div key={lane.type} className={`lane ${lane.className}`}>
            <div className="lane-header">
              <div className="lane-title">
                <div className="lane-icon">{lane.emoji}</div>
                <span>{lane.label}</span>
              </div>
              <div className="lane-count">{lane.commits.length} commits</div>
            </div>
            
            <div className="lane-timeline">
              <div className="timeline-line"></div>
              <div className="timeline-events">
                {lane.commits.map((commit, index) => (
                  <div key={commit.id} className="relative">
                    <div
                      className={`timeline-event ${selectedEvent?.id === commit.id ? 'selected' : ''}`}
                      onClick={() => handleEventClick(commit)}
                      onMouseEnter={(e) => showTooltip(e, commit)}
                      onMouseLeave={hideTooltip}
                    />
                    <div className="timeline-event-date">
                      {d3.timeFormat("%b %Y")(new Date(commit.date))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {lanes.length === 0 && commits && commits.length > 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No categorized commits found. The repository may need reprocessing.</p>
        </div>
      )}
    </div>
  );
}