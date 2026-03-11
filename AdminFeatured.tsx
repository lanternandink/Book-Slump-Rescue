import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Star, Plus, Pencil, Trash2, Loader2, ArrowUpDown, ExternalLink, Eye, EyeOff, Sparkles } from "lucide-react";
import type { FeaturedPick } from "@shared/schema";

const GENRE_OPTIONS = [
  { value: "romance", label: "Romance" },
  { value: "fantasy", label: "Fantasy" },
  { value: "mystery_thriller", label: "Mystery & Thriller" },
  { value: "sci_fi", label: "Sci-Fi" },
  { value: "horror", label: "Horror" },
  { value: "nonfiction", label: "Non-Fiction" },
  { value: "ya", label: "Young Adult" },
  { value: "literary", label: "Literary Fiction" },
  { value: "historical", label: "Historical Fiction" },
];

const emptyPick = {
  genre: "",
  genreLabel: "",
  bookTitle: "",
  authorName: "",
  coverImageUrl: "",
  shortBlurb: "",
  amazonUrl: "",
  isIndie: false,
  isSponsored: false,
  sortOrder: 0,
  isActive: true,
};

export default function AdminFeatured() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<FeaturedPick | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyPick);

  const { data: picks = [], isLoading } = useQuery<FeaturedPick[]>({
    queryKey: ["/api/admin/featured-picks"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof emptyPick) => apiRequest("POST", "/api/admin/featured-picks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-picks"] });
      setCreating(false);
      setForm(emptyPick);
      toast({ title: "Featured pick created" });
    },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PATCH", `/api/admin/featured-picks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-picks"] });
      setEditing(null);
      toast({ title: "Featured pick updated" });
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/featured-picks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-picks"] });
      toast({ title: "Featured pick deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/featured-picks/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/featured-picks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured-picks"] });
      toast({ title: "Default picks seeded" });
    },
    onError: () => toast({ title: "Failed to seed", variant: "destructive" }),
  });

  const handleGenreChange = (genre: string) => {
    const label = GENRE_OPTIONS.find(g => g.value === genre)?.label || genre;
    setForm(f => ({ ...f, genre, genreLabel: label }));
  };

  const openEdit = (pick: FeaturedPick) => {
    setEditing(pick);
    setForm({
      genre: pick.genre,
      genreLabel: pick.genreLabel,
      bookTitle: pick.bookTitle,
      authorName: pick.authorName,
      coverImageUrl: pick.coverImageUrl || "",
      shortBlurb: pick.shortBlurb,
      amazonUrl: pick.amazonUrl || "",
      isIndie: pick.isIndie || false,
      isSponsored: pick.isSponsored || false,
      sortOrder: pick.sortOrder || 0,
      isActive: pick.isActive !== false,
    });
  };

  const handleSave = () => {
    if (!form.bookTitle || !form.authorName || !form.genre || !form.shortBlurb) {
      toast({ title: "Please fill required fields", variant: "destructive" });
      return;
    }
    if (editing) {
      updateMutation.mutate({ id: editing.id, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Admin access required.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Admin - Featured Picks" description="Manage featured book picks" />
      <Navigation />
      <main className="flex-1 py-8">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2" data-testid="text-admin-featured-title">
                <Star className="w-6 h-6 text-primary" /> Featured Picks
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{picks.length} picks total</p>
            </div>
            <div className="flex gap-2">
              {picks.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                  data-testid="button-seed-picks"
                >
                  {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span className="ml-1.5">Seed Defaults</span>
                </Button>
              )}
              <Button size="sm" onClick={() => { setCreating(true); setForm({ ...emptyPick, sortOrder: picks.length }); }} data-testid="button-add-pick">
                <Plus className="w-4 h-4 mr-1.5" /> Add Pick
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : picks.length === 0 ? (
            <Card className="p-12 text-center">
              <Star className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="font-bold text-lg mb-1">No featured picks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Click "Seed Defaults" to load the starter picks, or add your own.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {picks.map((pick) => (
                <Card key={pick.id} className={`p-4 ${!pick.isActive ? "opacity-50" : ""}`} data-testid={`featured-pick-${pick.id}`}>
                  <div className="flex items-start gap-4">
                    {pick.coverImageUrl ? (
                      <img loading="lazy" decoding="async" src={pick.coverImageUrl} alt={pick.bookTitle} className="w-12 h-16 object-cover rounded shrink-0" />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center shrink-0">
                        <Star className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm">{pick.bookTitle}</span>
                        <span className="text-xs text-muted-foreground">by {pick.authorName}</span>
                        <Badge variant="outline" className="text-xs">{pick.genreLabel}</Badge>
                        {pick.isIndie && <Badge className="text-xs bg-purple-500/10 text-purple-600 border-purple-200">Indie</Badge>}
                        {pick.isSponsored && <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-200">Sponsored</Badge>}
                        {!pick.isActive && <Badge variant="secondary" className="text-xs gap-1"><EyeOff className="w-3 h-3" />Hidden</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pick.shortBlurb}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><ArrowUpDown className="w-3 h-3" /> Order: {pick.sortOrder}</span>
                        {pick.amazonUrl && (
                          <a href={pick.amazonUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground">
                            <ExternalLink className="w-3 h-3" /> Amazon
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pick)} data-testid={`button-edit-${pick.id}`}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Delete this featured pick?")) deleteMutation.mutate(pick.id); }}
                        data-testid={`button-delete-${pick.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={creating || !!editing} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-featured-form">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Featured Pick" : "Add Featured Pick"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Book Title *</Label>
                <Input value={form.bookTitle} onChange={e => setForm(f => ({ ...f, bookTitle: e.target.value }))} placeholder="Book title" data-testid="input-pick-title" />
              </div>
              <div className="space-y-1.5">
                <Label>Author *</Label>
                <Input value={form.authorName} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))} placeholder="Author name" data-testid="input-pick-author" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Genre *</Label>
                <Select value={form.genre} onValueChange={handleGenreChange}>
                  <SelectTrigger data-testid="select-pick-genre"><SelectValue placeholder="Select genre" /></SelectTrigger>
                  <SelectContent>
                    {GENRE_OPTIONS.map(g => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} data-testid="input-pick-order" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Blurb *</Label>
              <Textarea value={form.shortBlurb} onChange={e => setForm(f => ({ ...f, shortBlurb: e.target.value }))} placeholder="A short, compelling description..." rows={3} data-testid="input-pick-blurb" />
            </div>

            <div className="space-y-1.5">
              <Label>Cover Image URL</Label>
              <Input value={form.coverImageUrl} onChange={e => setForm(f => ({ ...f, coverImageUrl: e.target.value }))} placeholder="https://..." data-testid="input-pick-cover" />
            </div>

            <div className="space-y-1.5">
              <Label>Amazon/Affiliate Link</Label>
              <Input value={form.amazonUrl} onChange={e => setForm(f => ({ ...f, amazonUrl: e.target.value }))} placeholder="https://amzn.to/..." data-testid="input-pick-amazon" />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} data-testid="switch-pick-active" />
                <Label className="text-sm">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isIndie} onCheckedChange={v => setForm(f => ({ ...f, isIndie: v }))} data-testid="switch-pick-indie" />
                <Label className="text-sm">Indie Author</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isSponsored} onCheckedChange={v => setForm(f => ({ ...f, isSponsored: v }))} data-testid="switch-pick-sponsored" />
                <Label className="text-sm">Sponsored</Label>
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-pick">
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Create Pick"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
