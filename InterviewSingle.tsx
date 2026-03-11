import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SEOHead } from "@/components/SEOHead";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link, useParams } from "wouter";
import { DisclosureTag } from "@/components/DisclosureTag";
import {
  ArrowLeft,
  User,
  Globe,
  Loader2,
  MessageCircle,
  Send,
  Calendar,
  Quote,
  AlertTriangle,
} from "lucide-react";

interface Interview {
  id: string;
  authorName: string;
  bookTitle: string;
  highlightQuote: string;
  questionsAnswers: { q: string; a: string }[];
  authorImage: string;
  socialLinks: Record<string, string>;
  sponsored: boolean;
  status: string;
  createdAt: string;
}

interface Comment {
  id: string;
  interviewId: string;
  username: string;
  comment: string;
  createdAt: string;
}

export default function InterviewSingle() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [commentText, setCommentText] = useState("");

  const { data: interview, isLoading, error } = useQuery<Interview>({
    queryKey: ["/api/interviews", id],
    queryFn: async () => {
      const res = await fetch(`/api/interviews/${id}`);
      if (!res.ok) throw new Error("Interview not found");
      return res.json();
    },
  });

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/interviews", id, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/interviews/${id}/comments`);
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/interview-comment/${id}`, {
        username: username.trim(),
        comment: commentText.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews", id, "comments"] });
      setCommentText("");
      toast({ title: "Comment posted", description: "Your comment has been added." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to post comment.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Interview Not Found" description="The requested interview could not be found." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Interview Not Found</h1>
            <p className="text-muted-foreground mb-4">This interview may have been removed or hasn't been published yet.</p>
            <Link href="/interviews">
              <Button variant="outline" className="gap-2" data-testid="button-back-interviews">
                <ArrowLeft className="w-4 h-4" /> Back to Interviews
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const socialEntries = Object.entries(interview.socialLinks || {}).filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title={`Interview with ${interview.authorName} - Book Slump Rescue`}
        description={`Read our interview with ${interview.authorName} about "${interview.bookTitle}".`}
      />
      <Navigation />

      <main className="flex-1 py-10 lg:py-14">
        <div className="container px-4 mx-auto max-w-5xl">
          <Link href="/interviews">
            <Button variant="ghost" size="sm" className="gap-1 mb-6" data-testid="button-back-to-interviews">
              <ArrowLeft className="w-4 h-4" /> All Interviews
            </Button>
          </Link>

          <div className="grid lg:grid-cols-[1fr_280px] gap-8">
            <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                {interview.authorImage ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={interview.authorImage}
                    alt={interview.authorName}
                    className="w-20 h-20 rounded-md object-cover"
                    data-testid="img-interview-author"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-md bg-muted flex items-center justify-center">
                    <User className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold leading-tight" data-testid="text-interview-author-name">
                    {interview.authorName}
                  </h1>
                  <p className="text-lg text-muted-foreground" data-testid="text-interview-book-title">
                    {interview.bookTitle}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(interview.createdAt).toLocaleDateString()}
                    </Badge>
                    {interview.sponsored && <DisclosureTag type="sponsored" />}
                  </div>
                </div>
              </div>

              <div className="space-y-8" data-testid="interview-qa-section">
                {interview.questionsAnswers.map((qa, i) => (
                  <div key={i} className="space-y-2">
                    <h3 className="font-semibold text-lg" data-testid={`text-question-${i}`}>
                      {qa.q}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid={`text-answer-${i}`}>
                      {qa.a}
                    </p>
                  </div>
                ))}
              </div>

              {socialEntries.length > 0 && (
                <div className="mt-8 pt-6 border-t">
                  <h3 className="font-semibold mb-3">Connect with {interview.authorName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {socialEntries.map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5" data-testid={`link-social-${key}`}>
                          <Globe className="w-3.5 h-3.5" />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-10 pt-8 border-t" data-testid="comments-section">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comments ({comments.length})
                </h2>

                <Card className="p-4 mb-6">
                  <div className="space-y-3">
                    <Input
                      placeholder="Your name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={50}
                      data-testid="input-comment-username"
                    />
                    <Textarea
                      placeholder="Share your thoughts on this interview..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      maxLength={2000}
                      className="resize-none"
                      rows={3}
                      data-testid="input-comment-text"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => commentMutation.mutate()}
                        disabled={!username.trim() || !commentText.trim() || commentMutation.isPending}
                        className="gap-1.5"
                        data-testid="button-submit-comment"
                      >
                        {commentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Post Comment
                      </Button>
                    </div>
                  </div>
                </Card>

                {comments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6" data-testid="text-no-comments">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {comments.map((c) => (
                      <Card key={c.id} className="p-4" data-testid={`card-comment-${c.id}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-sm" data-testid={`text-comment-user-${c.id}`}>{c.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-comment-body-${c.id}`}>
                          {c.comment}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.article>

            <aside className="space-y-6 lg:sticky lg:top-4 lg:self-start" style={{ zIndex: 10 }}>
              {interview.highlightQuote && (
                <Card className="p-5 bg-primary/5 border-primary/20" data-testid="card-highlight-quote">
                  <Quote className="w-6 h-6 text-primary mb-3" />
                  <blockquote className="text-lg font-serif italic leading-relaxed" data-testid="text-highlight-quote">
                    "{interview.highlightQuote}"
                  </blockquote>
                  <p className="text-sm text-muted-foreground mt-3">
                    — {interview.authorName}
                  </p>
                </Card>
              )}

              {interview.authorImage && (
                <Card className="overflow-hidden">
                  <img
                    loading="lazy"
                    decoding="async"
                    src={interview.authorImage}
                    alt={interview.authorName}
                    className="w-full h-auto object-cover"
                  />
                  <div className="p-3 text-center">
                    <p className="font-semibold text-sm">{interview.authorName}</p>
                    <p className="text-xs text-muted-foreground">{interview.bookTitle}</p>
                  </div>
                </Card>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
