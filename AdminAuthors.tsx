import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  BookOpen,
  Search,
  Save,
  Loader2,
  Edit2,
  X,
  ExternalLink,
  AlertTriangle,
  LayoutDashboard,
  Megaphone,
  Newspaper,
  Mail,
  CreditCard,
  FileUp,
  Eye,
  PlayCircle,
  ShoppingBag,
  Users,
  CheckCircle,
  Globe,
  BookMarked,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface AuthorProfile {
  id: number;
  penName: string;
  bio: string | null;
  website: string | null;
  twitter: string | null;
  instagram: string | null;
  tiktok: string | null;
  goodreads: string | null;
  amazonAuthorUrl: string | null;
  bookbubUrl: string | null;
  genres: string[] | null;
  isVerified: boolean;
  bookCount: number;
}

interface AuthorBook {
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
  isUpcoming: boolean;
  arcEnabled: boolean;
  createdAt: string | null;
  authorPenName: string;
  authorSlug: string;
}

interface GoogleBookResult {
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  publishedDate: string;
  categories: string[];
  isbn13: string;
}

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin", label: "Submissions", icon: BookOpen },
  { href: "/admin/ads", label: "Ads", icon: Megaphone },
  { href: "/admin/newsletters", label: "Newsletters", icon: Newspaper },
  { href: "/admin/send-newsletter", label: "Send Newsletter", icon: Mail },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/arcs", label: "ARCs", icon: FileUp },
  { href: "/admin/resources", label: "Resources", icon: BookOpen },
  { href: "/admin/interviews", label: "Interviews", icon: Eye },
  { href: "/admin/reviews", label: "Reviews", icon: PlayCircle },
  { href: "/admin/books", label: "Books", icon: BookOpen },
  { href: "/admin/authors", label: "Authors", icon: Users },
  { href: "/admin/shop", label: "Shop", icon: ShoppingBag },
];

