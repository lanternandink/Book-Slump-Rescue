import { useState, useRef, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { 
  User, BookOpen, Target, BarChart3, Star, Library, 
  Clock, CheckCircle, Check, XCircle, Loader2, LogIn, Edit2, Save, Trash2,
  Flame, Upload, History, Plus, Minus, Search, Eye, EyeOff, Package, Award, TrendingUp,
  Trophy, Medal, Crown, Zap, PenTool, BookMarked, Quote, Calendar, Download,
  Camera, Shield, Settings, Users, LayoutDashboard, RefreshCw, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Lock, UserCheck, UserX, Bell
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type UserBook, type UserChallenge, type ReadingStreak, type QuizHistory, type FollowRequest, DNF_REASONS, BOOK_FORMATS } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SEOHead } from "@/components/SEOHead";

const STATUS_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  want_to_read: { label: "Want to Read", icon: BookOpen, color: "bg-blue-500/20 text-blue-700 dark:text-blue-300" },
  currently_reading: { label: "Reading", icon: Clock, color: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" },
  finished: { label: "Finished", icon: CheckCircle, color: "bg-green-500/20 text-green-700 dark:text-green-300" },
  dnf: { label: "Did Not Finish", icon: XCircle, color: "bg-red-500/20 text-red-700 dark:text-red-300" },
};

const DNF_REASON_LABELS: Record<string, string> = {
  "boring": "Too Boring",
  "pacing": "Pacing Issues",
  "not-for-me": "Not For Me",
  "writing-style": "Writing Style",
  "characters": "Didn't Like Characters",
  "too-dark": "Too Dark",
  "too-slow": "Too Slow",
  "confusing": "Too Confusing",
  "other": "Other",
};

const FORMAT_LABELS: Record<string, string> = {
  "hardcover": "Hardcover",
  "paperback": "Paperback",
  "ebook": "E-book",
  "kindle": "Kindle",
  "audiobook": "Audiobook",
  "special-edition": "Special Edition",
};

