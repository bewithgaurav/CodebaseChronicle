import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/navbar";
import Sidebar from "@/components/sidebar";
import MultiLaneTimeline from "@/components/multi-lane-timeline";
import EventDetails from "@/components/event-details";
import { type Commit, type Repository } from "@shared/schema";

export default function Dashboard() {
  const [selectedEvent, setSelectedEvent] = useState<Commit | null>(null);
  const [repositoryId, setRepositoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'multi-lane' | 'ownership' | 'complexity'>('multi-lane');

  const { data: repository } = useQuery<Repository>({
    queryKey: ["/api/repositories", repositoryId],
    enabled: !!repositoryId,
  });

  return (
    <div className="flex flex-col h-screen">
      <Navbar repositoryId={repositoryId} />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onRepositoryAnalyzed={setRepositoryId}
        />
        
        <main className="flex-1 flex bg-background">
          <div className="flex-1 flex flex-col">
            {activeTab === 'multi-lane' && (
              <>
                <MultiLaneTimeline 
                  repositoryId={repositoryId}
                  onEventSelect={setSelectedEvent}
                  selectedEvent={selectedEvent}
                />
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
          </div>
          
          {(activeTab === 'multi-lane') && (
            <div className="w-96 border-l-2 border-border bg-card">
              <EventDetails 
                selectedEvent={selectedEvent} 
                repositoryOwner={repository?.owner}
                repositoryName={repository?.name}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
