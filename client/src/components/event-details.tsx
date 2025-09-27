import { Info, ExternalLink, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Commit } from "@shared/schema";
import * as d3 from "d3";

interface EventDetailsProps {
  selectedEvent: Commit | null;
  repositoryOwner?: string;
  repositoryName?: string;
}

const eventTypeConfig = {
  'major-feature': { color: 'var(--major-feature)', emoji: '🚀', label: 'Major Feature' },
  'minor-feature': { color: 'var(--minor-feature)', emoji: '✏️', label: 'Minor Feature' },
  'bug-fix': { color: 'var(--bug-fix)', emoji: '🐞', label: 'Bug Fix' },
  'refactor': { color: 'var(--refactor)', emoji: '🔧', label: 'Refactor' },
  'architecture': { color: 'var(--architecture)', emoji: '🏗', label: 'Architecture' },
};

export default function EventDetails({ selectedEvent, repositoryOwner, repositoryName }: EventDetailsProps) {
  if (!selectedEvent) {
    return (
      <div className="h-full p-6">
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">📋 Commit Details</h3>
            <p className="text-sm">
              Click on any event in the timeline to see commit information, files changed, and links to GitHub
            </p>
          </div>
        </div>
      </div>
    );
  }

  const config = eventTypeConfig[selectedEvent.type as keyof typeof eventTypeConfig];
  const githubUrl = repositoryOwner && repositoryName 
    ? `https://github.com/${repositoryOwner}/${repositoryName}/commit/${selectedEvent.hash}`
    : `https://github.com/commit/${selectedEvent.hash}`;
  const files = Array.isArray(selectedEvent.filesChanged) ? selectedEvent.filesChanged as Array<{filename: string; insertions: number; deletions: number}> : [];

  return (
    <div className="h-full p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-primary mb-6">📋 Commit Details</h3>
      <div className="space-y-6">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-3 mb-3">
            <span className="text-xl" data-testid="event-emoji">
              {config?.emoji || '📝'}
            </span>
            <Badge 
              className="text-xs font-medium"
              style={{ 
                backgroundColor: config?.color || 'var(--muted)',
                color: 'white'
              }}
              data-testid="event-badge"
            >
              {config?.label || selectedEvent.type}
            </Badge>
          </div>
          <h4 className="font-semibold text-foreground mb-2" data-testid="event-title">
            {selectedEvent.message}
          </h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <div data-testid="event-date">
              📅 {d3.timeFormat("%B %d, %Y")(new Date(selectedEvent.date))}
            </div>
            <div data-testid="event-author">
              👤 {selectedEvent.author}
            </div>
            <div className="font-mono text-xs" data-testid="event-hash">
              🔗 {selectedEvent.hash.substring(0, 7)}
            </div>
          </div>
          <Button 
            variant="outline"
            size="sm"
            asChild
            className="mt-3 w-full"
            data-testid="button-github-link"
          >
            <a 
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center space-x-1"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>

        <div className="space-y-6">

          {selectedEvent.insertions !== null && selectedEvent.deletions !== null && (
            <div className="bg-card p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-primary mb-2">💡 Impact Analysis</h4>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <span className="text-green-600">+{selectedEvent.insertions}</span>
                  <span className="text-muted-foreground">additions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-red-600">-{selectedEvent.deletions}</span>
                  <span className="text-muted-foreground">deletions</span>
                </div>
              </div>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-primary mb-3">📁 Files Changed ({files.length})</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="files-changed">
                {files.slice(0, 10).map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
                  >
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-muted-foreground">
                        {file.insertions > 0 && file.deletions > 0 ? '~' : 
                         file.insertions > 0 ? '+' : '-'}
                      </span>
                      <span className="font-mono truncate" title={file.filename}>
                        {file.filename}
                      </span>
                    </div>
                  </div>
                ))}
                {files.length > 10 && (
                  <div className="text-center py-2">
                    <span className="text-sm text-muted-foreground">
                      and {files.length - 10} more files...
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
