import { useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Video, PlayCircle, Send } from "lucide-react";
import { SiTiktok, SiInstagram, SiYoutube } from "react-icons/si";

interface Review {
  id: string;
  reviewerName: string;
  platform: "BookTok" | "Bookstagram" | "YouTube";
  bookTitle: string;
  genre: string;
  caption: string;
  embedUrl: string;
  thumbnail: string;
  createdAt: string;
}

function getPlatformIcon(platform: string) {
  switch (platform) {
    case "BookTok":
      return <SiTiktok className="w-4 h-4" />;
    case "Bookstagram":
      return <SiInstagram className="w-4 h-4" />;
    case "YouTube":
      return <SiYoutube className="w-4 h-4" />;
    default:
      return <Video className="w-4 h-4" />;
  }
}

function getEmbedSrc(url: string, platform: string): string {
  try {
    const parsed = new URL(url);

    if (platform === "YouTube" || parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      if (parsed.hostname.includes("youtu.be")) {
        const videoId = parsed.pathname.slice(1);
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (parsed.pathname.includes("/embed/")) {
        return url;
      }
      const videoId = parsed.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      const shortPath = parsed.pathname.replace("/shorts/", "");
      if (parsed.pathname.includes("/shorts/")) return `https://www.youtube.com/embed/${shortPath}`;
      return url;
    }

    if (platform === "BookTok" || parsed.hostname.includes("tiktok.com")) {
      const match = url.match(/\/video\/(\d+)/);
      if (match) return `https://www.tiktok.com/embed/v2/${match[1]}`;
      return url;
    }

    if (platform === "Bookstagram" || parsed.hostname.includes("instagram.com")) {
      const match = url.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
      if (match) return `https://www.instagram.com/reel/${match[2]}/embed`;
      return url;
    }
  } catch {}
  return url;
}

export default function BookReviews() {
  const [platformFilter, setPlatformFilter] = useState("all");
  const [genreFilter, setGenreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews"],
  });

  const genres = useMemo(() => {
    const set = new Set(reviews.map(r => r.genre));
    return Array.from(set).sort();
  }, [reviews]);

  const filtered = useMemo(() => {
    let list = [...reviews];
    if (platformFilter !== "all") list = list.filter(r => r.platform === platformFilter);
    if (genreFilter !== "all") list = list.filter(r => r.genre === genreFilter);
    if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return list;
  }, [reviews, platformFilter, genreFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Book Reviews - BookTok, Bookstagram & YouTube | Book Slump Rescue"
        description="Discover book reviews from your favorite BookTok, Bookstagram, and YouTube creators. Watch video reviews and find your next great read."
      />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <PlayCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-reviews-title">
              Book Reviews Hub
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Video reviews from BookTok, Bookstagram, and YouTube creators. Discover your next favorite read through the community.
            </p>
            <div className="mt-4">
              <Link href="/submit-review">
                <Button variant="outline" className="gap-2" data-testid="button-submit-review-link">
                  <Send className="w-4 h-4" />
                  Submit Your Review
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center gap-3 mb-8"
            data-testid="review-filters"
          >
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-platform-filter">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                <SelectItem value="BookTok">BookTok</SelectItem>
                <SelectItem value="Bookstagram">Bookstagram</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-genre-filter">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {genres.map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]" data-testid="select-sort">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>

            {(platformFilter !== "all" || genreFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setPlatformFilter("all"); setGenreFilter("all"); }}
                data-testid="button-clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center">
              <PlayCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-no-reviews">No Reviews Yet</h2>
              <p className="text-muted-foreground mb-4">
                {reviews.length > 0 ? "No reviews match your filters. Try adjusting them." : "Be the first to share a book review!"}
              </p>
              <Link href="/submit-review">
                <Button data-testid="button-submit-first-review">Submit a Review</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filtered.map((review, idx) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <Card className="overflow-visible flex flex-col" data-testid={`card-review-${review.id}`}>
                    <div className="relative w-full aspect-video bg-muted rounded-t-md overflow-hidden">
                      <iframe
                        src={getEmbedSrc(review.embedUrl, review.platform)}
                        title={`${review.bookTitle} review by ${review.reviewerName}`}
                        className="absolute inset-0 w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                        data-testid={`iframe-review-${review.id}`}
                      />
                      <div className="absolute top-2 right-2 z-10">
                        <Badge variant="secondary" className="gap-1 text-xs" data-testid={`badge-platform-${review.id}`}>
                          {getPlatformIcon(review.platform)}
                          {review.platform}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold leading-snug line-clamp-1" data-testid={`text-review-book-${review.id}`}>
                            {review.bookTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground" data-testid={`text-review-reviewer-${review.id}`}>
                            by {review.reviewerName}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0" data-testid={`badge-genre-${review.id}`}>
                          {review.genre}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1" data-testid={`text-review-caption-${review.id}`}>
                        {review.caption}
                      </p>

                      <p className="text-xs text-muted-foreground mt-3" data-testid={`text-review-date-${review.id}`}>
                        {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
