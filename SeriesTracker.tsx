import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Plus, Library, BookOpen, Check, Loader2, MoreVertical, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookSeries, SeriesBook } from "@shared/schema";
import { SEOHead } from "@/components/SEOHead";

type SeriesWithBooks = BookSeries & { books: SeriesBook[] };

export default function SeriesTracker() {
  const [createOpen, setCreateOpen] = useState(false);
  const [addBookOpen, setAddBookOpen] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    seriesName: "",
    authorName: "",
    totalBooks: "",
  });
  const [bookData, setBookData] = useState({
    bookNumber: "",
    bookTitle: "",
  });
  const { toast } = useToast();

  const { data: allSeries = [], isLoading } = useQuery<SeriesWithBooks[]>({
    queryKey: ["/api/user/series"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/user/series", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/series"] });
      setCreateOpen(false);
      setFormData({ seriesName: "", authorName: "", totalBooks: "" });
      toast({ title: "Series added!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/user/series/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/series"] });
      toast({ title: "Series deleted" });
    },
  });

  const addBookMutation = useMutation({
    mutationFn: async ({ seriesId, ...data }: any) => {
      return apiRequest("POST", `/api/user/series/${seriesId}/books`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/series"] });
      setAddBookOpen(null);
      setBookData({ bookNumber: "", bookTitle: "" });
      toast({ title: "Book added to series!" });
    },
  });

  const updateBookStatusMutation = useMutation({
    mutationFn: async ({ seriesId, bookId, status }: { seriesId: number; bookId: number; status: string }) => {
      return apiRequest("PATCH", `/api/user/series/${seriesId}/books/${bookId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/series"] });
    },
  });

  const handleCreateSeries = () => {
    createMutation.mutate({
      seriesName: formData.seriesName,
      authorName: formData.authorName,
      totalBooks: formData.totalBooks ? parseInt(formData.totalBooks) : undefined,
    });
  };

  const handleAddBook = (seriesId: number) => {
    addBookMutation.mutate({
      seriesId,
      bookNumber: parseInt(bookData.bookNumber),
      bookTitle: bookData.bookTitle,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Series Tracker" description="Track your progress through book series and never lose your place." />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Series Tracker</h1>
            <p className="text-muted-foreground text-sm">Track your progress through book series</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-series">
                <Plus className="w-4 h-4 mr-2" />
                Add Series
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Track a New Series</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Series name (e.g., A Court of Thorns and Roses)"
                  value={formData.seriesName}
                  onChange={(e) => setFormData({ ...formData, seriesName: e.target.value })}
                  data-testid="input-series-name"
                />
                <Input
                  placeholder="Author name"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  data-testid="input-series-author"
                />
                <Input
                  placeholder="Total books in series (optional)"
                  type="number"
                  value={formData.totalBooks}
                  onChange={(e) => setFormData({ ...formData, totalBooks: e.target.value })}
                  data-testid="input-series-total"
                />
                <Button
                  className="w-full"
                  onClick={handleCreateSeries}
                  disabled={!formData.seriesName.trim() || !formData.authorName.trim() || createMutation.isPending}
                  data-testid="button-save-series"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Series"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {allSeries.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Library className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No series tracked yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Track your progress through book series you're reading
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-add-first-series">
              <Plus className="w-4 h-4 mr-2" />
              Track Your First Series
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {allSeries.map((series) => {
              const finishedCount = series.books.filter((b) => b.status === "finished").length;
              const totalCount = series.totalBooks || series.books.length;
              const progress = totalCount > 0 ? (finishedCount / totalCount) * 100 : 0;

              return (
                <Card key={series.id} className="p-5" data-testid={`card-series-${series.id}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{series.seriesName}</h3>
                      <p className="text-muted-foreground text-sm">by {series.authorName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {finishedCount} / {totalCount} read
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setAddBookOpen(series.id)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Book
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteMutation.mutate(series.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Series
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <Progress value={progress} className="h-2 mb-4" />

                  {series.books.length > 0 ? (
                    <div className="grid gap-2">
                      {series.books.map((book) => (
                        <div
                          key={book.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {book.bookNumber}
                          </div>
                          <span className="flex-1 text-sm">{book.bookTitle}</span>
                          <Select
                            value={book.status ?? undefined}
                            onValueChange={(status) =>
                              updateBookStatusMutation.mutate({ seriesId: series.id, bookId: book.id, status })
                            }
                          >
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="reading">Reading</SelectItem>
                              <SelectItem value="finished">Finished</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No books added yet. Click the menu to add books.
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={addBookOpen !== null} onOpenChange={(open) => !open && setAddBookOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Book to Series</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Book number in series"
                type="number"
                value={bookData.bookNumber}
                onChange={(e) => setBookData({ ...bookData, bookNumber: e.target.value })}
                data-testid="input-book-number"
              />
              <Input
                placeholder="Book title"
                value={bookData.bookTitle}
                onChange={(e) => setBookData({ ...bookData, bookTitle: e.target.value })}
                data-testid="input-book-title"
              />
              <Button
                className="w-full"
                onClick={() => addBookOpen && handleAddBook(addBookOpen)}
                disabled={!bookData.bookNumber || !bookData.bookTitle.trim() || addBookMutation.isPending}
                data-testid="button-save-series-book"
              >
                {addBookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Book"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
