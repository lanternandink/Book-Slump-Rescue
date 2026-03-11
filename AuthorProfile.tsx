import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  Globe, BookOpen, ExternalLink, ShoppingCart, ArrowLeft,
  CheckCircle, Download, Tag, Calendar, Loader2, PenTool,
  Lock, AlertCircle, Clock, Star, ListChecks, MessageSquare,
} from "lucide-react";
import { SiInstagram, SiGoodreads, SiTiktok } from "react-icons/si";
import { Textarea } from "@/components/ui/textarea";
import { SEOHead } from "@/components/SEOHead";

interface AuthorBookPublic {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  genres: string[] | null;
  amazonUrl: string | null;
  bookshopUrl: string | null;
  seriesName: string | null;
  seriesNumber: number | null;
  publishedDate: string | null;
  isUpcoming: boolean | null;
  arcEnabled: boolean | null;
  arcDescription: string | null;
  arcAvailable: boolean;
}

interface AuthorPublic {
  id: number;
  penName: string;
  slug: string;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  goodreadsUrl: string | null;
  amazonAuthorUrl: string | null;
  bookbubUrl: string | null;
  tiktokHandle: string | null;
  genres: string[] | null;
  avatarUrl: string | null;
  isVerified: boolean | null;
  books: AuthorBookPublic[];
}

interface ArcStatus {
  claimed: boolean;
  todayClaims: number;
  dailyLimit: number;
  onWaitlist: boolean;
  isExpired: boolean;
  reviewReminderDue: boolean;
  readingProgress: number;
  waitlistEnabled: boolean;
}

interface Review {
  id: number;
  authorBookId: number;
  userId: string;
  userDisplayName: string | null;
  rating: number;
  reviewText: string | null;
  pacingRating: number | null;
  charactersRating: number | null;
  writingRating: number | null;
  wouldRecommend: boolean | null;
  isVerifiedArc: boolean;
  createdAt: string;
}

function getRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y ago`;
}

function BookReviews({ bookId, isExpanded, onToggle }: { bookId: number; isExpanded: boolean; onToggle: () => void }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [selectedRating, setSelectedRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [pacingRating, setPacingRating] = useState(0);
  const [charactersRating, setCharactersRating] = useState(0);
  const [writingRating, setWritingRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/author-books", bookId, "reviews"],
    enabled: isExpanded,
  });

  const { data: myReview } = useQuery<Review | null>({
    queryKey: ["/api/author-books", bookId, "reviews", "mine"],
    queryFn: async () => {
      const res = await fetch(`/api/author-books/${bookId}/reviews/mine`, { credentials: "include" });
      if (res.status === 404 || res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to check review status");
      return res.json();
    },
    enabled: isExpanded && isAuthenticated,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/author-books/${bookId}/reviews`, {
        rating: selectedRating,
        reviewText: reviewText || null,
        pacingRating: pacingRating || null,
        charactersRating: charactersRating || null,
        writingRating: writingRating || null,
        wouldRecommend,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Review Submitted", description: "Your review has been posted." });
      setSelectedRating(0);
      setReviewText("");
      setPacingRating(0);
      setCharactersRating(0);
      setWritingRating(0);
      setWouldRecommend(null);
      queryClient.invalidateQueries({ queryKey: ["/api/author-books", bookId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/author-books", bookId, "reviews", "mine"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    },
  });

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="mt-3 border-t pt-2" data-testid={`reviews-section-${bookId}`}>
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground"
        onClick={onToggle}
        data-testid={`button-toggle-reviews-${bookId}`}
      >
        <MessageSquare className="w-3.5 h-3.5" />
        Reviews{isExpanded && reviews.length > 0 ? ` (${reviews.length})` : ""}
      </Button>

      {isExpanded && (
        <div className="mt-2 space-y-3">
          {reviewsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`reviews-loading-${bookId}`}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading reviews...
            </div>
          ) : (
            <>
              {reviews.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm" data-testid={`text-average-rating-${bookId}`}>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= Math.round(averageRating) ? "fill-primary text-primary" : "text-muted-foreground"}`}
                      />
                    ))}
                  </div>
                  <span className="font-medium">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                  </span>
                </div>
              )}

              {reviews.map((review) => (
                <div key={review.id} className="text-sm space-y-1" data-testid={`review-${review.id}`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                    <span className="font-medium" data-testid={`text-reviewer-${review.id}`}>
                      {review.userDisplayName || "Anonymous"}
                    </span>
                    {review.isVerifiedArc && (
                      <Badge variant="secondary" className="text-[10px]" data-testid={`badge-arc-verified-${review.id}`}>
                        <CheckCircle className="w-2.5 h-2.5 mr-0.5" /> ARC Verified
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs" data-testid={`text-review-time-${review.id}`}>
                      {getRelativeTime(review.createdAt)}
                    </span>
                  </div>
                  {review.reviewText && (
                    <p className="text-muted-foreground" data-testid={`text-review-content-${review.id}`}>
                      {review.reviewText}
                    </p>
                  )}
                  {(review.pacingRating || review.charactersRating || review.writingRating || review.wouldRecommend !== null) && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {review.pacingRating && (
                        <span className="text-[10px] text-muted-foreground">
                          Pacing: {review.pacingRating}/5
                        </span>
                      )}
                      {review.charactersRating && (
                        <span className="text-[10px] text-muted-foreground">
                          Characters: {review.charactersRating}/5
                        </span>
                      )}
                      {review.writingRating && (
                        <span className="text-[10px] text-muted-foreground">
                          Writing: {review.writingRating}/5
                        </span>
                      )}
                      {review.wouldRecommend !== null && review.wouldRecommend !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          {review.wouldRecommend ? "Would recommend" : "Would not recommend"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {reviews.length === 0 && (
                <p className="text-sm text-muted-foreground" data-testid={`text-no-reviews-${bookId}`}>
                  No reviews yet. Be the first to review!
                </p>
              )}

              {isAuthenticated && !myReview && (
                <div className="border-t pt-3 space-y-2" data-testid={`form-write-review-${bookId}`}>
                  <p className="text-sm font-medium">Write a Review</p>
                  <div className="flex gap-1" data-testid={`rating-selector-${bookId}`}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedRating(s)}
                        data-testid={`button-rate-${bookId}-${s}`}
                      >
                        <Star
                          className={`w-5 h-5 cursor-pointer ${s <= selectedRating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2 bg-muted/20 rounded p-2">
                    <p className="text-xs font-medium text-muted-foreground">Optional: Rate specific aspects</p>
                    {[
                      { label: "Pacing", value: pacingRating, setter: setPacingRating },
                      { label: "Characters", value: charactersRating, setter: setCharactersRating },
                      { label: "Writing Style", value: writingRating, setter: setWritingRating },
                    ].map(({ label, value, setter }) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className="flex gap-0.5" data-testid={`rating-${label.toLowerCase().replace(/\s+/g, "-")}-${bookId}`}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setter(s)}
                            >
                              <Star
                                className={`w-3.5 h-3.5 cursor-pointer ${s <= value ? "fill-primary text-primary" : "text-muted-foreground"}`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">Would recommend?</span>
                      <div className="flex gap-1.5" data-testid={`recommend-selector-${bookId}`}>
                        <Button
                          type="button"
                          size="sm"
                          variant={wouldRecommend === true ? "default" : "outline"}
                          className="text-xs h-6 px-2"
                          onClick={() => setWouldRecommend(wouldRecommend === true ? null : true)}
                          data-testid={`button-recommend-yes-${bookId}`}
                        >
                          Yes
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={wouldRecommend === false ? "default" : "outline"}
                          className="text-xs h-6 px-2"
                          onClick={() => setWouldRecommend(wouldRecommend === false ? null : false)}
                          data-testid={`button-recommend-no-${bookId}`}
                        >
                          No
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="text-sm"
                    data-testid={`input-review-text-${bookId}`}
                  />
                  <Button
                    size="sm"
                    disabled={selectedRating === 0 || submitReviewMutation.isPending}
                    onClick={() => submitReviewMutation.mutate()}
                    data-testid={`button-submit-review-${bookId}`}
                  >
                    {submitReviewMutation.isPending && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    )}
                    Submit Review
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReadingProgressTracker({ bookId, authorId, initialProgress }: { bookId: number; authorId: number; initialProgress: number }) {
  const [progress, setProgress] = useState(initialProgress);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const { toast } = useToast();

  const updateProgressMutation = useMutation({
    mutationFn: async (newProgress: number) => {
      return apiRequest("PATCH", `/api/authors/${authorId}/books/${bookId}/reading-progress`, { progress: newProgress });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors", authorId, "books", bookId, "arc-status"] });
    },
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/authors/${authorId}/books/${bookId}/feedback`, { feedbackText });
    },
    onSuccess: () => {
      toast({ title: "Feedback Sent", description: "Your private feedback has been sent to the author." });
      setFeedbackText("");
      setShowFeedback(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send feedback.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-1.5" data-testid={`reading-progress-${bookId}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>Reading Progress</span>
            <span>{progress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(parseInt(e.target.value))}
            onMouseUp={() => updateProgressMutation.mutate(progress)}
            onTouchEnd={() => updateProgressMutation.mutate(progress)}
            className="w-full h-1.5 accent-primary cursor-pointer"
            data-testid={`slider-progress-${bookId}`}
          />
        </div>
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-5 px-1.5 gap-0.5"
          onClick={() => setShowFeedback(!showFeedback)}
          data-testid={`button-private-feedback-${bookId}`}
        >
          <MessageSquare className="w-2.5 h-2.5" /> Private Feedback
        </Button>
      </div>
      {showFeedback && (
        <div className="space-y-1.5 bg-muted/20 rounded p-2">
          <p className="text-[10px] text-muted-foreground">Send private feedback directly to the author (only they will see this)</p>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Share thoughts, report typos, suggest improvements..."
            className="text-xs min-h-[50px]"
            data-testid={`input-private-feedback-${bookId}`}
          />
          <Button
            size="sm"
            className="text-xs"
            disabled={!feedbackText.trim() || submitFeedbackMutation.isPending}
            onClick={() => submitFeedbackMutation.mutate()}
            data-testid={`button-send-feedback-${bookId}`}
          >
            {submitFeedbackMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            Send to Author
          </Button>
        </div>
      )}
    </div>
  );
}

function ArcButton({ book, authorId }: { book: AuthorBookPublic; authorId: number }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: arcStatus } = useQuery<ArcStatus>({
    queryKey: ["/api/authors", authorId, "books", book.id, "arc-status"],
    queryFn: async () => {
      const res = await fetch(`/api/authors/${authorId}/books/${book.id}/arc-status`);
      if (!res.ok) throw new Error("Failed to check ARC status");
      return res.json();
    },
    enabled: isAuthenticated && !!book.arcEnabled,
  });

  const claimArcMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/authors/${authorId}/books/${book.id}/claim-arc`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
      let message = "ARC claimed successfully!";
      if (data.couponCode) {
        message += ` Your coupon code: ${data.couponCode}`;
      }
      if (data.downloadExpiresAt) {
        const expiryDate = new Date(data.downloadExpiresAt).toLocaleDateString();
        message += ` Download available until ${expiryDate}.`;
      }
      toast({ title: "ARC Claimed", description: message });
      queryClient.invalidateQueries({ queryKey: ["/api/authors", authorId, "books", book.id, "arc-status"] });
    },
    onError: (error: any) => {
      let msg = "Unable to claim ARC. It may no longer be available.";
      let waitlistAvailable = false;
      try {
        const errStr = error?.message || "";
        const jsonStart = errStr.indexOf("{");
        if (jsonStart >= 0) {
          const parsed = JSON.parse(errStr.slice(jsonStart));
          if (parsed.message) msg = parsed.message;
          if (parsed.waitlistAvailable) waitlistAvailable = true;
        }
      } catch {}
      if (waitlistAvailable) {
        toast({ title: "All Copies Claimed", description: "All copies have been claimed. Join the waitlist to be notified when more become available." });
      } else {
        toast({ title: "Claim Failed", description: msg, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/authors", authorId, "books", book.id, "arc-status"] });
    },
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/authors/${authorId}/books/${book.id}/arc-waitlist`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Waitlisted", description: "You've been added to the waitlist. We'll let you know when copies become available." });
      queryClient.invalidateQueries({ queryKey: ["/api/authors", authorId, "books", book.id, "arc-status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join waitlist.", variant: "destructive" });
    },
  });

  const dismissReminderMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/authors/${authorId}/books/${book.id}/dismiss-review-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/authors", authorId, "books", book.id, "arc-status"] });
    },
  });

  if (!book.arcEnabled) return null;

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => toast({ title: "Sign in Required", description: "Please sign in to claim free ARCs." })}
        data-testid={`button-arc-login-${book.id}`}
      >
        <Lock className="w-3.5 h-3.5" /> Sign in to Get ARC
      </Button>
    );
  }

  if (arcStatus?.isExpired) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled data-testid={`button-arc-expired-${book.id}`}>
        <Clock className="w-3.5 h-3.5" /> ARC Offer Expired
      </Button>
    );
  }

  if (arcStatus?.claimed) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button variant="outline" size="sm" className="gap-1.5" disabled data-testid={`button-arc-claimed-${book.id}`}>
          <CheckCircle className="w-3.5 h-3.5" /> Already Claimed
        </Button>
        <ReadingProgressTracker bookId={book.id} authorId={authorId} initialProgress={arcStatus.readingProgress} />
        {arcStatus.reviewReminderDue && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
            <Star className="w-3 h-3 text-primary flex-shrink-0" />
            <span>Enjoyed this ARC? Leave a review!</span>
            <button
              className="text-[10px] underline flex-shrink-0"
              onClick={() => dismissReminderMutation.mutate()}
              data-testid={`button-dismiss-reminder-${book.id}`}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }

  if (arcStatus?.onWaitlist) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled data-testid={`button-arc-waitlisted-${book.id}`}>
        <ListChecks className="w-3.5 h-3.5" /> On Waitlist
      </Button>
    );
  }

  if (arcStatus && arcStatus.todayClaims >= arcStatus.dailyLimit) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled data-testid={`button-arc-limit-${book.id}`}>
        <AlertCircle className="w-3.5 h-3.5" /> Daily Limit Reached
      </Button>
    );
  }

  if (!book.arcAvailable) {
    if (arcStatus?.waitlistEnabled && !arcStatus.onWaitlist) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => joinWaitlistMutation.mutate()}
          disabled={joinWaitlistMutation.isPending}
          data-testid={`button-arc-join-waitlist-${book.id}`}
        >
          {joinWaitlistMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ListChecks className="w-3.5 h-3.5" />
          )}
          Join Waitlist
        </Button>
      );
    }
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={() => claimArcMutation.mutate()}
      disabled={claimArcMutation.isPending}
      data-testid={`button-arc-${book.id}`}
    >
      {claimArcMutation.isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      Get Free ARC
    </Button>
  );
}

