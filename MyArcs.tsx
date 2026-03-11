import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SEOHead } from "@/components/SEOHead";
import { Link } from "wouter";
import {
  BookOpen, CheckCircle, ExternalLink, Loader2,
  Download, BookMarked, Star, ArrowRight, Award,
  Pen, Medal,
} from "lucide-react";

interface ArcBook {
  id: number;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishedDate: string | null;
  arcExpiresAt: string | null;
  arcAmazonReviewUrl: string | null;
  arcGoodreadsReviewUrl: string | null;
  arcStorygraphReviewUrl: string | null;
  arcBookbubReviewUrl: string | null;
  arcVisibility: string | null;
  authorProfileId: number;
}

interface MyArcEntry {
  id: number;
  bookId: number;
  claimedAt: string | null;
  status: string;
  readingProgress: number;
  reviewReminded: boolean;
  book: ArcBook | null;
}

interface EarnedBadge {
  id: number;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  badgeKey: string;
  category: string;
}

const BADGE_ICONS: Record<string, typeof Award> = {
  pen: Pen,
  medal: Medal,
  star: Star,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string }> = {
  invited: { label: "Invited", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  requested: { label: "Requested — Awaiting Approval", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", next: "downloaded", nextLabel: "Mark as Downloaded" },
  downloaded: { label: "Downloaded", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", next: "reading", nextLabel: "Start Reading" },
  reading: { label: "Currently Reading", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", next: "finished", nextLabel: "Mark as Finished" },
  finished: { label: "Finished", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", next: "reviewed", nextLabel: "Mark as Reviewed" },
  reviewed: { label: "Reviewed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

function ReviewLinks({ book }: { book: ArcBook }) {
  const links = [
    { url: book.arcAmazonReviewUrl, label: "Amazon" },
    { url: book.arcGoodreadsReviewUrl, label: "Goodreads" },
    { url: book.arcStorygraphReviewUrl, label: "StoryGraph" },
    { url: book.arcBookbubReviewUrl, label: "BookBub" },
  ].filter(l => l.url);

  if (links.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="text-xs text-muted-foreground self-center">Leave a review:</span>
      {links.map(link => (
        <a
          key={link.label}
          href={link.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-border hover:bg-muted transition-colors"
          data-testid={`link-review-${link.label.toLowerCase()}-${book.id}`}
        >
          <ExternalLink className="w-3 h-3" />
          {link.label}
        </a>
      ))}
    </div>
  );
}

function BadgeRevealDialog({ badge, onClose }: { badge: EarnedBadge; onClose: () => void }) {
  const IconComponent = BADGE_ICONS[badge.badgeIcon] || Award;
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-sm text-center px-8 py-10" data-testid="dialog-badge-reveal">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-yellow-300 dark:from-amber-900/50 dark:to-yellow-700/50 flex items-center justify-center shadow-lg">
              <IconComponent className="w-12 h-12 text-amber-600 dark:text-amber-300" />
            </div>
            <span className="absolute -top-1 -right-1 text-2xl select-none">✨</span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">
              Surprise Badge Unlocked!
            </p>
            <h2 className="text-xl font-display font-bold mb-2" data-testid="text-badge-reveal-name">
              {badge.badgeName}
            </h2>
            <p className="text-sm text-muted-foreground" data-testid="text-badge-reveal-desc">
              {badge.badgeDescription}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <Link href="/badges">
              <Button className="w-full gap-2" onClick={onClose} data-testid="button-badge-view-all">
                <Award className="w-4 h-4" />
                View My Badges
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-badge-dismiss">
              Continue Reading
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function MyArcs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revealedBadge, setRevealedBadge] = useState<EarnedBadge | null>(null);

  const { data: arcs = [], isLoading, isError, refetch } = useQuery<MyArcEntry[]>({
    queryKey: ["/api/user/my-arcs"],
    enabled: !!user,
    staleTime: 30_000,
  });

  const statusMutation = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/arc-claims/${claimId}/status`, { status });
      return (await res.json()) as { claim: MyArcEntry; newBadge: EarnedBadge | null };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/my-arcs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/badges"] });
      if (data?.newBadge) {
        setRevealedBadge(data.newBadge);
      } else {
        toast({ title: "Status updated!" });
      }
    },
    onError: () => toast({ title: "Could not update status", variant: "destructive" }),
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to see your ARCs</h2>
          <p className="text-muted-foreground text-sm">Your advance reader copies will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="My ARCs | Book Slump Rescue"
        description="Your advance reader copies — track your reading progress and leave reviews."
      />
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My ARCs</h1>
          <p className="text-muted-foreground text-sm mt-1">Your advance reader copies. Track progress and leave reviews.</p>
        </div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4 rounded-xl border bg-card">
                <Skeleton className="w-14 h-20 rounded-md shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-20 px-4">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">Couldn't load your ARCs</h2>
            <p className="text-muted-foreground text-sm mb-4">Something went wrong fetching your advance reader copies.</p>
            <Button variant="outline" onClick={() => refetch()} data-testid="button-retry-arcs">Try again</Button>
          </div>
        )}

        {!isLoading && arcs.length === 0 && (
          <div className="text-center py-20 px-4">
            <BookMarked className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">No ARCs yet</h2>
            <p className="text-muted-foreground text-sm mb-4">Claim advance reader copies from author profiles to see them here.</p>
            <Link href="/">
              <Button variant="outline" className="gap-1.5" data-testid="button-browse-authors">
                <ArrowRight className="w-4 h-4" /> Explore Authors
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && arcs.length > 0 && (
          <div className="space-y-4">
            {arcs.map(arc => {
              const book = arc.book;
              const status = arc.status || "approved";
              const statusConf = STATUS_CONFIG[status] ?? STATUS_CONFIG["approved"];
              const showReviewLinks = (status === "finished" || status === "reviewed") && book;
              const pendingUpdate = statusMutation.isPending;

              return (
                <div
                  key={arc.id}
                  className="flex gap-4 p-4 rounded-xl border bg-card shadow-sm"
                  data-testid={`arc-card-${arc.id}`}
                >
                  {book?.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-14 h-20 object-cover rounded-md border shrink-0"
                      loading="lazy"
                      data-testid={`img-arc-cover-${arc.id}`}
                    />
                  ) : (
                    <div className="w-14 h-20 rounded-md border bg-muted flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-sm leading-tight" data-testid={`text-arc-title-${arc.id}`}>
                          {book?.title ?? "Unknown Book"}
                        </h3>
                        {arc.claimedAt && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Claimed {new Date(arc.claimedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusConf.color}`}
                        data-testid={`status-arc-${arc.id}`}
                      >
                        {statusConf.label}
                      </span>
                    </div>

                    {arc.readingProgress > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${arc.readingProgress}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{arc.readingProgress}%</span>
                      </div>
                    )}

                    {showReviewLinks && <ReviewLinks book={book!} />}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {statusConf.next && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          disabled={pendingUpdate}
                          onClick={() => statusMutation.mutate({ claimId: arc.id, status: statusConf.next! })}
                          data-testid={`button-status-${arc.id}`}
                        >
                          {pendingUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {status === "finished" ? <Star className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                          {statusConf.nextLabel}
                        </Button>
                      )}
                      {status === "approved" && book && (
                        <a
                          href={`/author/${encodeURIComponent(book.authorProfileId)}`}
                          className="inline-flex items-center gap-1 text-xs h-7 px-2.5 rounded-md border border-border hover:bg-muted transition-colors"
                          data-testid={`link-arc-download-${arc.id}`}
                        >
                          <Download className="w-3 h-3" />
                          Get Download
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {revealedBadge && (
        <BadgeRevealDialog badge={revealedBadge} onClose={() => setRevealedBadge(null)} />
      )}
    </div>
  );
}
