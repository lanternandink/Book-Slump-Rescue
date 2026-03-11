import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, BookOpen, Star, Calendar, TrendingUp, Award, Loader2, Flame, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";

interface UserBook {
  id: number;
  bookTitle: string;
  bookAuthor: string;
  status: string;
  rating?: number;
  dateFinished?: string;
  dateAdded?: string;
  pageCount?: number;
}

interface ReadingStreak {
  currentStreak: number;
  longestStreak: number;
  totalBooksFinished: number;
}

export default function YearInReview() {
  const currentYear = new Date().getFullYear();

  const { data: books = [], isLoading: booksLoading } = useQuery<UserBook[]>({
    queryKey: ["/api/user/books"],
  });

  const { data: streak } = useQuery<ReadingStreak>({
    queryKey: ["/api/user/streak"],
  });

  if (booksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const booksThisYear = books.filter((b) => {
    const finishDate = b.dateFinished || b.dateAdded;
    if (!finishDate) return false;
    return b.status === "finished" && new Date(finishDate).getFullYear() === currentYear;
  });

  const finishedBooks = booksThisYear.filter((b) => b.status === "finished");
  const ratedBooks = finishedBooks.filter((b) => b.rating);
  const averageRating = ratedBooks.length > 0
    ? (ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length).toFixed(1)
    : null;

  const topRatedBooks = finishedBooks
    .filter((b) => b.rating && b.rating >= 4)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const totalPages = finishedBooks.reduce((sum, b) => sum + (b.pageCount || 300), 0);

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const month = i;
    const count = finishedBooks.filter((b) => {
      const finishDate = b.dateFinished || b.dateAdded;
      if (!finishDate) return false;
      return new Date(finishDate).getMonth() === month;
    }).length;
    return { month: new Date(currentYear, month).toLocaleDateString("en-US", { month: "short" }), count };
  });

  const maxMonthlyCount = Math.max(...monthlyBreakdown.map((m) => m.count), 1);

  const authorCounts: Record<string, number> = {};
  finishedBooks.forEach((b) => {
    authorCounts[b.bookAuthor] = (authorCounts[b.bookAuthor] || 0) + 1;
  });
  const topAuthors = Object.entries(authorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const hasData = finishedBooks.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <SEOHead title="Year in Review" description="Your annual reading journey - books read, favorite genres, and reading highlights." />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{currentYear} Year in Review</h1>
            <p className="text-muted-foreground">Your reading journey at a glance</p>
          </div>
        </div>

        {!hasData ? (
          <Card className="p-8 text-center">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No books finished in {currentYear} yet</h2>
            <p className="text-muted-foreground mb-4">
              Start reading and mark books as finished to see your year in review!
            </p>
            <Link href="/quiz">
              <Button data-testid="button-find-book">Find Your Next Book</Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4 mb-8">
              <Card className="p-6 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/5">
                <BookOpen className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-4xl font-bold text-blue-600">{finishedBooks.length}</p>
                <p className="text-sm text-muted-foreground">Books Read</p>
              </Card>

              <Card className="p-6 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/5">
                <Clock className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-4xl font-bold text-purple-600">{totalPages.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pages Read</p>
              </Card>

              <Card className="p-6 text-center bg-gradient-to-br from-yellow-500/10 to-yellow-600/5">
                <Star className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
                <p className="text-4xl font-bold text-yellow-600">{averageRating || "—"}</p>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
              </Card>

              <Card className="p-6 text-center bg-gradient-to-br from-orange-500/10 to-orange-600/5">
                <Flame className="w-8 h-8 mx-auto text-orange-500 mb-2" />
                <p className="text-4xl font-bold text-orange-600">{streak?.longestStreak || 0}</p>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Monthly Breakdown
                </h3>
                <div className="space-y-2">
                  {monthlyBreakdown.map((m) => (
                    <div key={m.month} className="flex items-center gap-3">
                      <span className="w-10 text-sm text-muted-foreground">{m.month}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/80 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${(m.count / maxMonthlyCount) * 100}%` }}
                        >
                          {m.count > 0 && <span className="text-xs text-primary-foreground font-medium">{m.count}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Rated Books
                </h3>
                {topRatedBooks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Rate some books to see your favorites here!</p>
                ) : (
                  <div className="space-y-3">
                    {topRatedBooks.map((book, i) => (
                      <div key={book.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-600">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{book.bookTitle}</p>
                          <p className="text-sm text-muted-foreground truncate">{book.bookAuthor}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{book.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {topAuthors.length > 0 && (
              <Card className="p-6 mb-8">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Most Read Authors
                </h3>
                <div className="flex flex-wrap gap-3">
                  {topAuthors.map(([author, count], i) => (
                    <Badge
                      key={author}
                      variant="secondary"
                      className={`text-sm py-2 px-4 ${i === 0 ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400" : ""}`}
                    >
                      {author} ({count} book{count > 1 ? "s" : ""})
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 text-center">
              <Award className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">Keep the momentum going!</h3>
              <p className="text-muted-foreground mb-4">
                You've read {finishedBooks.length} books this year. {finishedBooks.length >= 12 ? "Amazing work!" : "Let's find your next great read!"}
              </p>
              <Link href="/quiz">
                <Button data-testid="button-find-next-book">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Find Your Next Book
                </Button>
              </Link>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
