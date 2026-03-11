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
  ShieldCheck, Loader2, ArrowRight, AlertTriangle, Check, X, Trash2,
  LayoutDashboard, BookOpen, Megaphone, Newspaper, Mail, CreditCard, FileUp, Eye, PlayCircle, Video
} from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { useState } from "react";

interface Review {
  id: string;
  reviewerName: string;
  platform: "BookTok" | "Bookstagram" | "YouTube";
  bookTitle: string;
  genre: string;
  caption: string;
  embedUrl: string;
  contactEmail: string;
  approved: boolean;
  createdAt: string;
}

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
];

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "BookTok": return <SiTiktok className="w-3.5 h-3.5" />;
    case "Bookstagram": return <SiInstagram className="w-3.5 h-3.5" />;
    case "YouTube": return <SiYoutube className="w-3.5 h-3.5" />;
    default: return <Video className="w-3.5 h-3.5" />;
  }
}

export default function AdminReviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.isAdmin;
  const [previewReview, setPreviewReview] = useState<Review | null>(null);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/admin/reviews"],
    enabled: isAdmin,
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "decline" }) => {
      const res = await apiRequest("PATCH", `/api/admin/reviews/${id}`, { action });
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: vars.action === "approve" ? "Review Approved" : "Review Declined" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/reviews/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reviews"] });
      toast({ title: "Review Deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

  const pending = reviews.filter(r => !r.approved);
  const approved = reviews.filter(r => r.approved);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Admin - Book Reviews | Book Slump Rescue" description="Manage BookTok, Bookstagram, and YouTube review submissions." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight mb-2" data-testid="text-admin-reviews-title">
              Review Management
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Approve or decline BookTok, Bookstagram, and YouTube review submissions.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8" data-testid="admin-nav-bar">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={link.href === "/admin/reviews" ? "default" : "outline"}
                  size="sm"
                  data-testid={`nav-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="w-4 h-4 mr-1.5" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 text-center" data-testid="stat-total-reviews">
              <p className="text-2xl font-bold">{reviews.length}</p>
              <p className="text-sm text-muted-foreground">Total Reviews</p>
            </Card>
            <Card className="p-4 text-center" data-testid="stat-pending-reviews">
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </Card>
            <Card className="p-4 text-center" data-testid="stat-published-reviews">
              <p className="text-2xl font-bold">{approved.length}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </Card>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <Card className="p-12 text-center">
              <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Review Submissions</h2>
              <p className="text-muted-foreground">Review submissions will appear here once creators submit them.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviews.map((review, idx) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4" data-testid={`admin-review-${review.id}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold" data-testid={`text-review-name-${review.id}`}>{review.reviewerName}</span>
                          <Badge variant="secondary" className="gap-1 text-xs">
                            {getPlatformIcon(review.platform)}
                            {review.platform}
                          </Badge>
                          {review.approved ? (
                            <Badge variant="default" className="text-xs" data-testid={`badge-approved-${review.id}`}>Approved</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs" data-testid={`badge-pending-${review.id}`}>Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm" data-testid={`text-review-title-${review.id}`}>
                          <span className="text-muted-foreground">Book:</span> {review.bookTitle}
                          <span className="text-muted-foreground ml-2">Genre:</span> {review.genre}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{review.caption}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {review.contactEmail && ` | ${review.contactEmail}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewReview(review)}
                          data-testid={`button-preview-${review.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" /> Preview
                        </Button>
                        {!review.approved && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => actionMutation.mutate({ id: review.id, action: "approve" })}
                            disabled={actionMutation.isPending}
                            data-testid={`button-approve-${review.id}`}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        )}
                        {review.approved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => actionMutation.mutate({ id: review.id, action: "decline" })}
                            disabled={actionMutation.isPending}
                            data-testid={`button-decline-${review.id}`}
                          >
                            <X className="w-4 h-4 mr-1" /> Unpublish
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(review.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${review.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <Dialog open={!!previewReview} onOpenChange={() => setPreviewReview(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Review Preview</DialogTitle>
                <DialogDescription>Preview of the embedded video review</DialogDescription>
              </DialogHeader>
              {previewReview && (
                <div className="space-y-3">
                  <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden">
                    <iframe
                      src={getPreviewEmbedSrc(previewReview.embedUrl, previewReview.platform)}
                      title="Review preview"
                      className="absolute inset-0 w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      data-testid="iframe-preview"
                    />
                  </div>
                  <div>
                    <p className="font-semibold">{previewReview.bookTitle}</p>
                    <p className="text-sm text-muted-foreground">by {previewReview.reviewerName}</p>
                    <p className="text-sm mt-2">{previewReview.caption}</p>
                    <p className="text-xs text-muted-foreground mt-1">Embed URL: {previewReview.embedUrl}</p>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewReview(null)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

function getPreviewEmbedSrc(url: string, platform: string): string {
  try {
    const parsed = new URL(url);
    if (platform === "YouTube" || parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`;
      if (parsed.pathname.includes("/embed/")) return url;
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (parsed.pathname.includes("/shorts/")) return `https://www.youtube.com/embed/${parsed.pathname.replace("/shorts/", "")}`;
      return url;
    }
    if (platform === "BookTok" || parsed.hostname.includes("tiktok.com")) {
      const match = url.match(/\/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
      return url;
    }
    if (platform === "Bookstagram" || parsed.hostname.includes("instagram.com")) {
      const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match) return `https://www.instagram.com/reel/${match[2]}/embed`;
      return url;
    }
  } catch {}
  return url;
}
