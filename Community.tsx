import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Heart,
  MessageCircle,
  Flag,
  BookOpen,
  Star,
  Send,
  Loader2,
  LogIn,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ExternalLink,
  PenLine,
  Users,
  Activity,
  Filter,
  X,
  Bell,
  Check,
  CheckCheck,
  Trophy,
  UserPlus,
  Sparkles,
  Reply,
  Hash,
  Plus,
  Minus,
  BookCheck,
} from "lucide-react";
import { CommunityGuidelinesDialog } from "@/components/CommunityGuidelinesDialog";

interface FeedItem {
  id: number;
  userId: string;
  type: string;
  bookTitle?: string | null;
  bookAuthor?: string | null;
  bookCoverUrl?: string | null;
  metadata?: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  displayName: string;
}

interface FeedResponse {
  items: FeedItem[];
  nextCursor: number | null;
}

interface FeedComment {
  id: number;
  feedItemId: number;
  userId: string;
  userDisplayName: string | null;
  content: string;
  parentId: number | null;
  createdAt: string;
}

interface TrendingBook {
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string | null;
  postCount: string;
  likeCount: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

function parseMetadata(metadata?: string | null): Record<string, any> {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

function getPostTypeLabel(type: string): string {
  switch (type) {
    case "status_update": return "Status";
    case "review": return "Review";
    case "added_review": return "Review";
    case "author_post": return "Author";
    case "share": return "Share";
    case "finished_book": return "Finished";
    case "started_book": return "Started";
    case "want_to_read": return "TBR";
    case "currently_reading": return "Reading";
    case "paused": return "Paused";
    case "dnf": return "DNF";
    case "follow": return "Follow";
    case "joined_club": return "Club";
    case "set_challenge": return "Challenge";
    case "earned_badge": return "Badge";
    default: return "Post";
  }
}

function getPostTypeBadgeVariant(type: string): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "review":
    case "added_review":
      return "default";
    case "author_post":
      return "outline";
    case "dnf":
      return "destructive";
    default:
      return "secondary";
  }
}

function getAutoDescription(item: FeedItem): string | null {
  const meta = parseMetadata(item.metadata);
  switch (item.type) {
    case "finished_book":
      return `Finished reading ${item.bookTitle || "a book"}`;
    case "started_book":
      return `Started reading ${item.bookTitle || "a book"}`;
    case "want_to_read":
      return `Added ${item.bookTitle || "a book"} to their TBR`;
    case "currently_reading":
      return `Currently reading ${item.bookTitle || "a book"}`;
    case "paused":
      return `Paused ${item.bookTitle || "a book"}`;
    case "dnf":
      return `Did not finish ${item.bookTitle || "a book"}`;
    case "follow":
      return `Followed ${meta.followingDisplayName || meta.followingId || "a reader"}`;
    case "joined_club":
      return `Joined ${meta.clubName || "a reading club"}`;
    case "set_challenge":
      return `Set a reading challenge${meta.goal ? ` — ${meta.goal} books` : ""}`;
    case "earned_badge":
      return `Earned the ${meta.badgeName || "Achievement"} badge`;
    case "added_review":
      return `Reviewed ${item.bookTitle || "a book"}${meta.rating ? ` (${meta.rating}★)` : ""}`;
    default:
      return null;
  }
}

interface Notification {
  id: number;
  type?: string;
  message: string;
  isRead: boolean;
  linkUrl?: string | null;
  createdAt: string;
}

function getNotificationIcon(type?: string) {
  switch (type) {
    case "arc_approved": return <BookCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />;
    case "arc_reviewed": return <Star className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />;
    case "follow":
    case "follow_request":
    case "follow_approved": return <UserPlus className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />;
    case "like": return <Heart className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />;
    case "comment": return <MessageCircle className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />;
    case "club_join": return <Users className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />;
  }
}

