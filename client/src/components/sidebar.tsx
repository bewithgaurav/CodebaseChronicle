import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BarChart3, Users, Layers3, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { analyzeRepositorySchema, type Repository } from "@shared/schema";

interface SidebarProps {
  activeTab: 'timeline' | 'multi-lane' | 'ownership' | 'complexity';
  setActiveTab: (tab: 'timeline' | 'multi-lane' | 'ownership' | 'complexity') => void;
  onRepositoryAnalyzed: (repositoryId: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab, onRepositoryAnalyzed }: SidebarProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const { toast } = useToast();

  const analyzeMutation = useMutation({
    mutationFn: async (url: string) => {
      const validatedData = analyzeRepositorySchema.parse({ url });
      const response = await apiRequest("POST", "/api/repositories/analyze", validatedData);
      return response.json() as Promise<Repository>;
    },
    onSuccess: (repository) => {
      toast({
        title: "Repository Analysis Started",
        description: `Analyzing ${repository.name}. This may take a few moments.`,
      });
      onRepositoryAnalyzed(repository.id);
      setRepoUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to start repository analysis",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoUrl.trim()) {
      analyzeMutation.mutate(repoUrl.trim());
    }
  };

  const navItems = [
    {
      id: 'multi-lane' as const,
      label: 'Multi-Lane View',
      icon: GitBranch,
      description: 'Organized timeline by change type'
    },
    {
      id: 'ownership' as const,
      label: 'Ownership',
      icon: Users,
      description: 'Code contributors and hotspots'
    },
    {
      id: 'complexity' as const,
      label: 'Complexity',
      icon: Layers3,
      description: 'Code complexity metrics'
    }
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Navigation
        </h2>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-link w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-left ${
                  isActive 
                    ? 'active bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`nav-${item.id}`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-border mt-auto">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Load Repository
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="repo-url" className="sr-only">
              Repository URL
            </Label>
            <Input
              id="repo-url"
              type="url"
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full"
              disabled={analyzeMutation.isPending}
              data-testid="input-repo-url"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={analyzeMutation.isPending || !repoUrl.trim()}
            data-testid="button-analyze-repo"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Repository"}
          </Button>
        </form>
      </div>
    </aside>
  );
}
