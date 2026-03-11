import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Target, Plus, Minus, Trophy, BookOpen, Trash2, Check, Loader2, LogIn, Sun, Sparkles, Star, Grid3X3, Flower2, Award, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type UserChallenge, type SummerChallenge, type SpringChallenge, type UserBadge } from "@shared/schema";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

const BINGO_PROMPTS = [
  { id: "summer-set", label: "A book set in summer" },
  { id: "over-400", label: "A book over 400 pages" },
  { id: "novella", label: "A novella under 200 pages" },
  { id: "beachy-romance", label: "A beachy romance" },
  { id: "cant-put-down", label: "A thriller you can't put down" },
  { id: "gold-cover", label: "A book with gold on the cover" },
  { id: "indie-author", label: "An indie author" },
  { id: "published-2026", label: "A book published in 2026" },
  { id: "bsr-rec", label: "A book recommended on BSR" },
  { id: "been-avoiding", label: "A book you've been avoiding" },
  { id: "reread-teens", label: "A re-read from your teens" },
  { id: "outside-us", label: "A book set outside the U.S." },
  { id: "morally-gray", label: "Morally gray characters" },
  { id: "finish-48hrs", label: "Finish a book in 48 hours" },
  { id: "fantasy-intrigue", label: "Fantasy with political intrigue" },
  { id: "guilty-pleasure", label: "A 'guilty pleasure' read" },
  { id: "audiobook", label: "An audiobook" },
  { id: "book-club-pick", label: "A book club pick" },
  { id: "memoir", label: "A memoir or autobiography" },
  { id: "debut-author", label: "A debut author" },
  { id: "dual-timeline", label: "A dual timeline story" },
  { id: "award-winner", label: "An award-winning book" },
  { id: "diff-format", label: "A different format (graphic novel, poetry, etc.)" },
  { id: "surprise-pick", label: "A surprise/blind date book" },
  { id: "free-space", label: "FREE SPACE" },
];

const TIERS = [
  { level: 1, name: "Casual Escape", books: 5, color: "text-blue-500" },
  { level: 2, name: "Devoted Reader", books: 10, color: "text-purple-500" },
  { level: 3, name: "Summer Addict", books: 15, color: "text-orange-500" },
  { level: 4, name: "Book Dragon", books: 20, color: "text-yellow-500" },
];

