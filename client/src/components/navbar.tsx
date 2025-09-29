import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  repositoryId: string | null;
  repositoryUrl: string | null;
}

export default function Navbar({ repositoryId, repositoryUrl }: NavbarProps) {
  // Parse repository info from URL instead of making API call
  const repositoryInfo = repositoryUrl ? (() => {
    const match = repositoryUrl.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?(?:\.git)?$/);
    if (match) {
      const [, owner, name] = match;
      return {
        owner,
        name: name.replace(/\.git$/, ''),
        url: repositoryUrl
      };
    }
    return null;
  })() : null;  return (
    <nav className="bg-card border-b border-border px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">📚</span>
          <h1 className="text-xl font-semibold text-foreground" data-testid="app-title">
            Codebase Chronicle
          </h1>
        </div>
        
        {repositoryInfo && (
          <>
            <div className="h-6 w-px bg-border"></div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Repo:</span>
              <a 
                href={repositoryInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline flex items-center space-x-1"
                data-testid="repo-link"
              >
                <span>{repositoryInfo.owner}/{repositoryInfo.name}</span>
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
