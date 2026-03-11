import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import {
  Users,
  Plus,
  MessageCircle,
  BookOpen,
  ArrowLeft,
  Crown,
  Shield,
  Loader2,
  ThumbsUp,
  CalendarDays,
  MapPin,
  Link2,
  Check,
  X,
  HelpCircle,
  Trash2,
  Flame,
  Star,
  TrendingUp,
  Pencil,
  Pin,
  Heart,
  BookMarked,
  Sparkles,
} from "lucide-react";

interface Club {
  id: number;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxMembers: number;
  memberCount?: number;
  createdAt?: string;
  createdBy?: string;
  coverImageUrl?: string | null;
}

interface ClubMember {
  id: number;
  userId: string;
  clubId: number;
  role: string;
  userDisplayName?: string;
  joinedAt?: string;
  currentChapter?: number | null;
  currentPage?: number | null;
}

interface Discussion {
  id: number;
  clubId: number;
  userId: string;
  userDisplayName?: string;
  title: string;
  content: string;
  parentId?: number | null;
  chapterStart?: number | null;
  chapterEnd?: number | null;
  hasSpoilers?: boolean;
  createdAt: string;
}

interface ClubBook {
  id: number;
  clubId: number;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl?: string | null;
  status: string;
  voteCount?: number;
  nominatedBy?: string;
}

