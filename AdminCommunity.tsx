import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ShieldCheck,
  BookOpen,
  Megaphone,
  Newspaper,
  Mail,
  CreditCard,
  Loader2,
  ArrowRight,
  LayoutDashboard,
  AlertTriangle,
  FileUp,
  Eye,
  PlayCircle,
  ShoppingBag,
  Star,
  Users,
  Heart,
  MessageSquare,
  MousePointerClick,
  TrendingUp,
  Flag,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Submissions", icon: BookOpen },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/newsletters", label: "Newsletters", icon: Newspaper },
  { href: "/admin/send-newsletter", label: "Send Newsletter", icon: Mail },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/arcs", label: "ARCs", icon: FileUp },
  { href: "/admin/resources", label: "Resources", icon: BookOpen },
  { href: "/admin/interviews", label: "Interviews", icon: Eye },
  { href: "/admin/reviews", label: "Reviews", icon: PlayCircle },
  { href: "/admin/books", label: "Books", icon: BookOpen },
  { href: "/admin/authors", label: "Authors", icon: Eye },
  { href: "/admin/shop", label: "Shop", icon: ShoppingBag },
  { href: "/admin/featured", label: "Featured Picks", icon: Star },
  { href: "/admin/community", label: "Community", icon: Users },
];

interface FeedReport {
  id: number;
  feedItemId: number;
  reporterId: string;
  reason: string;
  status: string;
  createdAt: string;
}

interface CommunityAnalytics {
  period: string;
  itemsCreated: number;
  likes: number;
  comments: number;
  affiliateClicks: number;
  activeUsers: number;
  topBooks: Array<{ bookTitle: string; bookAuthor: string; mentions: number }>;
  clicksBySource: Array<{ source: string; clicks: number }>;
}

