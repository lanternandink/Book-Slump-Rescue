import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Share2, Download } from "lucide-react";
import { ReadingStatsCard, type StatsCardData, type TemplateType } from "@/components/ReadingStatsCard";
import { useToast } from "@/hooks/use-toast";

export default function ShareStats() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [template, setTemplate] = useState<TemplateType>("minimal");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white dark:from-red-950 dark:to-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-serif font-bold mb-4">Sign in to create reading cards</h1>
          <p className="text-muted-foreground mb-8">Create and share your reading stats with the world.</p>
        </div>
      </div>
    );
  }

  const { data: userBooks = [] } = useQuery({
    queryKey: ["/api/user/books"],
    queryFn: () => fetch("/api/user/books").then(r => r.json()),
  });

  const { data: readingStreak } = useQuery({
    queryKey: ["/api/user/reading-streak"],
    queryFn: () => fetch("/api/user/reading-streak").then(r => r.json()),
  });

  const { data: userChallenge } = useQuery({
    queryKey: ["/api/user/challenge"],
    queryFn: () => fetch("/api/user/challenge").then(r => r.json()),
  });

  // Calculate stats
  const booksRead = userBooks.filter((b: any) => b.status === "finished").length;
  const totalPages = userBooks
    .filter((b: any) => b.status === "finished")
    .reduce((sum: number, b: any) => sum + (b.pageCount || 0), 0);

  const currentlyReading = userBooks.find((b: any) => b.status === "currently_reading")?.bookTitle;

  // Get favorite genre (most common genre in finished books)
  const genreCount: Record<string, number> = {};
  userBooks
    .filter((b: any) => b.status === "finished")
    .forEach((b: any) => {
      if (b.genre) {
        genreCount[b.genre] = (genreCount[b.genre] || 0) + 1;
      }
    });
  const favoriteGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0]?.[0];

  const cardData: StatsCardData = {
    displayName: user.displayName || "Reader",
    profileImageUrl: user.profileImageUrl || undefined,
    booksRead,
    totalPages,
    currentStreak: readingStreak?.currentStreak || 0,
    longestStreak: readingStreak?.longestStreak || 0,
    favoriteGenre: favoriteGenre || undefined,
    currentlyReading: currentlyReading || undefined,
    challengeProgress: userChallenge
      ? { current: userChallenge.booksRead?.length || 0, goal: userChallenge.goal }
      : undefined,
    theme,
    template,
  };

  const handleShare = async () => {
    if (!navigator.share) {
      toast({
        title: "Share not available",
        description: "Please download the image and share manually.",
        variant: "default",
      });
      return;
    }
    toast({
      title: "Download your card first!",
      description: "Then share the image on your social media.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
      <Navigation />
      <SEOHead
        title="Share Your Reading Stats | Book Slump Rescue"
        description="Create beautiful, shareable reading statistics cards with your yearly reading recap, streaks, and challenges."
      />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-serif font-bold mb-2">Reading Stats Cards</h1>
            <p className="text-lg text-muted-foreground">Create beautiful cards to share your reading journey</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Controls */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3">Template</h3>
                    <div className="space-y-2">
                      {(["minimal", "detailed", "achievement"] as const).map(t => (
                        <Button
                          key={t}
                          variant={template === t ? "default" : "outline"}
                          size="sm"
                          className="w-full capitalize"
                          onClick={() => setTemplate(t)}
                          data-testid={`button-template-${t}`}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Theme</h3>
                    <div className="space-y-2">
                      {(["light", "dark"] as const).map(t => (
                        <Button
                          key={t}
                          variant={theme === t ? "default" : "outline"}
                          size="sm"
                          className="w-full capitalize"
                          onClick={() => setTheme(t)}
                          data-testid={`button-theme-${t}`}
                        >
                          {t}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <div className="text-sm">
                      <p className="font-semibold mb-1">Your Stats</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>📚 {booksRead} books read</p>
                        <p>📖 {totalPages.toLocaleString()} pages</p>
                        <p>🔥 {readingStreak?.currentStreak || 0} day streak</p>
                        {currentlyReading && <p>📕 {currentlyReading}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Preview */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-900 rounded-lg p-8 flex justify-center overflow-x-auto">
                <div className="transform scale-50 origin-top-left">
                  <ReadingStatsCard data={cardData} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center mt-4">Preview (scaled down for display)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