const BADGE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  "first-book": { label: "First Book!", icon: BookOpen, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  "5-books": { label: "5 Books", icon: Library, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  "10-books": { label: "10 Books", icon: Target, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  "25-books": { label: "25 Books", icon: Trophy, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300" },
  "50-books": { label: "50 Books", icon: Medal, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  "100-books": { label: "Century!", icon: Crown, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  "first-dnf": { label: "First DNF", icon: XCircle, color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300" },
  "7-day-streak": { label: "Week Streak", icon: Flame, color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" },
  "30-day-streak": { label: "Month Streak", icon: Zap, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  "first-review": { label: "First Review", icon: PenTool, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  "bookworm": { label: "Bookworm", icon: BookMarked, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
};

interface SiteStats {
  totalUsers: number;
  totalBooks: number;
  totalClubs: number;
  totalReviews: number;
  totalCatalogBooks: number;
}

interface FeaturedPlacement {
  id: number;
  type: string;
  title: string;
  description: string | null;
  authorBookId: number | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  priority: number;
}

interface AdminImportResult {
  totalInCatalog: number;
  booksAdded: number;
  duplicatesSkipped: number;
  errors: string[];
}

function SiteManagementSection({ queryClient, toast }: { queryClient: ReturnType<typeof useQueryClient>; toast: ReturnType<typeof useToast>["toast"] }) {
  const [siteManagementOpen, setSiteManagementOpen] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<AdminImportResult | null>(null);
  const [showAddFeaturedDialog, setShowAddFeaturedDialog] = useState(false);
  const [newFeatured, setNewFeatured] = useState({
    type: "book_spotlight",
    title: "",
    description: "",
    authorBookId: "",
    startDate: "",
    endDate: "",
  });

  const { data: adminStats, isLoading: statsLoading } = useQuery<SiteStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const [statsRes, catalogRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/catalog/count", { credentials: "include" }),
      ]);
      if (!statsRes.ok) throw new Error("Failed to fetch stats");
      if (!catalogRes.ok) throw new Error("Failed to fetch catalog count");
      const stats = await statsRes.json();
      const catalog = await catalogRes.json();
      return { ...stats, totalCatalogBooks: catalog.count };
    },
    enabled: siteManagementOpen,
  });

  const { data: featuredPlacements = [], isLoading: featuredLoading } = useQuery<FeaturedPlacement[]>({
    queryKey: ["/api/admin/featured"],
    queryFn: async () => {
      const res = await fetch("/api/admin/featured", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch featured placements");
      return res.json();
    },
    enabled: siteManagementOpen,
  });

  const fullImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/import", { queriesPerGenre: 3 });
      return res.json();
    },
    onSuccess: (data: AdminImportResult) => {
      setLastImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/count"] });
      toast({ title: "Import Complete", description: `${data.booksAdded} books added to catalog.` });
    },
    onError: (err: Error) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  const quickImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/import-quick");
      return res.json();
    },
    onSuccess: (data: AdminImportResult) => {
      setLastImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/catalog/count"] });
      toast({ title: "Quick Import Complete", description: `${data.booksAdded} books added.` });
    },
    onError: (err: Error) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  const createFeaturedMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; description: string; authorBookId?: number; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/admin/featured", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      setShowAddFeaturedDialog(false);
      setNewFeatured({ type: "book_spotlight", title: "", description: "", authorBookId: "", startDate: "", endDate: "" });
      toast({ title: "Featured placement created." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    },
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/featured/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      toast({ title: "Featured placement updated." });
    },
    onError: () => {
      toast({ title: "Failed to update featured placement.", variant: "destructive" });
    },
  });

  const deleteFeaturedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/featured/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured"] });
      toast({ title: "Featured placement deleted." });
    },
    onError: () => {
      toast({ title: "Failed to delete featured placement.", variant: "destructive" });
    },
  });

  const isImporting = fullImportMutation.isPending || quickImportMutation.isPending;

  return (
    <Card className="mb-6" data-testid="card-site-management">
      <button
        className="w-full p-4 flex items-center justify-between gap-3 text-left"
        onClick={() => setSiteManagementOpen(!siteManagementOpen)}
        data-testid="button-toggle-site-management"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Site Management</h3>
            <p className="text-sm text-muted-foreground">Admin tools, stats, and content management</p>
          </div>
        </div>
        {siteManagementOpen ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {siteManagementOpen && (
        <div className="px-4 pb-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Site Stats</h4>
            </div>
            {statsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading stats...
              </div>
            ) : adminStats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold" data-testid="text-stat-users">{adminStats.totalUsers}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> Users
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold" data-testid="text-stat-catalog">{adminStats.totalCatalogBooks}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Library className="w-3 h-3" /> Catalog
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold" data-testid="text-stat-books">{adminStats.totalBooks}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <BookOpen className="w-3 h-3" /> User Books
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold" data-testid="text-stat-clubs">{adminStats.totalClubs}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Users className="w-3 h-3" /> Clubs
                  </div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold" data-testid="text-stat-reviews">{adminStats.totalReviews}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Star className="w-3 h-3" /> Reviews
                  </div>
                </Card>
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Book Import Tools</h4>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => fullImportMutation.mutate()}
                disabled={isImporting}
                data-testid="button-full-import"
              >
                {fullImportMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Run Full Import
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => quickImportMutation.mutate()}
                disabled={isImporting}
                data-testid="button-quick-import"
              >
                {quickImportMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Quick Import (+50 books)
                  </>
                )}
              </Button>
            </div>
            {lastImportResult && (
              <Card className="mt-3 p-3 bg-muted/30">
                <p className="text-sm font-medium mb-1">Import Results</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p data-testid="text-import-added">Books Added: {lastImportResult.booksAdded}</p>
                  <p data-testid="text-import-skipped">Duplicates Skipped: {lastImportResult.duplicatesSkipped}</p>
                  <p data-testid="text-import-total">Total in Catalog: {lastImportResult.totalInCatalog}</p>
                  {lastImportResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-destructive text-xs">Errors ({lastImportResult.errors.length}):</p>
                      {lastImportResult.errors.slice(0, 5).map((err, i) => (
                        <p key={i} className="text-xs text-destructive/80 truncate">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">Featured Content</h4>
              </div>
              <Dialog open={showAddFeaturedDialog} onOpenChange={setShowAddFeaturedDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-add-featured">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Featured
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Featured Placement</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={newFeatured.type}
                        onValueChange={(val) => setNewFeatured({ ...newFeatured, type: val })}
                      >
                        <SelectTrigger data-testid="select-featured-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="book_spotlight">Book Spotlight</SelectItem>
                          <SelectItem value="author_spotlight">Author Spotlight</SelectItem>
                          <SelectItem value="curated_list">Curated List</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newFeatured.title}
                        onChange={(e) => setNewFeatured({ ...newFeatured, title: e.target.value })}
                        placeholder="Featured title"
                        data-testid="input-featured-title"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newFeatured.description}
                        onChange={(e) => setNewFeatured({ ...newFeatured, description: e.target.value })}
                        placeholder="Description (optional)"
                        data-testid="input-featured-description"
                      />
                    </div>
                    <div>
                      <Label>Author Book ID (optional)</Label>
                      <Input
                        type="number"
                        value={newFeatured.authorBookId}
                        onChange={(e) => setNewFeatured({ ...newFeatured, authorBookId: e.target.value })}
                        placeholder="Book ID"
                        data-testid="input-featured-book-id"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={newFeatured.startDate}
                          onChange={(e) => setNewFeatured({ ...newFeatured, startDate: e.target.value })}
                          data-testid="input-featured-start-date"
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={newFeatured.endDate}
                          onChange={(e) => setNewFeatured({ ...newFeatured, endDate: e.target.value })}
                          data-testid="input-featured-end-date"
                        />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        createFeaturedMutation.mutate({
                          type: newFeatured.type,
                          title: newFeatured.title,
                          description: newFeatured.description,
                          authorBookId: newFeatured.authorBookId ? parseInt(newFeatured.authorBookId) : undefined,
                          startDate: newFeatured.startDate,
                          endDate: newFeatured.endDate,
                        });
                      }}
                      disabled={!newFeatured.title || createFeaturedMutation.isPending}
                      data-testid="button-submit-featured"
                    >
                      {createFeaturedMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Featured Placement"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {featuredLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading featured...
              </div>
            ) : featuredPlacements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No featured placements yet.</p>
            ) : (
              <div className="space-y-2">
                {featuredPlacements.map((placement) => (
                  <Card key={placement.id} className="p-3" data-testid={`card-featured-${placement.id}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{placement.title}</p>
                          <Badge variant="secondary">{placement.type.replace("_", " ")}</Badge>
                          {placement.isActive ? (
                            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        {placement.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{placement.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFeaturedMutation.mutate({ id: placement.id, isActive: !placement.isActive })}
                          data-testid={`button-toggle-featured-${placement.id}`}
                        >
                          {placement.isActive ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteFeaturedMutation.mutate(placement.id)}
                          data-testid={`button-delete-featured-${placement.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function StarRating({ rating, onRate }: { rating: number | null; onRate?: (r: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          disabled={!onRate}
          className="p-0.5 disabled:cursor-default"
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              (hover || rating || 0) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function QuickAddBookDialog({ onAdd }: { onAdd: (book: any) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("currently_reading");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const searchBooks = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/book-search?q=${encodeURIComponent(query)}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.books || []);
      }
    } catch (e) {
      console.error("Search error:", e);
    }
    setSearching(false);
  };

  const handleSubmit = () => {
    if (selectedBook) {
      onAdd({
        bookTitle: selectedBook.title,
        bookAuthor: selectedBook.authors?.join(", ") || "Unknown",
        bookCoverUrl: selectedBook.coverUrl,
        googleBooksId: selectedBook.sourceId,
        pageCount: selectedBook.pageCount,
        status,
      });
    } else if (title && author) {
      onAdd({
        bookTitle: title,
        bookAuthor: author,
        status,
      });
    }
    setOpen(false);
    setTitle("");
    setAuthor("");
    setSelectedBook(null);
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 shadow-lg" data-testid="button-quick-add-book">
          <Plus className="w-5 h-5" />
          Quick Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a Book to Your Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Search for a book</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                className="pl-9"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSelectedBook(null);
                  searchBooks(e.target.value);
                }}
                data-testid="input-search-book"
              />
            </div>
            {searching && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching...
              </div>
            )}
            {searchResults.length > 0 && !selectedBook && (
              <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
                {searchResults.map((book, i) => (
                  <button
                    key={i}
                    className="w-full p-2 text-left hover:bg-muted flex gap-2 items-center"
                    onClick={() => {
                      setSelectedBook(book);
                      setTitle(book.title);
                      setAuthor(book.authors?.join(", ") || "");
                      setSearchResults([]);
                    }}
                    data-testid={`search-result-${i}`}
                  >
                    {book.coverUrl && (
                      <img loading="lazy" decoding="async" src={book.coverUrl} alt="" className="w-8 h-12 object-cover rounded" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{book.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{book.authors?.join(", ")}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {title.length >= 3 && searchResults.length === 0 && !searching && !selectedBook && (
              <div className="mt-2 p-3 border rounded-md bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  No results found from search. Enter the author name below to add this book manually.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: If search isn't working, it may be temporarily rate-limited. Try again later or add books manually.
                </p>
              </div>
            )}
          </div>

          {selectedBook && (
            <Card className="p-3 bg-muted/50">
              <div className="flex gap-3">
                {selectedBook.coverUrl && (
                  <img loading="lazy" decoding="async" src={selectedBook.coverUrl} alt="" className="w-12 h-18 object-cover rounded" />
                )}
                <div>
                  <p className="font-medium">{selectedBook.title}</p>
                  <p className="text-sm text-muted-foreground">{selectedBook.authors?.join(", ")}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-1 h-auto p-0 text-xs"
                    onClick={() => {
                      setSelectedBook(null);
                      setTitle("");
                      setAuthor("");
                    }}
                    data-testid="button-change-selection"
                  >
                    Change selection
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {!selectedBook && title && (
            <div>
              <Label>Author (if adding manually)</Label>
              <Input
                placeholder="Author name"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1"
                data-testid="input-author"
              />
            </div>
          )}

          <div>
            <Label>Reading Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1" data-testid="select-add-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="currently_reading">Currently Reading</SelectItem>
                <SelectItem value="want_to_read">Want to Read</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="dnf">Did Not Finish</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!selectedBook && (!title || !author)}
            data-testid="button-submit-add-book"
          >
            Add to Library
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BookLogCard({ book, onUpdate, onDelete }: { 
  book: UserBook; 
  onUpdate: (updates: Partial<UserBook>) => void;
  onDelete: () => void;
}) {
  const [editingReview, setEditingReview] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [review, setReview] = useState(book.review || "");
  const [notes, setNotes] = useState(book.notes || "");
  const [showSpoilers, setShowSpoilers] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [fetchedCover, setFetchedCover] = useState<string | null>(null);
  const status = STATUS_LABELS[book.status] || STATUS_LABELS.want_to_read;

  const safeCoverUrl = fetchedCover
    || (book.bookCoverUrl ? book.bookCoverUrl.replace(/^http:\/\//i, "https://") : null);

  const handleCoverError = () => {
    if (!coverError && book.bookTitle && book.bookAuthor) {
      setCoverError(true);
      const params = new URLSearchParams({ title: book.bookTitle, author: book.bookAuthor });
      fetch(`/api/book-cover?${params}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.coverUrl) setFetchedCover(data.coverUrl.replace(/^http:\/\//i, "https://")); })
        .catch(() => {});
    }
  };
  const StatusIcon = status.icon;

  const handleSaveReview = () => {
    onUpdate({ review });
    setEditingReview(false);
  };

  const handleSaveNotes = () => {
    onUpdate({ notes });
    setEditingNotes(false);
  };

  useEffect(() => {
    if (!book.bookCoverUrl && book.bookTitle && book.bookAuthor && !fetchedCover && !coverError) {
      setCoverError(true);
      const params = new URLSearchParams({ title: book.bookTitle, author: book.bookAuthor });
      fetch(`/api/book-cover?${params}`, { credentials: "include" })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.coverUrl) setFetchedCover(data.coverUrl.replace(/^http:\/\//i, "https://")); })
        .catch(() => {});
    }
  }, [book.bookCoverUrl, book.bookTitle, book.bookAuthor]);

  const isDnf = book.status === "dnf";

  return (
    <Card className="p-4">
      <div className="flex gap-4">
        {safeCoverUrl && !coverError ? (
          <img
            loading="lazy"
            decoding="async"
            src={safeCoverUrl}
            alt={book.bookTitle}
            className="w-16 h-24 object-cover rounded-md flex-shrink-0"
            onError={handleCoverError}
          />
        ) : fetchedCover ? (
          <img
            loading="lazy"
            decoding="async"
            src={fetchedCover}
            alt={book.bookTitle}
            className="w-16 h-24 object-cover rounded-md flex-shrink-0"
          />
        ) : (
          <div
            className="w-16 h-24 bg-secondary rounded-md flex items-center justify-center flex-shrink-0 cursor-pointer"
            onClick={!coverError ? handleCoverError : undefined}
          >
            <BookOpen className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-base truncate">{book.bookTitle}</h3>
              <p className="text-sm text-muted-foreground truncate">{book.bookAuthor}</p>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="text-destructive flex-shrink-0"
              onClick={onDelete}
              data-testid={`button-delete-book-${book.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="secondary" className={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            
            {book.isOwned && (
              <Badge variant="outline" className="text-xs">
                <Package className="w-3 h-3 mr-1" />
                Owned {book.format && `(${FORMAT_LABELS[book.format] || book.format})`}
              </Badge>
            )}
            
            <Select
              value={book.status}
              onValueChange={(value) => onUpdate({ status: value as UserBook["status"] })}
            >
              <SelectTrigger className="h-7 w-auto text-xs" data-testid={`select-status-${book.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Want to Read</SelectItem>
                <SelectItem value="currently_reading">Currently Reading</SelectItem>
                <SelectItem value="finished">Finished</SelectItem>
                <SelectItem value="dnf">Did Not Finish</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isDnf && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-900/50">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-medium text-red-700 dark:text-red-300">DNF Details:</span>
                <Select
                  value={book.dnfReason || ""}
                  onValueChange={(value) => onUpdate({ dnfReason: value })}
                >
                  <SelectTrigger className="h-6 w-auto text-xs" data-testid={`select-dnf-reason-${book.id}`}>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {DNF_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {DNF_REASON_LABELS[reason] || reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Stopped at (page, chapter, %)"
                  value={book.dnfStopPoint || ""}
                  onChange={(e) => onUpdate({ dnfStopPoint: e.target.value })}
                  className="h-6 text-xs w-32"
                  data-testid={`input-dnf-stop-${book.id}`}
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground">Rating:</span>
            <StarRating rating={book.rating} onRate={(r) => onUpdate({ rating: r })} />
          </div>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <Switch
                id={`owned-${book.id}`}
                checked={book.isOwned || false}
                onCheckedChange={(checked) => onUpdate({ isOwned: checked })}
                data-testid={`switch-owned-${book.id}`}
              />
              <Label htmlFor={`owned-${book.id}`} className="text-xs">I own this</Label>
            </div>
            {book.isOwned && (
              <Select
                value={book.format || ""}
                onValueChange={(value) => onUpdate({ format: value })}
              >
                <SelectTrigger className="h-6 w-auto text-xs" data-testid={`select-format-${book.id}`}>
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  {BOOK_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {FORMAT_LABELS[format] || format}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Review</span>
                {book.review && (
                  <div className="flex items-center gap-1">
                    <Switch
                      id={`spoiler-review-${book.id}`}
                      checked={book.isSpoiler || false}
                      onCheckedChange={(checked) => onUpdate({ isSpoiler: checked })}
                      data-testid={`switch-spoiler-${book.id}`}
                    />
                    <Label htmlFor={`spoiler-review-${book.id}`} className="text-xs text-muted-foreground">
                      Contains spoilers
                    </Label>
                  </div>
                )}
              </div>
              {editingReview ? (
                <div className="space-y-2 mt-1">
                  <Textarea
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    placeholder="Write your review..."
                    className="text-sm min-h-[60px]"
                    data-testid={`textarea-review-${book.id}`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveReview} data-testid={`button-save-review-${book.id}`}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingReview(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {book.review ? (
                    <div className="mt-1">
                      {book.isSpoiler && !showSpoilers ? (
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground italic blur-sm select-none">
                            "{book.review.substring(0, 50)}..."
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowSpoilers(true)}
                            className="h-auto p-1"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-sm text-muted-foreground italic">"{book.review}"</p>
                          {book.isSpoiler && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowSpoilers(false)}
                              className="h-auto p-1"
                            >
                              <EyeOff className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-1 text-xs"
                    onClick={() => setEditingReview(true)}
                    data-testid={`button-edit-review-${book.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {book.review ? "Edit Review" : "Add Review"}
                  </Button>
                </div>
              )}
            </div>
            
            <div>
              <span className="text-xs font-medium text-muted-foreground">Notes & Quotes</span>
              {editingNotes ? (
                <div className="space-y-2 mt-1">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add personal notes, favorite quotes, or page references..."
                    className="text-sm min-h-[60px]"
                    data-testid={`textarea-notes-${book.id}`}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNotes} data-testid={`button-save-notes-${book.id}`}>
                      <Save className="w-3 h-3 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {notes ? (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{notes}</p>
                  ) : null}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-1 text-xs"
                    onClick={() => setEditingNotes(true)}
                    data-testid={`button-edit-notes-${book.id}`}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {notes ? "Edit Notes" : "Add Notes"}
                  </Button>
                </div>
              )}
            </div>

            {book.status === "currently_reading" && book.pageCount && (
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Reading Progress</span>
                  <span className="font-medium">
                    {book.currentPage || 0} / {book.pageCount} pages
                  </span>
                </div>
                <Progress 
                  value={((book.currentPage || 0) / book.pageCount) * 100} 
                  className="h-2 mt-1" 
                />
                <Input
                  type="number"
                  placeholder="Current page"
                  value={book.currentPage || ""}
                  onChange={(e) => onUpdate({ currentPage: parseInt(e.target.value) || 0 })}
                  className="h-6 text-xs w-24 mt-1"
                  max={book.pageCount}
                  data-testid={`input-progress-${book.id}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const { data: books = [], isLoading: booksLoading } = useQuery<UserBook[]>({
    queryKey: ["/api/user/books"],
    enabled: isAuthenticated,
  });

  const { data: challenge } = useQuery<UserChallenge | null>({
    queryKey: ["/api/user/challenge", currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/user/challenge?year=${currentYear}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: isAuthenticated,
  });

  const { data: streak } = useQuery<ReadingStreak | null>({
    queryKey: ["/api/user/streak"],
    enabled: isAuthenticated,
  });

  const { data: quizHistory = [] } = useQuery<QuizHistory[]>({
    queryKey: ["/api/user/quiz-history"],
    enabled: isAuthenticated,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasSynced, setHasSynced] = useState(false);
  useEffect(() => {
    if (isAuthenticated && !hasSynced) {
      setHasSynced(true);
      apiRequest("POST", "/api/user/library-sync").then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/challenge", currentYear] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/reading-insights"] });
      }).catch(() => {});
    }
  }, [isAuthenticated, hasSynced]);

  const addBookMutation = useMutation({
    mutationFn: async (book: any) => {
      return apiRequest("POST", "/api/user/books", book);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/streak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/reading-insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
      toast({ title: "Book added to library!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add book.", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (books: any[]) => {
      return apiRequest("POST", "/api/user/import/goodreads", { books });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({ 
        title: "Import Complete", 
        description: data.message || `Imported ${data.imported} books.`
      });
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Could not import books.", variant: "destructive" });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/"/g, ""));
      
      const titleIdx = headers.findIndex(h => h.includes("title"));
      const authorIdx = headers.findIndex(h => h.includes("author"));
      const shelfIdx = headers.findIndex(h => h.includes("shelf") || h.includes("exclusive shelf"));
      const ratingIdx = headers.findIndex(h => h.includes("my rating"));
      const dateReadIdx = headers.findIndex(h => h.includes("date read"));

      const books = lines.slice(1).filter(line => line.trim()).map(line => {
        const cols = line.match(/("([^"]*)"|[^,]*)/g)?.map(c => c.replace(/^"|"$/g, "").trim()) || [];
        return {
          title: cols[titleIdx] || "",
          author: cols[authorIdx] || "",
          shelf: cols[shelfIdx] || "to-read",
          rating: cols[ratingIdx] || "",
          dateRead: cols[dateReadIdx] || "",
        };
      }).filter(b => b.title);

      if (books.length > 0) {
        importMutation.mutate(books);
      } else {
        toast({ title: "No books found", description: "Could not parse the CSV file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPEG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const urlRes = await fetch("/api/profile/photo/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");

      const confirmRes = await fetch("/api/profile/photo/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ objectPath }),
      });
      if (!confirmRes.ok) throw new Error("Failed to save photo");

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile photo updated!" });
    } catch (err) {
      toast({ title: "Upload failed", description: "Could not upload profile photo.", variant: "destructive" });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/user/export?format=csv", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Export failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `library-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Export complete", description: "Your library has been downloaded." });
    } catch (err) {
      toast({ title: "Export failed", description: "Could not export library.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const updateBookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<UserBook> }) => {
      return apiRequest("PATCH", `/api/user/books/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/streak"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/reading-insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/community/feed"] });
      toast({ title: "Book updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update book.", variant: "destructive" });
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/user/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({ title: "Book removed from library" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove book.", variant: "destructive" });
    },
  });

  const isLoading = authLoading || booksLoading;

  const stats = {
    total: books.length,
    finished: books.filter(b => b.status === "finished").length,
    reading: books.filter(b => b.status === "currently_reading").length,
    wantToRead: books.filter(b => b.status === "want_to_read").length,
    dnf: books.filter(b => b.status === "dnf").length,
    owned: books.filter(b => b.isOwned).length,
    avgRating: books.filter(b => b.rating).reduce((sum, b) => sum + (b.rating || 0), 0) / 
               (books.filter(b => b.rating).length || 1),
  };

  const challengeProgress = challenge 
    ? Math.min(100, ((challenge.booksRead?.length || 0) / challenge.goal) * 100) 
    : 0;

  const [challengeExpanded, setChallengeExpanded] = useState(false);
  const [editingChallengeGoal, setEditingChallengeGoal] = useState(false);
  const [challengeGoalInput, setChallengeGoalInput] = useState("");
  const [newChallengeBookTitle, setNewChallengeBookTitle] = useState("");

  const createChallengeMutation = useMutation({
    mutationFn: async (goal: number) => {
      return apiRequest("POST", "/api/user/challenge", { goal, year: currentYear });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({ title: "Challenge started!", description: `Your ${currentYear} reading goal is set!` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create challenge.", variant: "destructive" });
    },
  });

  const updateChallengeMutation = useMutation({
    mutationFn: async (updates: { goal?: number; booksRead?: string[] }) => {
      if (!challenge) throw new Error("No challenge");
      return apiRequest("PATCH", `/api/user/challenge/${challenge.id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update challenge.", variant: "destructive" });
    },
  });

  const deleteChallengeMutation = useMutation({
    mutationFn: async () => {
      if (!challenge) throw new Error("No challenge");
      return apiRequest("DELETE", `/api/user/challenge/${challenge.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/challenge"] });
      toast({ title: "Challenge reset", description: "Your challenge has been cleared." });
    },
  });

  const challengeIsPending = createChallengeMutation.isPending || updateChallengeMutation.isPending || deleteChallengeMutation.isPending;
  const challengeBooksRead = challenge?.booksRead || [];
  const challengeIsComplete = challenge ? challengeBooksRead.length >= challenge.goal : false;

  const [profileSettingsOpen, setProfileSettingsOpen] = useState(() => new URLSearchParams(window.location.search).get("edit") === "true");
  const [profileBio, setProfileBio] = useState((user as any)?.bio || "");
  const [profileFavoriteGenres, setProfileFavoriteGenres] = useState<string[]>((user as any)?.favoriteGenres || []);
  const [profileCurrentlyReading, setProfileCurrentlyReading] = useState((user as any)?.currentlyReading || "");
  const [profileIsPublic, setProfileIsPublic] = useState((user as any)?.isProfilePublic !== false);
  const [profileDisplayName, setProfileDisplayName] = useState(user?.displayName || "");
  const [genreInput, setGenreInput] = useState("");

  const { data: privacySettings } = useQuery<{ isPrivateAccount: boolean; isProfilePublic: boolean }>({
    queryKey: ["/api/user/privacy"],
    enabled: isAuthenticated,
  });

  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  useEffect(() => {
    if (privacySettings) {
      setIsPrivateAccount(privacySettings.isPrivateAccount);
    }
  }, [privacySettings]);

  const { data: followRequests = [], isLoading: followRequestsLoading } = useQuery<(FollowRequest & { requesterName?: string; requesterAvatar?: string })[]>({
    queryKey: ["/api/user/follow-requests"],
    enabled: isAuthenticated,
  });

  const pendingFollowRequests = followRequests.filter(r => r.status === "pending");

  const togglePrivacyMutation = useMutation({
    mutationFn: async (isPrivate: boolean) => {
      return apiRequest("PATCH", "/api/user/privacy", { isPrivateAccount: isPrivate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/privacy"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/follow-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update privacy setting.", variant: "destructive" });
      setIsPrivateAccount(!isPrivateAccount);
    },
  });

  const approveFollowRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("POST", `/api/user/follow-requests/${requestId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/follow-requests"] });
      toast({ title: "Follow request approved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    },
  });

  const rejectFollowRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest("POST", `/api/user/follow-requests/${requestId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/follow-requests"] });
      toast({ title: "Follow request rejected" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reject request.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await apiRequest("PATCH", "/api/user/profile", updates);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/auth/user"], (old: any) => old ? { ...old, ...updatedUser } : updatedUser);
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "profile"] });
      toast({ title: "Profile saved!", description: "Your public profile has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const GENRE_OPTIONS = [
    "Fantasy", "Romance", "Mystery", "Thriller", "Sci-Fi", "Horror",
    "Historical Fiction", "Contemporary", "Literary Fiction", "Memoir",
    "Self-Help", "Young Adult", "Poetry", "Graphic Novel", "Non-Fiction",
    "Biography", "True Crime", "Dystopian", "Paranormal", "Comedy",
  ];

  const addGenre = (genre: string) => {
    if (!profileFavoriteGenres.includes(genre)) {
      setProfileFavoriteGenres([...profileFavoriteGenres, genre]);
    }
    setGenreInput("");
  };

  const removeGenre = (genre: string) => {
    setProfileFavoriteGenres(profileFavoriteGenres.filter(g => g !== genre));
  };

  const saveProfileSettings = () => {
    updateProfileMutation.mutate({
      displayName: profileDisplayName.trim() || null,
      bio: profileBio.trim() || null,
      favoriteGenres: profileFavoriteGenres,
      currentlyReading: profileCurrentlyReading.trim() || null,
      isProfilePublic: profileIsPublic,
    });
  };

  const earnedBadges = streak?.earnedBadges || [];
  const computedBadges: string[] = [];
  if (stats.finished >= 1 && !computedBadges.includes("first-book")) computedBadges.push("first-book");
  if (stats.finished >= 5) computedBadges.push("5-books");
  if (stats.finished >= 10) computedBadges.push("10-books");
  if (stats.finished >= 25) computedBadges.push("25-books");
  if (stats.finished >= 50) computedBadges.push("50-books");
  if (stats.finished >= 100) computedBadges.push("100-books");
  if (stats.dnf >= 1) computedBadges.push("first-dnf");
  if ((streak?.currentStreak || 0) >= 7) computedBadges.push("7-day-streak");
  if ((streak?.currentStreak || 0) >= 30) computedBadges.push("30-day-streak");
  if (books.some(b => b.review)) computedBadges.push("first-review");
  const allBadges = Array.from(new Set([...earnedBadges, ...computedBadges]));

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold mb-4">
              Sign In to View Your Profile
            </h2>
            <p className="text-muted-foreground mb-6">
              Create a free account to track your reading, rate books, write reviews, and set reading goals.
            </p>
            <a href="/api/login">
              <Button size="lg" data-testid="button-login-profile">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </a>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="My Profile" description="Manage your reading profile, preferences, and account settings." />
      <Navigation />

      <main className="flex-1">
        <section className="py-8 lg:py-12">
          <div className="container px-4 mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-16 h-16">
                      {user?.profileImageUrl ? (
                        <AvatarImage src={user.profileImageUrl} alt={user.displayName || user.firstName || "Profile"} />
                      ) : null}
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {(user?.displayName || user?.firstName) ? (user?.displayName || user?.firstName || "")[0].toUpperCase() : <User className="w-8 h-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      data-testid="input-profile-photo"
                    />
                    <button
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center cursor-pointer"
                      style={{ visibility: "visible" }}
                      data-testid="button-upload-photo"
                    >
                      <span className="invisible group-hover:visible">
                        {isUploadingPhoto ? (
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <Camera className="w-5 h-5 text-white" />
                        )}
                      </span>
                    </button>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="font-display text-3xl font-bold">
                        {(user?.displayName || user?.firstName) ? `${user.displayName || user.firstName}'s Profile` : "Your Profile"}
                      </h1>
                      {(user as any)?.isAdmin && (
                        <Badge variant="default" data-testid="badge-profile-admin">Admin</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">Track your reading journey</p>
                  </div>
                </div>
                <QuickAddBookDialog onAdd={(book) => addBookMutation.mutate(book)} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.finished}</div>
                  <div className="text-xs text-muted-foreground">Finished</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{stats.reading}</div>
                  <div className="text-xs text-muted-foreground">Reading</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-blue-500">{stats.wantToRead}</div>
                  <div className="text-xs text-muted-foreground">TBR</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold text-red-500">{stats.dnf}</div>
                  <div className="text-xs text-muted-foreground">DNF</div>
                </Card>
                <Card className="p-3 text-center">
                  <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Avg
                  </div>
                </Card>
              </div>

              {(user?.isOwner || (user as any)?.isAdmin) && (
                <>
                  <Card className="p-4 mb-6 border-dashed hover-elevate">
                    <Link href="/admin/dashboard">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Admin Dashboard</h3>
                          <p className="text-sm text-muted-foreground">
                            Manage submissions, ads, newsletters, payments, ARCs, resources, interviews, and reviews.
                          </p>
                        </div>
                        <Button variant="outline" size="sm" data-testid="button-admin-dashboard">
                          Open Dashboard
                        </Button>
                      </div>
                    </Link>
                  </Card>
                  <SiteManagementSection queryClient={queryClient} toast={toast} />
                </>
              )}

              <Card className="p-4 mb-6 border-dashed hover-elevate">
                <Link href="/author-dashboard">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <PenTool className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Author Portal</h3>
                      <p className="text-sm text-muted-foreground">
                        Are you an author? Create your profile, manage your books, and distribute ARCs.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-author-portal">
                      Open Portal
                    </Button>
                  </div>
                </Link>
              </Card>

              {challenge ? (
                <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {challengeIsComplete ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <Target className="w-5 h-5 text-primary" />
                      )}
                      <span className="font-semibold">{currentYear} Reading Challenge</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={challengeIsComplete ? "default" : "secondary"}>
                        {challengeBooksRead.length} / {challenge.goal} books
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setChallengeExpanded(!challengeExpanded)}
                        data-testid="button-toggle-challenge"
                      >
                        {challengeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <Progress value={challengeProgress} className="h-3" />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-muted-foreground">
                      {challengeIsComplete 
                        ? "Challenge completed! Keep reading!" 
                        : `${Math.round(challengeProgress)}% complete - ${challenge.goal - challengeBooksRead.length} books to go`
                      }
                    </span>
                    {!challengeExpanded && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-sm"
                        onClick={() => setChallengeExpanded(true)}
                        data-testid="link-view-challenge"
                      >
                        Manage Challenge
                      </Button>
                    )}
                  </div>

                  {challengeExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="flex items-center justify-between">
                        {editingChallengeGoal ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">Goal:</span>
                            <Input
                              type="number"
                              className="w-20 h-8 text-sm"
                              value={challengeGoalInput}
                              onChange={(e) => setChallengeGoalInput(e.target.value)}
                              min="1"
                              data-testid="input-edit-challenge-goal"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                const newGoal = parseInt(challengeGoalInput);
                                if (!isNaN(newGoal) && newGoal >= 1) {
                                  updateChallengeMutation.mutate({ goal: newGoal });
                                  setEditingChallengeGoal(false);
                                  toast({ title: "Goal updated!", description: `New goal: ${newGoal} books.` });
                                }
                              }}
                              disabled={challengeIsPending}
                              data-testid="button-save-challenge-goal"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setChallengeGoalInput(challenge.goal.toString()); setEditingChallengeGoal(true); }}
                            className="text-sm text-muted-foreground hover:text-foreground"
                            data-testid="button-edit-challenge-goal"
                          >
                            Goal: {challenge.goal} books (click to edit)
                          </button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteChallengeMutation.mutate()}
                          disabled={challengeIsPending}
                          data-testid="button-reset-challenge"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Reset
                        </Button>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          placeholder="Add book title..."
                          value={newChallengeBookTitle}
                          onChange={(e) => setNewChallengeBookTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newChallengeBookTitle.trim() && challenge) {
                              const updatedBooks = [...challengeBooksRead, newChallengeBookTitle.trim()];
                              updateChallengeMutation.mutate({ booksRead: updatedBooks });
                              setNewChallengeBookTitle("");
                              const remaining = challenge.goal - updatedBooks.length;
                              if (remaining <= 0) {
                                toast({ title: "Congratulations!", description: "You've completed your reading challenge!" });
                              } else {
                                toast({ title: "Book added!", description: `${remaining} more to reach your goal.` });
                              }
                            }
                          }}
                          className="h-8 text-sm"
                          data-testid="input-challenge-book-title"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!newChallengeBookTitle.trim() || !challenge) return;
                            const updatedBooks = [...challengeBooksRead, newChallengeBookTitle.trim()];
                            updateChallengeMutation.mutate({ booksRead: updatedBooks });
                            setNewChallengeBookTitle("");
                            const remaining = challenge.goal - updatedBooks.length;
                            if (remaining <= 0) {
                              toast({ title: "Congratulations!", description: "You've completed your reading challenge!" });
                            } else {
                              toast({ title: "Book added!", description: `${remaining} more to reach your goal.` });
                            }
                          }}
                          disabled={!newChallengeBookTitle.trim() || challengeIsPending}
                          data-testid="button-add-challenge-book"
                        >
                          {challengeIsPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        </Button>
                      </div>

                      {challengeBooksRead.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Books Read ({challengeBooksRead.length})</h4>
                          <ul className="space-y-1">
                            {challengeBooksRead.map((title, index) => (
                              <li key={index} className="flex items-center justify-between bg-secondary/30 rounded-md px-3 py-1.5 text-sm">
                                <span className="flex items-center gap-2">
                                  <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                                  {title}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    const updatedBooks = challengeBooksRead.filter((_, i) => i !== index);
                                    updateChallengeMutation.mutate({ booksRead: updatedBooks });
                                  }}
                                  disabled={challengeIsPending}
                                  data-testid={`button-remove-challenge-book-${index}`}
                                >
                                  <Trash2 className="w-3 h-3 text-muted-foreground" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              ) : (
                <Card className="p-4 mb-6 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Target className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Start Your Reading Challenge!</h3>
                      <p className="text-sm text-muted-foreground">
                        How many books will you read in {currentYear}?
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {[12, 24, 52].map((goal) => (
                          <Button
                            key={goal}
                            variant="outline"
                            size="sm"
                            onClick={() => createChallengeMutation.mutate(goal)}
                            disabled={challengeIsPending}
                            data-testid={`button-goal-${goal}`}
                          >
                            {goal} books ({goal === 12 ? "1/mo" : goal === 24 ? "2/mo" : "1/wk"})
                          </Button>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Input
                          type="number"
                          placeholder="Custom..."
                          min="1"
                          value={challengeGoalInput}
                          onChange={(e) => setChallengeGoalInput(e.target.value)}
                          className="w-24 h-8 text-sm"
                          data-testid="input-custom-challenge-goal"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const goal = parseInt(challengeGoalInput);
                            if (goal > 0) createChallengeMutation.mutate(goal);
                          }}
                          disabled={!challengeGoalInput || parseInt(challengeGoalInput) < 1 || challengeIsPending}
                          data-testid="button-set-custom-challenge-goal"
                        >
                          {challengeIsPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Set"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {streak && ((streak.currentStreak ?? 0) > 0 || (streak.longestStreak ?? 0) > 0) ? (
                <Card className="p-4 mb-6 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/20 rounded-full">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">Reading Streak</h3>
                        {(streak.currentStreak ?? 0) > 0 && (streak.currentStreak ?? 0) === (streak.longestStreak ?? 0) && (
                          <Badge variant="secondary" className="text-xs">Personal Best!</Badge>
                        )}
                      </div>
                      <div className="flex gap-6 mt-1">
                        <div>
                          <span className="text-2xl font-bold text-orange-500">{streak.currentStreak || 0}</span>
                          <span className="text-sm text-muted-foreground ml-1">day streak</span>
                        </div>
                        <div>
                          <span className="text-lg font-medium text-muted-foreground">{streak.longestStreak || 0}</span>
                          <span className="text-sm text-muted-foreground ml-1">best</span>
                        </div>
                        <div>
                          <span className="text-lg font-medium text-muted-foreground">{streak.totalBooksFinished || 0}</span>
                          <span className="text-sm text-muted-foreground ml-1">total</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : stats.finished === 0 ? (
                <Card className="p-4 mb-6 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-full">
                      <Flame className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Start Your Reading Streak!</h3>
                      <p className="text-sm text-muted-foreground">
                        Finish a book to start building your reading streak. Every book counts!
                      </p>
                    </div>
                  </div>
                </Card>
              ) : null}

              {allBadges.length > 0 && (
                <Card className="p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold">Badges</h3>
                    </div>
                    <Link href="/badges">
                      <Button variant="ghost" size="sm" className="text-xs" data-testid="link-view-all-badges">
                        View All Badges
                      </Button>
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allBadges.map((badge) => {
                      const config = BADGE_CONFIG[badge];
                      if (!config) return null;
                      const IconComponent = config.icon;
                      return (
                        <Badge key={badge} variant="secondary" className={config.color} data-testid={`badge-${badge}`}>
                          <IconComponent className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      );
                    })}
                  </div>
                </Card>
              )}

              {quizHistory.length > 0 && (
                <Card className="p-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Reading Mood History</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {quizHistory.slice(0, 5).map((quiz, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {Array.isArray(quiz.mood) && quiz.mood.length > 0 ? quiz.mood.join(", ") : "exploring"} • {quiz.selectedGenres?.slice(0, 2).join(", ") || "various genres"}
                        <span className="text-muted-foreground ml-1">
                          {quiz.takenAt ? new Date(quiz.takenAt).toLocaleDateString() : ""}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <Link href="/lists" asChild>
                  <a className="block" data-testid="link-reading-lists">
                    <Card className="p-4 text-center hover-elevate cursor-pointer h-full">
                      <Library className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                      <p className="text-sm font-medium">Reading Lists</p>
                      <p className="text-xs text-muted-foreground">Custom collections</p>
                    </Card>
                  </a>
                </Link>
                <Link href="/quotes" asChild>
                  <a className="block" data-testid="link-quotes">
                    <Card className="p-4 text-center hover-elevate cursor-pointer h-full">
                      <Quote className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                      <p className="text-sm font-medium">Book Quotes</p>
                      <p className="text-xs text-muted-foreground">Favorite passages</p>
                    </Card>
                  </a>
                </Link>
                <Link href="/series" asChild>
                  <a className="block" data-testid="link-series">
                    <Card className="p-4 text-center hover-elevate cursor-pointer h-full">
                      <Library className="w-6 h-6 mx-auto mb-2 text-green-500" />
                      <p className="text-sm font-medium">Series Tracker</p>
                      <p className="text-xs text-muted-foreground">Track progress</p>
                    </Card>
                  </a>
                </Link>
                <Link href="/year-in-review" asChild>
                  <a className="block" data-testid="link-year-review">
                    <Card className="p-4 text-center hover-elevate cursor-pointer h-full">
                      <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-sm font-medium">Year in Review</p>
                      <p className="text-xs text-muted-foreground">Reading summary</p>
                    </Card>
                  </a>
                </Link>
              </div>
            </motion.div>

            <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
              <h2 className="font-display text-xl font-bold">Your Book Log</h2>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-goodreads-csv"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                  data-testid="button-import-goodreads"
                >
                  {importMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Import Goodreads
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting}
                  data-testid="button-export-library"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export
                </Button>
              </div>
            </div>

            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                  <span className="font-semibold">Profile Settings</span>
                  {profileIsPublic ? (
                    <Badge variant="secondary" className="text-xs">Public</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Private</Badge>
                  )}
                  {isPrivateAccount && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-0.5" />
                      Private Account
                    </Badge>
                  )}
                  {pendingFollowRequests.length > 0 && (
                    <Badge variant="default" className="text-xs" data-testid="badge-pending-requests-header">
                      {pendingFollowRequests.length} request{pendingFollowRequests.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/readers/${user?.id}`}>
                    <Button variant="ghost" size="sm" data-testid="button-view-public-profile">
                      <Eye className="w-4 h-4 mr-1" />
                      View Public Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProfileBio((user as any)?.bio || "");
                      setProfileFavoriteGenres((user as any)?.favoriteGenres || []);
                      setProfileCurrentlyReading((user as any)?.currentlyReading || "");
                      setProfileIsPublic((user as any)?.isProfilePublic !== false);
                      setProfileDisplayName(user?.displayName || "");
                      setProfileSettingsOpen(!profileSettingsOpen);
                    }}
                    data-testid="button-toggle-settings"
                  >
                    {profileSettingsOpen ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                    Edit Profile
                  </Button>
                </div>
              </div>

              {profileSettingsOpen && (
                <div className="mt-4 space-y-4 border-t pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="displayName" className="text-sm font-medium">Public Display Name</Label>
                      <Input
                        id="displayName"
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        placeholder={user?.firstName || "Set your public name..."}
                        className="mt-1"
                        data-testid="input-display-name"
                      />
                      <p className="text-xs text-muted-foreground mt-1">This is how your name appears to other readers.</p>
                    </div>
                    <div>
                      <Label htmlFor="currentlyReading" className="text-sm font-medium">Currently Reading</Label>
                      <Input
                        id="currentlyReading"
                        value={profileCurrentlyReading}
                        onChange={(e) => setProfileCurrentlyReading(e.target.value)}
                        placeholder="What are you reading now?"
                        className="mt-1"
                        data-testid="input-currently-reading"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio" className="text-sm font-medium">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Tell others about yourself as a reader..."
                      className="mt-1 resize-none"
                      rows={3}
                      maxLength={500}
                      data-testid="input-bio"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{profileBio.length}/500</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Favorite Genres</Label>
                    <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                      {profileFavoriteGenres.map(genre => (
                        <Badge key={genre} variant="secondary" className="gap-1">
                          {genre}
                          <button
                            onClick={() => removeGenre(genre)}
                            className="ml-0.5 hover:text-destructive"
                            data-testid={`button-remove-genre-${genre}`}
                          >
                            <XCircle className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRE_OPTIONS.filter(g => !profileFavoriteGenres.includes(g)).map(genre => (
                        <Button
                          key={genre}
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => addGenre(genre)}
                          data-testid={`button-add-genre-${genre}`}
                        >
                          <Plus className="w-3 h-3 mr-0.5" />
                          {genre}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Profile Visibility</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {profileIsPublic 
                          ? "Your profile, reading activity, and library are visible to others"
                          : "Only your name and avatar are visible to others"
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{profileIsPublic ? "Public" : "Private"}</span>
                      <Switch
                        checked={profileIsPublic}
                        onCheckedChange={setProfileIsPublic}
                        data-testid="switch-profile-visibility"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Private Account
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isPrivateAccount
                          ? "New followers must send a request that you approve before they can see your activity"
                          : "Anyone can follow you and see your reading activity"
                        }
                      </p>
                      {!isPrivateAccount && pendingFollowRequests.length > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Switching to public will auto-approve all {pendingFollowRequests.length} pending follow request{pendingFollowRequests.length !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{isPrivateAccount ? "On" : "Off"}</span>
                      <Switch
                        checked={isPrivateAccount}
                        onCheckedChange={(checked) => {
                          setIsPrivateAccount(checked);
                          togglePrivacyMutation.mutate(checked);
                          if (checked) {
                            toast({ title: "Private account enabled", description: "New followers will need your approval." });
                          } else {
                            toast({ title: "Private account disabled", description: "Anyone can now follow you. All pending requests have been auto-approved." });
                          }
                        }}
                        disabled={togglePrivacyMutation.isPending}
                        data-testid="switch-private-account"
                      />
                    </div>
                  </div>

                  {isPrivateAccount && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Bell className="w-3.5 h-3.5" />
                          Follow Requests
                          {pendingFollowRequests.length > 0 && (
                            <Badge variant="default" className="ml-1" data-testid="badge-follow-request-count">
                              {pendingFollowRequests.length}
                            </Badge>
                          )}
                        </Label>
                      </div>
                      {followRequestsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading requests...
                        </div>
                      ) : pendingFollowRequests.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No pending follow requests.</p>
                      ) : (
                        <div className="space-y-2">
                          {pendingFollowRequests.map((request) => (
                            <div
                              key={request.id}
                              className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30"
                              data-testid={`follow-request-${request.id}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="w-8 h-8 flex-shrink-0">
                                  {(request as any).requesterAvatar ? (
                                    <AvatarImage src={(request as any).requesterAvatar} />
                                  ) : null}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                    {((request as any).requesterName || "U")[0].toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" data-testid={`text-requester-name-${request.id}`}>
                                    {(request as any).requesterName || "Unknown User"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => approveFollowRequestMutation.mutate(request.id)}
                                  disabled={approveFollowRequestMutation.isPending || rejectFollowRequestMutation.isPending}
                                  data-testid={`button-approve-request-${request.id}`}
                                >
                                  <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => rejectFollowRequestMutation.mutate(request.id)}
                                  disabled={approveFollowRequestMutation.isPending || rejectFollowRequestMutation.isPending}
                                  data-testid={`button-reject-request-${request.id}`}
                                >
                                  <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setProfileSettingsOpen(false)}
                      data-testid="button-cancel-settings"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={saveProfileSettings}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-settings"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <Save className="w-4 h-4 mr-1" />
                      )}
                      Save Profile
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-6 flex-wrap h-auto gap-1">
                <TabsTrigger value="all" data-testid="tab-all">All ({stats.total})</TabsTrigger>
                <TabsTrigger value="reading" data-testid="tab-reading">Reading ({stats.reading})</TabsTrigger>
                <TabsTrigger value="finished" data-testid="tab-finished">Finished ({stats.finished})</TabsTrigger>
                <TabsTrigger value="want" data-testid="tab-want">TBR ({stats.wantToRead})</TabsTrigger>
                <TabsTrigger value="dnf" data-testid="tab-dnf" className="text-red-600 dark:text-red-400">DNF ({stats.dnf})</TabsTrigger>
                <TabsTrigger value="owned" data-testid="tab-owned">Owned ({stats.owned})</TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : books.length === 0 ? (
                <Card className="p-8 text-center">
                  <Library className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-bold mb-2">Your library is empty</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first book using the Quick Add button above, or take the quiz for personalized recommendations.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <QuickAddBookDialog onAdd={(book) => addBookMutation.mutate(book)} />
                    <Link href="/quiz">
                      <Button variant="outline" data-testid="button-take-quiz">Take the Quiz</Button>
                    </Link>
                  </div>
                </Card>
              ) : (
                <>
                  <TabsContent value="all" className="space-y-4">
                    {books.map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                  </TabsContent>

                  <TabsContent value="reading" className="space-y-4">
                    {books.filter(b => b.status === "currently_reading").map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                    {stats.reading === 0 && (
                      <p className="text-center text-muted-foreground py-8">No books currently reading.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="finished" className="space-y-4">
                    {books.filter(b => b.status === "finished").map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                    {stats.finished === 0 && (
                      <p className="text-center text-muted-foreground py-8">No finished books yet.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="want" className="space-y-4">
                    {books.filter(b => b.status === "want_to_read").map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                    {stats.wantToRead === 0 && (
                      <p className="text-center text-muted-foreground py-8">No books in your reading list.</p>
                    )}
                  </TabsContent>

                  <TabsContent value="dnf" className="space-y-4">
                    <Card className="p-4 mb-4 bg-muted/50">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <h3 className="font-medium">Your DNF List</h3>
                          <p className="text-sm text-muted-foreground">
                            It's okay to not finish a book! Track why you stopped and where you left off.
                          </p>
                        </div>
                      </div>
                    </Card>
                    {books.filter(b => b.status === "dnf").map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                    {stats.dnf === 0 && (
                      <p className="text-center text-muted-foreground py-8">No DNF books. (That's okay!)</p>
                    )}
                  </TabsContent>

                  <TabsContent value="owned" className="space-y-4">
                    <Card className="p-4 mb-4 bg-muted/50">
                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <h3 className="font-medium">Your Personal Library</h3>
                          <p className="text-sm text-muted-foreground">
                            Track books you physically or digitally own. Mark any book as "owned" to see it here.
                          </p>
                        </div>
                      </div>
                    </Card>
                    {books.filter(b => b.isOwned).map((book) => (
                      <BookLogCard
                        key={book.id}
                        book={book}
                        onUpdate={(updates) => updateBookMutation.mutate({ id: book.id, updates })}
                        onDelete={() => deleteBookMutation.mutate(book.id)}
                      />
                    ))}
                    {stats.owned === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No owned books tracked yet. Toggle "I own this" on any book to track your personal library.
                      </p>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        </section>
      </main>
    </div>
  );
}
