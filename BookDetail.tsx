import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, BookOpen, Headphones, Flame, Moon, Clock, Heart,
  ShoppingCart, Library, ExternalLink, Bookmark, BookmarkCheck,
  AlertTriangle, Sparkles, Tag, Palette, Loader2, Users
} from "lucide-react";

const MOOD_ICONS: Record<string, any> = {
  happy: "😊", emotional: "😢", thoughtful: "🤔", adventurous: "🗺️",
  romantic: "💕", scary: "😱", funny: "😂", cozy: "☕",
  dark: "🌑", intense: "⚡", dreamy: "✨", wholesome: "🌻",
};

const SPICE_LABELS = ["", "Clean", "Mild", "Moderate", "Steamy", "Very Steamy"];
const DARKNESS_LABELS = ["", "Light", "Mild", "Moderate", "Dark", "Very Dark"];

export default function BookDetail() {
  const [, params] = useRoute("/book/:id");
  const bookId = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: book, isLoading, error } = useQuery({
    queryKey: ["/api/catalog", bookId],
    queryFn: async () => {
      const res = await fetch(`/api/catalog/${bookId}`, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to load book");
      return res.json();
    },
    enabled: bookId > 0,
  });

  const { data: userBooks } = useQuery<any[]>({
    queryKey: ["/api/user/books"],
    enabled: !!user,
  });

  const isSaved = userBooks?.some((ub: any) => ub.title === book?.title && ub.authors?.includes(book?.authors?.[0]));

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/books", {
      title: book.title,
      authors: book.authors,
      coverUrl: book.coverUrl,
      status: "to-read",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      toast({ title: "Saved to library!" });
    },
  });

  const coverUrl = book?.coverUrl || (book?.isbn13 ? `https://covers.openlibrary.org/b/isbn/${book.isbn13}-L.jpg` : null);
  const amazonUrl = book ? `https://www.amazon.com/s?k=${encodeURIComponent(`${book.title} ${book.authors?.[0] || ""}`)}` : "#";
  const worldcatUrl = book ? `https://search.worldcat.org/search?q=${encodeURIComponent(book.title)}` : "#";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
            <Skeleton className="h-[420px] w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book || error) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-book-not-found">Book Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the book you're looking for.</p>
          <Link href="/discover"><Button data-testid="link-discover"><ArrowLeft className="w-4 h-4 mr-2" /> Browse Books</Button></Link>
        </div>
      </div>
    );
  }

  const allTropes = [...(book.tropes || []), ...(book.communityTropes || [])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  const allMoodTags = [...(book.moodTags || []), ...(book.communityMoodTags || [])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  const allTags = [...(book.tags || []), ...(book.communityTags || [])].filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);
  const discoveryTags = book.discoveryTags || [];
  const primaryGenre = book.categories?.[0] || "Fiction";

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${book.title} by ${book.authors?.join(", ")} | Book Slump Rescue`}
        description={book.description?.slice(0, 160) || `Discover ${book.title} on Book Slump Rescue`}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/discover" data-testid="link-back-discover">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Discover
          </Button>
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          <div className="space-y-4">
            <div className="relative rounded-lg overflow-hidden shadow-lg bg-muted aspect-[2/3] flex items-center justify-center">
              {coverUrl ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={coverUrl}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  data-testid="img-book-cover"
                />
              ) : (
                <BookOpen className="w-16 h-16 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              {user && (
                <Button
                  variant={isSaved ? "secondary" : "default"}
                  className="w-full"
                  onClick={() => !isSaved && saveMutation.mutate()}
                  disabled={isSaved || saveMutation.isPending}
                  data-testid="button-save-library"
                >
                  {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : isSaved ? <BookmarkCheck className="w-4 h-4 mr-2" /> : <Bookmark className="w-4 h-4 mr-2" />}
                  {isSaved ? "In Your Library" : "Save to Library"}
                </Button>
              )}
              <a href={amazonUrl} target="_blank" rel="noopener noreferrer" data-testid="link-amazon">
                <Button variant="outline" className="w-full">
                  <ShoppingCart className="w-4 h-4 mr-2" /> Buy on Amazon
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
              <a href={worldcatUrl} target="_blank" rel="noopener noreferrer" data-testid="link-worldcat">
                <Button variant="outline" className="w-full">
                  <Library className="w-4 h-4 mr-2" /> Find at Library
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-1" data-testid="text-book-title">{book.title}</h1>
              <p className="text-lg text-muted-foreground" data-testid="text-book-author">
                by {book.authors?.join(", ") || "Unknown Author"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Badge variant="secondary" data-testid="badge-genre">{primaryGenre}</Badge>
                {book.publishedDate && <Badge variant="outline" data-testid="badge-year">{book.publishedDate}</Badge>}
                {book.pageCount && (
                  <Badge variant="outline" data-testid="badge-pages">
                    <BookOpen className="w-3 h-3 mr-1" /> {book.pageCount} pages
                  </Badge>
                )}
              </div>
            </div>

            {book.description && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Synopsis</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line" data-testid="text-description">{book.description}</p>
              </div>
            )}

            <Card>
              <CardContent className="pt-4">
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-3">Book Details</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  {book.mood && (
                    <div className="flex items-center gap-2" data-testid="detail-mood">
                      <span>{MOOD_ICONS[book.mood] || "📖"}</span>
                      <div>
                        <div className="text-muted-foreground text-xs">Mood</div>
                        <div className="font-medium capitalize">{book.mood}</div>
                      </div>
                    </div>
                  )}
                  {book.pace && (
                    <div className="flex items-center gap-2" data-testid="detail-pace">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Pacing</div>
                        <div className="font-medium capitalize">{book.pace}</div>
                      </div>
                    </div>
                  )}
                  {book.tone && (
                    <div className="flex items-center gap-2" data-testid="detail-tone">
                      <Moon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground text-xs">Tone</div>
                        <div className="font-medium capitalize">{book.tone}</div>
                      </div>
                    </div>
                  )}
                  {book.romanceLevel && book.romanceLevel !== "none" && (
                    <div className="flex items-center gap-2" data-testid="detail-romance">
                      <Heart className="w-4 h-4 text-pink-500" />
                      <div>
                        <div className="text-muted-foreground text-xs">Romance</div>
                        <div className="font-medium capitalize">{book.romanceLevel}</div>
                      </div>
                    </div>
                  )}
                  {book.spiceLevel > 1 && (
                    <div className="flex items-center gap-2" data-testid="detail-spice">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <div>
                        <div className="text-muted-foreground text-xs">Spice Level</div>
                        <div className="font-medium">{SPICE_LABELS[book.spiceLevel] || book.spiceLevel}/5</div>
                      </div>
                    </div>
                  )}
                  {book.darknessLevel > 1 && (
                    <div className="flex items-center gap-2" data-testid="detail-darkness">
                      <Moon className="w-4 h-4 text-purple-500" />
                      <div>
                        <div className="text-muted-foreground text-xs">Darkness</div>
                        <div className="font-medium">{DARKNESS_LABELS[book.darknessLevel] || book.darknessLevel}/5</div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              {book.hasEbook && <Badge variant="outline" data-testid="badge-ebook"><BookOpen className="w-3 h-3 mr-1" /> eBook</Badge>}
              {book.hasAudiobook && <Badge variant="outline" data-testid="badge-audiobook"><Headphones className="w-3 h-3 mr-1" /> Audiobook</Badge>}
              {book.kindleUnlimited && <Badge variant="outline" data-testid="badge-ku">Kindle Unlimited</Badge>}
              {book.libbyAvailable && <Badge variant="outline" data-testid="badge-libby"><Library className="w-3 h-3 mr-1" /> Libby</Badge>}
            </div>

            {allTropes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Sparkles className="w-4 h-4" /> Tropes
                </h2>
                <div className="flex flex-wrap gap-1.5" data-testid="section-tropes">
                  {allTropes.map((t: string) => (
                    <Badge key={t} variant="secondary" className="text-xs">{t.replace(/-/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            )}

            {allMoodTags.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Palette className="w-4 h-4" /> Vibes & Mood
                </h2>
                <div className="flex flex-wrap gap-1.5" data-testid="section-vibes">
                  {allMoodTags.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs">{t.replace(/-/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            )}

            {allTags.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Tag className="w-4 h-4" /> Tags
                </h2>
                <div className="flex flex-wrap gap-1.5" data-testid="section-tags">
                  {allTags.map((t: string) => (
                    <Badge key={t} variant="outline" className="text-xs">{t.replace(/-/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            )}

            {book.contentWarnings?.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Content Warnings
                </h2>
                <div className="flex flex-wrap gap-1.5" data-testid="section-warnings">
                  {book.contentWarnings.map((cw: string) => (
                    <Badge key={cw} variant="destructive" className="text-xs">{cw.replace(/-/g, " ")}</Badge>
                  ))}
                </div>
              </div>
            )}

            {discoveryTags.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-1">
                  <Users className="w-4 h-4" /> Discovery Tags
                </h2>
                <div className="flex flex-wrap gap-1.5" data-testid="section-discovery-tags">
                  {discoveryTags.map((dt: any) => (
                    <Badge key={dt.id} variant="outline" className="text-xs">
                      <span className="text-muted-foreground mr-1">{dt.category}:</span> {dt.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(book.isbn13 || book.isbn10) && (
              <div className="text-xs text-muted-foreground pt-2 border-t">
                {book.isbn13 && <span data-testid="text-isbn13">ISBN-13: {book.isbn13}</span>}
                {book.isbn13 && book.isbn10 && <span className="mx-2">·</span>}
                {book.isbn10 && <span data-testid="text-isbn10">ISBN-10: {book.isbn10}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
