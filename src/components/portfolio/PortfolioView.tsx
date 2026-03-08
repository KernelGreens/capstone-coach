import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap, Github, Star, GitFork, ExternalLink,
  Award, Code, BookOpen, TrendingUp, Calendar, MapPin, Trophy
} from 'lucide-react';

interface PortfolioViewProps {
  portfolio: any;
  student: any;
  profile: any;
  projects: any[];
  badges: any[];
  weeklyProgress: any[];
  isPublic?: boolean;
}

export const PortfolioView = React.forwardRef<HTMLDivElement, PortfolioViewProps>(
  ({ portfolio, student, profile, projects, badges, weeklyProgress, isPublic }, ref) => {
    if (!portfolio || !student) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-muted-foreground">Portfolio not available yet.</p>
        </div>
      );
    }

    const githubData = portfolio.github_data as any;
    const totalWeeks = weeklyProgress.length;
    const completedWeeks = weeklyProgress.filter((w: any) => w.status === 'completed').length;
    const avgScore = weeklyProgress.length > 0
      ? weeklyProgress.reduce((sum: number, w: any) => sum + (w.supervisor_score || 0), 0) / weeklyProgress.filter((w: any) => w.supervisor_score).length || 0
      : 0;
    const totalHours = weeklyProgress.reduce((sum: number, w: any) => sum + (w.learning_hours || 0), 0);

    const getLevelColor = (level: string) => {
      switch (level) {
        case 'expert': return 'bg-primary text-primary-foreground';
        case 'advanced': return 'bg-accent text-accent-foreground';
        case 'intermediate': return 'bg-secondary text-secondary-foreground';
        default: return 'bg-muted text-muted-foreground';
      }
    };

    return (
      <div ref={ref} className="max-w-4xl mx-auto space-y-8 print:space-y-4 p-4 print:p-0">
        {/* Hero Header */}
        <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border p-8 print:p-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={githubData?.avatar_url || profile?.avatar_url} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-3xl font-bold text-foreground">{profile?.full_name}</h1>
              {portfolio.bio && <p className="text-muted-foreground mt-1">{portfolio.bio}</p>}
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                {student.tracks?.name && (
                  <Badge variant="secondary" className="gap-1">
                    <BookOpen className="h-3 w-3" /> {student.tracks?.name}
                  </Badge>
                )}
                {githubData?.location && (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="h-3 w-3" /> {githubData.location}
                  </Badge>
                )}
                {portfolio.graduation_approved && (
                  <Badge className="gap-1 bg-accent text-accent-foreground">
                    <GraduationCap className="h-3 w-3" /> Graduated
                  </Badge>
                )}
              </div>
            </div>
            {githubData?.html_url && (
              <a href={githubData.html_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Github className="h-5 w-5" /> GitHub Profile
              </a>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-background/60">
              <p className="text-2xl font-bold text-foreground">{completedWeeks}/{totalWeeks}</p>
              <p className="text-xs text-muted-foreground">Weeks Completed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/60">
              <p className="text-2xl font-bold text-foreground">{avgScore.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/60">
              <p className="text-2xl font-bold text-foreground">{totalHours}</p>
              <p className="text-xs text-muted-foreground">Learning Hours</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background/60">
              <p className="text-2xl font-bold text-foreground">{projects.length}</p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
          </div>
        </div>

        {/* Certificate Section */}
        {portfolio.graduation_approved && portfolio.certificate_issued && (
          <Card className="border-2 border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5 print:break-before-page">
            <CardContent className="p-8 text-center">
              <Trophy className="h-12 w-12 text-accent mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Certificate of Completion</h2>
              <Separator className="my-4 max-w-xs mx-auto" />
              <p className="text-muted-foreground">This certifies that</p>
              <p className="text-xl font-semibold text-foreground my-2">{profile?.full_name}</p>
              <p className="text-muted-foreground">
                has successfully completed the internship program
                {student.tracks?.name && ` in ${student.tracks.name}`}
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(student.start_date).toLocaleDateString()} — {new Date(student.end_date).toLocaleDateString()}
                </span>
              </div>
              {portfolio.graduation_approved_at && (
                <p className="text-xs text-muted-foreground mt-3">
                  Approved on {new Date(portfolio.graduation_approved_at).toLocaleDateString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Skill Badges */}
        {badges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> Skill Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {badges.map((badge: any) => (
                  <div key={badge.id} className="flex flex-col items-center gap-1">
                    <div className={`rounded-full px-4 py-2 text-sm font-medium ${getLevelColor(badge.level)}`}>
                      {badge.name}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{badge.level}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Project Showcase */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Code className="h-5 w-5 text-primary" /> Project Showcase
          </h2>
          {projects.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project: any) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{project.title}</CardTitle>
                    {project.week_number && (
                      <p className="text-xs text-muted-foreground">Week {project.week_number}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                    )}
                    {project.technologies?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                    )}
                    {project.github_url && (
                      <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <Github className="h-4 w-4" /> View Repository
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {project.github_stats && (
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {project.github_stats.stargazers_count}</span>
                        <span className="flex items-center gap-1"><GitFork className="h-3 w-3" /> {project.github_stats.forks_count}</span>
                        {project.github_stats.language && <Badge variant="outline" className="text-xs">{project.github_stats.language}</Badge>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No projects added yet.
              </CardContent>
            </Card>
          )}
        </div>

        {/* GitHub Activity */}
        {githubData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" /> GitHub Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{githubData.public_repos}</p>
                  <p className="text-xs text-muted-foreground">Repositories</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{githubData.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{githubData.following}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
              {githubData.languages && Object.keys(githubData.languages).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Top Languages</p>
                  <div className="space-y-2">
                    {Object.entries(githubData.languages)
                      .sort(([, a]: any, [, b]: any) => b - a)
                      .slice(0, 5)
                      .map(([lang, count]: any) => (
                        <div key={lang} className="flex items-center gap-2">
                          <span className="text-sm text-foreground w-24">{lang}</span>
                          <Progress value={(count / Math.max(...Object.values(githubData.languages) as number[])) * 100} className="flex-1 h-2" />
                          <span className="text-xs text-muted-foreground w-8">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Summary (for resume) */}
        <Card className="print:break-before-page">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Internship Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weeklyProgress.map((wp: any) => (
                <div key={wp.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Week {wp.week_number}: {wp.week_focus || 'N/A'}</span>
                  <div className="flex items-center gap-2">
                    {wp.supervisor_score && (
                      <Badge variant="secondary">{wp.supervisor_score}/10</Badge>
                    )}
                    <Badge variant={wp.status === 'completed' ? 'default' : 'outline'} className="capitalize">
                      {wp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

PortfolioView.displayName = 'PortfolioView';
