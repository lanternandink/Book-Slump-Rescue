import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, BookOpen, Search, Save, ExternalLink,
  Loader2, Check, X, Edit2, ShoppingCart, AlertTriangle,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface AdminAuthorBook {
  id: number;
  authorProfileId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  genres: string[] | null;
  amazonUrl: string | null;
  bookshopUrl: string | null;
  seriesName: string | null;
  seriesNumber: number | null;
  publishedDate: string | null;
  createdAt: string | null;
  authorPenName: string;
  authorSlug: string;
}

export default function AdminBooks() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmazonUrl, setEditAmazonUrl] = useState("");
  const [editBookshopUrl, setEditBookshopUrl] = useState("");

  const { data: books = [], isLoading } = useQuery<AdminAuthorBook[]>({
    queryKey: ["/api/admin/author-books"],
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, amazonUrl, bookshopUrl }: { id: number; amazonUrl: string; bookshopUrl: string }) => {
      return apiRequest("PATCH", `/api/admin/author-books/${id}`, { amazonUrl, bookshopUrl });
    },
    onSuccess: () => {
      toast({ title: "Book updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/author-books"] });
      setEditingId(null);
    },
    onError: () => {
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const startEditing = (book: AdminAuthorBook) => {
    setEditingId(book.id);
    setEditAmazonUrl(book.amazonUrl || "");
    setEditBookshopUrl(book.bookshopUrl || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditAmazonUrl("");
    setEditBookshopUrl("");
  };

  const saveEdit = (id: number) => {
    updateMutation.mutate({ id, amazonUrl: editAmazonUrl, bookshopUrl: editBookshopUrl });
  };

  const filtered = books.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.title.toLowerCase().includes(q) ||
      b.authorPenName.toLowerCase().includes(q) ||
      (b.amazonUrl || "").toLowerCase().includes(q) ||
      (b.genres || []).some((g) => g.toLowerCase().includes(q))
    );
  });

  const extractAsin = (url: string | null): string => {
    if (!url) return "";
    const match = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return match ? match[1] : "";
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Please sign in to access admin.</p>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Access Denied" description="Admin access only." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-access-denied">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page. This area is restricted to administrators only.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Admin - Author Books" description="Manage author books and affiliate links." />
      <Navigation />
      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="icon" data-testid="button-back-admin">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2" data-testid="heading-admin-books">
                <BookOpen className="w-6 h-6 text-primary" /> Author Books
              </h1>
              <p className="text-sm text-muted-foreground">{books.length} book{books.length !== 1 ? "s" : ""} from author portal</p>
            </div>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or genre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-search-books"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-muted-foreground">{search ? "No books match your search." : "No author books yet."}</p>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-4 py-3 font-medium">Book</th>
                      <th className="text-left px-4 py-3 font-medium">Author</th>
                      <th className="text-left px-4 py-3 font-medium">Amazon URL / ASIN</th>
                      <th className="text-left px-4 py-3 font-medium">Bookshop URL</th>
                      <th className="text-right px-4 py-3 font-medium w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((book) => (
                      <tr key={book.id} className="border-b last:border-0 hover:bg-muted/20" data-testid={`row-book-${book.id}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {book.coverUrl && (
                              <img loading="lazy" decoding="async" src={book.coverUrl} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]" data-testid={`text-title-${book.id}`}>{book.title}</p>
                              {book.genres && book.genres.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {book.genres.slice(0, 2).map((g) => (
                                    <Badge key={g} variant="secondary" className="text-[10px] px-1 py-0">{g}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-muted-foreground" data-testid={`text-author-${book.id}`}>{book.authorPenName}</span>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === book.id ? (
                            <Input
                              value={editAmazonUrl}
                              onChange={(e) => setEditAmazonUrl(e.target.value)}
                              placeholder="https://amazon.com/dp/..."
                              className="h-8 text-xs"
                              data-testid={`input-amazon-${book.id}`}
                            />
                          ) : (
                            <div className="min-w-0">
                              {book.amazonUrl ? (
                                <div className="flex items-center gap-1.5">
                                  <a
                                    href={book.amazonUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline truncate max-w-[180px] text-xs inline-flex items-center gap-1"
                                    data-testid={`link-amazon-${book.id}`}
                                  >
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    {extractAsin(book.amazonUrl) || "Link"}
                                  </a>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">No link</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {editingId === book.id ? (
                            <Input
                              value={editBookshopUrl}
                              onChange={(e) => setEditBookshopUrl(e.target.value)}
                              placeholder="https://bookshop.org/..."
                              className="h-8 text-xs"
                              data-testid={`input-bookshop-${book.id}`}
                            />
                          ) : (
                            <div className="min-w-0">
                              {book.bookshopUrl ? (
                                <a
                                  href={book.bookshopUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline truncate max-w-[150px] text-xs inline-flex items-center gap-1"
                                  data-testid={`link-bookshop-${book.id}`}
                                >
                                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                  Bookshop
                                </a>
                              ) : (
                                <span className="text-muted-foreground text-xs italic">No link</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {editingId === book.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => saveEdit(book.id)}
                                disabled={updateMutation.isPending}
                                data-testid={`button-save-${book.id}`}
                              >
                                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-green-600" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={cancelEditing}
                                data-testid={`button-cancel-${book.id}`}
                              >
                                <X className="w-3.5 h-3.5 text-red-500" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => startEditing(book)}
                              data-testid={`button-edit-${book.id}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
