import { useSavedBooks } from "@/hooks/use-local-storage";
import { Navigation } from "@/components/Navigation";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Library, SearchX, Cloud, CloudOff, Loader2, Star, BookOpen, Clock, XCircle, Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type UserBook, type BookStatus, BOOK_STATUSES } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";

const STATUS_LABELS: Record<BookStatus, { label: string; icon: typeof BookOpen; color: string }> = {
  want_to_read: { label: "Want to Read", icon: Clock, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  currently_reading: { label: "Reading", icon: BookOpen, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  finished: { label: "Finished", icon: Star, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  dnf: { label: "DNF", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

function TbrQuickPick() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pickedBook, isLoading, refetch } = useQuery<UserBook | null>({
    queryKey: ["/api/user/tbr-pick"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user/tbr-pick", { credentials: "include" });
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        return await res.json();
      } catch (error) {
        return null;
      }
    },
  });

  const startReadingMutation = useMutation({
    mutationFn: async () => {
      if (!pickedBook) return;
      return apiRequest("PATCH", `/api/user/books/${pickedBook.id}`, {
        status: "currently_reading",
        dateStarted: new Date().toISOString().split("T")[0],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/tbr-pick"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({ title: "Great choice!", description: `Started reading ${pickedBook?.bookTitle}` });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8 mb-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pickedBook) {
    return null;
  }

  return (
    <Card
      className="mb-8 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden"
      data-testid="tbr-quickpick"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        <div className="flex items-center justify-center">
          {pickedBook.bookCoverUrl ? (
            <img
              loading="lazy"
              decoding="async"
              src={pickedBook.bookCoverUrl}
              alt={pickedBook.bookTitle}
              className="max-h-64 rounded-lg shadow-md object-cover"
            />
          ) : (
            <div className="w-40 h-56 bg-muted rounded-lg flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col justify-between">
          <div className="flex items-start gap-2 mb-4">
            <Shuffle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-display text-2xl font-bold mb-1">Can't decide what to read next?</h2>
              <p className="text-muted-foreground text-sm">
                Here's a random book from your "Want to Read" shelf
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-display font-bold text-xl line-clamp-2 mb-1">{pickedBook.bookTitle}</h3>
            <p className="text-muted-foreground">{pickedBook.bookAuthor}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-pick-another"
            >
              Pick Another
            </Button>
            <Button
              onClick={() => startReadingMutation.mutate()}
              disabled={startReadingMutation.isPending}
              data-testid="button-start-reading"
            >
              {startReadingMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Start Reading
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CloudLibraryBook({ book, onUpdate }: { book: UserBook; onUpdate: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserBook>) => {
      return apiRequest("PATCH", `/api/user/books/${book.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/user/books/${book.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      toast({ title: "Book removed", description: `${book.bookTitle} has been removed from your library.` });
    },
  });

  const handleStatusChange = async (status: BookStatus) => {
    setIsUpdating(true);
    const updates: Partial<UserBook> = { status };
    
    // Auto-set dates based on status
    if (status === "currently_reading" && !book.dateStarted) {
      updates.dateStarted = new Date().toISOString().split("T")[0];
    }
    if (status === "finished" && !book.dateFinished) {
      updates.dateFinished = new Date().toISOString().split("T")[0];
    }
    
    await updateMutation.mutateAsync(updates);
    setIsUpdating(false);
  };

  const handleRating = async (rating: number) => {
    await updateMutation.mutateAsync({ rating });
  };

  const statusInfo = STATUS_LABELS[book.status as BookStatus] || STATUS_LABELS.want_to_read;
  const StatusIcon = statusInfo.icon;

  return (
    <Card className="overflow-hidden h-full flex flex-col" data-testid={`cloud-book-${book.id}`}>
      <div className="aspect-[3/4] bg-muted relative overflow-hidden">
        {book.bookCoverUrl ? (
          <img loading="lazy" decoding="async" 
            src={book.bookCoverUrl} 
            alt={book.bookTitle}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <Badge className={`absolute top-2 left-2 ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusInfo.label}
        </Badge>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-display font-bold text-base mb-1 line-clamp-2">{book.bookTitle}</h3>
        <p className="text-sm text-muted-foreground mb-3">{book.bookAuthor}</p>
        
        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => handleRating(star)}
              className="focus:outline-none"
              data-testid={`button-rate-${book.id}-${star}`}
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  book.rating && star <= book.rating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30 hover:text-yellow-400"
                }`}
              />
            </button>
          ))}
          {book.rating && (
            <span className="text-xs text-muted-foreground ml-1">{book.rating}/5</span>
          )}
        </div>
        
        {/* Status selector */}
        <div className="flex flex-wrap gap-1 mb-3">
          {BOOK_STATUSES.map((status) => (
            <Button
              key={status}
              variant={book.status === status ? "secondary" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => handleStatusChange(status)}
              disabled={isUpdating}
              data-testid={`button-status-${book.id}-${status}`}
            >
              {STATUS_LABELS[status].label}
            </Button>
          ))}
        </div>
        
        <div className="mt-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive w-full"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            data-testid={`button-remove-${book.id}`}
          >
            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function Saved() {
  const { savedBooks } = useSavedBooks();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: cloudBooks, isLoading: cloudLoading } = useQuery<UserBook[]>({
    queryKey: ["/api/user/books"],
    enabled: isAuthenticated,
  });

  // Use cloud library if authenticated, otherwise localStorage
  const books = isAuthenticated ? cloudBooks || [] : savedBooks;
  const isLoading = authLoading || (isAuthenticated && cloudLoading);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="My Library" description="Your personal book library. Track what you're reading, want to read, and have finished." />
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 border-b border-border/60 pb-8">
          <div className="space-y-2">
            <h1 className="font-display text-4xl font-bold flex items-center gap-3">
              <Library className="w-8 h-8 text-primary" />
              My Library
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                {books.length} {books.length === 1 ? 'book' : 'books'} saved
              </p>
              {isAuthenticated ? (
                <Badge variant="secondary" className="gap-1">
                  <Cloud className="w-3 h-3" />
                  Synced
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <CloudOff className="w-3 h-3" />
                  Local only
                </Badge>
              )}
            </div>
            {!isAuthenticated && (
              <p className="text-sm text-muted-foreground">
                <a href="/api/login" className="text-primary hover:underline">Sign in</a> to sync your library across devices
              </p>
            )}
          </div>
          
          <Link href="/quiz">
            <Button data-testid="button-find-more">Find More Books</Button>
          </Link>
        </div>

        {isAuthenticated && <TbrQuickPick />}

        {isLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {isAuthenticated
              ? (cloudBooks || []).map((book) => (
                  <CloudLibraryBook key={book.id} book={book} onUpdate={() => {}} />
                ))
              : savedBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border rounded-3xl bg-card/30"
          >
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
              <SearchX className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">Your library is empty</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Looks like you haven't saved any books yet. Take the quiz to find your next great read!
            </p>
            <Link href="/quiz">
              <Button size="lg" className="shadow-lg" data-testid="button-start-quiz">Start Quiz</Button>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
