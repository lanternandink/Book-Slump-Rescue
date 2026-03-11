import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
  LinkIcon,
  PlayCircle,
  ShoppingBag,
  Star,
} from "lucide-react";

interface DashboardStats {
  bookSubmissions: number;
  adRequests: { total: number; pending: number; approved: number; paid: number; declined: number };
  newsletterRequests: { total: number; pending: number; approved: number; paid: number; declined: number };
  subscribers: { total: number; communityCorner: number; firstChapterFriday: number };
  payments: { total: number; pending: number; completed: number };
}

interface ReviewStats {
  total: number;
  pending: number;
  published: number;
}

interface TransparencyStats {
  paidItems: number;
  paidAds: number;
  paidNewsletters: number;
  affiliateResources: number;
  totalResources: number;
}

const isTestMode = import.meta.env.MODE !== "production";

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
  { href: "/admin/community", label: "Community", icon: ShieldCheck },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    enabled: isAdmin,
  });

  const { data: transparency } = useQuery<TransparencyStats>({
    queryKey: ["/api/admin/transparency-stats"],
    enabled: isAdmin,
  });

  const { data: reviewStats } = useQuery<ReviewStats>({
    queryKey: ["/api/admin/review-stats"],
    enabled: isAdmin,
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
            <p className="text-muted-foreground">You don't have permission to view this page. This area is restricted to administrators only.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Admin Dashboard - Book Slump Rescue" description="Admin control center for Book Slump Rescue." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-5xl">
          {isTestMode && (
            <div className="mb-6 flex items-center gap-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-4 py-3" data-testid="banner-test-mode">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">TEST MODE — Using Stripe test keys. No real charges will be made.</span>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-admin-dashboard-title">
              Admin Dashboard
            </h1>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Badge variant="default" data-testid="badge-admin">Admin</Badge>
              <span className="text-muted-foreground text-sm">Logged in as {(user as any)?.firstName || "Admin"}</span>
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              Platform control center. Monitor submissions, requests, subscribers, and payments.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8" data-testid="admin-nav-bar">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={link.href === "/admin/dashboard" ? "default" : "outline"}
                  size="sm"
                  data-testid={`nav-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="w-4 h-4 mr-1.5" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Link href="/admin">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                    <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-submissions">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid="text-stat-submissions">{stats.bookSubmissions}</p>
                      <p className="text-sm text-muted-foreground">Book Submissions</p>
                    </Card>
                  </motion.div>
                </Link>

                <Link href="/admin/ads">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-ads">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                          <Megaphone className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid="text-stat-ads-total">{stats.adRequests.total}</p>
                      <p className="text-sm text-muted-foreground">Ad Requests</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{stats.adRequests.pending} pending</Badge>
                        <Badge variant="default" className="text-xs">{stats.adRequests.approved} awaiting</Badge>
                        {stats.adRequests.paid > 0 && <Badge variant="default" className="text-xs">{stats.adRequests.paid} paid</Badge>}
                      </div>
                    </Card>
                  </motion.div>
                </Link>

                <Link href="/admin/newsletters">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-newsletters">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                          <Newspaper className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid="text-stat-newsletters-total">{stats.newsletterRequests.total}</p>
                      <p className="text-sm text-muted-foreground">Newsletter Requests</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{stats.newsletterRequests.pending} pending</Badge>
                        <Badge variant="default" className="text-xs">{stats.newsletterRequests.approved} awaiting</Badge>
                        {stats.newsletterRequests.paid > 0 && <Badge variant="default" className="text-xs">{stats.newsletterRequests.paid} paid</Badge>}
                      </div>
                    </Card>
                  </motion.div>
                </Link>

                <Link href="/admin/send-newsletter">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-subscribers">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                          <Mail className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid="text-stat-subscribers-total">{stats.subscribers.total}</p>
                      <p className="text-sm text-muted-foreground">Subscribers</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{stats.subscribers.communityCorner} Community Corner</Badge>
                        <Badge variant="secondary" className="text-xs">{stats.subscribers.firstChapterFriday} First Chapter Friday</Badge>
                      </div>
                    </Card>
                  </motion.div>
                </Link>

                <Link href="/admin/payments">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-payments">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-3xl font-bold" data-testid="text-stat-payments-total">{stats.payments.total}</p>
                      <p className="text-sm text-muted-foreground">Payments</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="secondary" className="text-xs">{stats.payments.pending} pending</Badge>
                        <Badge variant="default" className="text-xs">{stats.payments.completed} paid</Badge>
                      </div>
                    </Card>
                  </motion.div>
                </Link>
                {reviewStats && (
                  <Link href="/admin/reviews">
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                      <Card className="p-5 hover-elevate cursor-pointer" data-testid="card-stat-reviews">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                            <PlayCircle className="w-5 h-5 text-primary" />
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <p className="text-3xl font-bold" data-testid="text-stat-reviews-total">{reviewStats.total}</p>
                        <p className="text-sm text-muted-foreground">Book Reviews</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <Badge variant="secondary" className="text-xs">{reviewStats.pending} pending</Badge>
                          <Badge variant="default" className="text-xs">{reviewStats.published} published</Badge>
                        </div>
                      </Card>
                    </motion.div>
                  </Link>
                )}
              </div>

              {transparency && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                  <Card className="p-5" data-testid="card-transparency-overview">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                        <Eye className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold">Transparency Overview</h3>
                        <p className="text-xs text-muted-foreground">Active paid and affiliate content</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold" data-testid="text-transparency-paid">{transparency.paidItems}</p>
                        <p className="text-xs text-muted-foreground">Active Paid Items</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold" data-testid="text-transparency-paid-ads">{transparency.paidAds}</p>
                        <p className="text-xs text-muted-foreground">Paid Ads</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold" data-testid="text-transparency-paid-newsletters">{transparency.paidNewsletters}</p>
                        <p className="text-xs text-muted-foreground">Paid Newsletters</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold" data-testid="text-transparency-affiliate">{transparency.affiliateResources}</p>
                        <p className="text-xs text-muted-foreground">Affiliate Resources</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Failed to load dashboard stats. Please try again.</p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