interface ScheduleWeek {
  id?: number;
  weekNumber: number;
  label: string;
  chapterStart?: number | null;
  chapterEnd?: number | null;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

function ClubsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="clubs-card">
          <Skeleton className="h-24 w-full rounded-t-lg" />
          <CardHeader>
            <Skeleton className="h-5 w-3/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ClubCard({
  club,
  isMember,
  onJoin,
  onSelect,
  joinPending,
}: {
  club: Club;
  isMember: boolean;
  onJoin: (id: number) => void;
  onSelect: (id: number) => void;
  joinPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="h-full flex flex-col overflow-hidden clubs-card cursor-pointer hover:shadow-lg transition-shadow"
        data-testid={`card-club-${club.id}`}
        onClick={() => onSelect(club.id)}
      >
        {club.coverImageUrl ? (
          <div className="h-28 overflow-hidden">
            <img
              src={club.coverImageUrl}
              alt={`${club.name} banner`}
              className="w-full h-28 object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        ) : (
          <div className="h-28 clubs-banner-placeholder flex items-center justify-center">
            <BookMarked className="w-10 h-10 text-amber-700/30" />
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg clubs-heading">{club.name}</CardTitle>
            {club.isPublic ? (
              <Badge variant="secondary" className="clubs-badge" data-testid={`badge-public-${club.id}`}>
                Public
              </Badge>
            ) : (
              <Badge variant="outline" className="clubs-badge" data-testid={`badge-private-${club.id}`}>
                Private
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-end gap-3">
          {club.description && (
            <p
              className="text-sm text-muted-foreground line-clamp-2"
              data-testid={`text-club-desc-${club.id}`}
            >
              {club.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-sm text-muted-foreground flex items-center gap-1.5"
              data-testid={`text-member-count-${club.id}`}
            >
              <Users className="w-3.5 h-3.5" />
              {club.memberCount ?? 0} members
            </span>
            {isMember ? (
              <Badge className="clubs-badge-member" data-testid={`badge-member-${club.id}`}>
                <Check className="w-3 h-3 mr-1" />
                Member
              </Badge>
            ) : (
              <Button
                size="sm"
                className="clubs-btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoin(club.id);
                }}
                disabled={joinPending}
                data-testid={`button-join-club-${club.id}`}
              >
                {joinPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Join"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

const DISCUSSION_PROMPTS = [
  { text: "What are your predictions so far?", icon: Sparkles },
  { text: "Favorite quote from this section?", icon: BookOpen },
  { text: "Which character surprised you the most?", icon: Star },
];

function DiscussionTab({
  clubId,
  isMember,
  userRole,
}: {
  clubId: number;
  isMember: boolean;
  userRole: string | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [chapterStart, setChapterStart] = useState("");
  const [chapterEnd, setChapterEnd] = useState("");
  const [hasSpoilers, setHasSpoilers] = useState(false);

  const { data: discussions = [], isLoading } = useQuery<Discussion[]>({
    queryKey: ["/api/clubs", clubId, "discussions"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/discussions`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch discussions");
      return res.json();
    },
  });

  const postMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; parentId?: number; chapterStart?: number; chapterEnd?: number; hasSpoilers?: boolean }) => {
      return apiRequest("POST", `/api/clubs/${clubId}/discussions`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "discussions"] });
      setNewTitle("");
      setNewContent("");
      setChapterStart("");
      setChapterEnd("");
      setHasSpoilers(false);
      toast({ title: "Post created" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create post.", variant: "destructive" });
    },
  });

  const handleSubmitPost = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    postMutation.mutate({
      title: newTitle,
      content: newContent,
      ...(chapterStart ? { chapterStart: parseInt(chapterStart) } : {}),
      ...(chapterEnd ? { chapterEnd: parseInt(chapterEnd) } : {}),
      hasSpoilers,
    });
  };

  const fillPrompt = (text: string) => {
    setNewTitle(text);
    setNewContent("");
  };

  const topLevel = discussions.filter((d) => !d.parentId);
  const replies = discussions.filter((d) => d.parentId);

  const trendingPosts = [...topLevel]
    .sort((a, b) => {
      const aReplies = replies.filter(r => r.parentId === a.id).length;
      const bReplies = replies.filter(r => r.parentId === b.id).length;
      return bReplies - aReplies;
    })
    .slice(0, 3);

  const topPost = trendingPosts[0];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="clubs-card">
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topLevel.length > 0 && topPost && (
        <div className="grid gap-3 sm:grid-cols-2">
          {trendingPosts.length > 0 && (
            <Card className="clubs-card border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold clubs-accent-text uppercase tracking-wide">Trending Discussion</span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{topPost.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {replies.filter(r => r.parentId === topPost.id).length} replies · {formatRelativeTime(topPost.createdAt)}
                </p>
              </CardContent>
            </Card>
          )}
          {topPost && (
            <Card className="clubs-card border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold clubs-accent-text uppercase tracking-wide">Top Post</span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{topPost.title}</p>
                <p className="text-xs text-muted-foreground mt-1">by {topPost.userDisplayName || "Anonymous"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {isMember && (
        <Card className="clubs-card">
          <CardContent className="pt-5 space-y-3">
            <h3 className="text-sm font-semibold clubs-heading flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              Start a Discussion
            </h3>
            {!newTitle && topLevel.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {DISCUSSION_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.text}
                      onClick={() => fillPrompt(prompt.text)}
                      className="text-xs px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                      data-testid={`button-prompt-${prompt.text.slice(0, 10)}`}
                    >
                      <Icon className="w-3 h-3 text-amber-600" />
                      {prompt.text}
                    </button>
                  );
                })}
              </div>
            )}
            <Input
              placeholder="Post title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="clubs-input"
              data-testid="input-discussion-title"
            />
            <Textarea
              placeholder="What do you want to discuss?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] clubs-input"
              data-testid="textarea-discussion-content"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Chapters</Label>
                <Input type="number" placeholder="From" value={chapterStart} onChange={e => setChapterStart(e.target.value)} className="w-20 h-8 text-xs clubs-input" data-testid="input-chapter-start" />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="number" placeholder="To" value={chapterEnd} onChange={e => setChapterEnd(e.target.value)} className="w-20 h-8 text-xs clubs-input" data-testid="input-chapter-end" />
              </div>
              <div className="flex items-center gap-1.5">
                <Switch checked={hasSpoilers} onCheckedChange={setHasSpoilers} id="spoiler-toggle" data-testid="switch-spoilers" />
                <Label htmlFor="spoiler-toggle" className="text-xs text-muted-foreground">Contains spoilers</Label>
              </div>
            </div>
            <Button
              onClick={handleSubmitPost}
              disabled={postMutation.isPending || !newTitle.trim() || !newContent.trim()}
              className="clubs-btn-primary"
              data-testid="button-submit-discussion"
            >
              {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit
            </Button>
          </CardContent>
        </Card>
      )}

      {topLevel.length === 0 ? (
        <Card className="clubs-card">
          <CardContent className="py-12 text-center">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 text-amber-400 opacity-60" />
            <h3 className="font-semibold clubs-heading mb-1">No discussions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start the first conversation!</p>
            {isMember && (
              <div className="flex flex-wrap justify-center gap-2">
                {DISCUSSION_PROMPTS.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <button
                      key={prompt.text}
                      onClick={() => fillPrompt(prompt.text)}
                      className="text-xs px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center gap-1.5"
                      data-testid={`button-empty-prompt-${prompt.text.slice(0, 10)}`}
                    >
                      <Icon className="w-3 h-3 text-amber-600" />
                      {prompt.text}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        topLevel.map((post) => {
          const postReplies = replies.filter((r) => r.parentId === post.id);
          return (
            <div key={post.id}>
              <DiscussionPost
                post={post}
                clubId={clubId}
                isMember={isMember}
                userRole={userRole}
                replyCount={postReplies.length}
              />
              {postReplies.map((reply) => (
                <div key={reply.id} className="ml-4 sm:ml-8 mt-2">
                  <DiscussionPost
                    post={reply}
                    clubId={clubId}
                    isMember={isMember}
                    userRole={userRole}
                    isReply
                    replyCount={0}
                  />
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

function DiscussionPost({
  post,
  clubId,
  isMember,
  userRole,
  isReply = false,
  replyCount = 0,
}: {
  post: Discussion;
  clubId: number;
  isMember: boolean;
  userRole: string | null;
  isReply?: boolean;
  replyCount?: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [liked, setLiked] = useState(false);

  const replyMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; parentId: number }) => {
      return apiRequest("POST", `/api/clubs/${clubId}/discussions`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "discussions"] });
      setReplyContent("");
      setShowReply(false);
      toast({ title: "Reply posted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post reply.", variant: "destructive" });
    },
  });

  const handleReply = () => {
    if (!replyContent.trim()) return;
    replyMutation.mutate({
      title: `Re: ${post.title}`,
      content: replyContent,
      parentId: post.id,
    });
  };

  const isAdmin = userRole === "admin" || userRole === "moderator";

  return (
    <Card
      className={`clubs-card ${isReply ? "border-l-2 border-l-amber-300 dark:border-l-amber-700" : ""}`}
      data-testid={`card-discussion-${post.id}`}
    >
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 clubs-avatar">
              <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                {(post.userDisplayName || "A").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium" data-testid={`text-author-${post.id}`}>
                {post.userDisplayName || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground ml-2" data-testid={`text-time-${post.id}`}>
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(post.chapterStart || post.chapterEnd) && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Ch. {post.chapterStart || "?"}–{post.chapterEnd || "?"}
              </Badge>
            )}
            {post.hasSpoilers && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Spoilers</Badge>
            )}
          </div>
        </div>
        <h4 className="font-semibold text-sm clubs-heading mb-1" data-testid={`text-post-title-${post.id}`}>
          {post.title}
        </h4>
        <p className="text-sm text-muted-foreground" data-testid={`text-post-content-${post.id}`}>
          {post.content}
        </p>

        <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 text-xs ${liked ? "text-red-500" : "text-muted-foreground"}`}
            onClick={() => setLiked(!liked)}
            data-testid={`button-like-${post.id}`}
          >
            <Heart className={`w-3.5 h-3.5 mr-1 ${liked ? "fill-red-500" : ""}`} />
            Like
          </Button>

          {isMember && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-muted-foreground"
              onClick={() => setShowReply(!showReply)}
              data-testid={`button-reply-${post.id}`}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              Reply {replyCount > 0 && `(${replyCount})`}
            </Button>
          )}

          {isAdmin && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-amber-600"
              data-testid={`button-pin-${post.id}`}
            >
              <Pin className="w-3.5 h-3.5 mr-1" />
              Pin
            </Button>
          )}
        </div>

        {showReply && (
          <div className="mt-3 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] clubs-input"
              data-testid={`textarea-reply-${post.id}`}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="clubs-btn-primary"
                onClick={handleReply}
                disabled={replyMutation.isPending || !replyContent.trim()}
                data-testid={`button-submit-reply-${post.id}`}
              >
                {replyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Post Reply
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowReply(false)}
                data-testid={`button-cancel-reply-${post.id}`}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReadingTab({
  clubId,
  isMember,
  userRole,
  members,
}: {
  clubId: number;
  isMember: boolean;
  userRole: string | null;
  members: ClubMember[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [scheduleWeeks, setScheduleWeeks] = useState<ScheduleWeek[]>([]);

  const { data: books = [], isLoading } = useQuery<ClubBook[]>({
    queryKey: ["/api/clubs", clubId, "books"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/books`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch books");
      return res.json();
    },
  });

  const { data: schedule = [] } = useQuery<ScheduleWeek[]>({
    queryKey: ["/api/clubs", clubId, "schedule"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/schedule`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const nominateMutation = useMutation({
    mutationFn: async (data: { bookTitle: string; bookAuthor: string }) => {
      return apiRequest("POST", `/api/clubs/${clubId}/books`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "books"] });
      setBookTitle("");
      setBookAuthor("");
      toast({ title: "Book nominated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to nominate book.", variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return apiRequest("POST", `/api/clubs/${clubId}/books/${bookId}/vote`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "books"] });
      toast({ title: "Vote recorded" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to vote.", variant: "destructive" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async (weeks: ScheduleWeek[]) => {
      return apiRequest("PUT", `/api/clubs/${clubId}/schedule`, { weeks });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "schedule"] });
      setEditingSchedule(false);
      toast({ title: "Schedule updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update schedule.", variant: "destructive" });
    },
  });

  const handleNominate = () => {
    if (!bookTitle.trim() || !bookAuthor.trim()) return;
    nominateMutation.mutate({ bookTitle, bookAuthor });
  };

  const startEditSchedule = () => {
    setScheduleWeeks(schedule.length > 0 ? schedule.map(s => ({ ...s })) : [
      { weekNumber: 1, label: "Week 1", chapterStart: 1, chapterEnd: 5 },
      { weekNumber: 2, label: "Week 2", chapterStart: 6, chapterEnd: 10 },
    ]);
    setEditingSchedule(true);
  };

  const addWeek = () => {
    const nextNum = scheduleWeeks.length + 1;
    const lastEnd = scheduleWeeks[scheduleWeeks.length - 1]?.chapterEnd || 0;
    setScheduleWeeks([...scheduleWeeks, { weekNumber: nextNum, label: `Week ${nextNum}`, chapterStart: lastEnd + 1, chapterEnd: lastEnd + 5 }]);
  };

  const removeWeek = (idx: number) => {
    setScheduleWeeks(scheduleWeeks.filter((_, i) => i !== idx));
  };

  const currentBook = books.find((b) => b.status === "current");
  const nominatedBooks = books.filter((b) => b.status === "nominated");
  const isAdmin = userRole === "admin" || userRole === "moderator";

  const membersWithProgress = members.filter(m => m.currentChapter && m.currentChapter > 0);
  const avgProgress = membersWithProgress.length > 0
    ? Math.round(membersWithProgress.reduce((sum, m) => sum + (m.currentChapter || 0), 0) / membersWithProgress.length)
    : 0;
  const totalChapters = schedule.length > 0 ? Math.max(...schedule.map(s => s.chapterEnd || 0)) : 0;
  const progressPercent = totalChapters > 0 ? Math.min(100, Math.round((avgProgress / totalChapters) * 100)) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {currentBook && (
        <Card className="clubs-card clubs-current-read overflow-hidden" data-testid="card-current-book">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold clubs-accent-text uppercase tracking-wider">Current Read</span>
            </div>
            <div className="flex gap-4">
              {currentBook.bookCoverUrl ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={currentBook.bookCoverUrl}
                  alt={currentBook.bookTitle}
                  className="w-20 h-28 object-cover rounded-md flex-shrink-0 shadow-md"
                />
              ) : (
                <div className="w-20 h-28 bg-amber-100 dark:bg-amber-900/40 rounded-md flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-amber-600/50" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold clubs-heading text-lg" data-testid="text-current-book-title">
                  {currentBook.bookTitle}
                </h3>
                <p className="text-sm text-muted-foreground" data-testid="text-current-book-author">
                  {currentBook.bookAuthor}
                </p>
                {totalChapters > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Reading Progress</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}
                {!isMember && (
                  <Badge className="mt-2 clubs-badge-member" data-testid="badge-join-reading">
                    Join to participate
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!currentBook && (
        <Card className="clubs-card">
          <CardContent className="py-8 text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-50" />
            <p className="text-sm text-muted-foreground">No book currently being read.</p>
            {isMember && (
              <p className="text-xs text-muted-foreground mt-1">Nominate a book below to get started!</p>
            )}
          </CardContent>
        </Card>
      )}

      {(schedule.length > 0 || isAdmin) && (
        <Card className="clubs-card" data-testid="card-reading-schedule">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base clubs-heading flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-600" />
                Reading Schedule
              </CardTitle>
              {isAdmin && !editingSchedule && (
                <Button size="sm" variant="ghost" onClick={startEditSchedule} data-testid="button-edit-schedule">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingSchedule ? (
              <div className="space-y-3">
                {scheduleWeeks.map((week, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={week.label}
                      onChange={e => {
                        const updated = [...scheduleWeeks];
                        updated[idx].label = e.target.value;
                        setScheduleWeeks(updated);
                      }}
                      className="w-28 h-8 text-xs clubs-input"
                      placeholder="Week 1"
                      data-testid={`input-schedule-label-${idx}`}
                    />
                    <span className="text-xs text-muted-foreground">Ch.</span>
                    <Input
                      type="number"
                      value={week.chapterStart || ""}
                      onChange={e => {
                        const updated = [...scheduleWeeks];
                        updated[idx].chapterStart = parseInt(e.target.value) || undefined;
                        setScheduleWeeks(updated);
                      }}
                      className="w-16 h-8 text-xs clubs-input"
                      placeholder="1"
                      data-testid={`input-schedule-start-${idx}`}
                    />
                    <span className="text-xs text-muted-foreground">–</span>
                    <Input
                      type="number"
                      value={week.chapterEnd || ""}
                      onChange={e => {
                        const updated = [...scheduleWeeks];
                        updated[idx].chapterEnd = parseInt(e.target.value) || undefined;
                        setScheduleWeeks(updated);
                      }}
                      className="w-16 h-8 text-xs clubs-input"
                      placeholder="5"
                      data-testid={`input-schedule-end-${idx}`}
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeWeek(idx)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={addWeek} data-testid="button-add-week">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Week
                  </Button>
                  <Button size="sm" className="clubs-btn-primary" onClick={() => scheduleMutation.mutate(scheduleWeeks)} disabled={scheduleMutation.isPending} data-testid="button-save-schedule">
                    {scheduleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingSchedule(false)}>Cancel</Button>
                </div>
              </div>
            ) : schedule.length > 0 ? (
              <div className="space-y-2">
                {schedule.map((week) => (
                  <div key={week.weekNumber} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0" data-testid={`schedule-week-${week.weekNumber}`}>
                    <div className="w-20 text-xs font-semibold clubs-accent-text">{week.label}</div>
                    <div className="text-sm text-muted-foreground">
                      Chapters {week.chapterStart || "?"}–{week.chapterEnd || "?"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reading schedule set yet.
                {isAdmin && " Click Edit to create one."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {isMember && (
        <Card className="clubs-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base clubs-heading">Nominate a Book</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Book title"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              className="clubs-input"
              data-testid="input-nominate-title"
            />
            <Input
              placeholder="Author"
              value={bookAuthor}
              onChange={(e) => setBookAuthor(e.target.value)}
              className="clubs-input"
              data-testid="input-nominate-author"
            />
            <Button
              onClick={handleNominate}
              disabled={nominateMutation.isPending || !bookTitle.trim() || !bookAuthor.trim()}
              className="clubs-btn-primary"
              data-testid="button-nominate-book"
            >
              {nominateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Nominate
            </Button>
          </CardContent>
        </Card>
      )}

      {nominatedBooks.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3 clubs-heading">Nominated Books</h3>
          <div className="space-y-2">
            {nominatedBooks.map((book) => (
              <Card key={book.id} className="clubs-card" data-testid={`card-nominated-${book.id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-nominated-title-${book.id}`}>
                        {book.bookTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {book.bookAuthor}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="secondary" data-testid={`badge-votes-${book.id}`}>
                        <ThumbsUp className="w-3 h-3 mr-1" />
                        {book.voteCount ?? 0}
                      </Badge>
                      {isMember && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => voteMutation.mutate(book.id)}
                          disabled={voteMutation.isPending}
                          data-testid={`button-vote-${book.id}`}
                        >
                          {voteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {nominatedBooks.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <p className="text-sm">No nominations yet. Be the first to nominate!</p>
        </div>
      )}
    </div>
  );
}

function MembersTab({
  clubId,
  onLeave,
  leavePending,
  userRole,
  onDeleteClub,
  deletePending,
}: {
  clubId: number;
  onLeave: () => void;
  leavePending: boolean;
  userRole: string | null;
  onDeleteClub: () => void;
  deletePending: boolean;
}) {
  const { data: members = [], isLoading } = useQuery<ClubMember[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const roleConfig: Record<string, { label: string; icon: typeof Crown; className: string }> = {
    admin: {
      label: "Admin",
      icon: Crown,
      className: "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300",
    },
    moderator: {
      label: "Moderator",
      icon: Shield,
      className: "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300",
    },
    member: {
      label: "Member",
      icon: Users,
      className: "bg-muted text-muted-foreground",
    },
  };

  const sortedMembers = [...members].sort((a, b) => {
    const order: Record<string, number> = { admin: 0, moderator: 1, member: 2 };
    return (order[a.role || "member"] || 2) - (order[b.role || "member"] || 2);
  });

  const mostActive = members.filter(m => m.currentChapter && m.currentChapter > 0)
    .sort((a, b) => (b.currentChapter || 0) - (a.currentChapter || 0))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mostActive.length > 0 && (
        <Card className="clubs-card border-amber-200 dark:border-amber-800">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold clubs-accent-text uppercase tracking-wide">Most Active Readers</span>
            </div>
            <div className="flex -space-x-2">
              {mostActive.map(m => (
                <Avatar key={m.id} className="h-8 w-8 border-2 border-background clubs-avatar" title={m.userDisplayName || "Reader"}>
                  <AvatarFallback className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    {(m.userDisplayName || "R").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        {sortedMembers.map((member) => {
          const role = roleConfig[member.role || "member"] || roleConfig.member;
          const RoleIcon = role.icon;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between gap-3 py-2.5 px-2 rounded-lg hover:bg-muted/40 transition-colors"
              data-testid={`member-row-${member.id}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 clubs-avatar">
                  <AvatarFallback className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                    {(member.userDisplayName || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium" data-testid={`text-member-name-${member.id}`}>
                      {member.userDisplayName || "Unknown User"}
                    </span>
                    {member.role === "admin" && (
                      <Crown className="w-3.5 h-3.5 text-amber-500" data-testid={`icon-crown-${member.id}`} />
                    )}
                  </div>
                  {member.joinedAt && (
                    <span className="text-xs text-muted-foreground">
                      Joined {formatRelativeTime(member.joinedAt)}
                    </span>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className={role.className}>
                <RoleIcon className="w-3 h-3 mr-1" />
                {role.label}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t space-y-3">
        <Button
          variant="outline"
          className="text-destructive"
          onClick={onLeave}
          disabled={leavePending}
          data-testid="button-leave-club"
        >
          {leavePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Leave Club
        </Button>

        {userRole === "admin" && (
          <Button
            variant="destructive"
            onClick={onDeleteClub}
            disabled={deletePending}
            data-testid="button-delete-club"
          >
            {deletePending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete Club
          </Button>
        )}
      </div>
    </div>
  );
}

interface Meeting {
  id: number;
  clubId: number;
  title: string;
  description: string | null;
  meetingDate: string;
  location: string | null;
  meetingLink: string | null;
  agenda: string | null;
  createdBy: string;
  rsvpCount: number;
  userRsvpStatus: string | null;
}

function MeetingsTab({ clubId, isMember, userRole }: { clubId: number; isMember: boolean; userRole: string | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [agenda, setAgenda] = useState("");

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/clubs", clubId, "meetings"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/meetings`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isMember,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/clubs/${clubId}/meetings`, { title, meetingDate, location: location || null, meetingLink: meetingLink || null, agenda: agenda || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "meetings"] });
      setShowForm(false);
      setTitle(""); setMeetingDate(""); setLocation(""); setMeetingLink(""); setAgenda("");
      toast({ title: "Meeting created" });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ meetingId, status }: { meetingId: number; status: string }) =>
      apiRequest("POST", `/api/clubs/${clubId}/meetings/${meetingId}/rsvp`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "meetings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (meetingId: number) => apiRequest("DELETE", `/api/clubs/${clubId}/meetings/${meetingId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "meetings"] });
      toast({ title: "Meeting deleted" });
    },
  });

  const canManage = userRole === "admin" || userRole === "moderator";

  if (isLoading) return <Skeleton className="h-32" />;

  return (
    <div className="space-y-4">
      {canManage && (
        <div>
          {!showForm ? (
            <Button size="sm" className="clubs-btn-primary" onClick={() => setShowForm(true)} data-testid="button-create-meeting">
              <Plus className="w-4 h-4 mr-1" /> Schedule Meeting
            </Button>
          ) : (
            <Card className="clubs-card p-4 space-y-3">
              <Input placeholder="Meeting title *" value={title} onChange={e => setTitle(e.target.value)} className="clubs-input" data-testid="input-meeting-title" />
              <Input type="datetime-local" value={meetingDate} onChange={e => setMeetingDate(e.target.value)} className="clubs-input" data-testid="input-meeting-date" />
              <Input placeholder="Location (optional)" value={location} onChange={e => setLocation(e.target.value)} className="clubs-input" data-testid="input-meeting-location" />
              <Input placeholder="Meeting link (optional)" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} className="clubs-input" data-testid="input-meeting-link" />
              <Textarea placeholder="Agenda (optional)" value={agenda} onChange={e => setAgenda(e.target.value)} rows={3} className="clubs-input" data-testid="input-meeting-agenda" />
              <div className="flex gap-2">
                <Button size="sm" className="clubs-btn-primary" onClick={() => createMutation.mutate()} disabled={!title || !meetingDate || createMutation.isPending} data-testid="button-save-meeting">
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {meetings.length === 0 ? (
        <Card className="clubs-card">
          <CardContent className="py-8 text-center">
            <CalendarDays className="w-10 h-10 mx-auto mb-2 text-amber-400 opacity-50" />
            <p className="text-sm text-muted-foreground">No meetings scheduled yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {meetings.map(m => {
            const d = new Date(m.meetingDate);
            const isPast = d < new Date();
            return (
              <Card key={m.id} className={`clubs-card p-4 ${isPast ? "opacity-60" : ""}`} data-testid={`meeting-card-${m.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm clubs-heading">{m.title}</h4>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {m.location}</span>}
                      {m.meetingLink && <a href={m.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 clubs-accent-text hover:underline"><Link2 className="w-3 h-3" /> Join</a>}
                    </div>
                    {m.agenda && <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">{m.agenda}</p>}
                  </div>
                  {canManage && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => deleteMutation.mutate(m.id)} data-testid={`button-delete-meeting-${m.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                {!isPast && isMember && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                    <span className="text-xs text-muted-foreground mr-1">{m.rsvpCount} going</span>
                    {(["going", "maybe", "not_going"] as const).map(status => {
                      const isActive = m.userRsvpStatus === status;
                      const icons = { going: Check, maybe: HelpCircle, not_going: X };
                      const labels = { going: "Going", maybe: "Maybe", not_going: "Can't go" };
                      const Icon = icons[status];
                      return (
                        <Button
                          key={status}
                          size="sm"
                          variant={isActive ? "default" : "outline"}
                          className="h-8 text-xs"
                          onClick={() => rsvpMutation.mutate({ meetingId: m.id, status })}
                          disabled={rsvpMutation.isPending}
                          data-testid={`button-rsvp-${status}-${m.id}`}
                        >
                          <Icon className="w-3 h-3 mr-1" /> {labels[status]}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClubDetailView({
  clubId,
  onBack,
}: {
  clubId: number;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const [detailTab, setDetailTab] = useState("discussion");

  const { data: club, isLoading: clubLoading } = useQuery<Club>({
    queryKey: ["/api/clubs", clubId],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch club");
      return res.json();
    },
  });

  const { data: members = [] } = useQuery<ClubMember[]>({
    queryKey: ["/api/clubs", clubId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: books = [] } = useQuery<ClubBook[]>({
    queryKey: ["/api/clubs", clubId, "books"],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${clubId}/books`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: authUser } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: isAuthenticated,
  });

  const currentUserId = (authUser as any)?.id;
  const isMember = members.some((m) => m.userId === currentUserId);
  const userRole = members.find((m) => m.userId === currentUserId)?.role || null;
  const currentBook = books.find((b) => b.status === "current");
  const creatorMember = members.find((m) => m.role === "admin");

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/clubs/${clubId}/join`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/user/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members"] });
      toast({ title: "Joined club!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join club.", variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clubs/${clubId}/leave`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/user/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/clubs", clubId, "members"] });
      toast({ title: "You left the club" });
      onBack();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to leave club.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/clubs/${clubId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/user/clubs"] });
      toast({ title: "Club deleted" });
      onBack();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete club.", variant: "destructive" });
    },
  });

  if (clubLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Club not found.</p>
        <Button variant="ghost" onClick={onBack} className="mt-4" data-testid="button-back-not-found">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to clubs
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
        data-testid="button-back-to-list"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to clubs
      </Button>

      <Card className="clubs-card overflow-hidden mb-6" data-testid="club-banner-section">
        {club.coverImageUrl ? (
          <div className="h-48 sm:h-56 overflow-hidden relative" data-testid="club-banner-image">
            <img
              src={club.coverImageUrl}
              alt={`${club.name} banner`}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        ) : (
          <div className="h-32 clubs-banner-placeholder flex items-center justify-center">
            <BookMarked className="w-16 h-16 text-amber-700/20" />
          </div>
        )}

        <CardContent className={`${club.coverImageUrl ? "-mt-16 relative z-10" : ""} pt-5 pb-5 space-y-3`}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className={`text-2xl sm:text-3xl font-bold clubs-heading ${club.coverImageUrl ? "text-white drop-shadow-lg mb-2" : ""}`} data-testid="text-club-name">
                {club.name}
              </h2>
              {club.description && (
                <p className="text-muted-foreground mt-1 text-sm sm:text-base" data-testid="text-club-description">
                  {club.description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              {isAuthenticated && !isMember && (
                <Button className="clubs-btn-primary" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="button-join-detail">
                  {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Join Club
                </Button>
              )}
              {isMember && (
                <Badge className="clubs-badge-member text-sm px-3 py-1" data-testid="badge-member-detail">
                  <Check className="w-3.5 h-3.5 mr-1" /> Member
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5" data-testid="text-detail-member-count">
              <Users className="w-4 h-4" />
              {club.memberCount ?? members.length} members
            </span>
            {currentBook && (
              <span className="flex items-center gap-1.5" data-testid="text-detail-current-book">
                <BookOpen className="w-4 h-4" />
                {currentBook.bookTitle}
              </span>
            )}
            {creatorMember && (
              <span className="flex items-center gap-1.5" data-testid="text-detail-creator">
                <Star className="w-4 h-4" />
                Created by {creatorMember.userDisplayName || "Admin"}
              </span>
            )}
          </div>

          <div className="flex -space-x-2 mt-1">
            {members.slice(0, 8).map(m => (
              <Avatar key={m.id} className="h-7 w-7 border-2 border-background clubs-avatar" title={m.userDisplayName || "Member"}>
                <AvatarFallback className="text-[10px] bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                  {(m.userDisplayName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))}
            {members.length > 8 && (
              <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] text-muted-foreground">
                +{members.length - 8}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {currentBook && (
        <Card className="clubs-card clubs-current-read mb-6 overflow-hidden" data-testid="card-hero-current-book">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold clubs-accent-text uppercase tracking-wider">Current Read</span>
            </div>
            <div className="flex gap-4">
              {currentBook.bookCoverUrl ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={currentBook.bookCoverUrl}
                  alt={currentBook.bookTitle}
                  className="w-16 h-24 sm:w-20 sm:h-28 object-cover rounded-md flex-shrink-0 shadow-md"
                />
              ) : (
                <div className="w-16 h-24 sm:w-20 sm:h-28 bg-amber-100 dark:bg-amber-900/40 rounded-md flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-amber-600/50" />
                </div>
              )}
              <div>
                <h3 className="font-semibold clubs-heading" data-testid="text-hero-book-title">{currentBook.bookTitle}</h3>
                <p className="text-sm text-muted-foreground" data-testid="text-hero-book-author">{currentBook.bookAuthor}</p>
                {!isMember && isAuthenticated && (
                  <Button size="sm" className="clubs-btn-primary mt-2" onClick={() => joinMutation.mutate()} disabled={joinMutation.isPending} data-testid="button-join-reading">
                    Join Reading
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={detailTab} onValueChange={setDetailTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="discussion" className="min-w-0 px-3" data-testid="tab-discussion">
            <MessageCircle className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Discussion
          </TabsTrigger>
          <TabsTrigger value="reading" className="min-w-0 px-3" data-testid="tab-reading">
            <BookOpen className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Reading
          </TabsTrigger>
          <TabsTrigger value="meetings" className="min-w-0 px-3" data-testid="tab-meetings">
            <CalendarDays className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="members" className="min-w-0 px-3" data-testid="tab-members">
            <Users className="w-4 h-4 mr-1.5 hidden sm:inline" />
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discussion" className="mt-4">
          <DiscussionTab clubId={clubId} isMember={isMember} userRole={userRole} />
        </TabsContent>

        <TabsContent value="reading" className="mt-4">
          <ReadingTab clubId={clubId} isMember={isMember} userRole={userRole} members={members} />
        </TabsContent>

        <TabsContent value="meetings" className="mt-4">
          <MeetingsTab clubId={clubId} isMember={isMember} userRole={userRole} />
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <MembersTab
            clubId={clubId}
            onLeave={() => leaveMutation.mutate()}
            leavePending={leaveMutation.isPending}
            userRole={userRole}
            onDeleteClub={() => {
              if (window.confirm("Are you sure you want to permanently delete this club? This cannot be undone.")) {
                deleteMutation.mutate();
              }
            }}
            deletePending={deleteMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

export default function Clubs() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("discover");
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);
  const [newMaxMembers, setNewMaxMembers] = useState(50);
  const [newCoverImageUrl, setNewCoverImageUrl] = useState("");

  const {
    data: publicClubs = [],
    isLoading: publicLoading,
  } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const {
    data: userClubs = [],
    isLoading: userClubsLoading,
  } = useQuery<Club[]>({
    queryKey: ["/api/user/clubs"],
    enabled: isAuthenticated,
  });

  const userClubIds = new Set(userClubs.map((c) => c.id));

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      isPublic: boolean;
      maxMembers: number;
      coverImageUrl: string;
    }) => {
      return apiRequest("POST", "/api/clubs", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/user/clubs"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setNewIsPublic(true);
      setNewMaxMembers(50);
      setNewCoverImageUrl("");
      toast({ title: "Club created!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create club.", variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (clubId: number) => {
      return apiRequest("POST", `/api/clubs/${clubId}/join`, {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/clubs"] });
      qc.invalidateQueries({ queryKey: ["/api/user/clubs"] });
      toast({ title: "Joined club!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to join club.", variant: "destructive" });
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName,
      description: newDescription,
      isPublic: newIsPublic,
      maxMembers: newMaxMembers,
      coverImageUrl: newCoverImageUrl,
    });
  };

  if (selectedClubId !== null) {
    return (
      <div className="min-h-screen clubs-page-bg">
        <Navigation />
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
          <ClubDetailView
            clubId={selectedClubId}
            onBack={() => setSelectedClubId(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen clubs-page-bg">
      <SEOHead title="Book Clubs" description="Join book clubs, discuss your favorite reads, and vote on what to read next." />
      <Navigation />
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold clubs-heading" data-testid="text-page-title">
                Book Clubs
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Find your reading community</p>
            </div>
            {isAuthenticated && (
              <Button
                onClick={() => setCreateOpen(true)}
                className="gap-2 clubs-btn-primary"
                data-testid="button-create-club"
              >
                <Plus className="w-4 h-4" />
                Create Club
              </Button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="discover" data-testid="tab-discover">
                Discover
              </TabsTrigger>
              <TabsTrigger value="my-clubs" data-testid="tab-my-clubs">
                My Clubs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discover" className="mt-6">
              {publicLoading ? (
                <ClubsListSkeleton />
              ) : publicClubs.length === 0 ? (
                <Card className="clubs-card">
                  <CardContent className="py-16 text-center">
                    <BookMarked className="w-14 h-14 mx-auto mb-4 text-amber-400 opacity-50" />
                    <h3 className="text-lg font-semibold clubs-heading mb-1">No clubs yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Be the first to create a book club!
                    </p>
                    {isAuthenticated && (
                      <Button className="clubs-btn-primary" onClick={() => setCreateOpen(true)} data-testid="button-create-first-club">
                        <Plus className="w-4 h-4 mr-2" /> Create Club
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {publicClubs.map((club) => (
                    <ClubCard
                      key={club.id}
                      club={club}
                      isMember={userClubIds.has(club.id)}
                      onJoin={(id) => joinMutation.mutate(id)}
                      onSelect={(id) => setSelectedClubId(id)}
                      joinPending={joinMutation.isPending}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-clubs" className="mt-6">
              {!isAuthenticated ? (
                <Card className="clubs-card">
                  <CardContent className="py-16 text-center">
                    <Users className="w-14 h-14 mx-auto mb-4 text-amber-400 opacity-50" />
                    <h3 className="text-lg font-semibold clubs-heading mb-1">Sign in required</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Sign in to see your clubs.
                    </p>
                    <a href="/api/login">
                      <Button variant="outline" data-testid="button-login-clubs">
                        Sign In
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ) : userClubsLoading ? (
                <ClubsListSkeleton />
              ) : userClubs.length === 0 ? (
                <Card className="clubs-card">
                  <CardContent className="py-16 text-center">
                    <Users className="w-14 h-14 mx-auto mb-4 text-amber-400 opacity-50" />
                    <h3 className="text-lg font-semibold clubs-heading mb-1">
                      You haven't joined any clubs
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Discover and join clubs from the Discover tab.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {userClubs.map((club) => (
                    <ClubCard
                      key={club.id}
                      club={club}
                      isMember={true}
                      onJoin={() => {}}
                      onSelect={(id) => setSelectedClubId(id)}
                      joinPending={false}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="clubs-heading">Create a Book Club</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="club-name">Name *</Label>
              <Input
                id="club-name"
                placeholder="Club name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 clubs-input"
                data-testid="input-club-name"
              />
            </div>
            <div>
              <Label htmlFor="club-description">Description</Label>
              <Textarea
                id="club-description"
                placeholder="What is this club about?"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="mt-1 min-h-[80px] clubs-input"
                data-testid="textarea-club-description"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="club-public"
                  checked={newIsPublic}
                  onCheckedChange={setNewIsPublic}
                  data-testid="switch-club-public"
                />
                <Label htmlFor="club-public">Public club</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="club-banner">Banner Image URL (optional)</Label>
              <Input
                id="club-banner"
                placeholder="https://example.com/banner.jpg"
                value={newCoverImageUrl}
                onChange={(e) => setNewCoverImageUrl(e.target.value)}
                className="mt-1 clubs-input"
                data-testid="input-club-banner"
              />
            </div>
            <div>
              <Label htmlFor="club-max-members">Max Members</Label>
              <Input
                id="club-max-members"
                type="number"
                value={newMaxMembers}
                onChange={(e) =>
                  setNewMaxMembers(parseInt(e.target.value) || 50)
                }
                min={2}
                max={1000}
                className="mt-1 w-32 clubs-input"
                data-testid="input-max-members"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              data-testid="button-cancel-create"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !newName.trim()}
              className="clubs-btn-primary"
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Create Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