function SummerChallengeSection() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookTitle, setBookTitle] = useState("");

  const { data: summer, isLoading } = useQuery<SummerChallenge | null>({
    queryKey: ["/api/user/summer-challenge"],
    queryFn: async () => {
      const res = await fetch("/api/user/summer-challenge?year=2026", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/summer-challenge"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/summer-challenge"] });
      toast({ title: "You're in!", description: "Welcome to the 2026 Summer Reading Escape!" });
    },
    onError: () => toast({ title: "Error", description: "Could not join challenge.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { completedSquares?: string[]; booksLogged?: string[]; tierReached?: number }) =>
      apiRequest("PATCH", "/api/user/summer-challenge", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/summer-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/badges"] });
    },
    onError: () => toast({ title: "Error", description: "Could not update.", variant: "destructive" }),
  });

  const checkSummerBadge = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/summer-challenge/check-badge"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/badges"] }),
  });

  const markSquare = (id: string) => {
    if (!summer) return;
    const current = summer.completedSquares || [];
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    updateMutation.mutate({ completedSquares: updated });
    const wasAdding = !current.includes(id);
    if (wasAdding && updated.length === 12 && current.length < 12) {
      toast({ title: "Badge Unlocked!", description: "You earned the Summer Escape 2026 badge!" });
      checkSummerBadge.mutate();
    }
    if (wasAdding && updated.length === 25) {
      toast({ title: "BLACKOUT!", description: "Elite status achieved! Full board complete!" });
    }
  };

  const addBook = () => {
    if (!summer || !bookTitle.trim()) return;
    const updated = [...(summer.booksLogged || []), bookTitle.trim()];
    const newTier = updated.length >= 20 ? 4 : updated.length >= 15 ? 3 : updated.length >= 10 ? 2 : updated.length >= 5 ? 1 : 0;
    updateMutation.mutate({ booksLogged: updated, tierReached: newTier });
    setBookTitle("");
    const tier = TIERS.find(t => t.books === updated.length);
    if (tier) {
      toast({ title: `Level Up: ${tier.name}!`, description: `You've read ${tier.books} books this summer!` });
    }
  };

  const removeBook = (index: number) => {
    if (!summer) return;
    const updated = (summer.booksLogged || []).filter((_, i) => i !== index);
    updateMutation.mutate({ booksLogged: updated });
  };

  const completedCount = summer?.completedSquares?.length || 0;
  const booksCount = summer?.booksLogged?.length || 0;
  const currentTier = TIERS.filter(t => booksCount >= t.books).pop();
  const nextTier = TIERS.find(t => booksCount < t.books);
  const isPending = joinMutation.isPending || updateMutation.isPending;

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Sun className="w-7 h-7 text-yellow-500" />
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-summer-title">
            2026 Summer Reading Escape
          </h2>
        </div>
        <p className="text-muted-foreground italic">Escape. Indulge. Explore.</p>
      </div>

      {!summer ? (
        <Card className="p-8 text-center bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <Sun className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Join the Summer Escape</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete bingo prompts, log books to level up through tiers, and earn exclusive badges. Are you ready?
          </p>
          <Button onClick={() => joinMutation.mutate()} disabled={isPending} size="lg" data-testid="button-join-summer">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Join the Challenge
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Grid3X3 className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Bingo Board</h3>
                <Badge variant={completedCount >= 25 ? "default" : completedCount >= 12 ? "secondary" : "outline"} data-testid="badge-bingo-count">
                  {completedCount}/25
                </Badge>
              </div>
              {completedCount >= 12 && (
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className={`w-4 h-4 ${completedCount >= 25 ? "text-yellow-500" : "text-primary"}`} />
                  <span className="text-sm font-medium">
                    {completedCount >= 25 ? "ELITE: Full Blackout!" : "Badge Earned!"}
                  </span>
                </div>
              )}
              <Progress value={(completedCount / 25) * 100} className="h-2" />
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold">Reading Tiers</h3>
                {currentTier && (
                  <Badge className={currentTier.color} variant="outline" data-testid="badge-tier">
                    {currentTier.name}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1 mb-2">
                {TIERS.map((tier) => (
                  <div
                    key={tier.level}
                    className={`flex-1 h-2 rounded-full ${booksCount >= tier.books ? "bg-primary" : "bg-muted"}`}
                    title={`${tier.name}: ${tier.books} books`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {booksCount} books logged
                {nextTier ? ` — ${nextTier.books - booksCount} more for ${nextTier.name}` : " — Max tier reached!"}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" /> Bingo Prompts
            </h3>
            <div className="grid grid-cols-5 gap-1.5" data-testid="bingo-grid">
              {BINGO_PROMPTS.map((prompt) => {
                const done = summer.completedSquares?.includes(prompt.id);
                const isFree = prompt.id === "free-space";
                return (
                  <button
                    key={prompt.id}
                    onClick={() => markSquare(prompt.id)}
                    disabled={isPending}
                    className={`aspect-square rounded-lg border text-[10px] sm:text-xs leading-tight p-1 flex items-center justify-center text-center transition-all ${
                      done
                        ? "bg-primary text-primary-foreground border-primary"
                        : isFree
                        ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700"
                        : "bg-card hover:bg-accent border-border"
                    }`}
                    title={prompt.label}
                    data-testid={`bingo-${prompt.id}`}
                  >
                    {done ? <Check className="w-4 h-4" /> : prompt.label}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Log a Book
            </h3>
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Book title..."
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBook()}
                data-testid="input-summer-book"
              />
              <Button onClick={addBook} disabled={!bookTitle.trim() || isPending} data-testid="button-add-summer-book">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            {summer.booksLogged && summer.booksLogged.length > 0 && (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {summer.booksLogged.map((title, i) => (
                  <li key={i} className="flex items-center justify-between bg-secondary/30 rounded px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                      {title}
                    </span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeBook(i)} disabled={isPending} data-testid={`button-remove-summer-${i}`}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

const SPRING_PROMPTS = [
  { id: "flowers-cover", label: "A book with flowers on the cover" },
  { id: "set-spring", label: "A book set in springtime" },
  { id: "new-author", label: "A new-to-you author" },
  { id: "under-300", label: "A book under 300 pages" },
  { id: "over-450", label: "A book over 450 pages" },
  { id: "fresh-start", label: "A romance with a 'fresh start' theme" },
  { id: "journey-quest", label: "A fantasy with a journey/quest" },
  { id: "cozy-read", label: "A cozy read" },
  { id: "mystery-thriller", label: "A mystery/thriller" },
  { id: "indie-author", label: "An indie author book" },
  { id: "bsr-rec", label: "A book recommended by another user on BSR" },
  { id: "been-putting-off", label: "A book you've been putting off" },
];

function SpringChallengeSection() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bookTitle, setBookTitle] = useState("");
  const [attachingPrompt, setAttachingPrompt] = useState<string | null>(null);
  const [attachBookInput, setAttachBookInput] = useState("");
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  const { data: spring, isLoading } = useQuery<SpringChallenge | null>({
    queryKey: ["/api/user/spring-challenge"],
    queryFn: async () => {
      const res = await fetch("/api/user/spring-challenge?year=2026", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: badges } = useQuery<UserBadge[]>({
    queryKey: ["/api/user/badges"],
    enabled: isAuthenticated,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/spring-challenge"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/spring-challenge"] });
      toast({ title: "You're in!", description: "Welcome to the Spring Reading Bloom Challenge!" });
    },
    onError: () => toast({ title: "Error", description: "Could not join challenge.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { completedPrompts?: string[]; booksLogged?: string[] }) =>
      apiRequest("PATCH", "/api/user/spring-challenge", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/spring-challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/badges"] });
    },
    onError: (err: any) => {
      const msg = err?.message?.includes("window closed") ? "This challenge window is closed." : "Could not update.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const markPrompt = (id: string) => {
    if (!spring) return;
    const current = spring.completedPrompts || [];
    const updated = current.includes(id) ? current.filter(s => s !== id) : [...current, id];
    updateMutation.mutate({ completedPrompts: updated });
    const wasAdding = !current.includes(id);
    if (wasAdding && updated.length === 12 && current.length < 12) {
      toast({ title: "Challenge Complete!", description: "You earned the Spring Bloom 2026 badge!" });
    }
  };

  const addBook = () => {
    if (!spring || !bookTitle.trim()) return;
    const updated = [...(spring.booksLogged || []), bookTitle.trim()];
    updateMutation.mutate({ booksLogged: updated });
    setBookTitle("");
    toast({ title: "Book logged!", description: `${updated.length} books logged for the Spring challenge.` });
  };

  const removeBook = (index: number) => {
    if (!spring) return;
    const updated = (spring.booksLogged || []).filter((_, i) => i !== index);
    updateMutation.mutate({ booksLogged: updated });
  };

  const attachBook = (promptId: string) => {
    if (!spring || !attachBookInput.trim()) return;
    const existing = (spring.booksLogged || []).filter(b => !b.startsWith(`${promptId}:`));
    const updated = [...existing, `${promptId}:${attachBookInput.trim()}`];
    updateMutation.mutate({ booksLogged: updated });
    setAttachBookInput("");
    setAttachingPrompt(null);
    toast({ title: "Book attached!", description: `Linked to this prompt.` });
  };

  const getAttachedBook = (promptId: string) => {
    const entry = (spring?.booksLogged || []).find(b => b.startsWith(`${promptId}:`));
    return entry ? entry.substring(promptId.length + 1) : null;
  };

  const completedCount = spring?.completedPrompts?.length || 0;
  const hasSpringBadge = badges?.some(b => b.badgeName === "Spring Bloom 2026");
  const isPending = joinMutation.isPending || updateMutation.isPending;

  if (!isAuthenticated) return null;
  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <Flower2 className="w-7 h-7 text-pink-500" />
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-spring-title">
            Spring Reading Bloom Challenge
          </h2>
        </div>
        <p className="text-muted-foreground italic">March 10 – April 15, 2026</p>
      </div>

      {!spring ? (
        <Card className="p-8 text-center bg-gradient-to-br from-pink-50 to-green-50 dark:from-pink-950/20 dark:to-green-950/20 border-pink-200 dark:border-pink-800">
          <Flower2 className="w-12 h-12 text-pink-500 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold mb-2">Join the Spring Bloom</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Complete 12 reading prompts to earn the Spring Bloom 2026 badge. Track your books and bloom through the season!
          </p>
          <Button onClick={() => joinMutation.mutate()} disabled={isPending} size="lg" data-testid="button-join-spring">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Flower2 className="w-4 h-4 mr-2" />}
            Join the Challenge
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flower2 className="w-5 h-5 text-pink-500" />
                <h3 className="font-bold">Progress</h3>
                <Badge variant={completedCount >= 12 ? "default" : "outline"} data-testid="badge-spring-count">
                  {completedCount}/12
                </Badge>
              </div>
              {hasSpringBadge && (
                <div className="flex items-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                  <Award className="w-4 h-4" />
                  Badge Earned!
                </div>
              )}
            </div>
            <Progress value={(completedCount / 12) * 100} className="h-2" />
          </Card>

          <Card className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Check className="w-4 h-4" /> Reading Prompts
            </h3>
            <div className="space-y-2" data-testid="spring-prompts-list">
              {SPRING_PROMPTS.map((prompt) => {
                const done = spring.completedPrompts?.includes(prompt.id);
                const attachedBook = getAttachedBook(prompt.id);
                return (
                  <div key={prompt.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => markPrompt(prompt.id)}
                        disabled={isPending}
                        className={`flex-1 text-left rounded-lg border px-4 py-3 flex items-center gap-3 transition-all ${
                          done
                            ? "bg-primary/10 border-primary text-foreground"
                            : "bg-card hover:bg-accent border-border"
                        }`}
                        data-testid={`spring-prompt-${prompt.id}`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          done ? "border-primary bg-primary" : "border-muted-foreground"
                        }`}>
                          {done && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${done ? "line-through text-muted-foreground" : ""}`}>
                            {prompt.label}
                          </span>
                          {attachedBook && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              <BookOpen className="w-3 h-3 inline mr-1" />{attachedBook}
                            </p>
                          )}
                        </div>
                      </button>
                      {done && !attachedBook && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setAttachingPrompt(prompt.id); setAttachBookInput(""); }}
                          className="text-xs shrink-0"
                          data-testid={`button-attach-${prompt.id}`}
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" />
                          Attach
                        </Button>
                      )}
                    </div>
                    {attachingPrompt === prompt.id && (
                      <div className="flex gap-2 pl-10">
                        <Input
                          placeholder="Book title for this prompt..."
                          value={attachBookInput}
                          onChange={(e) => setAttachBookInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && attachBook(prompt.id)}
                          className="h-8 text-sm"
                          autoFocus
                          data-testid={`input-attach-${prompt.id}`}
                        />
                        <Button size="sm" onClick={() => attachBook(prompt.id)} disabled={!attachBookInput.trim()} className="h-8">
                          <Plus className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAttachingPrompt(null)} className="h-8">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Challenge() {
  const [newBookTitle, setNewBookTitle] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [activeTab, setActiveTab] = useState<"yearly" | "summer" | "spring">("spring");
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();

  const { data: challenge, isLoading: challengeLoading } = useQuery<UserChallenge | null>({
    queryKey: ["/api/user/challenge", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/user/challenge?year=${currentYear}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (goal: number) => {
      return apiRequest("POST", "/api/user/challenge", { goal, year: currentYear });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({
        title: "Challenge started!",
        description: `You've set a goal to read books in ${currentYear}. Let's do this!`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create challenge.", variant: "destructive" });
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: async (updates: { goal?: number; booksRead?: string[] }) => {
      if (!challenge) throw new Error("No challenge");
      return apiRequest("PATCH", `/api/user/challenge/${challenge.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update challenge.", variant: "destructive" });
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!challenge) throw new Error("No challenge");
      return apiRequest("DELETE", `/api/user/challenge/${challenge.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({ title: "Challenge reset", description: "Your challenge has been cleared." });
    },
  });

  const startChallenge = (goal: number) => {
    createChallengeMutation.mutate(goal);
  };

  const addBook = () => {
    if (!challenge || !newBookTitle.trim()) return;
    
    const updatedBooks = [...(challenge.booksRead || []), newBookTitle.trim()];
    updateChallengeMutation.mutate({ booksRead: updatedBooks });
    setNewBookTitle("");
    
    const remaining = challenge.goal - updatedBooks.length;
    if (remaining <= 0) {
      toast({
        title: "Congratulations!",
        description: "You've completed your reading challenge!",
      });
    } else {
      toast({
        title: "Book added!",
        description: `${remaining} more to reach your goal.`,
      });
    }
  };

  const removeBook = (index: number) => {
    if (!challenge) return;
    const updatedBooks = (challenge.booksRead || []).filter((_, i) => i !== index);
    updateChallengeMutation.mutate({ booksRead: updatedBooks });
  };

  const updateGoal = () => {
    const newGoal = parseInt(goalInput);
    if (!challenge || isNaN(newGoal) || newGoal < 1) return;
    
    updateChallengeMutation.mutate({ goal: newGoal });
    setEditingGoal(false);
    toast({
      title: "Goal updated!",
      description: `New goal: ${newGoal} books.`,
    });
  };

  const resetChallenge = () => {
    deleteChallengeMutation.mutate();
  };

  const booksRead = challenge?.booksRead || [];
  const progress = challenge ? Math.min(100, (booksRead.length / challenge.goal) * 100) : 0;
  const isComplete = challenge && booksRead.length >= challenge.goal;
  const isLoading = authLoading || challengeLoading;
  const isPending = createChallengeMutation.isPending || updateChallengeMutation.isPending || deleteChallengeMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Reading Challenge" description="Set your annual reading goal, join the 2026 Summer Reading Escape, and track your progress." />
      <Navigation />

      <main className="flex-1">
        <section className="py-12 lg:py-16">
          <div className="container px-4 mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Target className="w-8 h-8 text-primary" />
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
                  Reading Challenge
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                Set goals, join seasonal challenges, and track your reading journey.
              </p>
            </motion.div>

            {isAuthenticated && (
              <div className="flex justify-center gap-2 mb-8 flex-wrap">
                <Button
                  variant={activeTab === "spring" ? "default" : "outline"}
                  onClick={() => setActiveTab("spring")}
                  className="gap-1.5"
                  data-testid="tab-spring"
                >
                  <Flower2 className="w-4 h-4" />
                  Spring Bloom
                </Button>
                <Button
                  variant={activeTab === "summer" ? "default" : "outline"}
                  onClick={() => setActiveTab("summer")}
                  className="gap-1.5"
                  data-testid="tab-summer"
                >
                  <Sun className="w-4 h-4" />
                  Summer Escape
                </Button>
                <Button
                  variant={activeTab === "yearly" ? "default" : "outline"}
                  onClick={() => setActiveTab("yearly")}
                  className="gap-1.5"
                  data-testid="tab-yearly"
                >
                  <Target className="w-4 h-4" />
                  Yearly Goal
                </Button>
                <Link href="/badges">
                  <Button variant="outline" className="gap-1.5" data-testid="tab-badges">
                    <Award className="w-4 h-4" />
                    My Badges
                  </Button>
                </Link>
              </div>
            )}

            {!isAuthenticated ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-8 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <LogIn className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold mb-4">
                    Sign In to Start Your Challenge
                  </h2>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Create a free account to set your reading goal, join seasonal challenges, and track your progress.
                  </p>
                  <a href="/api/login">
                    <Button size="lg" data-testid="button-login-challenge">
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In to Get Started
                    </Button>
                  </a>
                </Card>
              </motion.div>
            ) : activeTab === "spring" ? (
              <SpringChallengeSection />
            ) : activeTab === "summer" ? (
              <SummerChallengeSection />
            ) : isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !challenge ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-6 md:p-8">
                  <h2 className="font-display text-2xl font-bold mb-4 text-center">
                    Start Your {currentYear} Challenge
                  </h2>
                  <p className="text-muted-foreground text-center mb-6">
                    How many books do you want to read this year?
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[12, 24, 52].map((goal) => (
                      <Button
                        key={goal}
                        variant="outline"
                        className="h-20 flex-col"
                        onClick={() => startChallenge(goal)}
                        disabled={isPending}
                        data-testid={`button-goal-${goal}`}
                      >
                        <span className="text-2xl font-bold">{goal}</span>
                        <span className="text-xs text-muted-foreground">
                          {goal === 12 ? "1/month" : goal === 24 ? "2/month" : "1/week"}
                        </span>
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Custom goal..."
                      min="1"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      data-testid="input-custom-goal"
                    />
                    <Button
                      onClick={() => {
                        const goal = parseInt(goalInput);
                        if (goal > 0) startChallenge(goal);
                      }}
                      disabled={!goalInput || parseInt(goalInput) < 1 || isPending}
                      data-testid="button-set-custom-goal"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Set Goal"}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {isComplete ? (
                        <Trophy className="w-8 h-8 text-yellow-500" />
                      ) : (
                        <Target className="w-8 h-8 text-primary" />
                      )}
                      <div>
                        <h2 className="font-display text-xl font-bold">
                          {currentYear} Reading Goal
                        </h2>
                        {editingGoal ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              className="w-20 h-7 text-sm"
                              value={goalInput}
                              onChange={(e) => setGoalInput(e.target.value)}
                              min="1"
                              data-testid="input-edit-goal"
                            />
                            <Button size="sm" variant="ghost" onClick={updateGoal} disabled={isPending} data-testid="button-save-goal">
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setGoalInput(challenge.goal.toString()); setEditingGoal(true); }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                            data-testid="button-edit-goal"
                          >
                            Goal: {challenge.goal} books (click to edit)
                          </button>
                        )}
                      </div>
                    </div>
                    <Badge variant={isComplete ? "default" : "secondary"} className="text-lg px-3 py-1">
                      {booksRead.length} / {challenge.goal}
                    </Badge>
                  </div>

                  <Progress value={progress} className="h-3 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    {isComplete 
                      ? "Challenge completed! Keep reading!"
                      : `${challenge.goal - booksRead.length} books to go`
                    }
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Add a Book
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter book title..."
                      value={newBookTitle}
                      onChange={(e) => setNewBookTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addBook()}
                      data-testid="input-book-title"
                    />
                    <Button onClick={addBook} disabled={!newBookTitle.trim() || isPending} data-testid="button-add-book">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    </Button>
                  </div>
                </Card>

                {booksRead.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-display text-lg font-bold mb-4">
                      Books Read ({booksRead.length})
                    </h3>
                    <ul className="space-y-2">
                      {booksRead.map((title, index) => (
                        <li key={index} className="flex items-center justify-between bg-secondary/30 rounded-lg px-4 py-2">
                          <span className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-green-500" />
                            {title}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeBook(index)}
                            disabled={isPending}
                            data-testid={`button-remove-book-${index}`}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                <div className="flex justify-center">
                  <Button 
                    variant="ghost" 
                    className="text-destructive" 
                    onClick={resetChallenge}
                    disabled={isPending}
                    data-testid="button-reset-challenge"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset Challenge
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}