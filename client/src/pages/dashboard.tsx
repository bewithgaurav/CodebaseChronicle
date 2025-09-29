import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import Timeline from "@/components/timeline";
import EventDetails from "@/components/event-details";

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

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Commit | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [repositoryUrl, setRepositoryUrl] = useState<string | null>(null);
  const [repositoryData, setRepositoryData] = useState<RepositoryData | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'timeline' | 'ownership' | 'complexity'>('timeline');

  const handleEventSelect = (event: Commit | null, data?: RepositoryData) => {
    setSelectedEvent(event);
    if (data) {
      setRepositoryData(data);
    }
  };

  const handleRepositoryAnalyzed = (repositoryId: string, repositoryUrl: string) => {
    setRepositoryId(repositoryId);
    setRepositoryUrl(repositoryUrl);
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar repositoryId={repositoryId} repositoryUrl={repositoryUrl} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRepositoryAnalyzed={handleRepositoryAnalyzed}
        />
        
        <main className="flex-1 flex flex-col bg-background">
          {activeTab === 'timeline' && (
            <>
              <div className="flex-1 overflow-y-auto">
                <Timeline 
                  repositoryId={repositoryId}
                  repositoryUrl={repositoryUrl}
                  onEventSelect={handleEventSelect}
                  selectedEvent={selectedEvent}
                />
              </div>
              
              <div className="h-96 border-t border-border bg-card overflow-y-auto">
                <div className="p-6">
                  <h2 className="text-lg font-semibold mb-4 text-foreground">📊 Event Details & Insights</h2>
                  <EventDetails 
                    selectedEvent={selectedEvent} 
                    repositoryData={repositoryData}
                  />
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'ownership' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Code Ownership Analysis</h2>
                <p className="text-muted-foreground">
                  This feature shows file hotspots and contributor analysis. Implementation coming soon.
                </p>
              </div>
            </div>
          )}
          
          {activeTab === 'complexity' && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">Complexity Trends</h2>
                <p className="text-muted-foreground">
                  This feature shows code complexity metrics over time. Implementation coming soon.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