export default function AdminAuthors() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileSearch, setProfileSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [profileForm, setProfileForm] = useState<Record<string, any>>({});
  const [bookForm, setBookForm] = useState<Record<string, any>>({});
  const [googleDialogBookId, setGoogleDialogBookId] = useState<number | null>(null);
  const [googleQuery, setGoogleQuery] = useState("");
  const [googleResults, setGoogleResults] = useState<GoogleBookResult[]>([]);
  const [googleSearching, setGoogleSearching] = useState(false);

  const { data: profiles = [], isLoading: profilesLoading } = useQuery<AuthorProfile[]>({
    queryKey: ["/api/admin/author-profiles"],
    enabled: isAdmin,
  });

  const { data: books = [], isLoading: booksLoading } = useQuery<AuthorBook[]>({
    queryKey: ["/api/admin/author-books"],
    enabled: isAdmin,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return apiRequest("PATCH", `/api/admin/author-profiles/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/author-profiles"] });
      setEditingProfileId(null);
    },
    onError: () => {
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const updateBookMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, any> }) => {
      return apiRequest("PATCH", `/api/admin/author-books/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Book updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/author-books"] });
      setEditingBookId(null);
    },
    onError: () => {
      toast({ title: "Update failed", variant: "destructive" });
    },
  });

  const enrichMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GoogleBookResult }) => {
      return apiRequest("POST", `/api/admin/author-books/${id}/enrich`, data);
    },
    onSuccess: () => {
      toast({ title: "Book enriched with Google Books data" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/author-books"] });
      setGoogleDialogBookId(null);
      setGoogleResults([]);
      setGoogleQuery("");
    },
    onError: () => {
      toast({ title: "Enrichment failed", variant: "destructive" });
    },
  });

  const startEditProfile = (profile: AuthorProfile) => {
    setEditingProfileId(profile.id);
    setProfileForm({
      penName: profile.penName,
      bio: profile.bio || "",
      website: profile.website || "",
      twitter: profile.twitter || "",
      instagram: profile.instagram || "",
      tiktok: profile.tiktok || "",
      goodreads: profile.goodreads || "",
      amazonAuthorUrl: profile.amazonAuthorUrl || "",
      bookbubUrl: profile.bookbubUrl || "",
      genres: (profile.genres || []).join(", "),
      isVerified: profile.isVerified,
    });
  };

  const saveProfile = () => {
    if (editingProfileId === null) return;
    const data = {
      ...profileForm,
      genres: profileForm.genres
        ? profileForm.genres.split(",").map((g: string) => g.trim()).filter(Boolean)
        : [],
    };
    updateProfileMutation.mutate({ id: editingProfileId, data });
  };

  const startEditBook = (book: AuthorBook) => {
    setEditingBookId(book.id);
    setBookForm({
      title: book.title,
      description: book.description || "",
      coverUrl: book.coverUrl || "",
      genres: (book.genres || []).join(", "),
      seriesName: book.seriesName || "",
      seriesNumber: book.seriesNumber ?? "",
      publishedDate: book.publishedDate || "",
      amazonUrl: book.amazonUrl || "",
      bookshopUrl: book.bookshopUrl || "",
      isUpcoming: book.isUpcoming || false,
      arcEnabled: book.arcEnabled || false,
    });
  };

  const saveBook = () => {
    if (editingBookId === null) return;
    const data = {
      ...bookForm,
      genres: bookForm.genres
        ? bookForm.genres.split(",").map((g: string) => g.trim()).filter(Boolean)
        : [],
      seriesNumber: bookForm.seriesNumber !== "" ? Number(bookForm.seriesNumber) : null,
    };
    updateBookMutation.mutate({ id: editingBookId, data });
  };

  const searchGoogleBooks = async () => {
    if (!googleQuery.trim()) return;
    setGoogleSearching(true);
    try {
      const res = await fetch(`/api/admin/google-books-search?q=${encodeURIComponent(googleQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setGoogleResults(data);
      } else {
        toast({ title: "Search failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Search failed", variant: "destructive" });
    }
    setGoogleSearching(false);
  };

  const selectGoogleResult = (result: GoogleBookResult) => {
    if (googleDialogBookId === null) return;
    setBookForm((prev: Record<string, any>) => ({
      ...prev,
      title: result.title || prev.title,
      description: result.description || prev.description,
      coverUrl: result.coverUrl || prev.coverUrl,
      genres: result.categories?.join(", ") || prev.genres,
      publishedDate: result.publishedDate || prev.publishedDate,
    }));
    enrichMutation.mutate({
      id: googleDialogBookId,
      data: {
        title: result.title,
        description: result.description,
        coverUrl: result.coverUrl,
        publishedDate: result.publishedDate,
        genres: result.categories || [],
        googleBooksId: result.isbn13 || undefined,
      },
    });
  };

  const filteredProfiles = profiles.filter((p) => {
    if (!profileSearch.trim()) return true;
    return p.penName.toLowerCase().includes(profileSearch.toLowerCase());
  });

  const filteredBooks = books.filter((b) => {
    if (!bookSearch.trim()) return true;
    const q = bookSearch.toLowerCase();
    return b.title.toLowerCase().includes(q) || b.authorPenName.toLowerCase().includes(q);
  });

  const countSocialLinks = (profile: AuthorProfile) => {
    return [profile.website, profile.twitter, profile.instagram, profile.tiktok, profile.goodreads, profile.amazonAuthorUrl, profile.bookbubUrl].filter(Boolean).length;
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
      <SEOHead title="Admin - Authors" description="Manage author profiles and books." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8" data-testid="admin-nav-bar">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid={`nav-admin-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <link.icon className="w-4 h-4 mr-1.5" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2" data-testid="heading-admin-authors">
                <Users className="w-6 h-6 text-primary" /> Author Management
              </h1>
              <p className="text-sm text-muted-foreground">Manage author profiles and their books</p>
            </div>
          </div>

          <Tabs defaultValue="profiles" className="space-y-6">
            <TabsList data-testid="tabs-author-management">
              <TabsTrigger value="profiles" data-testid="tab-author-profiles">Author Profiles</TabsTrigger>
              <TabsTrigger value="books" data-testid="tab-author-books">Author Books</TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by pen name..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-profiles"
                />
              </div>

              {profilesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredProfiles.length === 0 ? (
                <Card className="p-8 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">{profileSearch ? "No profiles match your search." : "No author profiles yet."}</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredProfiles.map((profile) => (
                    <Card key={profile.id} className="p-4" data-testid={`card-profile-${profile.id}`}>
                      {editingProfileId === profile.id ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label>Pen Name</Label>
                              <Input
                                value={profileForm.penName}
                                onChange={(e) => setProfileForm({ ...profileForm, penName: e.target.value })}
                                data-testid={`input-profile-penname-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>Website</Label>
                              <Input
                                value={profileForm.website}
                                onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                                data-testid={`input-profile-website-${profile.id}`}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Bio</Label>
                              <Textarea
                                value={profileForm.bio}
                                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                rows={3}
                                data-testid={`input-profile-bio-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>Twitter</Label>
                              <Input
                                value={profileForm.twitter}
                                onChange={(e) => setProfileForm({ ...profileForm, twitter: e.target.value })}
                                data-testid={`input-profile-twitter-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>Instagram</Label>
                              <Input
                                value={profileForm.instagram}
                                onChange={(e) => setProfileForm({ ...profileForm, instagram: e.target.value })}
                                data-testid={`input-profile-instagram-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>TikTok</Label>
                              <Input
                                value={profileForm.tiktok}
                                onChange={(e) => setProfileForm({ ...profileForm, tiktok: e.target.value })}
                                data-testid={`input-profile-tiktok-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>Goodreads</Label>
                              <Input
                                value={profileForm.goodreads}
                                onChange={(e) => setProfileForm({ ...profileForm, goodreads: e.target.value })}
                                data-testid={`input-profile-goodreads-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>Amazon Author URL</Label>
                              <Input
                                value={profileForm.amazonAuthorUrl}
                                onChange={(e) => setProfileForm({ ...profileForm, amazonAuthorUrl: e.target.value })}
                                data-testid={`input-profile-amazon-${profile.id}`}
                              />
                            </div>
                            <div>
                              <Label>BookBub URL</Label>
                              <Input
                                value={profileForm.bookbubUrl}
                                onChange={(e) => setProfileForm({ ...profileForm, bookbubUrl: e.target.value })}
                                data-testid={`input-profile-bookbub-${profile.id}`}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Genres (comma-separated)</Label>
                              <Input
                                value={profileForm.genres}
                                onChange={(e) => setProfileForm({ ...profileForm, genres: e.target.value })}
                                placeholder="Fantasy, Romance, Sci-Fi"
                                data-testid={`input-profile-genres-${profile.id}`}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={profileForm.isVerified}
                                onChange={(e) => setProfileForm({ ...profileForm, isVerified: e.target.checked })}
                                className="rounded"
                                data-testid={`checkbox-profile-verified-${profile.id}`}
                              />
                              <Label>Verified</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={saveProfile}
                              disabled={updateProfileMutation.isPending}
                              data-testid={`button-save-profile-${profile.id}`}
                            >
                              {updateProfileMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setEditingProfileId(null)}
                              data-testid={`button-cancel-profile-${profile.id}`}
                            >
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold" data-testid={`text-profile-penname-${profile.id}`}>{profile.penName}</h3>
                              {profile.isVerified && (
                                <Badge variant="default" data-testid={`badge-verified-${profile.id}`}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Verified
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {profile.genres && profile.genres.length > 0 && profile.genres.slice(0, 3).map((g) => (
                                <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                              ))}
                              <span className="text-xs text-muted-foreground">
                                <Globe className="w-3 h-3 inline mr-0.5" />{countSocialLinks(profile)} social links
                              </span>
                              <span className="text-xs text-muted-foreground">
                                <BookMarked className="w-3 h-3 inline mr-0.5" />{profile.bookCount} book{profile.bookCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditProfile(profile)}
                            data-testid={`button-edit-profile-${profile.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="books" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or author..."
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-author-books"
                />
              </div>

              {booksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredBooks.length === 0 ? (
                <Card className="p-8 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-muted-foreground">{bookSearch ? "No books match your search." : "No author books yet."}</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredBooks.map((book) => (
                    <Card key={book.id} className="p-4" data-testid={`card-book-${book.id}`}>
                      {editingBookId === book.id ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <Label>Title</Label>
                              <Input
                                value={bookForm.title}
                                onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                                data-testid={`input-book-title-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Cover URL</Label>
                              <Input
                                value={bookForm.coverUrl}
                                onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                                data-testid={`input-book-cover-${book.id}`}
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <Label>Description</Label>
                              <Textarea
                                value={bookForm.description}
                                onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                                rows={3}
                                data-testid={`input-book-description-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Genres (comma-separated)</Label>
                              <Input
                                value={bookForm.genres}
                                onChange={(e) => setBookForm({ ...bookForm, genres: e.target.value })}
                                placeholder="Fantasy, Romance"
                                data-testid={`input-book-genres-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Series Name</Label>
                              <Input
                                value={bookForm.seriesName}
                                onChange={(e) => setBookForm({ ...bookForm, seriesName: e.target.value })}
                                data-testid={`input-book-series-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Series Number</Label>
                              <Input
                                type="number"
                                value={bookForm.seriesNumber}
                                onChange={(e) => setBookForm({ ...bookForm, seriesNumber: e.target.value })}
                                data-testid={`input-book-series-number-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Published Date</Label>
                              <Input
                                value={bookForm.publishedDate}
                                onChange={(e) => setBookForm({ ...bookForm, publishedDate: e.target.value })}
                                placeholder="YYYY-MM-DD"
                                data-testid={`input-book-published-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Amazon URL</Label>
                              <Input
                                value={bookForm.amazonUrl}
                                onChange={(e) => setBookForm({ ...bookForm, amazonUrl: e.target.value })}
                                data-testid={`input-book-amazon-${book.id}`}
                              />
                            </div>
                            <div>
                              <Label>Bookshop URL</Label>
                              <Input
                                value={bookForm.bookshopUrl}
                                onChange={(e) => setBookForm({ ...bookForm, bookshopUrl: e.target.value })}
                                data-testid={`input-book-bookshop-${book.id}`}
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={bookForm.isUpcoming}
                                  onChange={(e) => setBookForm({ ...bookForm, isUpcoming: e.target.checked })}
                                  className="rounded"
                                  data-testid={`checkbox-book-upcoming-${book.id}`}
                                />
                                <Label>Upcoming</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={bookForm.arcEnabled}
                                  onChange={(e) => setBookForm({ ...bookForm, arcEnabled: e.target.checked })}
                                  className="rounded"
                                  data-testid={`checkbox-book-arc-${book.id}`}
                                />
                                <Label>ARC Enabled</Label>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={saveBook}
                              disabled={updateBookMutation.isPending}
                              data-testid={`button-save-book-${book.id}`}
                            >
                              {updateBookMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setGoogleDialogBookId(book.id);
                                setGoogleQuery(book.title);
                                setGoogleResults([]);
                              }}
                              data-testid={`button-google-lookup-${book.id}`}
                            >
                              <Search className="w-4 h-4 mr-1" /> Google Books Lookup
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => setEditingBookId(null)}
                              data-testid={`button-cancel-book-${book.id}`}
                            >
                              <X className="w-4 h-4 mr-1" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-[60px] rounded bg-muted flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {book.coverUrl ? (
                              <img loading="lazy" decoding="async" src={book.coverUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="w-4 h-4 text-muted-foreground/30" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold truncate" data-testid={`text-book-title-${book.id}`}>{book.title}</h3>
                              {book.arcEnabled && (
                                <Badge variant="default" className="text-xs" data-testid={`badge-arc-${book.id}`}>ARC</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground" data-testid={`text-book-author-${book.id}`}>{book.authorPenName}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {book.genres && book.genres.slice(0, 3).map((g) => (
                                <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                              ))}
                              {book.publishedDate && (
                                <span className="text-xs text-muted-foreground">{book.publishedDate}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {book.amazonUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(book.amazonUrl!, "_blank")}
                                data-testid={`link-amazon-${book.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            {book.bookshopUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(book.bookshopUrl!, "_blank")}
                                data-testid={`link-bookshop-${book.id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditBook(book)}
                              data-testid={`button-edit-book-${book.id}`}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Dialog open={googleDialogBookId !== null} onOpenChange={(open) => { if (!open) { setGoogleDialogBookId(null); setGoogleResults([]); setGoogleQuery(""); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Google Books Lookup</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={googleQuery}
              onChange={(e) => setGoogleQuery(e.target.value)}
              placeholder="Search Google Books..."
              onKeyDown={(e) => e.key === "Enter" && searchGoogleBooks()}
              data-testid="input-google-search"
            />
            <Button onClick={searchGoogleBooks} disabled={googleSearching} data-testid="button-google-search">
              {googleSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {googleSearching && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!googleSearching && googleResults.length > 0 && (
            <div className="space-y-3 mt-4">
              {googleResults.map((result, idx) => (
                <Card
                  key={idx}
                  className="p-3 cursor-pointer hover-elevate"
                  onClick={() => selectGoogleResult(result)}
                  data-testid={`card-google-result-${idx}`}
                >
                  <div className="flex gap-3">
                    {result.coverUrl && (
                      <img loading="lazy" decoding="async" src={result.coverUrl} alt="" className="w-12 h-[72px] object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm" data-testid={`text-google-title-${idx}`}>{result.title}</h4>
                      <p className="text-xs text-muted-foreground">{result.author}</p>
                      {result.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{result.description}</p>
                      )}
                      {result.publishedDate && (
                        <span className="text-xs text-muted-foreground">{result.publishedDate}</span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {!googleSearching && googleResults.length === 0 && googleQuery && (
            <p className="text-sm text-muted-foreground text-center py-4">No results. Try a different search query.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}