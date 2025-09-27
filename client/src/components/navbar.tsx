import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Repository } from "@shared/schema";

interface NavbarProps {
  repositoryId: string | null;
}

export default function Navbar({ repositoryId }: NavbarProps) {
  const { data: repository } = useQuery<Repository>({
    queryKey: ["/api/repositories", repositoryId],
    enabled: !!repositoryId,
  });

  return (
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-8 h-8 text-primary" data-testid="logo-clock" />
          <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">
            Codebase Time Machine
          </h1>
        </div>
        
        {repository && (
          <>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Repo:</span>
              <a 
                href={repository.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center space-x-1"
                data-testid="repo-link"
              >
                <span>{repository.owner}/{repository.name}</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-settings"
        >
          <Settings className="w-5 h-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-muted-foreground hover:text-foreground"
          data-testid="button-help"
        >
          <HelpCircle className="w-5 h-5" />
        </Button>
      </div>
    </nav>
  );
}
