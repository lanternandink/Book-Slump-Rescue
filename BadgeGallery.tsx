import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Award, Share2, Loader2, Lock, Flower2, Sun, Star, BookOpen, Trophy, Sparkles, Pen, Medal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { type UserBadge } from "@shared/schema";
import { useRoute } from "wouter";
import { SEOHead } from "@/components/SEOHead";

const BADGE_ICONS: Record<string, typeof Flower2> = {
  flower: Flower2,
  sun: Sun,
  star: Star,
  book: BookOpen,
  trophy: Trophy,
  sparkles: Sparkles,
  pen: Pen,
  medal: Medal,
};

function BadgeCard({ badge, index, onClick }: { badge: UserBadge; index: number; onClick: () => void }) {
  const IconComponent = BADGE_ICONS[badge.badgeIcon] || Award;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card
        className="p-6 text-center hover:shadow-lg transition-shadow cursor-pointer"
        onClick={onClick}
        data-testid={`badge-card-${badge.id}`}
      >
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-800/40 flex items-center justify-center">
          <IconComponent className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h3 className="font-display font-bold text-sm mb-1" data-testid={`badge-name-${badge.id}`}>{badge.badgeName}</h3>
        <p className="text-xs text-muted-foreground mb-2">{badge.badgeDescription}</p>
        <Badge variant="outline" className="text-[10px]">
          {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ""}
        </Badge>
      </Card>
    </motion.div>
  );
}

export default function BadgeGallery() {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const [, params] = useRoute("/badges/public/:userId");
  const isPublicView = !!params?.userId;
  const publicUserId = params?.userId;
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: myBadges, isLoading: myLoading } = useQuery<UserBadge[]>({
    queryKey: ["/api/user/badges"],
    enabled: isAuthenticated && !isPublicView,
  });

  const { data: publicData, isLoading: publicLoading } = useQuery<{ badges: UserBadge[] }>({
    queryKey: ["/api/badges/public", publicUserId],
    queryFn: async () => {
      const res = await fetch(`/api/badges/public/${publicUserId}`);
      if (!res.ok) throw new Error("Failed to fetch badges");
      return res.json();
    },
    enabled: isPublicView,
  });

  const allBadges = isPublicView ? (publicData?.badges || []) : (myBadges || []);
  const badges = categoryFilter === "all" ? allBadges : allBadges.filter(b => b.category === categoryFilter);
  const isLoading = isPublicView ? publicLoading : myLoading;
  const categories = ["all", ...Array.from(new Set(allBadges.map(b => b.category || "milestone")))];

  const shareLink = () => {
    const userId = user?.id || "";
    const url = `${window.location.origin}/badges/public/${userId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied!", description: "Share your badges page with friends." });
  };

  const SelectedIcon = selectedBadge ? (BADGE_ICONS[selectedBadge.badgeIcon] || Award) : Award;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title={isPublicView ? "Badges" : "My Badges"} description="View earned reading badges and achievements." />
      <Navigation />

      <main className="flex-1">
        <section className="py-12 lg:py-16">
          <div className="container px-4 mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Award className="w-8 h-8 text-yellow-500" />
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight" data-testid="text-badges-title">
                  {isPublicView ? "Badges" : "My Badges"}
                </h1>
              </div>
              <p className="text-muted-foreground text-lg">
                {isPublicView ? "Reading achievements and earned badges." : "Your reading achievements and earned badges."}
              </p>

              {!isPublicView && isAuthenticated && (
                <Button onClick={shareLink} variant="outline" className="mt-4 gap-1.5" data-testid="button-share-badges">
                  <Share2 className="w-4 h-4" />
                  Share My Badges
                </Button>
              )}
            </motion.div>

            {allBadges.length > 0 && categories.length > 2 && (
              <div className="flex justify-center gap-2 mb-6 flex-wrap" data-testid="badge-category-filters">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(cat)}
                    className="capitalize"
                    data-testid={`filter-${cat}`}
                  >
                    {cat === "all" ? "All" : cat}
                  </Button>
                ))}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : !isAuthenticated && !isPublicView ? (
              <Card className="p-8 text-center">
                <Lock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">Sign in to view your badges</h2>
                <p className="text-muted-foreground mb-4">Complete reading challenges to earn badges.</p>
                <a href="/api/login">
                  <Button data-testid="button-login-badges">Sign In</Button>
                </a>
              </Card>
            ) : badges.length === 0 ? (
              <Card className="p-8 text-center">
                <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="font-display text-xl font-bold mb-2">
                  {isPublicView ? "No badges yet" : "No badges earned yet"}
                </h2>
                <p className="text-muted-foreground">
                  {isPublicView
                    ? "This reader hasn't earned any badges yet."
                    : "Complete reading challenges to earn your first badge!"}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="badges-grid">
                {badges.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} index={i} onClick={() => setSelectedBadge(badge)} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-md" data-testid="badge-detail-modal">
          <DialogHeader>
            <DialogTitle className="text-center">{selectedBadge?.badgeName}</DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <div className="text-center py-4">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-100 to-amber-200 dark:from-yellow-900/40 dark:to-amber-800/40 flex items-center justify-center">
                <SelectedIcon className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-muted-foreground mb-3">{selectedBadge.badgeDescription}</p>
              <div className="flex justify-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">{selectedBadge.category || "milestone"}</Badge>
                {selectedBadge.editionYear && <Badge variant="outline" className="text-xs">{selectedBadge.editionYear}</Badge>}
              </div>
              <Badge variant="secondary" className="text-sm mt-3">
                Earned {selectedBadge.earnedAt ? new Date(selectedBadge.earnedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
