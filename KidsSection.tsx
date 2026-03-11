import { useState, useEffect, useRef, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Trash2, Loader2, LogIn, Star, Flame, Trophy, Target, Edit, ArrowLeft, Timer, Play, Pause, Square, Lock, Sparkles, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type ChildProfile, type ChildReadingLog, type ChildReadingGoal, type ChildChallenge } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";

const AVATAR_EMOJIS = ["📚", "🦊", "🐱", "🐶", "🦄", "🐸", "🦁", "🐼", "🐰", "🦋", "🐝", "🌟", "🚀", "🎨", "🌈"];

const BADGE_INFO: Record<string, { name: string; emoji: string; description: string }> = {
  first_book: { name: "First Book", emoji: "📖", description: "Read your very first book!" },
  bookworm_5: { name: "Bookworm", emoji: "🐛", description: "Read 5 books!" },
  super_reader_10: { name: "Super Reader", emoji: "🦸", description: "Read 10 books!" },
  reading_champion_25: { name: "Reading Champion", emoji: "🏆", description: "Read 25 books!" },
  library_legend_50: { name: "Library Legend", emoji: "👑", description: "Read 50 books!" },
  streak_3: { name: "On Fire", emoji: "🔥", description: "3-day reading streak!" },
  streak_7: { name: "Week Warrior", emoji: "⚔️", description: "7-day reading streak!" },
  streak_14: { name: "Fortnight Force", emoji: "💪", description: "14-day reading streak!" },
  streak_30: { name: "Monthly Master", emoji: "🌙", description: "30-day reading streak!" },
  book_reporter: { name: "Book Reporter", emoji: "✍️", description: "Wrote a book report!" },
  first_review: { name: "Star Giver", emoji: "⭐", description: "Gave your first star rating!" },
};

const LEVEL_INFO: Record<string, { emoji: string; color: string; minBooks: number }> = {
  "Reading Sprout": { emoji: "🌱", color: "text-green-500", minBooks: 0 },
  "Bookworm": { emoji: "🐛", color: "text-blue-500", minBooks: 5 },
  "Page Turner": { emoji: "📄", color: "text-purple-500", minBooks: 10 },
  "Story Master": { emoji: "🧙", color: "text-orange-500", minBooks: 25 },
  "Reading Champion": { emoji: "🏆", color: "text-yellow-500", minBooks: 50 },
};

const JELLY_BLOBS = ["🐙", "🪼", "🍬", "🫧", "🧸", "🌈", "🦑", "🍭", "⭐", "🎈"];

type ChallengeCategory = "time" | "genre" | "creative" | "skill" | "milestone" | "community";

interface ChallengeDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: ChallengeCategory;
  target: number;
  unit: string;
}

const CHALLENGE_CATEGORIES: Record<ChallengeCategory, { label: string; emoji: string; color: string }> = {
  time: { label: "Time-Based", emoji: "📅", color: "text-blue-500" },
  genre: { label: "Genre & Theme", emoji: "📚", color: "text-purple-500" },
  creative: { label: "Creative Format", emoji: "🔤", color: "text-green-500" },
  skill: { label: "Skill-Building", emoji: "🧠", color: "text-orange-500" },
  milestone: { label: "Milestone", emoji: "🌟", color: "text-yellow-500" },
  community: { label: "Community / Group", emoji: "🤝", color: "text-pink-500" },
};

