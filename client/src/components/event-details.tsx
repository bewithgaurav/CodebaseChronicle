import { Info, ExternalLink, FileText, Users, TrendingUp, BookOpen, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

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
}

interface OnboardingTips {
  projectStory: string;
  expertContacts: Array<{
    username: string;
    expertise: string[];
    commits: number;
  }>;
  focusAreas: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
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
  onboarding: OnboardingTips;
}

interface EventDetailsProps {
  selectedEvent: Commit | null;
  repositoryData?: RepositoryData;
}

const eventTypeConfig = {
  'initial': { color: '#10b981', bgColor: '#d1fae5', emoji: '🎯', label: 'Initial Commit' },
  'feature': { color: '#3b82f6', bgColor: '#dbeafe', emoji: '✨', label: 'New Feature' },
  'bugfix': { color: '#ef4444', bgColor: '#fee2e2', emoji: '�', label: 'Bug Fix' },
  'docs': { color: '#06b6d4', bgColor: '#cffafe', emoji: '📝', label: 'Documentation' },
  'refactor': { color: '#f97316', bgColor: '#fed7aa', emoji: '♻️', label: 'Refactor' },
  'test': { color: '#8b5cf6', bgColor: '#ede9fe', emoji: '🧪', label: 'Tests' },
  'config': { color: '#6b7280', bgColor: '#f3f4f6', emoji: '⚙️', label: 'Configuration' },
};

export default function EventDetails({ selectedEvent, repositoryData }: EventDetailsProps) {
  if (!selectedEvent) {
    return (
      <Card className="h-full">
        <CardContent className="pt-6 h-full">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a commit to view insights</h3>
              <p className="text-sm">
                Click on any commit in the timeline to see detailed information and onboarding insights
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = eventTypeConfig[selectedEvent.type] || eventTypeConfig['feature'];
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const formatCommitMessage = (message: string) => {
    const lines = message.split('\n');
    const title = lines[0];
    const description = lines.slice(1).join('\n').trim();
    
    return { title, description };
  };

  const { title: commitTitle, description: commitDescription } = formatCommitMessage(selectedEvent.message);

  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-xl">{config.emoji}</span>
              <h3 className="text-xl font-semibold text-foreground flex-1">
                {commitTitle}
              </h3>
            </div>
            {commitDescription && (
              <div className="ml-8 mb-3">
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {commitDescription}
                </p>
              </div>
            )}
            <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
              <span>{formatDate(selectedEvent.date)}</span>
              <span>•</span>
              <div className="flex items-center space-x-2">
                <img 
                  src={selectedEvent.author.avatar} 
                  alt={selectedEvent.author.name}
                  className="w-5 h-5 rounded-full"
                />
                <span>{selectedEvent.author.name}</span>
                <span className="text-xs text-muted-foreground">@{selectedEvent.author.username}</span>
              </div>
              <span>•</span>
              <code className="text-xs bg-muted px-1 rounded">{selectedEvent.hash}</code>
            </div>
            <div className="flex items-center gap-2">
              <Badge style={{ backgroundColor: config.color, color: 'white' }}>
                {config.label}
              </Badge>
              {selectedEvent.importance === 'high' && (
                <Badge variant="destructive">High Impact</Badge>
              )}
              <div className="flex gap-1">
                {selectedEvent.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={selectedEvent.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center space-x-1">
              <span>View on GitHub</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>

        <Tabs defaultValue="commit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="commit">Commit Details</TabsTrigger>
            <TabsTrigger value="insights">Onboarding Insights</TabsTrigger>
            <TabsTrigger value="context">Project Context</TabsTrigger>
          </TabsList>
          
          <TabsContent value="commit" className="space-y-4">
            {(selectedEvent.stats.additions > 0 || selectedEvent.stats.deletions > 0 || selectedEvent.stats.total > 0) ? (
              <div>
                <h4 className="text-sm font-semibold mb-2">Changes Summary</h4>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <span className="text-green-600">+{selectedEvent.stats.additions}</span>
                    <span className="text-muted-foreground">additions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-red-600">-{selectedEvent.stats.deletions}</span>
                    <span className="text-muted-foreground">deletions</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-600">{selectedEvent.stats.total}</span>
                    <span className="text-muted-foreground">total changes</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-semibold mb-2">Commit Info</h4>
                <p className="text-sm text-muted-foreground">
                  <a 
                    href={selectedEvent.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View detailed changes on GitHub →
                  </a>
                </p>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">Commit Category</h4>
              <p className="text-sm text-muted-foreground">{selectedEvent.category}</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {selectedEvent.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {repositoryData?.onboarding ? (
              <>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start space-x-3">
                    <BookOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                        Project Story for New Developers
                      </h4>
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {repositoryData.onboarding.projectStory}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Expert Contacts</h4>
                  </div>
                  <div className="space-y-2">
                    {repositoryData.onboarding.expertContacts.map((expert) => (
                      <div key={expert.username} className="flex items-center justify-between p-3 bg-secondary rounded-md">
                        <div>
                          <span className="text-sm font-medium">@{expert.username}</span>
                          <div className="flex gap-1 mt-1">
                            {expert.expertise.map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{expert.commits} commits</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <h4 className="text-sm font-semibold">Focus Areas to Learn</h4>
                  </div>
                  <div className="space-y-3">
                    {repositoryData.onboarding.focusAreas.map((area) => (
                      <div key={area.type}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium capitalize">{area.type.replace('-', ' ')}</span>
                          <span className="text-xs text-muted-foreground">{area.percentage}%</span>
                        </div>
                        <Progress value={area.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Onboarding insights will appear here once repository data is loaded</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="context" className="space-y-4">
            {repositoryData ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span>Repository Stats</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Stars:</span>
                          <span>{repositoryData.repository.stars.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Forks:</span>
                          <span>{repositoryData.repository.forks.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Language:</span>
                          <span>{repositoryData.repository.language}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Timeline Context</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total Commits:</span>
                          <span>{repositoryData.commits.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>This Commit:</span>
                          <span>#{repositoryData.commits.findIndex(c => c.id === selectedEvent.id) + 1}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Impact Level:</span>
                          <Badge variant={selectedEvent.importance === 'high' ? 'destructive' : selectedEvent.importance === 'medium' ? 'default' : 'secondary'}>
                            {selectedEvent.importance}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h4 className="text-sm font-semibold mb-2">Repository Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {repositoryData.repository.description || 'No description available'}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Project context will appear here once repository data is loaded</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
