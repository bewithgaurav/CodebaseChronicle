import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as d3 from "d3";
import { Loader2, BarChart3 } from "lucide-react";
import { type Commit } from "@shared/schema";

interface TimelineProps {
  repositoryId: string | null;
  onEventSelect: (event: Commit | null) => void;
  selectedEvent: Commit | null;
}

const eventTypeConfig = {
  'major-feature': { color: 'var(--major-feature)', emoji: '🚀', label: 'Major Feature' },
  'minor-feature': { color: 'var(--minor-feature)', emoji: '✏️', label: 'Minor Feature' },
  'bug-fix': { color: 'var(--bug-fix)', emoji: '🐞', label: 'Bug Fix' },
  'refactor': { color: 'var(--refactor)', emoji: '🔧', label: 'Refactor' },
  'architecture': { color: 'var(--architecture)', emoji: '🏗', label: 'Architecture' },
};

export default function Timeline({ repositoryId, onEventSelect, selectedEvent }: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: commits, isLoading, isError } = useQuery<Commit[]>({
    queryKey: ["/api/repositories", repositoryId, "commits"],
    enabled: !!repositoryId,
    refetchInterval: (data) => {
      // Keep polling if no data yet (repository is being processed)
      return data && data.length > 0 ? false : 2000;
    }
  });

  const { data: repository } = useQuery<{ status: string }>({
    queryKey: ["/api/repositories", repositoryId],
    enabled: !!repositoryId,
  });

  useEffect(() => {
    if (!commits || commits.length === 0 || !svgRef.current || !containerRef.current) {
      return;
    }

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    // Set up dimensions
    const container = containerRef.current;
    const margin = { top: 50, right: 50, bottom: 50, left: 50 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.attr("width", width + margin.left + margin.right)
       .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const dateExtent = d3.extent(commits, d => new Date(d.date)) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(dateExtent)
      .range([0, width]);

    // Add timeline line
    g.append("line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", height / 2)
      .attr("y2", height / 2)
      .attr("stroke", "var(--border)")
      .attr("stroke-width", 2);

    // Add events
    const events = g.selectAll(".event")
      .data(commits)
      .enter()
      .append("g")
      .attr("class", "event")
      .attr("transform", d => `translate(${xScale(new Date(d.date))}, ${height / 2})`);

    // Add event circles
    events.append("circle")
      .attr("class", "timeline-dot")
      .attr("r", d => selectedEvent?.id === d.id ? 10 : 8)
      .attr("fill", d => eventTypeConfig[d.type as keyof typeof eventTypeConfig]?.color || "var(--muted)")
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        showTooltip(event, d);
      })
      .on("mouseout", hideTooltip)
      .on("click", function(event, d) {
        onEventSelect(d);
        
        // Update circle sizes
        events.selectAll("circle")
          .attr("r", (circle_d: any) => selectedEvent?.id === (circle_d as Commit).id ? 10 : 8);
      });

    // Add date labels
    events.append("text")
      .attr("y", -20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "var(--muted-foreground)")
      .text(d => d3.timeFormat("%b %Y")(new Date(d.date)));

    // Auto-select the most recent commit
    if (!selectedEvent && commits.length > 0) {
      const mostRecent = commits[commits.length - 1];
      onEventSelect(mostRecent);
    }

  }, [commits, selectedEvent, onEventSelect]);

  const showTooltip = (event: any, data: Commit) => {
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
      const config = eventTypeConfig[data.type as keyof typeof eventTypeConfig];
      tooltip.innerHTML = `
        <strong>${data.message}</strong><br>
        ${d3.timeFormat("%B %d, %Y")(new Date(data.date))}<br>
        ${data.author}
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
        
        <div className="timeline-container bg-background rounded-lg border border-border p-6" ref={containerRef}>
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
        <h2 className="text-lg font-semibold text-foreground mb-2">Repository Timeline</h2>
        <p className="text-sm text-muted-foreground">
          Click on any event to see detailed information about the changes
        </p>
      </div>
      
      <div className="timeline-container bg-background rounded-lg border border-border p-6" ref={containerRef}>
        <svg ref={svgRef} data-testid="timeline-svg"></svg>
      </div>

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