function NotificationsPanel() {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/user/notifications/unread-count"],
  });

  const { data: notifications = [], isLoading: notificationsLoading } =
    useQuery<Notification[]>({
      queryKey: ["/api/user/notifications"],
      enabled: expanded,
    });

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("POST", `/api/user/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications/unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/user/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/notifications/unread-count"] });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -left-2 h-5 min-w-5 flex items-center justify-center text-[10px] px-1"
                data-testid="badge-unread-count"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base">Notifications</CardTitle>
          {unreadCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(!expanded)}
          data-testid="button-toggle-notifications"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 pt-0">
          {unreadCount > 0 && (
            <div className="flex justify-end mb-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="gap-1.5 text-xs"
                data-testid="button-mark-all-read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </Button>
            </div>
          )}

          {notificationsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded-full flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-notifications">
              No notifications yet.
            </p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-2 rounded-md transition-colors ${notification.isRead ? "" : "bg-muted/30"} ${notification.linkUrl ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  data-testid={`notification-${notification.id}`}
                  onClick={() => {
                    if (!notification.isRead) markReadMutation.mutate(notification.id);
                    if (notification.linkUrl) window.location.href = notification.linkUrl;
                  }}
                >
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" data-testid={`notification-message-${notification.id}`}>
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {getRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notification.id); }}
                      disabled={markReadMutation.isPending}
                      data-testid={`button-mark-read-${notification.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Composer({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"status" | "review" | "author">("status");
  const [text, setText] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [rating, setRating] = useState(0);
  const [spoilerText, setSpoilerText] = useState("");
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<Record<string, any> | null>(null);

  const postMutation = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/community/post", body);
      return res.json();
    },
    onSuccess: () => {
      setText("");
      setBookTitle("");
      setBookAuthor("");
      setRating(0);
      setSpoilerText("");
      toast({ title: "Posted!", description: "Your post is live." });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post. Please try again.", variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!text.trim() && tab !== "review") return;
    const body: Record<string, any> = { text: text.trim() };

    if (tab === "status") {
      body.type = "status_update";
      if (bookTitle.trim()) body.bookTitle = bookTitle.trim();
      if (bookAuthor.trim()) body.bookAuthor = bookAuthor.trim();
    } else if (tab === "review") {
      if (!bookTitle.trim()) {
        toast({ title: "Book title required", variant: "destructive" });
        return;
      }
      body.type = "review";
      body.bookTitle = bookTitle.trim();
      if (bookAuthor.trim()) body.bookAuthor = bookAuthor.trim();
      if (rating > 0) body.rating = rating;
      if (spoilerText.trim()) body.spoilerText = spoilerText.trim();
    } else if (tab === "author") {
      body.type = "author_post";
      if (bookTitle.trim()) body.bookTitle = bookTitle.trim();
      if (bookAuthor.trim()) body.bookAuthor = bookAuthor.trim();
    }
    setPendingBody(body);
    setGuidelinesOpen(true);
  };

  return (
    <>
      <CommunityGuidelinesDialog
        open={guidelinesOpen}
        onOpenChange={setGuidelinesOpen}
        onAccept={() => {
          if (pendingBody) postMutation.mutate(pendingBody);
          setPendingBody(null);
        }}
        context="community_post"
      />
    <Card data-testid="composer">
      <CardContent className="p-4 space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="status" className="flex-1 gap-1.5" data-testid="tab-status">
              <PenLine className="w-3.5 h-3.5" />
              Status
            </TabsTrigger>
            <TabsTrigger value="review" className="flex-1 gap-1.5" data-testid="tab-review">
              <Star className="w-3.5 h-3.5" />
              Review
            </TabsTrigger>
            <TabsTrigger value="author" className="flex-1 gap-1.5" data-testid="tab-author-post">
              <BookOpen className="w-3.5 h-3.5" />
              Author Post
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "status" && (
          <div className="flex flex-wrap gap-1.5" data-testid="prompt-chips">
            {[
              { label: "What are you reading?", icon: "📖" },
              { label: "DNF confession?", icon: "😬" },
              { label: "Quote of the day?", icon: "💬" },
              { label: "Recommend me a…", icon: "🔍" },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border bg-muted/50 hover:bg-muted text-foreground/80 transition-colors"
                onClick={() => setText(chip.label + " ")}
                data-testid={`chip-${chip.label.replace(/[^a-z]/gi, "-").toLowerCase()}`}
              >
                <span>{chip.icon}</span>
                {chip.label}
              </button>
            ))}
          </div>
        )}

        <Textarea
          placeholder={
            tab === "status"
              ? "What are you reading? Share an update..."
              : tab === "review"
              ? "Write your review..."
              : "Share news about your books..."
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="resize-none text-sm"
          data-testid="input-post-text"
        />

        {(tab === "review" || bookTitle) && (
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Book title"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="flex-1 min-w-[140px]"
              data-testid="input-book-title"
            />
            <Input
              placeholder="Author"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              className="flex-1 min-w-[140px]"
              data-testid="input-book-author"
            />
          </div>
        )}

        {tab === "status" && !bookTitle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBookTitle("")}
            className="gap-1.5 text-muted-foreground"
            data-testid="button-add-book"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Add a book
          </Button>
        )}

        {tab === "review" && (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground mr-1">Rating:</span>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRating(s === rating ? 0 : s)}
                  className="p-0.5"
                  data-testid={`button-star-${s}`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      s <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>
            <Input
              placeholder="Spoiler text (optional, hidden by default)"
              value={spoilerText}
              onChange={(e) => setSpoilerText(e.target.value)}
              className="text-sm"
              data-testid="input-spoiler-text"
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={postMutation.isPending || (!text.trim() && tab !== "review")}
            className="gap-1.5"
            data-testid="button-submit-post"
          >
            {postMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Post
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  );
}

function CommentsSection({ itemId }: { itemId: number }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number; name: string } | null>(null);

  const { data: comments = [], isLoading } = useQuery<FeedComment[]>({
    queryKey: ["/api/community/comments", itemId],
  });

  const addComment = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: number }) => {
      const res = await apiRequest("POST", `/api/community/comments/${itemId}`, { content, parentId });
      return res.json();
    },
    onSuccess: () => {
      setCommentText("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/community/comments", itemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add comment", variant: "destructive" });
    },
  });

  const topLevel = comments.filter(c => !c.parentId);
  const replies = comments.filter(c => c.parentId);
  const getReplies = (parentId: number) => replies.filter(r => r.parentId === parentId);

  const renderComment = (c: FeedComment, isReply = false) => (
    <div key={c.id} className={`flex gap-2 ${isReply ? "ml-8" : ""}`} data-testid={`comment-${c.id}`}>
      <Avatar className={`flex-shrink-0 ${isReply ? "h-5 w-5" : "h-6 w-6"}`}>
        <AvatarFallback className="text-[10px]">
          {(c.userDisplayName || c.userId)?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs">
          <span className="font-medium text-foreground" data-testid={`comment-author-${c.id}`}>
            {c.userDisplayName || c.userId.slice(0, 8)}
          </span>
          <span className="text-muted-foreground ml-1.5">{getRelativeTime(c.createdAt)}</span>
          {isAuthenticated && !isReply && (
            <button
              className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setReplyingTo({ id: c.id, name: c.userDisplayName || c.userId.slice(0, 8) })}
              data-testid={`button-reply-${c.id}`}
            >
              <Reply className="w-3 h-3 inline mr-0.5" />
              Reply
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90" data-testid={`comment-content-${c.id}`}>
          {c.content}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-2 pt-2 border-t mt-2">
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-3/4" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-1" data-testid="text-no-comments">
          No comments yet
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {topLevel.map((c) => (
            <div key={c.id}>
              {renderComment(c)}
              {getReplies(c.id).map((r) => renderComment(r, true))}
            </div>
          ))}
        </div>
      )}

      {isAuthenticated && (
        <div className="space-y-1">
          {replyingTo && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Reply className="w-3 h-3" />
              Replying to {replyingTo.name}
              <button onClick={() => setReplyingTo(null)} className="ml-1 hover:text-foreground" data-testid="button-cancel-reply">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              placeholder={replyingTo ? `Reply to ${replyingTo.name}...` : "Write a comment..."}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && commentText.trim()) {
                  addComment.mutate({ content: commentText.trim(), parentId: replyingTo?.id });
                }
              }}
              data-testid="input-comment"
            />
            <Button
              size="icon"
              variant="ghost"
              disabled={!commentText.trim() || addComment.isPending}
              onClick={() => commentText.trim() && addComment.mutate({ content: commentText.trim(), parentId: replyingTo?.id })}
              data-testid="button-submit-comment"
            >
              {addComment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedCard({ item }: { item: FeedItem }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const meta = parseMetadata(item.metadata);
  const [showComments, setShowComments] = useState(false);
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const likeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/community/react/${item.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", `/api/community/report/${item.id}`, { reason });
      return res.json();
    },
    onSuccess: () => {
      setShowReportInput(false);
      setReportReason("");
      toast({ title: "Reported", description: "Thank you, we'll review this post." });
    },
  });

  const affiliateClickMutation = useMutation({
    mutationFn: async (data: { bookTitle: string; affiliateUrl: string }) => {
      await apiRequest("POST", "/api/community/affiliate-click", {
        feedItemId: item.id,
        bookTitle: data.bookTitle,
        source: "contextual",
        affiliateUrl: data.affiliateUrl,
      });
    },
  });

  const isSystemUser = item.displayName === "Book Slump Rescue";
  const initials = isSystemUser ? "BSR" : (item.displayName?.[0]?.toUpperCase() || "?");
  const hasBookInfo = item.bookTitle && item.bookTitle.trim();
  const amazonSearchUrl = hasBookInfo
    ? `https://www.amazon.com/s?k=${encodeURIComponent(item.bookTitle! + (item.bookAuthor ? " " + item.bookAuthor : ""))}&tag=slumpsolver-20`
    : null;

  return (
    <Card className={`${isSystemUser ? "bg-primary/5 border-primary/10" : "bg-muted/30"}`} data-testid={`feed-item-${item.id}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className={`h-10 w-10 flex-shrink-0 ${isSystemUser ? "bg-primary text-primary-foreground" : ""}`}>
            {isSystemUser ? (
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                <BookOpen className="w-5 h-5" />
              </AvatarFallback>
            ) : (
              <AvatarFallback>{initials}</AvatarFallback>
            )}
          </Avatar>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-sm text-foreground" data-testid={`feed-item-author-${item.id}`}>
                  {item.displayName}
                </span>
                <Badge variant={getPostTypeBadgeVariant(item.type)} className="text-[10px]">
                  {getPostTypeLabel(item.type)}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap" data-testid={`feed-item-time-${item.id}`}>
                {getRelativeTime(item.createdAt)}
              </span>
            </div>

            {(meta.text || getAutoDescription(item)) && (
              <p className="text-sm text-foreground/90" data-testid={`feed-item-text-${item.id}`}>
                {meta.text || getAutoDescription(item)}
              </p>
            )}

            {hasBookInfo && (
              <Link
                href={`/discover?search=${encodeURIComponent(item.bookTitle || "")}`}
                className="block"
                data-testid={`link-book-${item.id}`}
              >
                <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  {item.bookCoverUrl && (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={item.bookCoverUrl}
                      alt={item.bookTitle || "Book cover"}
                      className="w-10 h-14 object-cover rounded-md flex-shrink-0"
                      data-testid={`feed-item-cover-${item.id}`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate" data-testid={`feed-item-book-title-${item.id}`}>
                      {item.bookTitle}
                    </p>
                    {item.bookAuthor && (
                      <p className="text-xs text-muted-foreground">by {item.bookAuthor}</p>
                    )}
                    <p className="text-[10px] text-primary mt-0.5">View book & related posts →</p>
                  </div>
                </div>
              </Link>
            )}

            {meta.rating && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Number(meta.rating) }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            )}

            {meta.spoilerText && (
              <div className="mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSpoiler(!showSpoiler)}
                  className="gap-1.5 text-xs text-muted-foreground"
                  data-testid={`button-toggle-spoiler-${item.id}`}
                >
                  {showSpoiler ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showSpoiler ? "Hide Spoiler" : "Show Spoiler"}
                </Button>
                {showSpoiler && (
                  <p className="text-sm text-foreground/80 mt-1 pl-2 border-l-2 border-muted-foreground/30" data-testid={`feed-item-spoiler-${item.id}`}>
                    {meta.spoilerText}
                  </p>
                )}
              </div>
            )}

            {amazonSearchUrl && (
              <a
                href={amazonSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  affiliateClickMutation.mutate({
                    bookTitle: item.bookTitle!,
                    affiliateUrl: amazonSearchUrl,
                  })
                }
                data-testid={`link-affiliate-${item.id}`}
              >
                <Card className="bg-background/50 p-2 mt-1 hover-elevate">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Find <span className="font-medium text-foreground">{item.bookTitle}</span> on Amazon</span>
                  </div>
                </Card>
              </a>
            )}

            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => isAuthenticated && likeMutation.mutate()}
                disabled={!isAuthenticated || likeMutation.isPending}
                className={`gap-1.5 text-xs ${item.liked ? "text-red-500" : "text-muted-foreground"}`}
                data-testid={`button-like-${item.id}`}
              >
                <Heart className={`w-4 h-4 ${item.liked ? "fill-red-500" : ""}`} />
                {item.likeCount > 0 && <span data-testid={`text-like-count-${item.id}`}>{item.likeCount}</span>}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComments(!showComments)}
                className="gap-1.5 text-xs text-muted-foreground"
                data-testid={`button-comments-${item.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                {item.commentCount > 0 && <span data-testid={`text-comment-count-${item.id}`}>{item.commentCount}</span>}
              </Button>

              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReportInput(!showReportInput)}
                  className="gap-1.5 text-xs text-muted-foreground ml-auto"
                  data-testid={`button-report-${item.id}`}
                >
                  <Flag className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {showReportInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="Reason for reporting..."
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="flex-1 text-sm"
                  data-testid={`input-report-reason-${item.id}`}
                />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={!reportReason.trim() || reportMutation.isPending}
                  onClick={() => reportReason.trim() && reportMutation.mutate(reportReason.trim())}
                  data-testid={`button-submit-report-${item.id}`}
                >
                  Report
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setShowReportInput(false); setReportReason(""); }}
                  data-testid={`button-cancel-report-${item.id}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {showComments && <CommentsSection itemId={item.id} />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendingModule() {
  const { data: trending = [], isLoading } = useQuery<TrendingBook[]>({
    queryKey: ["/api/community/trending"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Trending Books
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="w-8 h-11 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-2.5 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (trending.length === 0) return null;

  return (
    <Card data-testid="trending-module">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />
          Trending This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {trending.map((book, idx) => (
          <div key={idx} className="flex items-center gap-2" data-testid={`trending-book-${idx}`}>
            <span className="text-xs font-bold text-muted-foreground w-4 text-right flex-shrink-0">
              {idx + 1}
            </span>
            {book.bookCoverUrl ? (
              <img
                loading="lazy"
                decoding="async"
                src={book.bookCoverUrl}
                alt={book.bookTitle}
                className="w-8 h-11 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-11 bg-muted rounded flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{book.bookTitle}</p>
              {book.bookAuthor && (
                <p className="text-[10px] text-muted-foreground truncate">{book.bookAuthor}</p>
              )}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{book.postCount} posts</span>
                <span>{book.likeCount} likes</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const SUGGESTED_TOPICS = [
  { topic: "Romance", category: "genre" },
  { topic: "Fantasy", category: "genre" },
  { topic: "Thriller", category: "genre" },
  { topic: "Sci-Fi", category: "genre" },
  { topic: "Horror", category: "genre" },
  { topic: "Historical Fiction", category: "genre" },
  { topic: "Enemies to Lovers", category: "trope" },
  { topic: "Found Family", category: "trope" },
  { topic: "Slow Burn", category: "trope" },
  { topic: "Morally Grey", category: "trope" },
  { topic: "Dark Academia", category: "vibe" },
  { topic: "Cozy", category: "vibe" },
  { topic: "Spicy", category: "vibe" },
  { topic: "BookTok Favorites", category: "vibe" },
];

function TopicFollowsPanel() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);

  const { data: followed = [] } = useQuery<{ id: number; topic: string; category: string }[]>({
    queryKey: ["/api/user/topic-follows"],
    enabled: isAuthenticated,
  });

  const followMutation = useMutation({
    mutationFn: async ({ topic, category }: { topic: string; category: string }) => {
      const res = await apiRequest("POST", "/api/user/topic-follows", { topic, category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/topic-follows"] });
      toast({ title: "Topic followed!" });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (topic: string) => {
      await apiRequest("DELETE", `/api/user/topic-follows/${encodeURIComponent(topic)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/topic-follows"] });
      toast({ title: "Topic unfollowed" });
    },
  });

  if (!isAuthenticated) return null;

  const followedTopics = new Set(followed.map(f => f.topic));
  const displayTopics = showAll ? SUGGESTED_TOPICS : SUGGESTED_TOPICS.slice(0, 8);

  return (
    <Card data-testid="topic-follows-panel">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Hash className="w-4 h-4" />
          Follow Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-[10px] text-muted-foreground mb-2">
          Followed topics influence your For You feed
        </p>
        <div className="flex flex-wrap gap-1.5">
          {displayTopics.map((t) => {
            const isFollowed = followedTopics.has(t.topic);
            return (
              <button
                key={t.topic}
                onClick={() => isFollowed ? unfollowMutation.mutate(t.topic) : followMutation.mutate(t)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                  isFollowed
                    ? "bg-primary/10 border-primary/30 text-primary font-medium"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
                disabled={followMutation.isPending || unfollowMutation.isPending}
                data-testid={`topic-${t.topic.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {isFollowed ? <Minus className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                {t.topic}
              </button>
            );
          })}
        </div>
        {SUGGESTED_TOPICS.length > 8 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs w-full"
            data-testid="button-show-all-topics"
          >
            {showAll ? "Show Less" : `Show All (${SUGGESTED_TOPICS.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InfiniteScrollSentinel({ onVisible, isFetching }: { onVisible: () => void; isFetching: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisibleRef.current();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinelRef} className="flex justify-center py-4" data-testid="infinite-scroll-sentinel">
      {isFetching && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
    </div>
  );
}

type FilterType = "all" | "for_you" | "following" | "reviews" | "status" | "author";

export default function Community() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>(isAuthenticated ? "for_you" : "all");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allItems, setAllItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);

  const mode = filter === "following" ? "following" : filter === "for_you" ? "for_you" : "all";
  const typeFilter = (filter === "following" || filter === "for_you") ? "all" : filter;

  const { isLoading: feedLoading, isFetching } = useQuery<FeedResponse>({
    queryKey: ["/api/community/feed", `?filter=${typeFilter}&mode=${mode}&limit=20${cursor ? `&cursor=${cursor}` : ""}`],
    queryFn: async () => {
      const url = `/api/community/feed?filter=${typeFilter}&mode=${mode}&limit=20${cursor ? `&cursor=${cursor}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load feed");
      const data = await res.json();
      if (cursor) {
        setAllItems((prev) => {
          const existingIds = new Set(prev.map(i => i.id));
          const newItems = data.items.filter((i: FeedItem) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      } else {
        setAllItems(data.items);
      }
      setNextCursor(data.nextCursor);
      return data;
    },
  });

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCursor(undefined);
    setAllItems([]);
    setNextCursor(null);
    queryClient.removeQueries({ queryKey: ["/api/community/feed"] });
  };

  const loadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  const refreshFeed = () => {
    setCursor(undefined);
    setAllItems([]);
    setNextCursor(null);
    queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Community"
        description="Join the Book Slump Rescue community. Share reading updates, reviews, and connect with fellow book lovers."
      />
      <Navigation />

      <main className="flex-1">
        <section className="py-8 lg:py-12">
          <div className="container px-4 mx-auto max-w-5xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-2">
                <Users className="w-7 h-7 text-primary" />
                <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                  Community
                </h1>
              </div>
              <p className="text-muted-foreground">
                Share what you're reading, write reviews, and connect with readers.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 min-w-0 space-y-4">
                {isAuthenticated && <Composer onSuccess={refreshFeed} />}
                {isAuthenticated && <NotificationsPanel />}

                {!isAuthenticated && (
                  <Card className="p-6 text-center">
                    <Activity className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground mb-4" data-testid="text-sign-in-prompt">
                      Sign in to post updates and interact with the community.
                    </p>
                    <a href="/api/login">
                      <Button data-testid="button-community-login">
                        <LogIn className="w-4 h-4 mr-2" />
                        Sign In
                      </Button>
                    </a>
                  </Card>
                )}

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        { value: "for_you", label: "For You", authOnly: true },
                        { value: "all", label: "All", authOnly: false },
                        { value: "following", label: "Following", authOnly: true },
                        { value: "reviews", label: "Reviews", authOnly: false },
                        { value: "status", label: "Status", authOnly: false },
                        { value: "author", label: "Author Posts", authOnly: false },
                      ] as { value: FilterType; label: string; authOnly: boolean }[]
                    ).map((f) => (
                      <Button
                        key={f.value}
                        variant={filter === f.value ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => handleFilterChange(f.value)}
                        className={`text-xs ${f.value === "for_you" ? "font-semibold" : ""}`}
                        disabled={f.authOnly && !isAuthenticated}
                        data-testid={`filter-${f.value}`}
                      >
                        {f.value === "for_you" && <Sparkles className="w-3 h-3 mr-1" />}
                        {f.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {feedLoading && !cursor ? (
                  <FeedSkeleton />
                ) : allItems.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground" data-testid="text-empty-feed">
                      {filter === "for_you"
                        ? "Follow readers and set your favorite genres to personalize your feed!"
                        : filter === "following"
                        ? "Follow other readers to see their posts here!"
                        : "No posts yet. Be the first to share!"}
                    </p>
                    {(filter === "following" || filter === "for_you") && (
                      <Link href="/readers">
                        <Button variant="outline" className="mt-4 gap-1.5" data-testid="button-find-readers">
                          <Users className="w-4 h-4" />
                          Find Readers
                        </Button>
                      </Link>
                    )}
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {allItems.map((item) => (
                      <FeedCard key={item.id} item={item} />
                    ))}
                  </div>
                )}

                {nextCursor && (
                  <InfiniteScrollSentinel
                    onVisible={loadMore}
                    isFetching={isFetching}
                  />
                )}
              </div>

              <div className="w-full lg:w-72 flex-shrink-0 space-y-4">
                <TrendingModule />
                <TopicFollowsPanel />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