export default function AdminCommunity() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();

  const { data: reports, isLoading: reportsLoading } = useQuery<FeedReport[]>({
    queryKey: ["/api/admin/community/reports"],
    enabled: isAdmin,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery<CommunityAnalytics>({
    queryKey: ["/api/admin/community/analytics"],
    enabled: isAdmin,
  });

  const resolveReport = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/community/reports/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/reports"] });
      toast({ title: "Report updated" });
    },
    onError: () => {
      toast({ title: "Failed to update report", variant: "destructive" });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/community/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/community/analytics"] });
      toast({ title: "Feed item deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete item", variant: "destructive" });
    },
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Access Denied" description="Admin access only." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-access-denied">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </Card>
        </main>
      </div>
    );
  }

  const openReports = reports?.filter(r => r.status === "open") || [];
  const closedReports = reports?.filter(r => r.status !== "open") || [];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Community Moderation - Admin" description="Moderate community feed and view analytics." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-admin-community-title">
              Community Moderation
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Manage reports, moderate content, and track community analytics.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8" data-testid="admin-nav-bar">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={link.href === "/admin/community" ? "default" : "outline"}
                  size="sm"
                  data-testid={`nav-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="w-4 h-4 mr-1.5" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <Tabs defaultValue="reports" className="space-y-6">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="reports" data-testid="tab-reports">
                <Flag className="w-4 h-4 mr-1.5" />
                Reports
                {openReports.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-xs">{openReports.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="tab-analytics">
                <TrendingUp className="w-4 h-4 mr-1.5" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-6">
              {reportsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div>
                    <h2 className="text-lg font-semibold mb-3" data-testid="text-open-reports-heading">
                      Open Reports ({openReports.length})
                    </h2>
                    {openReports.length === 0 ? (
                      <Card className="p-6 text-center">
                        <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground" data-testid="text-no-open-reports">No open reports. Community is healthy!</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {openReports.map(report => (
                          <Card key={report.id} className="p-4" data-testid={`card-report-${report.id}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <Badge variant="destructive" className="text-xs">Open</Badge>
                                  <span className="text-sm text-muted-foreground">Feed Item #{report.feedItemId}</span>
                                </div>
                                <p className="text-sm font-medium" data-testid={`text-report-reason-${report.id}`}>
                                  Reason: {report.reason}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Reported by: {report.reporterId} &middot; {new Date(report.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resolveReport.mutate({ id: report.id, status: "resolved" })}
                                  disabled={resolveReport.isPending}
                                  data-testid={`button-resolve-report-${report.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Resolve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resolveReport.mutate({ id: report.id, status: "dismissed" })}
                                  disabled={resolveReport.isPending}
                                  data-testid={`button-dismiss-report-${report.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Dismiss
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    deleteItem.mutate(report.feedItemId);
                                    resolveReport.mutate({ id: report.id, status: "resolved" });
                                  }}
                                  disabled={deleteItem.isPending}
                                  data-testid={`button-delete-item-${report.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete Post
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {closedReports.length > 0 && (
                    <div>
                      <h2 className="text-lg font-semibold mb-3" data-testid="text-closed-reports-heading">
                        Resolved/Dismissed ({closedReports.length})
                      </h2>
                      <div className="space-y-3">
                        {closedReports.map(report => (
                          <Card key={report.id} className="p-4 opacity-60" data-testid={`card-closed-report-${report.id}`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <Badge variant="secondary" className="text-xs">{report.status}</Badge>
                                  <span className="text-sm text-muted-foreground">Feed Item #{report.feedItemId}</span>
                                </div>
                                <p className="text-sm" data-testid={`text-closed-report-reason-${report.id}`}>
                                  Reason: {report.reason}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Reported by: {report.reporterId} &middot; {new Date(report.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              {analyticsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : analytics ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card className="p-4 text-center" data-testid="card-stat-items-created">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-2 mx-auto">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-stat-items-created">{analytics.itemsCreated}</p>
                      <p className="text-xs text-muted-foreground">Posts (7d)</p>
                    </Card>

                    <Card className="p-4 text-center" data-testid="card-stat-likes">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-2 mx-auto">
                        <Heart className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-stat-likes">{analytics.likes}</p>
                      <p className="text-xs text-muted-foreground">Likes (7d)</p>
                    </Card>

                    <Card className="p-4 text-center" data-testid="card-stat-comments">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-2 mx-auto">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-stat-comments">{analytics.comments}</p>
                      <p className="text-xs text-muted-foreground">Comments (7d)</p>
                    </Card>

                    <Card className="p-4 text-center" data-testid="card-stat-affiliate-clicks">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-2 mx-auto">
                        <MousePointerClick className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-stat-affiliate-clicks">{analytics.affiliateClicks}</p>
                      <p className="text-xs text-muted-foreground">Affiliate Clicks (7d)</p>
                    </Card>

                    <Card className="p-4 text-center" data-testid="card-stat-active-users">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 mb-2 mx-auto">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-2xl font-bold" data-testid="text-stat-active-users">{analytics.activeUsers}</p>
                      <p className="text-xs text-muted-foreground">Active Users (7d)</p>
                    </Card>
                  </div>

                  {analytics.topBooks.length > 0 && (
                    <Card className="p-5" data-testid="card-top-books">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Top Books (7 Days)
                      </h3>
                      <div className="space-y-2">
                        {analytics.topBooks.map((book, i) => (
                          <div
                            key={`${book.bookTitle}-${i}`}
                            className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                            data-testid={`row-top-book-${i}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{book.bookTitle}</p>
                              <p className="text-xs text-muted-foreground truncate">{book.bookAuthor}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">{book.mentions} mentions</Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {analytics.clicksBySource.length > 0 && (
                    <Card className="p-5" data-testid="card-clicks-by-source">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-primary" />
                        Affiliate Clicks by Source
                      </h3>
                      <div className="space-y-2">
                        {analytics.clicksBySource.map((entry, i) => (
                          <div
                            key={entry.source}
                            className="flex items-center justify-between gap-3 py-2 border-b last:border-0"
                            data-testid={`row-click-source-${i}`}
                          >
                            <p className="text-sm font-medium">{entry.source}</p>
                            <Badge variant="secondary" className="text-xs">{entry.clicks} clicks</Badge>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="p-8 text-center">
                  <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Failed to load analytics data.</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}