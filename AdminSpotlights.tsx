import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, Sparkles, Plus, Trash2, Loader2, Edit2, X, Eye, Save,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const PRICING_TIERS = [
  { durationDays: 7, price: 1500, label: "7 days — $15" },
  { durationDays: 14, price: 2900, label: "14 days — $29" },
  { durationDays: 30, price: 3900, label: "30 days — $39" },
];

interface Spotlight {
  id: number;
  authorName: string;
  penName: string | null;
  bookTitle: string;
  genres: string[];
  shortBlurb: string;
  longBlurb: string | null;
  coverImageUrl: string | null;
  buyLinks: string | null;
  socialLinks: string | null;
  spotlightType: string;
  placement: string;
  isActive: boolean;
  priority: number;
  rankingWeight: number;
  startDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  pricePaid: number | null;
  placementType: string | null;
  orderId: string | null;
  createdAt: string;
}

type SpotlightForm = {
  authorName: string;
  penName: string;
  bookTitle: string;
  genres: string;
  shortBlurb: string;
  longBlurb: string;
  coverImageUrl: string;
  buyLinks: string;
  socialLinks: string;
  spotlightType: string;
  placement: string;
  isActive: boolean;
  priority: number;
  rankingWeight: number;
  startDate: string;
  endDate: string;
  durationDays: number;
  pricePaid: number;
  placementType: string;
};

const emptyForm: SpotlightForm = {
  authorName: "",
  penName: "",
  bookTitle: "",
  genres: "",
  shortBlurb: "",
  longBlurb: "",
  coverImageUrl: "",
  buyLinks: "",
  socialLinks: "",
  spotlightType: "free",
  placement: "standard",
  isActive: false,
  priority: 0,
  rankingWeight: 0,
  startDate: "",
  endDate: "",
  durationDays: 0,
  pricePaid: 0,
  placementType: "spotlight",
};

function formToPayload(form: SpotlightForm) {
  return {
    authorName: form.authorName,
    penName: form.penName || null,
    bookTitle: form.bookTitle,
    genres: form.genres ? form.genres.split(",").map(g => g.trim()).filter(Boolean) : [],
    shortBlurb: form.shortBlurb,
    longBlurb: form.longBlurb || null,
    coverImageUrl: form.coverImageUrl || null,
    buyLinks: form.buyLinks || null,
    socialLinks: form.socialLinks || null,
    spotlightType: form.spotlightType,
    placement: form.placement,
    isActive: form.isActive,
    priority: form.priority,
    rankingWeight: form.rankingWeight,
    startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
    endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
    durationDays: form.durationDays || null,
    pricePaid: form.pricePaid || null,
    placementType: form.placementType || null,
  };
}

function spotlightToForm(s: Spotlight): SpotlightForm {
  return {
    authorName: s.authorName,
    penName: s.penName || "",
    bookTitle: s.bookTitle,
    genres: (s.genres || []).join(", "),
    shortBlurb: s.shortBlurb,
    longBlurb: s.longBlurb || "",
    coverImageUrl: s.coverImageUrl || "",
    buyLinks: s.buyLinks || "",
    socialLinks: s.socialLinks || "",
    spotlightType: s.spotlightType,
    placement: s.placement,
    isActive: s.isActive ?? false,
    priority: s.priority ?? 0,
    rankingWeight: s.rankingWeight ?? 0,
    startDate: s.startDate ? new Date(s.startDate).toISOString().slice(0, 10) : "",
    endDate: s.endDate ? new Date(s.endDate).toISOString().slice(0, 10) : "",
    durationDays: s.durationDays ?? 0,
    pricePaid: s.pricePaid ?? 0,
    placementType: s.placementType || "spotlight",
  };
}