const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  { id: "summer_bingo", name: "Summer Reading Bingo", emoji: "🎯", description: "Complete a bingo card of fun reading prompts like read outside, read before bed, or read to a pet!", category: "time", target: 9, unit: "prompts" },
  { id: "streak_30", name: "30-Day Reading Streak", emoji: "🔥", description: "Read every single day for a whole month!", category: "time", target: 30, unit: "days" },
  { id: "weekend_blitz", name: "Weekend Book Blitz", emoji: "⚡", description: "Finish a whole book in one weekend!", category: "time", target: 1, unit: "book" },
  { id: "readathon", name: "Read-a-Thon", emoji: "⏱️", description: "Track how many total minutes you can read in one week!", category: "time", target: 300, unit: "minutes" },
  { id: "genre_explorer", name: "Genre Explorer", emoji: "🗺️", description: "Read one book from 5 different genres — mystery, fantasy, sci-fi, and more!", category: "genre", target: 5, unit: "genres" },
  { id: "around_world", name: "Around the World", emoji: "🌍", description: "Read books set in or written by authors from different countries.", category: "genre", target: 5, unit: "countries" },
  { id: "award_winners", name: "Award Winners Club", emoji: "🏅", description: "Read books that won a Newbery, Caldecott, or other awards!", category: "genre", target: 3, unit: "award books" },
  { id: "classic_vs_new", name: "Classic vs. New", emoji: "⚔️", description: "Read one classic book and one brand-new release, then compare!", category: "genre", target: 2, unit: "books" },
  { id: "az_challenge", name: "A-Z Challenge", emoji: "🔠", description: "Read books whose titles start with each letter of the alphabet!", category: "creative", target: 26, unit: "letters" },
  { id: "color_palette", name: "Color Palette", emoji: "🎨", description: "Read books with colors in the title!", category: "creative", target: 5, unit: "color books" },
  { id: "number_crunch", name: "Number Crunch", emoji: "🔢", description: "Read books with numbers in the title!", category: "creative", target: 3, unit: "books" },
  { id: "series_sprint", name: "Series Sprint", emoji: "📖", description: "Complete a full book series from start to finish!", category: "creative", target: 3, unit: "books in series" },
  { id: "read_review", name: "Read & Review", emoji: "✍️", description: "Write a short review after every book you read for a month!", category: "skill", target: 4, unit: "reviews" },
  { id: "book_to_movie", name: "Book-to-Movie", emoji: "🎬", description: "Read a book, then watch its movie adaptation and compare!", category: "skill", target: 1, unit: "book + movie" },
  { id: "read_aloud", name: "Read Aloud", emoji: "🗣️", description: "Read a full book aloud to someone — a sibling, parent, or even a pet!", category: "skill", target: 1, unit: "book" },
  { id: "retell_it", name: "Retell It", emoji: "💬", description: "After finishing a book, summarize it in exactly 5 sentences!", category: "skill", target: 3, unit: "summaries" },
  { id: "ten_books_club", name: "10 Books Club", emoji: "🔟", description: "Finish 10 books in a single season!", category: "milestone", target: 10, unit: "books" },
  { id: "hundred_pages", name: "100 Pages in a Day", emoji: "📄", description: "Read 100 pages in a single sitting — can you do it?", category: "milestone", target: 100, unit: "pages" },
  { id: "author_deep_dive", name: "Author Deep Dive", emoji: "🔍", description: "Read 3 books by the same author!", category: "milestone", target: 3, unit: "books" },
  { id: "big_book_brave", name: "Big Book Brave", emoji: "💪", description: "Finish a book that's over 300 pages!", category: "milestone", target: 1, unit: "big book" },
  { id: "buddy_read", name: "Buddy Read", emoji: "👯", description: "Read the same book as a friend and discuss it together!", category: "community", target: 1, unit: "buddy read" },
  { id: "family_book_club", name: "Family Book Club", emoji: "👨‍👩‍👧‍👦", description: "Every family member reads the same book and talks about it!", category: "community", target: 1, unit: "family read" },
  { id: "class_challenge", name: "Class Challenge", emoji: "🏫", description: "Track collective reading as a class or group goal!", category: "community", target: 20, unit: "books together" },
];

