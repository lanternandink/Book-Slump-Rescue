import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FEATURED_SLOTS as HARDCODED_SLOTS, INDIE_AUTHOR_OF_THE_WEEK, LANA_WILLIAMS_BOOKS, type FeaturedSlot } from "@/data/featured";
import { motion } from "framer-motion";
import { Star, ExternalLink, BookOpen, User, Loader2, Heart, ShoppingCart, PenTool, ArrowRight } from "lucide-react";
import { DisclosureTag } from "@/components/DisclosureTag";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

const COVER_CACHE_KEY = "featured_covers_cache";
const COVER_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCovers {
  covers: Record<string, string | null>;
  timestamp: number;
}

interface SpotlightAuthor {
  id: number;
  penName: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  genres: string[] | null;
  books: {
    id: number;
    title: string;
    coverUrl: string | null;
    amazonUrl: string | null;
    arcEnabled: boolean | null;
    arcAvailable: boolean;
  }[];
}

export default function Featured() {
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [savedBooks, setSavedBooks] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: spotlightAuthors = [] } = useQuery<SpotlightAuthor[]>({
    queryKey: ["/api/featured/spotlight"],
  });

  const { data: dbPicks = [] } = useQuery<any[]>({
    queryKey: ["/api/featured-picks"],
  });

  const FEATURED_SLOTS: FeaturedSlot[] = dbPicks.length > 0
    ? dbPicks.map(p => ({
        genre: p.genre,
        genreLabel: p.genreLabel,
        bookTitle: p.bookTitle,
        authorName: p.authorName,
        coverImageUrl: p.coverImageUrl || undefined,
        shortBlurb: p.shortBlurb,
        amazonUrl: p.amazonUrl || undefined,
        isIndie: p.isIndie || false,
        isSponsored: p.isSponsored || false,
      }))
    : HARDCODED_SLOTS;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("savedBooks");
      if (saved) {
        const books = JSON.parse(saved);
        if (Array.isArray(books)) {
          const titles = new Set(books.map((b: any) => b.title));
          setSavedBooks(titles as Set<string>);
        }
      }
    } catch {
      // Invalid savedBooks, ignore
    }
  }, []);

  const slotsKey = FEATURED_SLOTS.map(s => s.bookTitle).join("|");

  useEffect(() => {
    async function fetchCovers() {
      const slotsNeedingCovers = FEATURED_SLOTS.filter(s => !s.coverImageUrl);
      if (slotsNeedingCovers.length === 0) {
        setLoading(false);
        return;
      }

      const cacheKey = COVER_CACHE_KEY + "_" + slotsKey.slice(0, 50);
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed: CachedCovers = JSON.parse(cached);
          if (parsed && parsed.covers && Date.now() - parsed.timestamp < COVER_CACHE_EXPIRY) {
            setCovers(parsed.covers);
            setLoading(false);
            return;
          }
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }

      const coverPromises = slotsNeedingCovers.map(async (slot) => {
        try {
          const params = new URLSearchParams({
            title: slot.bookTitle,
            author: slot.authorName,
          });
          const response = await fetch(`/api/book-cover?${params}`);
          if (response.ok) {
            const data = await response.json();
            return { genre: slot.genre, coverUrl: data.coverUrl };
          }
        } catch (err) {
          console.error(`Failed to fetch cover for ${slot.bookTitle}:`, err);
        }
        return { genre: slot.genre, coverUrl: null };
      });

      const results = await Promise.all(coverPromises);
      const coverMap: Record<string, string | null> = {};
      results.forEach((r) => {
        coverMap[r.genre] = r.coverUrl;
      });

      localStorage.setItem(cacheKey, JSON.stringify({
        covers: coverMap,
        timestamp: Date.now(),
      }));

      setCovers(coverMap);
      setLoading(false);
    }

    fetchCovers();
  }, [slotsKey]);

  const getCoverUrl = (slot: FeaturedSlot) => {
    return slot.coverImageUrl || covers[slot.genre] || null;
  };

  const addToLibrary = (slot: FeaturedSlot) => {
    const saved = localStorage.getItem("savedBooks");
    const books = saved ? JSON.parse(saved) : [];
    
    // Check if already saved
    if (books.some((b: any) => b.title === slot.bookTitle)) {
      toast({
        title: "Already saved",
        description: `${slot.bookTitle} is already in your library.`,
      });
      return;
    }
    
    // Create book object matching the expected format
    const book = {
      id: `featured-${slot.genre}`,
      title: slot.bookTitle,
      authors: [slot.authorName],
      description: slot.shortBlurb,
      coverUrl: getCoverUrl(slot),
      primaryGenre: slot.genreLabel,
    };
    
    books.push(book);
    localStorage.setItem("savedBooks", JSON.stringify(books));
    setSavedBooks(new Set([...Array.from(savedBooks), slot.bookTitle]));
    
    toast({
      title: "Added to Library",
      description: `${slot.bookTitle} has been saved to your library.`,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Featured Picks"
        description="Curated book selections, author spotlights, and handpicked reading recommendations."
      />
      <Navigation />

      <main className="flex-1">
        <section className="py-12 lg:py-16">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Featured Picks
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Hand-picked recommendations across every genre to help you find your next great read.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-16"
            >
              <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 to-orange-100/30 dark:from-primary/10 dark:to-orange-900/20 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5 text-primary fill-primary" />
                  <h2 className="font-display text-xl font-bold text-primary">
                    Indie Author of the Week
                  </h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-shrink-0">
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-muted flex items-center justify-center border-2 border-primary/20">
                      {INDIE_AUTHOR_OF_THE_WEEK.photoUrl ? (
                        <img
                          loading="lazy"
                          decoding="async"
                          src={INDIE_AUTHOR_OF_THE_WEEK.photoUrl}
                          alt={INDIE_AUTHOR_OF_THE_WEEK.authorName}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-2xl font-bold mb-1">
                      {INDIE_AUTHOR_OF_THE_WEEK.authorName}
                    </h3>
                    <Badge variant="secondary" className="mb-3">
                      {INDIE_AUTHOR_OF_THE_WEEK.genre}
                    </Badge>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {INDIE_AUTHOR_OF_THE_WEEK.shortBio}
                    </p>
                    {INDIE_AUTHOR_OF_THE_WEEK.featuredBookTitle && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Featured Series:</span>{" "}
                        {INDIE_AUTHOR_OF_THE_WEEK.featuredBookTitle}
                      </p>
                    )}
                    
                    {LANA_WILLIAMS_BOOKS && LANA_WILLIAMS_BOOKS.length > 0 && (
                      <div className="mt-6 pt-4 border-t border-primary/10">
                        <p className="text-sm font-medium mb-4">Books in the Series:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {LANA_WILLIAMS_BOOKS.map((book: any) => (
                            <div key={book.title} className="flex flex-col items-center text-center">
                              {book.coverUrl ? (
                                <a
                                  href={book.amazonUrl || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="group"
                                  data-testid={`link-book-cover-${book.bookNumber}`}
                                >
                                  <img
                                    loading="lazy"
                                    decoding="async"
                                    src={book.coverUrl}
                                    alt={book.title}
                                    className="w-28 h-auto rounded-md shadow-md group-hover:shadow-lg transition-shadow"
                                  />
                                </a>
                              ) : (
                                <div className="w-28 h-40 bg-muted rounded-md flex items-center justify-center">
                                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                                </div>
                              )}
                              <p className="text-sm font-medium mt-2">{book.title}</p>
                              <Badge 
                                variant={book.isUpcoming ? "outline" : "secondary"}
                                className="text-xs mt-1"
                              >
                                Book {book.bookNumber}
                                {book.isUpcoming && " - Coming Soon!"}
                              </Badge>
                              {book.amazonUrl && !book.isUpcoming && (
                                <Button variant="outline" size="sm" className="mt-2" asChild>
                                  <a
                                    href={book.amazonUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`link-buy-book-${book.bookNumber}`}
                                  >
                                    <ShoppingCart className="w-3 h-3 mr-1" />
                                    Buy on Amazon
                                  </a>
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {INDIE_AUTHOR_OF_THE_WEEK.websiteUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={INDIE_AUTHOR_OF_THE_WEEK.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-indie-author-website"
                          >
                            Website <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                      {INDIE_AUTHOR_OF_THE_WEEK.socialLinks?.goodreads && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={INDIE_AUTHOR_OF_THE_WEEK.socialLinks.goodreads}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-indie-author-goodreads"
                          >
                            Goodreads <ExternalLink className="w-3 h-3 ml-1" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>

            {Array.isArray(spotlightAuthors) && spotlightAuthors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mb-16"
              >
                <div className="flex items-center gap-2 mb-6">
                  <PenTool className="w-5 h-5 text-primary" />
                  <h2 className="font-display text-2xl font-bold">Spotlight Authors</h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {spotlightAuthors.map((author) => (
                    <Card key={author.id} className="p-5 hover-elevate" data-testid={`card-spotlight-${author.id}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={author.avatarUrl || undefined} alt={author.penName} />
                          <AvatarFallback>{author.penName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h3 className="font-bold truncate">{author.penName}</h3>
                          {author.genres && author.genres.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {author.genres.slice(0, 2).map(g => (
                                <Badge key={g} variant="secondary" className="text-[10px]">{g}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {author.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{author.bio}</p>
                      )}
                      {author.books.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                          {author.books.slice(0, 3).map(book => (
                            book.coverUrl && (
                              <img loading="lazy" decoding="async" key={book.id} src={book.coverUrl} alt={book.title} className="w-14 h-20 object-cover rounded-md flex-shrink-0" />
                            )
                          ))}
                        </div>
                      )}
                      <Link href={`/authors/${author.slug}`}>
                        <Button variant="outline" size="sm" className="w-full gap-1.5" data-testid={`button-view-author-${author.id}`}>
                          View Author Page <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {FEATURED_SLOTS.map((slot, index) => {
                const coverUrl = getCoverUrl(slot);
                const isLoadingCover = loading && !slot.coverImageUrl;
                const isSaved = savedBooks.has(slot.bookTitle);

                return (
                  <motion.div
                    key={slot.genre}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Card
                      className="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow"
                      data-testid={`card-featured-${slot.genre}`}
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-muted to-muted/50 relative">
                        {isLoadingCover ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-muted-foreground/50 animate-spin" />
                          </div>
                        ) : coverUrl ? (
                          <img
                            loading="lazy"
                            decoding="async"
                            src={coverUrl}
                            alt={slot.bookTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BookOpen className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3 flex flex-col gap-1">
                          <div className="flex flex-wrap gap-1">
                            <Badge className="bg-primary text-primary-foreground">
                              {slot.genreLabel}
                            </Badge>
                            {slot.isIndie && (
                              <Badge variant="secondary">Indie</Badge>
                            )}
                          </div>
                          {slot.isSponsored && <DisclosureTag type="sponsored" />}
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="font-display font-bold text-lg mb-1 line-clamp-2">
                          {slot.bookTitle}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {slot.authorName}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed flex-1 line-clamp-3">
                          {slot.shortBlurb}
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant={isSaved ? "secondary" : "outline"}
                            size="sm"
                            className="flex-1"
                            onClick={() => addToLibrary(slot)}
                            disabled={isSaved}
                            data-testid={`button-save-${slot.genre}`}
                          >
                            <Heart className={`w-3 h-3 mr-1 ${isSaved ? "fill-current" : ""}`} />
                            {isSaved ? "Saved" : "Save"}
                          </Button>
                          {slot.amazonUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              asChild
                            >
                              <a
                                href={slot.amazonUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`link-amazon-${slot.genre}`}
                              >
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                Buy
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Book Slump Rescue. Made for readers, by readers.</p>
      </footer>
    </div>
  );
}
