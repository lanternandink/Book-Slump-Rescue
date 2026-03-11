import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Plus, Quote, Star, Trash2, Edit2, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { BookQuote } from "@shared/schema";
import { SEOHead } from "@/components/SEOHead";

export default function Quotes() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editQuote, setEditQuote] = useState<BookQuote | null>(null);
  const [formData, setFormData] = useState({
    bookTitle: "",
    bookAuthor: "",
    quote: "",
    pageNumber: "",
    chapter: "",
    notes: "",
  });
  const { toast } = useToast();

  const { data: quotes = [], isLoading } = useQuery<BookQuote[]>({
    queryKey: ["/api/user/quotes"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/user/quotes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/quotes"] });
      setCreateOpen(false);
      setFormData({ bookTitle: "", bookAuthor: "", quote: "", pageNumber: "", chapter: "", notes: "" });
      toast({ title: "Quote saved!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return apiRequest("PATCH", `/api/user/quotes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/quotes"] });
      setEditQuote(null);
      toast({ title: "Quote updated!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/user/quotes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/quotes"] });
      toast({ title: "Quote deleted" });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      return apiRequest("PATCH", `/api/user/quotes/${id}`, { isFavorite });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/quotes"] });
    },
  });

  const handleSubmit = () => {
    createMutation.mutate({
      ...formData,
      pageNumber: formData.pageNumber ? parseInt(formData.pageNumber) : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const favoriteQuotes = quotes.filter((q) => q.isFavorite);
  const otherQuotes = quotes.filter((q) => !q.isFavorite);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Book Quotes" description="Save and collect your favorite book quotes and memorable passages." />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Book Quotes</h1>
            <p className="text-muted-foreground text-sm">Save your favorite passages and memorable lines</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-quote">
                <Plus className="w-4 h-4 mr-2" />
                Add Quote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Save a Quote</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Textarea
                  placeholder="Enter the quote..."
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  className="min-h-[100px]"
                  data-testid="input-quote-text"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Book title"
                    value={formData.bookTitle}
                    onChange={(e) => setFormData({ ...formData, bookTitle: e.target.value })}
                    data-testid="input-quote-book"
                  />
                  <Input
                    placeholder="Author"
                    value={formData.bookAuthor}
                    onChange={(e) => setFormData({ ...formData, bookAuthor: e.target.value })}
                    data-testid="input-quote-author"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Page number (optional)"
                    type="number"
                    value={formData.pageNumber}
                    onChange={(e) => setFormData({ ...formData, pageNumber: e.target.value })}
                  />
                  <Input
                    placeholder="Chapter (optional)"
                    value={formData.chapter}
                    onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                  />
                </div>
                <Textarea
                  placeholder="Your notes about this quote (optional)"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={!formData.quote.trim() || !formData.bookTitle.trim() || !formData.bookAuthor.trim() || createMutation.isPending}
                  data-testid="button-save-quote"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Quote"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {quotes.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <Quote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No quotes saved yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Save memorable passages from books you're reading
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-add-first-quote">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Quote
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {favoriteQuotes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  Favorites
                </h2>
                <div className="space-y-4">
                  {favoriteQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onToggleFavorite={() => toggleFavoriteMutation.mutate({ id: quote.id, isFavorite: !quote.isFavorite })}
                      onEdit={() => setEditQuote(quote)}
                      onDelete={() => deleteMutation.mutate(quote.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherQuotes.length > 0 && (
              <div>
                {favoriteQuotes.length > 0 && <h2 className="text-lg font-semibold mb-4">All Quotes</h2>}
                <div className="space-y-4">
                  {otherQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onToggleFavorite={() => toggleFavoriteMutation.mutate({ id: quote.id, isFavorite: !quote.isFavorite })}
                      onEdit={() => setEditQuote(quote)}
                      onDelete={() => deleteMutation.mutate(quote.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <Dialog open={!!editQuote} onOpenChange={(open) => !open && setEditQuote(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Quote</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                placeholder="Quote"
                value={editQuote?.quote || ""}
                onChange={(e) => setEditQuote(editQuote ? { ...editQuote, quote: e.target.value } : null)}
                className="min-h-[100px]"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Book title"
                  value={editQuote?.bookTitle || ""}
                  onChange={(e) => setEditQuote(editQuote ? { ...editQuote, bookTitle: e.target.value } : null)}
                />
                <Input
                  placeholder="Author"
                  value={editQuote?.bookAuthor || ""}
                  onChange={(e) => setEditQuote(editQuote ? { ...editQuote, bookAuthor: e.target.value } : null)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => editQuote && updateMutation.mutate(editQuote)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function QuoteCard({
  quote,
  onToggleFavorite,
  onEdit,
  onDelete,
}: {
  quote: BookQuote;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-4" data-testid={`card-quote-${quote.id}`}>
      <div className="flex gap-3">
        <Quote className="w-5 h-5 text-primary shrink-0 mt-1" />
        <div className="flex-1 min-w-0">
          <p className="italic text-foreground leading-relaxed">{quote.quote}</p>
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">{quote.bookTitle}</span>
            <span>by {quote.bookAuthor}</span>
            {quote.pageNumber && <Badge variant="secondary">p. {quote.pageNumber}</Badge>}
            {quote.chapter && <Badge variant="secondary">{quote.chapter}</Badge>}
          </div>
          {quote.notes && (
            <p className="text-sm text-muted-foreground mt-2 italic">Note: {quote.notes}</p>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFavorite}
            data-testid={`button-favorite-${quote.id}`}
          >
            <Star className={`w-4 h-4 ${quote.isFavorite ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