function JellyLockScreen({ onUnlock, onCancel }: { onUnlock: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [savedPin, setSavedPin] = useState(() => {
    try { return localStorage.getItem("kids-corner-pin") || ""; } catch { return ""; }
  });
  const [settingPin, setSettingPin] = useState(!savedPin);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const handlePinSubmit = () => {
    if (pin === savedPin) {
      onUnlock();
      setPin("");
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 1500);
    }
  };

  const handleSetPin = () => {
    if (newPin.length >= 4 && newPin === confirmPin) {
      localStorage.setItem("kids-corner-pin", newPin);
      setSavedPin(newPin);
      setSettingPin(false);
      setNewPin("");
      setConfirmPin("");
    }
  };

  if (settingPin) {
    return (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {JELLY_BLOBS.map((blob, i) => (
          <motion.div
            key={i}
            className="absolute text-4xl opacity-20 select-none pointer-events-none"
            style={{ left: `${10 + (i * 9) % 80}%`, top: `${5 + (i * 13) % 85}%` }}
            animate={{ y: [0, -20, 0], rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {blob}
          </motion.div>
        ))}
        <Card className="p-8 text-center max-w-sm mx-4 relative z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>
            <Lock className="h-12 w-12 mx-auto mb-4 text-purple-500" />
          </motion.div>
          <h2 className="text-xl font-bold mb-2">Set Parent PIN</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create a 4-digit PIN that parents will use to exit Kids Corner
          </p>
          <div className="space-y-3">
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter PIN (4+ digits)"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em]"
              data-testid="input-set-pin"
            />
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em]"
              data-testid="input-confirm-pin"
            />
            {newPin.length >= 4 && confirmPin.length >= 4 && newPin !== confirmPin && (
              <p className="text-xs text-destructive">PINs don't match</p>
            )}
            <Button
              className="w-full"
              disabled={newPin.length < 4 || newPin !== confirmPin}
              onClick={handleSetPin}
              data-testid="button-save-pin"
            >
              Save PIN & Enter Kids Corner
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => { setSavedPin("0000"); setSettingPin(false); localStorage.setItem("kids-corner-pin", "0000"); }} data-testid="button-skip-pin">
              Skip (use default: 0000)
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {JELLY_BLOBS.slice(0, 6).map((blob, i) => (
        <motion.div
          key={i}
          className="absolute text-5xl opacity-15 select-none pointer-events-none"
          style={{ left: `${15 + (i * 15) % 70}%`, top: `${10 + (i * 17) % 75}%` }}
          animate={{ y: [0, -15, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {blob}
        </motion.div>
      ))}
      <Card className="p-8 text-center max-w-sm mx-4 relative z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
        <motion.div
          animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <Lock className="h-10 w-10 mx-auto mb-4 text-purple-500" />
          <h2 className="text-lg font-bold mb-2">Parent PIN Required</h2>
          <p className="text-sm text-muted-foreground mb-4">Enter your PIN to leave Kids Corner</p>
          <Input
            type="password"
            inputMode="numeric"
            maxLength={6}
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && pin.length >= 4 && handlePinSubmit()}
            className={`text-center text-2xl tracking-[0.5em] mb-3 ${error ? "border-destructive" : ""}`}
            autoFocus
            data-testid="input-unlock-pin"
          />
          {error && <p className="text-xs text-destructive mb-3">Incorrect PIN, try again</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel} data-testid="button-cancel-unlock">
              Cancel
            </Button>
            <Button className="flex-1" disabled={pin.length < 4} onClick={handlePinSubmit} data-testid="button-submit-pin">
              Unlock
            </Button>
          </div>
        </motion.div>
      </Card>
    </motion.div>
  );
}

function ReadingTimer({ onTimerComplete }: { onTimerComplete: (minutes: number) => void }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(accumulatedRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = elapsed;
    setIsRunning(false);
  }, [elapsed]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const totalMinutes = Math.max(1, Math.round(elapsed / 60));
    onTimerComplete(totalMinutes);
    setElapsed(0);
    accumulatedRef.current = 0;
    setIsRunning(false);
    setShowTimer(false);
  }, [elapsed, onTimerComplete]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const minutes = Math.floor(elapsed / 60);

  if (!showTimer) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setShowTimer(true)}
        data-testid="button-open-timer"
      >
        <Timer className="h-4 w-4" />
        Reading Timer
      </Button>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="p-6 text-center bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Timer className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-lg">Reading Timer</h3>
        </div>

        <div className="relative w-40 h-40 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
            <motion.circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="url(#timerGradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - (elapsed % 60) / 60)}`}
              animate={{ strokeDashoffset: `${2 * Math.PI * 54 * (1 - (elapsed % 60) / 60)}` }}
            />
            <defs>
              <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(280, 80%, 60%)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              className="text-3xl font-mono font-bold"
              animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              data-testid="text-timer-display"
            >
              {formatTime(elapsed)}
            </motion.div>
            <div className="text-xs text-muted-foreground mt-1">
              {minutes > 0 ? `${minutes} min read` : "Ready to read!"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          {!isRunning && elapsed === 0 && (
            <Button onClick={startTimer} className="gap-2 rounded-full px-6" data-testid="button-start-timer">
              <Play className="h-4 w-4" /> Start Reading
            </Button>
          )}
          {isRunning && (
            <Button onClick={pauseTimer} variant="secondary" className="gap-2 rounded-full px-6" data-testid="button-pause-timer">
              <Pause className="h-4 w-4" /> Pause
            </Button>
          )}
          {!isRunning && elapsed > 0 && (
            <>
              <Button onClick={startTimer} className="gap-2 rounded-full" data-testid="button-resume-timer">
                <Play className="h-4 w-4" /> Resume
              </Button>
              <Button onClick={stopTimer} variant="secondary" className="gap-2 rounded-full" data-testid="button-stop-timer">
                <Square className="h-4 w-4" /> Done ({Math.max(1, Math.round(elapsed / 60))} min)
              </Button>
            </>
          )}
          {isRunning && (
            <Button onClick={stopTimer} variant="outline" size="sm" className="gap-1 rounded-full" data-testid="button-finish-timer">
              <Square className="h-3 w-3" /> Finish
            </Button>
          )}
        </div>

        {!isRunning && elapsed === 0 && (
          <Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={() => setShowTimer(false)} data-testid="button-close-timer">
            Hide Timer
          </Button>
        )}
      </Card>
    </motion.div>
  );
}

function ChallengesSection({ childId, challenges }: { childId: number; challenges: ChildChallenge[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showBrowse, setShowBrowse] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ChallengeCategory | "all">("all");

  const startChallengeMutation = useMutation({
    mutationFn: async (def: ChallengeDefinition) => {
      return apiRequest("POST", `/api/children/${childId}/challenges`, {
        challengeId: def.id,
        target: def.target,
        status: "active",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "challenges"] });
      toast({ title: "Challenge started!", description: "Good luck — you've got this!" });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ challengeId, progress, target }: { challengeId: number; progress: number; target: number }) => {
      const isComplete = progress >= target;
      return apiRequest("PATCH", `/api/children/${childId}/challenges/${challengeId}`, {
        progress,
        status: isComplete ? "completed" : "active",
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "challenges"] });
      if (variables.progress >= variables.target) {
        toast({ title: "Challenge complete!", description: "Amazing job! You did it!" });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (challengeId: number) => {
      return apiRequest("DELETE", `/api/children/${childId}/challenges/${challengeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", childId, "challenges"] });
      toast({ title: "Challenge removed" });
    },
  });

  const activeChallenges = challenges.filter(c => c.status === "active");
  const completedChallenges = challenges.filter(c => c.status === "completed");
  const startedIds = new Set(challenges.map(c => c.challengeId));

  const filteredDefinitions = CHALLENGE_DEFINITIONS.filter(d =>
    !startedIds.has(d.id) && (selectedCategory === "all" || d.category === selectedCategory)
  );

  return (
    <Card className="p-6" data-testid="challenges-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5" /> Reading Challenges
        </h2>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowBrowse(!showBrowse)} data-testid="button-browse-challenges">
          {showBrowse ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showBrowse ? "Close" : "Browse"}
        </Button>
      </div>

      {showBrowse && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              size="sm"
              variant={selectedCategory === "all" ? "default" : "outline"}
              onClick={() => setSelectedCategory("all")}
              data-testid="button-filter-all"
            >
              All
            </Button>
            {(Object.entries(CHALLENGE_CATEGORIES) as [ChallengeCategory, { label: string; emoji: string }][]).map(([key, cat]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? "default" : "outline"}
                onClick={() => setSelectedCategory(key)}
                data-testid={`button-filter-${key}`}
              >
                {cat.emoji} {cat.label}
              </Button>
            ))}
          </div>

          {filteredDefinitions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {startedIds.size > 0 ? "You've started all challenges in this category!" : "No challenges available."}
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {filteredDefinitions.map((def) => {
                const catInfo = CHALLENGE_CATEGORIES[def.category];
                return (
                  <div key={def.id} className="p-3 bg-muted/30 rounded-lg border border-border/50" data-testid={`challenge-browse-${def.id}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">{def.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{def.name}</div>
                        <Badge variant="outline" className={`text-[10px] ${catInfo.color} mt-0.5`}>
                          {catInfo.emoji} {catInfo.label}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{def.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Goal: {def.target} {def.unit}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full mt-2 gap-1"
                      disabled={startChallengeMutation.isPending}
                      onClick={() => startChallengeMutation.mutate(def)}
                      data-testid={`button-start-${def.id}`}
                    >
                      <Sparkles className="h-3 w-3" /> Start Challenge
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {activeChallenges.length === 0 && completedChallenges.length === 0 && !showBrowse && (
        <p className="text-muted-foreground text-center py-4 text-sm" data-testid="text-no-challenges">
          No challenges yet! Browse to pick your first one.
        </p>
      )}

      {activeChallenges.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active</p>
          {activeChallenges.map((ch) => {
            const def = CHALLENGE_DEFINITIONS.find(d => d.id === ch.challengeId);
            if (!def) return null;
            const progress = ch.progress || 0;
            const target = ch.target || def.target;
            const percent = Math.min(100, Math.round((progress / target) * 100));

            return (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 bg-muted/30 rounded-lg"
                data-testid={`challenge-active-${ch.id}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{def.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{def.name}</div>
                    <div className="text-[10px] text-muted-foreground">{progress}/{target} {def.unit}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateProgressMutation.mutate({ challengeId: ch.id, progress: Math.max(0, progress - 1), target })}
                      disabled={progress <= 0}
                      data-testid={`button-progress-minus-${ch.id}`}
                    >
                      -
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => updateProgressMutation.mutate({ challengeId: ch.id, progress: progress + 1, target })}
                      data-testid={`button-progress-plus-${ch.id}`}
                    >
                      +
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground"
                      onClick={() => removeMutation.mutate(ch.id)}
                      data-testid={`button-remove-challenge-${ch.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Progress value={percent} className="h-2" />
              </motion.div>
            );
          })}
        </div>
      )}

      {completedChallenges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Completed</p>
          {completedChallenges.slice(0, 5).map((ch) => {
            const def = CHALLENGE_DEFINITIONS.find(d => d.id === ch.challengeId);
            if (!def) return null;
            return (
              <div key={ch.id} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg" data-testid={`challenge-completed-${ch.id}`}>
                <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-lg">{def.emoji}</span>
                <span className="text-sm font-medium flex-1 truncate">{def.name}</span>
                <Badge variant="secondary" className="text-[10px]">Done!</Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function StarRating({ rating, onRate, size = "md" }: { rating: number; onRate?: (r: number) => void; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onRate?.(s)}
          className={`transition-colors ${onRate ? "cursor-pointer hover:text-yellow-400" : "cursor-default"}`}
          data-testid={`star-${s}`}
        >
          <Star className={`${starSize} ${s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );
}

export default function KidsSection() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [showExitLock, setShowExitLock] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(0);

  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [newChildEmoji, setNewChildEmoji] = useState("📚");

  const [logBookTitle, setLogBookTitle] = useState("");
  const [logBookAuthor, setLogBookAuthor] = useState("");
  const [logPages, setLogPages] = useState("");
  const [logMinutes, setLogMinutes] = useState("");
  const [logCompleted, setLogCompleted] = useState(false);
  const [logRating, setLogRating] = useState(0);
  const [logNote, setLogNote] = useState("");

  const [goalType, setGoalType] = useState("books");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalPeriod, setGoalPeriod] = useState("weekly");

  const { data: children = [], isLoading: childrenLoading } = useQuery<ChildProfile[]>({
    queryKey: ["/api/children"],
    enabled: isAuthenticated,
  });

  const selectedChild = children.find(c => c.id === selectedChildId) || null;

  const { data: readingLogs = [] } = useQuery<ChildReadingLog[]>({
    queryKey: ["/api/children", selectedChildId, "reading-log"],
    queryFn: async () => {
      const res = await fetch(`/api/children/${selectedChildId}/reading-log`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChildId,
  });

  const { data: goals = [] } = useQuery<ChildReadingGoal[]>({
    queryKey: ["/api/children", selectedChildId, "goals"],
    queryFn: async () => {
      const res = await fetch(`/api/children/${selectedChildId}/goals`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChildId,
  });

  const { data: kidsChallenges = [] } = useQuery<ChildChallenge[]>({
    queryKey: ["/api/children", selectedChildId, "challenges"],
    queryFn: async () => {
      const res = await fetch(`/api/children/${selectedChildId}/challenges`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedChildId,
  });

  const createChildMutation = useMutation({
    mutationFn: async (data: { name: string; age: number; avatarEmoji: string }) => {
      return apiRequest("POST", "/api/children", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setShowAddChild(false);
      setNewChildName("");
      setNewChildAge("");
      setNewChildEmoji("📚");
      toast({ title: "Reader added!", description: "Your young reader's profile has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create profile.", variant: "destructive" });
    },
  });

  const updateChildMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest("PATCH", `/api/children/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setEditingChild(null);
      toast({ title: "Updated!", description: "Profile updated." });
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/children/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setSelectedChildId(null);
      toast({ title: "Removed", description: "Reader profile has been removed." });
    },
  });

  const addLogMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/children/${selectedChildId}/reading-log`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children", selectedChildId, "reading-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/children", selectedChildId, "goals"] });
      setShowAddLog(false);
      resetLogForm();
      toast({ title: "Reading logged!", description: "Great job keeping track of reading!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to log reading.", variant: "destructive" });
    },
  });

  const addGoalMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/children/${selectedChildId}/goals`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children", selectedChildId, "goals"] });
      setShowAddGoal(false);
      setGoalTarget("");
      toast({ title: "Goal set!", description: "New reading goal created!" });
    },
  });

  const handleTimerComplete = useCallback((minutes: number) => {
    setTimerMinutes(minutes);
    setLogMinutes(String(minutes));
    setShowAddLog(true);
    toast({ title: "Great reading session!", description: `You read for ${minutes} minute${minutes !== 1 ? "s" : ""}! Log your reading now.` });
  }, [toast]);

  function resetLogForm() {
    setLogBookTitle("");
    setLogBookAuthor("");
    setLogPages("");
    setLogMinutes("");
    setLogCompleted(false);
    setLogRating(0);
    setLogNote("");
    setTimerMinutes(0);
  }

  if (authLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <SEOHead title="Kids Corner | Book Slump Rescue" description="A fun, gamified reading tracker for young readers" />
        <Navigation />
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold mb-2">Kids Corner</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to create reading profiles for your young readers and track their reading adventures!
            </p>
            <a href="/api/login">
              <Button className="gap-2" data-testid="button-sign-in-kids">
                <LogIn className="h-4 w-4" />
                Sign In to Get Started
              </Button>
            </a>
          </Card>
        </div>
      </>
    );
  }

  if (selectedChild) {
    const levelInfo = LEVEL_INFO[selectedChild.readingLevel || "Reading Sprout"] || LEVEL_INFO["Reading Sprout"];
    const activeGoals = goals.filter(g => !g.isCompleted);
    const completedGoals = goals.filter(g => g.isCompleted);

    return (
      <>
        <SEOHead title={`${selectedChild.name}'s Reading Dashboard | Book Slump Rescue`} description={`Track ${selectedChild.name}'s reading progress`} />
        {showExitLock && <JellyLockScreen onUnlock={() => { setShowExitLock(false); navigate("/"); }} onCancel={() => setShowExitLock(false)} />}
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" className="gap-2" onClick={() => setSelectedChildId(null)} data-testid="button-back-to-kids">
              <ArrowLeft className="h-4 w-4" /> Back to Kids Corner
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowExitLock(true)} data-testid="button-exit-kids">
              <Lock className="h-4 w-4" /> Exit Kids Corner
            </Button>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl" data-testid="text-child-avatar">{selectedChild.avatarEmoji}</div>
                  <div>
                    <h1 className="text-2xl font-bold" data-testid="text-child-name">{selectedChild.name}</h1>
                    <div className={`flex items-center gap-2 text-lg ${levelInfo.color}`}>
                      <span>{levelInfo.emoji}</span>
                      <span className="font-semibold" data-testid="text-reading-level">{selectedChild.readingLevel}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" data-testid="button-edit-child">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit {selectedChild.name}'s Profile</DialogTitle>
                      </DialogHeader>
                      <EditChildForm
                        child={selectedChild}
                        onSave={(data) => updateChildMutation.mutate({ id: selectedChild.id, data })}
                        isPending={updateChildMutation.isPending}
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Remove ${selectedChild.name}'s profile? This cannot be undone.`)) {
                        deleteChildMutation.mutate(selectedChild.id);
                      }
                    }}
                    data-testid="button-delete-child"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon="📚" label="Books Read" value={selectedChild.totalBooksRead || 0} testId="stat-books-read" />
                <StatCard icon="📄" label="Pages Read" value={selectedChild.totalPagesRead || 0} testId="stat-pages-read" />
                <StatCard icon="⏱️" label="Minutes Read" value={selectedChild.totalMinutesRead || 0} testId="stat-minutes-read" />
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    {(selectedChild.currentStreak || 0) > 0 ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <Flame className="h-5 w-5 text-orange-500" />
                      </motion.div>
                    ) : (
                      <Flame className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="text-2xl font-bold" data-testid="stat-streak">{selectedChild.currentStreak || 0}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </Card>
          </motion.div>

          <div className="mb-6">
            <ReadingTimer onTimerComplete={handleTimerComplete} />
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2"><Target className="h-5 w-5" /> Reading Goals</h2>
                <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1" data-testid="button-add-goal">
                      <Plus className="h-4 w-4" /> New Goal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Set a Reading Goal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Select value={goalType} onValueChange={setGoalType}>
                        <SelectTrigger data-testid="select-goal-type"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="books">Books to Read</SelectItem>
                          <SelectItem value="pages">Pages to Read</SelectItem>
                          <SelectItem value="minutes">Minutes to Read</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Target amount"
                        value={goalTarget}
                        onChange={(e) => setGoalTarget(e.target.value)}
                        data-testid="input-goal-target"
                      />
                      <Select value={goalPeriod} onValueChange={setGoalPeriod}>
                        <SelectTrigger data-testid="select-goal-period"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">This Week</SelectItem>
                          <SelectItem value="monthly">This Month</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        className="w-full"
                        disabled={!goalTarget || addGoalMutation.isPending}
                        onClick={() => addGoalMutation.mutate({
                          goalType,
                          targetAmount: parseInt(goalTarget),
                          period: goalPeriod,
                        })}
                        data-testid="button-submit-goal"
                      >
                        {addGoalMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Goal"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {activeGoals.length === 0 && completedGoals.length === 0 ? (
                <p className="text-muted-foreground text-center py-4" data-testid="text-no-goals">No reading goals yet. Set one to get started!</p>
              ) : (
                <div className="space-y-3">
                  {activeGoals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} />
                  ))}
                  {completedGoals.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Completed</p>
                      {completedGoals.slice(0, 3).map((goal) => (
                        <GoalCard key={goal.id} goal={goal} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><Trophy className="h-5 w-5" /> Badges Earned</h2>
              {(selectedChild.earnedBadges || []).length === 0 ? (
                <p className="text-muted-foreground text-center py-4" data-testid="text-no-badges">No badges yet. Keep reading to earn your first one!</p>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(selectedChild.earnedBadges || []).map((badgeId) => {
                    const info = BADGE_INFO[badgeId];
                    if (!info) return null;
                    return (
                      <motion.div
                        key={badgeId}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-center p-2 bg-muted/50 rounded-lg"
                        data-testid={`badge-${badgeId}`}
                      >
                        <div className="text-3xl mb-1">{info.emoji}</div>
                        <div className="text-xs font-semibold">{info.name}</div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Badges to unlock:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(BADGE_INFO)
                    .filter(([id]) => !(selectedChild.earnedBadges || []).includes(id))
                    .slice(0, 4)
                    .map(([id, info]) => (
                      <Badge key={id} variant="outline" className="text-xs opacity-50" data-testid={`badge-locked-${id}`}>
                        {info.emoji} {info.name}
                      </Badge>
                    ))}
                </div>
              </div>
            </Card>
          </div>

          <div className="mb-6">
            <ChallengesSection childId={selectedChild.id} challenges={kidsChallenges} />
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> Reading Log</h2>
              <Dialog open={showAddLog} onOpenChange={(open) => { setShowAddLog(open); if (!open) resetLogForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1" data-testid="button-add-reading-log">
                    <Plus className="h-4 w-4" /> Log Reading
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Log Reading Activity</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      placeholder="Book title"
                      value={logBookTitle}
                      onChange={(e) => setLogBookTitle(e.target.value)}
                      data-testid="input-log-book-title"
                    />
                    <Input
                      placeholder="Author (optional)"
                      value={logBookAuthor}
                      onChange={(e) => setLogBookAuthor(e.target.value)}
                      data-testid="input-log-book-author"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="number"
                        placeholder="Pages read"
                        value={logPages}
                        onChange={(e) => setLogPages(e.target.value)}
                        data-testid="input-log-pages"
                      />
                      <Input
                        type="number"
                        placeholder="Minutes read"
                        value={logMinutes}
                        onChange={(e) => setLogMinutes(e.target.value)}
                        data-testid="input-log-minutes"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer" data-testid="label-log-completed">
                      <input
                        type="checkbox"
                        checked={logCompleted}
                        onChange={(e) => setLogCompleted(e.target.checked)}
                        className="rounded"
                        data-testid="checkbox-log-completed"
                      />
                      <span className="text-sm">Finished this book!</span>
                    </label>
                    <div>
                      <p className="text-sm mb-1">Rating</p>
                      <StarRating rating={logRating} onRate={setLogRating} />
                    </div>
                    <Textarea
                      placeholder="Book report / notes (optional)"
                      value={logNote}
                      onChange={(e) => setLogNote(e.target.value)}
                      rows={3}
                      data-testid="textarea-log-note"
                    />
                    <Button
                      className="w-full"
                      disabled={!logBookTitle || addLogMutation.isPending}
                      onClick={() => addLogMutation.mutate({
                        bookTitle: logBookTitle,
                        bookAuthor: logBookAuthor || undefined,
                        pagesRead: logPages ? parseInt(logPages) : 0,
                        minutesRead: logMinutes ? parseInt(logMinutes) : 0,
                        completed: logCompleted,
                        rating: logRating || undefined,
                        note: logNote || undefined,
                      })}
                      data-testid="button-submit-reading-log"
                    >
                      {addLogMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log Reading"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {readingLogs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-logs">
                No reading logged yet. Start by clicking "Log Reading" above!
              </p>
            ) : (
              <div className="space-y-3">
                {readingLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg" data-testid={`reading-log-${log.id}`}>
                    <div className="text-2xl">📖</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" data-testid={`text-log-title-${log.id}`}>{log.bookTitle}</div>
                      {log.bookAuthor && <div className="text-sm text-muted-foreground">by {log.bookAuthor}</div>}
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {(log.pagesRead || 0) > 0 && <span>{log.pagesRead} pages</span>}
                        {(log.minutesRead || 0) > 0 && <span>{log.minutesRead} min</span>}
                        {log.completed && <Badge variant="secondary" className="text-xs">Finished</Badge>}
                        {log.rating && <StarRating rating={log.rating} size="sm" />}
                      </div>
                      {log.note && <p className="text-sm mt-2 text-muted-foreground italic">"{log.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Kids Corner | Book Slump Rescue" description="A fun, gamified reading tracker for young readers" />
      {showExitLock && <JellyLockScreen onUnlock={() => { setShowExitLock(false); navigate("/"); }} onCancel={() => setShowExitLock(false)} />}
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex justify-end mb-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowExitLock(true)} data-testid="button-exit-kids-main">
            <Lock className="h-4 w-4" /> Exit Kids Corner
          </Button>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-kids-corner-title">
            🌟 Kids Corner 🌟
          </h1>
          <p className="text-muted-foreground text-lg">
            Track your young reader's adventures and watch them earn badges!
          </p>
        </motion.div>

        {childrenLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <AnimatePresence>
                {children.map((child, i) => {
                  const levelInfo = LEVEL_INFO[child.readingLevel || "Reading Sprout"] || LEVEL_INFO["Reading Sprout"];
                  return (
                    <motion.div
                      key={child.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card
                        className="p-6 cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
                        onClick={() => setSelectedChildId(child.id)}
                        data-testid={`card-child-${child.id}`}
                      >
                        <div className="text-center mb-4">
                          <div className="text-5xl mb-2">{child.avatarEmoji}</div>
                          <h3 className="text-xl font-bold">{child.name}</h3>
                          <div className={`text-sm ${levelInfo.color} font-medium`}>
                            {levelInfo.emoji} {child.readingLevel}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">Age {child.age}</div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-muted/50 rounded-lg p-2">
                            <div className="text-lg font-bold">{child.totalBooksRead || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Books</div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <div className="text-lg font-bold flex items-center justify-center gap-0.5">
                              {(child.currentStreak || 0) > 0 && <Flame className="h-3 w-3 text-orange-500" />}
                              {child.currentStreak || 0}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Streak</div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <div className="text-lg font-bold">{(child.earnedBadges || []).length}</div>
                            <div className="text-[10px] text-muted-foreground">Badges</div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: children.length * 0.1 }}>
                <Dialog open={showAddChild} onOpenChange={setShowAddChild}>
                  <DialogTrigger asChild>
                    <Card className="p-6 cursor-pointer border-dashed hover:shadow-lg transition-all hover:border-primary/50 flex flex-col items-center justify-center min-h-[200px]" data-testid="card-add-child">
                      <Plus className="h-10 w-10 text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground font-medium">Add a Reader</p>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add a Young Reader</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <Input
                        placeholder="Reader's name"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        data-testid="input-child-name"
                      />
                      <Input
                        type="number"
                        placeholder="Age"
                        value={newChildAge}
                        onChange={(e) => setNewChildAge(e.target.value)}
                        min={3}
                        max={15}
                        data-testid="input-child-age"
                      />
                      <div>
                        <p className="text-sm mb-2">Choose an avatar</p>
                        <div className="flex flex-wrap gap-2">
                          {AVATAR_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setNewChildEmoji(emoji)}
                              className={`text-2xl p-2 rounded-lg transition-all ${newChildEmoji === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                              data-testid={`button-emoji-${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        disabled={!newChildName || !newChildAge || createChildMutation.isPending}
                        onClick={() => createChildMutation.mutate({
                          name: newChildName,
                          age: parseInt(newChildAge),
                          avatarEmoji: newChildEmoji,
                        })}
                        data-testid="button-submit-add-child"
                      >
                        {createChildMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Reader"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </div>

            {children.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-6xl mb-4">🌈</div>
                <h2 className="text-xl font-bold mb-2">Welcome to Kids Corner!</h2>
                <p className="text-muted-foreground mb-4">
                  Create a reading profile for your child to start tracking their reading adventures.
                  They'll earn badges, level up, and have fun while building great reading habits!
                </p>
                <div className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">🏆 Earn Badges</Badge>
                  <Badge variant="outline">🔥 Build Streaks</Badge>
                  <Badge variant="outline">📊 Track Progress</Badge>
                  <Badge variant="outline">⭐ Rate Books</Badge>
                </div>
              </Card>
            )}
          </>
        )}

        <Card className="mt-8 p-6 bg-muted/30">
          <h3 className="font-bold mb-3">How It Works</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex gap-3">
              <div className="text-2xl">1️⃣</div>
              <div>
                <p className="font-medium">Add Readers</p>
                <p className="text-muted-foreground">Create a profile for each child with their name, age, and a fun avatar.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">2️⃣</div>
              <div>
                <p className="font-medium">Log Reading</p>
                <p className="text-muted-foreground">Track books, pages, and minutes read. Rate books and write mini book reports!</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">3️⃣</div>
              <div>
                <p className="font-medium">Earn Rewards</p>
                <p className="text-muted-foreground">Watch them level up from Reading Sprout to Reading Champion and earn fun badges!</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, testId }: { icon: string; label: string; value: number; testId: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-bold" data-testid={testId}>{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function GoalCard({ goal }: { goal: ChildReadingGoal }) {
  const progress = goal.targetAmount > 0 ? Math.min(100, ((goal.currentAmount || 0) / goal.targetAmount) * 100) : 0;
  const typeLabel = goal.goalType === "books" ? "books" : goal.goalType === "pages" ? "pages" : "minutes";
  return (
    <div className={`p-3 rounded-lg ${goal.isCompleted ? "bg-green-500/10 border border-green-500/20" : "bg-muted/30"}`} data-testid={`goal-${goal.id}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">
          {goal.isCompleted ? "🎉 " : ""}{goal.currentAmount || 0} / {goal.targetAmount} {typeLabel}
        </span>
        <Badge variant="outline" className="text-xs">{goal.period}</Badge>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

function EditChildForm({ child, onSave, isPending }: { child: ChildProfile; onSave: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState(child.name);
  const [age, setAge] = useState(String(child.age));
  const [emoji, setEmoji] = useState(child.avatarEmoji);

  return (
    <div className="space-y-4 pt-4">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" data-testid="input-edit-child-name" />
      <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Age" min={3} max={15} data-testid="input-edit-child-age" />
      <div>
        <p className="text-sm mb-2">Avatar</p>
        <div className="flex flex-wrap gap-2">
          {AVATAR_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`text-2xl p-2 rounded-lg transition-all ${emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>
      <Button
        className="w-full"
        disabled={!name || !age || isPending}
        onClick={() => onSave({ name, age: parseInt(age), avatarEmoji: emoji })}
        data-testid="button-save-edit-child"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
      </Button>
    </div>
  );
}
