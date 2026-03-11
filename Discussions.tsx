import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Pin,
  Send,
  Plus,
  ArrowLeft,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  LogIn,
  Loader2,
  BookOpen,
  Lightbulb,
  Heart,
  HelpCircle,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface Discussion {
  id: number;
  title: string;
  content: string;
  category: string;
  authorName: string;
  authorRole: string;
  userId: string | null;
  isPinned: boolean | null;
  commentCount: number | null;
  createdAt: string;
}

interface DiscussionComment {
  id: number;
  discussionId: number;
  content: string;
  authorName: string;
  authorRole: string;
  userId: string | null;
  parentId: number | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "general", label: "General", icon: MessageSquare },
  { value: "recommendations", label: "Recommendations", icon: BookOpen },
  { value: "reading-tips", label: "Reading Tips", icon: Lightbulb },
  { value: "favorites", label: "Favorites", icon: Heart },
  { value: "help", label: "Questions", icon: HelpCircle },
];

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

function getCategoryIcon(category: string) {
  const cat = CATEGORIES.find(c => c.value === category);
  if (!cat) return <MessageSquare className="h-4 w-4" />;
  const Icon = cat.icon;
  return <Icon className="h-4 w-4" />;
}

function getCategoryLabel(category: string) {
  return CATEGORIES.find(c => c.value === category)?.label || "General";
}

export default function Discussions() {
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <>
      <SEOHead
        title="Community Discussions | Book Slump Rescue"
        description="Join the conversation with fellow readers. Share your thoughts on books, get recommendations, and discuss reading topics."
      />
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-discussions-title">Community Discussions</h1>
          <p className="text-muted-foreground">
            Join the conversation with fellow readers. Share thoughts, ask for recommendations, and connect.
          </p>
        </div>

        {selectedDiscussion ? (
          <DiscussionThread
            discussion={selectedDiscussion}
            onBack={() => setSelectedDiscussion(null)}
          />
        ) : (
          <DiscussionsList
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
            onSelectDiscussion={setSelectedDiscussion}
            showNewForm={showNewForm}
            onToggleNewForm={() => setShowNewForm(!showNewForm)}
          />
        )}
      </div>
    </>
  );
}

function DiscussionsList({
  activeCategory,
  onCategoryChange,
  onSelectDiscussion,
  showNewForm,
  onToggleNewForm,
}: {
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  onSelectDiscussion: (d: Discussion) => void;
  showNewForm: boolean;
  onToggleNewForm: () => void;
}) {
  const { isAuthenticated } = useAuth();

  const { data: discussions = [], isLoading } = useQuery<Discussion[]>({
    queryKey: ["/api/discussions"],
  });

  const filtered = activeCategory === "all"
    ? discussions
    : discussions.filter(d => d.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeCategory === "all" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onCategoryChange("all")}
            data-testid="filter-all"
          >
            All
          </Button>
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={activeCategory === cat.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(cat.value)}
              className="gap-1.5"
              data-testid={`filter-${cat.value}`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{cat.label}</span>
            </Button>
          ))}
        </div>

        {isAuthenticated && (
          <Button
            onClick={onToggleNewForm}
            className="gap-1.5"
            size="sm"
            data-testid="button-new-discussion"
          >
            <Plus className="h-4 w-4" />
            New Topic
          </Button>
        )}
      </div>

      {showNewForm && isAuthenticated && (
        <NewDiscussionForm onClose={onToggleNewForm} />
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No discussions yet</p>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? "Be the first to start a conversation!"
                : "Sign in to start a new discussion."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <Card
              key={d.id}
              className="hover-elevate cursor-pointer transition-all"
              onClick={() => onSelectDiscussion(d)}
              data-testid={`card-discussion-${d.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-muted-foreground">
                    {getCategoryIcon(d.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {d.isPinned && (
                        <Pin className="h-3.5 w-3.5 text-primary" />
                      )}
                      <h3 className="font-semibold text-base leading-tight" data-testid={`text-discussion-title-${d.id}`}>
                        {d.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {d.content}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        {d.authorRole === "staff" ? (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Shield className="h-3 w-3" />
                            {d.authorName}
                          </Badge>
                        ) : (
                          d.authorName
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getRelativeTime(d.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {d.commentCount || 0} {(d.commentCount || 0) === 1 ? "reply" : "replies"}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getCategoryLabel(d.category)}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NewDiscussionForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/discussions", { title, content, category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      toast({ title: "Discussion created", description: "Your topic has been posted." });
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create discussion.", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Start a New Discussion</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Input
            placeholder="Discussion title..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            data-testid="input-discussion-title"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <Button
              key={cat.value}
              variant={category === cat.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.value)}
              className="gap-1.5"
              data-testid={`select-category-${cat.value}`}
            >
              <cat.icon className="h-3.5 w-3.5" />
              {cat.label}
            </Button>
          ))}
        </div>
        <Textarea
          placeholder="What would you like to discuss?"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={4}
          data-testid="input-discussion-content"
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} data-testid="button-cancel-discussion">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim() || !content.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="gap-1.5"
            data-testid="button-submit-discussion"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post Discussion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscussionThread({
  discussion,
  onBack,
}: {
  discussion: Discussion;
  onBack: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: comments = [], isLoading } = useQuery<DiscussionComment[]>({
    queryKey: ["/api/discussions", discussion.id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/discussions/${discussion.id}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      return res.json();
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/discussions/${discussion.id}/comments`, {
        content: newComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discussions", discussion.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/discussions"] });
      setNewComment("");
      toast({ title: "Reply posted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to post reply.", variant: "destructive" });
    },
  });

  const displayedComments = showAllComments ? comments : comments.slice(0, 10);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5" data-testid="button-back-discussions">
        <ArrowLeft className="h-4 w-4" />
        Back to Discussions
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs gap-1">
              {getCategoryIcon(discussion.category)}
              {getCategoryLabel(discussion.category)}
            </Badge>
            {discussion.isPinned && (
              <Badge variant="outline" className="text-xs gap-1">
                <Pin className="h-3 w-3" />
                Pinned
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-3" data-testid="text-thread-title">{discussion.title}</h2>
          <p className="text-foreground/90 whitespace-pre-wrap mb-4">{discussion.content}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {discussion.authorRole === "staff" ? (
              <Badge variant="outline" className="gap-1">
                <Shield className="h-3 w-3" />
                {discussion.authorName}
              </Badge>
            ) : (
              <span>{discussion.authorName}</span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {getRelativeTime(discussion.createdAt)}
            </span>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          {comments.length} {comments.length === 1 ? "Reply" : "Replies"}
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-md" />)}
          </div>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No replies yet. Be the first to share your thoughts!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedComments.map(c => (
              <Card key={c.id} data-testid={`card-comment-${c.id}`}>
                <CardContent className="p-4">
                  <p className="text-sm mb-2 whitespace-pre-wrap">{c.content}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {c.authorRole === "staff" ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="h-3 w-3" />
                        {c.authorName}
                      </Badge>
                    ) : (
                      <span>{c.authorName}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {getRelativeTime(c.createdAt)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {comments.length > 10 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllComments(!showAllComments)}
                className="w-full gap-1.5"
                data-testid="button-toggle-comments"
              >
                {showAllComments ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show All {comments.length} Replies
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {isAuthenticated ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Share your thoughts..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                rows={3}
                data-testid="input-comment"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!newComment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                  className="gap-1.5"
                  data-testid="button-submit-comment"
                >
                  {commentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-muted-foreground mb-3">Sign in to join the conversation</p>
            <a href="/api/login">
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-login-to-comment">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