export default function AuthorProfile() {
  const [, params] = useRoute("/authors/:slugOrId");
  const slugOrId = params?.slugOrId || "";
  const [expandedReviewBookId, setExpandedReviewBookId] = useState<number | null>(null);

  const { data: author, isLoading } = useQuery<AuthorPublic>({
    queryKey: ["/api/authors", slugOrId],
    enabled: !!slugOrId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-48 w-full rounded-lg mb-6" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96 mb-8" />
          <div className="grid sm:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Author Not Found</h1>
          <p className="text-muted-foreground mb-6">This author profile doesn't exist or has been removed.</p>
          <Link href="/featured">
            <Button data-testid="button-back-featured">Browse Featured Authors</Button>
          </Link>
        </div>
      </div>
    );
  }

  const releasedBooks = author.books.filter(b => !b.isUpcoming);
  const upcomingBooks = author.books.filter(b => b.isUpcoming);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={author?.penName || "Author Profile"}
        description={author?.bio ? author.bio.substring(0, 160) : `Discover books by ${author?.penName || "this author"}`}
        type="profile"
        jsonLd={author ? {
          "@context": "https://schema.org",
          "@type": "Person",
          "name": author.penName,
          "description": author.bio
        } : undefined}
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/featured">
          <Button variant="ghost" size="sm" className="mb-6 gap-1.5" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back to Featured
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="mb-8" data-testid="card-author-profile">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <Avatar className="w-24 h-24 md:w-32 md:h-32" data-testid="img-author-avatar">
                    <AvatarImage src={author.avatarUrl || undefined} alt={author.penName} />
                    <AvatarFallback className="text-2xl">
                      {author.penName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="font-display text-2xl md:text-3xl font-bold" data-testid="text-author-name">
                      {author.penName}
                    </h1>
                    {author.isVerified && (
                      <CheckCircle className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  {author.genres && author.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {author.genres.map(g => (
                        <Badge key={g} variant="secondary" data-testid={`badge-genre-${g}`}>
                          {g}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {author.bio && (
                    <p className="text-muted-foreground leading-relaxed" data-testid="text-author-bio">
                      {author.bio}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    {author.website && (
                      <a href={author.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-website">
                          <Globe className="w-4 h-4" /> Website
                        </Button>
                      </a>
                    )}
                    {author.goodreadsUrl && (
                      <a href={author.goodreadsUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-goodreads">
                          <SiGoodreads className="w-4 h-4" /> Goodreads
                        </Button>
                      </a>
                    )}
                    {author.amazonAuthorUrl && (
                      <a href={author.amazonAuthorUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-amazon">
                          <ShoppingCart className="w-4 h-4" /> Amazon
                        </Button>
                      </a>
                    )}
                    {author.instagramHandle && (
                      <a href={`https://instagram.com/${author.instagramHandle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-instagram">
                          <SiInstagram className="w-4 h-4" /> Instagram
                        </Button>
                      </a>
                    )}
                    {author.tiktokHandle && (
                      <a href={`https://tiktok.com/@${author.tiktokHandle}`} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-tiktok">
                          <SiTiktok className="w-4 h-4" /> TikTok
                        </Button>
                      </a>
                    )}
                    {author.bookbubUrl && (
                      <a href={author.bookbubUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid="link-bookbub">
                          <BookOpen className="w-4 h-4" /> BookBub
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {releasedBooks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Published Books
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {releasedBooks.map((book) => (
                <Card key={book.id} className="flex overflow-hidden" data-testid={`card-book-${book.id}`}>
                  {book.coverUrl && (
                    <div className="w-28 flex-shrink-0 bg-muted">
                      <img
                        loading="lazy"
                        decoding="async"
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-base mb-0.5" data-testid={`text-book-title-${book.id}`}>
                      {book.title}
                    </h3>
                    {book.seriesName && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {book.seriesName}{book.seriesNumber ? ` #${book.seriesNumber}` : ""}
                      </p>
                    )}
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{book.description}</p>
                    )}
                    {book.genres && book.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {book.genres.map(g => (
                          <Badge key={g} variant="outline" className="text-[10px]">
                            <Tag className="w-2.5 h-2.5 mr-0.5" /> {g}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap gap-2">
                      {book.amazonUrl && (
                        <a href={book.amazonUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" className="gap-1.5" data-testid={`button-buy-${book.id}`}>
                            <ShoppingCart className="w-3.5 h-3.5" /> Buy
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      {book.bookshopUrl && (
                        <a href={book.bookshopUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="gap-1.5" data-testid={`button-bookshop-${book.id}`}>
                            <BookOpen className="w-3.5 h-3.5" /> Bookshop
                          </Button>
                        </a>
                      )}
                      <ArcButton book={book} authorId={author.id} />
                    </div>
                    <BookReviews
                      bookId={book.id}
                      isExpanded={expandedReviewBookId === book.id}
                      onToggle={() => setExpandedReviewBookId(expandedReviewBookId === book.id ? null : book.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {upcomingBooks.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Coming Soon
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {upcomingBooks.map((book) => (
                <Card key={book.id} className="flex overflow-hidden opacity-80" data-testid={`card-upcoming-${book.id}`}>
                  {book.coverUrl && (
                    <div className="w-28 flex-shrink-0 bg-muted">
                      <img loading="lazy" decoding="async" src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-base mb-0.5">{book.title}</h3>
                    {book.seriesName && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {book.seriesName}{book.seriesNumber ? ` #${book.seriesNumber}` : ""}
                      </p>
                    )}
                    {book.publishedDate && (
                      <Badge variant="secondary" className="w-fit text-xs mt-1">
                        <Calendar className="w-3 h-3 mr-1" /> {book.publishedDate}
                      </Badge>
                    )}
                    {book.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{book.description}</p>
                    )}
                    <div className="mt-auto pt-2">
                      <ArcButton book={book} authorId={author.id} />
                    </div>
                    <BookReviews
                      bookId={book.id}
                      isExpanded={expandedReviewBookId === book.id}
                      onToggle={() => setExpandedReviewBookId(expandedReviewBookId === book.id ? null : book.id)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>
        )}

        {author.books.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>This author hasn't added any books yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