function PreviewCard({ form }: { form: SpotlightForm }) {
  return (
    <Card className="border-dashed border-2 border-primary/30 bg-primary/5" data-testid="spotlight-preview">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {form.coverImageUrl && (
            <img loading="lazy" decoding="async" src={form.coverImageUrl} alt="Cover" className="w-20 h-28 object-cover rounded-md shadow" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg truncate">{form.bookTitle || "Book Title"}</h3>
              <Badge variant={form.spotlightType === "sponsored" ? "default" : "secondary"} className="text-[10px]">
                {form.spotlightType === "sponsored" ? "Sponsored" : "Free"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">by {form.authorName || "Author Name"}{form.penName ? ` (${form.penName})` : ""}</p>
            {form.genres && <p className="text-xs text-muted-foreground mt-1">{form.genres}</p>}
            <p className="text-sm mt-2 line-clamp-3">{form.shortBlurb || "Blurb preview..."}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSpotlights() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState<SpotlightForm>(emptyForm);

  const { data: spotlights = [], isLoading } = useQuery<Spotlight[]>({
    queryKey: ["/api/admin/spotlights"],
    enabled: isAdmin,
  });

  const createMutation = useMutation({
    mutationFn: (data: SpotlightForm) =>
      apiRequest("POST", "/api/admin/spotlights", formToPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Spotlight created" });
      setShowAdd(false);
      setForm(emptyForm);
    },
    onError: () => toast({ title: "Failed to create spotlight", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: SpotlightForm }) =>
      apiRequest("PATCH", `/api/admin/spotlights/${id}`, formToPayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Spotlight updated" });
      setEditingId(null);
    },
    onError: () => toast({ title: "Failed to update spotlight", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/admin/spotlights/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Spotlight deleted" });
    },
    onError: () => toast({ title: "Failed to delete spotlight", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/spotlights/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Status updated" });
    },
    onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
  });

  const extendMutation = useMutation({
    mutationFn: ({ id, additionalDays }: { id: number; additionalDays: number }) =>
      apiRequest("POST", `/api/admin/spotlights/${id}/extend`, { additionalDays }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Placement extended" });
    },
    onError: () => toast({ title: "Failed to extend placement", variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("POST", `/api/admin/spotlights/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/spotlights"] });
      toast({ title: "Placement cancelled" });
    },
    onError: () => toast({ title: "Failed to cancel placement", variant: "destructive" }),
  });

  const startEdit = (s: Spotlight) => {
    setEditingId(s.id);
    setForm(spotlightToForm(s));
    setShowAdd(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
    setForm(emptyForm);
    setShowPreview(false);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4" data-testid="text-access-denied">Access Denied</h1>
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </div>
    );
  }

  const placementLabel = (p: string) => {
    switch (p) {
      case "frontpage": return "Sponsored Front Page";
      case "search_boost": return "Search Results Boost";
      case "rotation_premium": return "Premium Rotation";
      default: return "Standard Spotlight";
    }
  };

  const renderForm = (isNew: boolean) => (
    <Card className="mb-6" data-testid={isNew ? "card-new-spotlight" : `card-edit-spotlight-${editingId}`}>
      <CardHeader>
        <CardTitle className="text-lg">{isNew ? "New Spotlight" : "Edit Spotlight"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Author Name *</Label>
            <Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} data-testid="input-author-name" />
          </div>
          <div className="space-y-2">
            <Label>Pen Name</Label>
            <Input value={form.penName} onChange={e => setForm({ ...form, penName: e.target.value })} data-testid="input-pen-name" />
          </div>
          <div className="space-y-2">
            <Label>Book Title *</Label>
            <Input value={form.bookTitle} onChange={e => setForm({ ...form, bookTitle: e.target.value })} data-testid="input-book-title" />
          </div>
          <div className="space-y-2">
            <Label>Genres (comma-separated)</Label>
            <Input value={form.genres} onChange={e => setForm({ ...form, genres: e.target.value })} placeholder="Romance, Fantasy" data-testid="input-genres" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Short Blurb *</Label>
          <Textarea value={form.shortBlurb} onChange={e => setForm({ ...form, shortBlurb: e.target.value })} rows={3} data-testid="input-short-blurb" />
        </div>

        <div className="space-y-2">
          <Label>Long Blurb</Label>
          <Textarea value={form.longBlurb} onChange={e => setForm({ ...form, longBlurb: e.target.value })} rows={4} data-testid="input-long-blurb" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cover Image URL</Label>
            <Input value={form.coverImageUrl} onChange={e => setForm({ ...form, coverImageUrl: e.target.value })} data-testid="input-cover-url" />
          </div>
          <div className="space-y-2">
            <Label>Buy Links (JSON or URLs)</Label>
            <Input value={form.buyLinks} onChange={e => setForm({ ...form, buyLinks: e.target.value })} placeholder='{"amazon":"...","bookshop":"..."}' data-testid="input-buy-links" />
          </div>
          <div className="space-y-2">
            <Label>Social Links (JSON or URLs)</Label>
            <Input value={form.socialLinks} onChange={e => setForm({ ...form, socialLinks: e.target.value })} placeholder='{"tiktok":"...","instagram":"..."}' data-testid="input-social-links" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Spotlight Type</Label>
            <Select value={form.spotlightType} onValueChange={v => setForm({ ...form, spotlightType: v })}>
              <SelectTrigger data-testid="select-spotlight-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="sponsored">Sponsored</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Placement</Label>
            <Select value={form.placement} onValueChange={v => setForm({ ...form, placement: v })}>
              <SelectTrigger data-testid="select-placement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Spotlight</SelectItem>
                <SelectItem value="frontpage">Sponsored Front Page</SelectItem>
                <SelectItem value="search_boost">Search Results Boost</SelectItem>
                <SelectItem value="rotation_premium">Premium Rotation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: parseInt(e.target.value) || 0 })} data-testid="input-priority" />
          </div>
        </div>

        {(form.placement === "search_boost") && (
          <div className="space-y-2">
            <Label>Ranking Weight (higher = more boost)</Label>
            <Input type="number" value={form.rankingWeight} onChange={e => setForm({ ...form, rankingWeight: parseInt(e.target.value) || 0 })} data-testid="input-ranking-weight" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} data-testid="input-start-date" />
          </div>
          <div className="space-y-2">
            <Label>Duration / Pricing Tier</Label>
            <Select
              value={form.durationDays ? String(form.durationDays) : "0"}
              onValueChange={v => {
                const days = parseInt(v);
                const tier = PRICING_TIERS.find(t => t.durationDays === days);
                const updates: Partial<SpotlightForm> = { durationDays: days };
                if (tier) updates.pricePaid = tier.price;
                if (days && form.startDate) {
                  const start = new Date(form.startDate);
                  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
                  updates.endDate = end.toISOString().slice(0, 10);
                }
                setForm({ ...form, ...updates });
              }}
            >
              <SelectTrigger data-testid="select-duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No paid tier</SelectItem>
                {PRICING_TIERS.map(t => (
                  <SelectItem key={t.durationDays} value={String(t.durationDays)}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>End Date (auto-calculated)</Label>
            <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} data-testid="input-end-date" />
          </div>
          <div className="space-y-2">
            <Label>Price Paid (cents)</Label>
            <Input type="number" value={form.pricePaid} onChange={e => setForm({ ...form, pricePaid: parseInt(e.target.value) || 0 })} data-testid="input-price-paid" />
          </div>
          <div className="space-y-2">
            <Label>Placement Type</Label>
            <Select value={form.placementType} onValueChange={v => setForm({ ...form, placementType: v })}>
              <SelectTrigger data-testid="select-placement-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spotlight">Spotlight</SelectItem>
                <SelectItem value="feedBoost">Feed Boost</SelectItem>
                <SelectItem value="searchBoost">Search Boost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} data-testid="switch-active" />
          <Label>Active</Label>
        </div>

        {showPreview && <PreviewCard form={form} />}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            data-testid="button-preview"
          >
            <Eye className="w-4 h-4 mr-1" />
            {showPreview ? "Hide Preview" : "Preview"}
          </Button>
          <Button
            onClick={() => isNew ? createMutation.mutate(form) : updateMutation.mutate({ id: editingId!, data: form })}
            disabled={!form.authorName || !form.bookTitle || !form.shortBlurb || createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-spotlight"
          >
            {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
            {isNew ? "Create Spotlight" : "Save Changes"}
          </Button>
          <Button variant="ghost" onClick={cancelEdit} data-testid="button-cancel">
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin - Indie Spotlights" description="Manage indie author spotlights" />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/dashboard" data-testid="link-back-admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-spotlights-title">
              <Sparkles className="w-6 h-6" />
              Indie Author Spotlights
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage indie author spotlight entries
            </p>
          </div>
          {!showAdd && editingId === null && (
            <Button onClick={() => { setShowAdd(true); setForm(emptyForm); }} data-testid="button-add-spotlight">
              <Plus className="w-4 h-4 mr-1" /> New Spotlight
            </Button>
          )}
        </div>

        {showAdd && renderForm(true)}
        {editingId !== null && renderForm(false)}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
          </div>
        ) : spotlights.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-empty-spotlights">
              No spotlights yet. Click "New Spotlight" to create one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {spotlights.map(s => (
              <Card key={s.id} className={`transition-all ${!s.isActive ? "opacity-60" : ""}`} data-testid={`card-spotlight-${s.id}`}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {s.coverImageUrl && (
                      <img loading="lazy" decoding="async" src={s.coverImageUrl} alt="Cover" className="w-16 h-24 object-cover rounded-md shadow flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold truncate" data-testid={`text-spotlight-title-${s.id}`}>{s.bookTitle}</h3>
                        <Badge variant={s.spotlightType === "sponsored" ? "default" : "secondary"} className="text-[10px]">
                          {s.spotlightType === "sponsored" ? "Sponsored" : "Free"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {placementLabel(s.placement)}
                        </Badge>
                        {s.isActive ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">by {s.authorName}{s.penName ? ` (${s.penName})` : ""}</p>
                      {s.genres && s.genres.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{s.genres.join(", ")}</p>
                      )}
                      <p className="text-sm mt-1 line-clamp-2">{s.shortBlurb}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        {s.startDate && (
                          <span>Start: {new Date(s.startDate).toLocaleDateString()}</span>
                        )}
                        {s.endDate && (
                          <span>End: {new Date(s.endDate).toLocaleDateString()}</span>
                        )}
                        {s.durationDays && (
                          <span>{s.durationDays}d</span>
                        )}
                        {s.pricePaid != null && s.pricePaid > 0 && (
                          <Badge variant="outline" className="text-[10px]">${(s.pricePaid / 100).toFixed(0)} paid</Badge>
                        )}
                        {s.placementType && (
                          <Badge variant="outline" className="text-[10px]">{s.placementType}</Badge>
                        )}
                        {s.orderId && (
                          <span className="text-[10px]">Order: {s.orderId}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Switch
                        checked={s.isActive ?? false}
                        onCheckedChange={v => toggleActiveMutation.mutate({ id: s.id, isActive: v })}
                        data-testid={`switch-active-${s.id}`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => startEdit(s)} data-testid={`button-edit-${s.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {s.isActive && (
                        <>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => extendMutation.mutate({ id: s.id, additionalDays: 7 })} data-testid={`button-extend-${s.id}`}>
                            +7d
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => cancelMutation.mutate(s.id)} data-testid={`button-cancel-${s.id}`}>
                            Cancel
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-delete-${s.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
