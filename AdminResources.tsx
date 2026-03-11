import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { BookOpen, Loader2, AlertTriangle, ArrowLeft, Plus, Edit2, Trash2, Save } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  affiliateLink: string;
  isAffiliate: boolean;
  image: string;
}

const CATEGORY_OPTIONS = ["Writing Books", "Author Tools", "Marketing", "Courses"];

const EMPTY_FORM = {
  title: "",
  category: "",
  description: "",
  affiliateLink: "",
  isAffiliate: false,
  image: "",
};

export default function AdminResources() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.isAdmin;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/admin/resources"],
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM & { id?: string }) => {
      if (data.id) {
        const res = await apiRequest("PUT", `/api/admin/resources/${data.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/admin/resources", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: editingId ? "Resource updated" : "Resource added" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Failed to save resource.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/resources/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/resources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({ title: "Resource deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete resource.", variant: "destructive" });
    },
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (r: Resource) => {
    setEditingId(r.id);
    setForm({
      title: r.title,
      category: r.category,
      description: r.description,
      affiliateLink: r.affiliateLink,
      isAffiliate: r.isAffiliate,
      image: r.image,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.description.trim() || !form.category) {
      toast({ title: "Missing fields", description: "Title, category, and description are required.", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ ...form, id: editingId || undefined });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Access Denied" description="Admin access only." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-access-denied">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Manage Resources - Admin" description="Add, edit, and delete affiliate resources." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-resources-title">
              Manage Resources
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Add, edit, or remove affiliate and recommended resources.
            </p>
          </motion.div>

          <div className="flex justify-end mb-4">
            <Button onClick={openAdd} data-testid="button-add-resource">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Resource
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : resources.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg" data-testid="text-no-resources">No resources yet.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {resources.map((r) => (
                <Card key={r.id} className="p-4" data-testid={`card-admin-resource-${r.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{r.title}</h3>
                        <Badge variant="outline" className="text-xs">{r.category}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {r.isAffiliate ? "Affiliate" : "Recommended"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => openEdit(r)} data-testid={`button-edit-resource-${r.id}`}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(r.id)}
                        data-testid={`button-delete-resource-${r.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex justify-center mt-6">
            <Link href="/admin/dashboard">
              <Button variant="outline" data-testid="button-back-dashboard">
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Resource" : "Add Resource"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Resource title"
                data-testid="input-resource-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger data-testid="select-resource-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of this resource"
                rows={3}
                data-testid="input-resource-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Link URL</Label>
              <Input
                value={form.affiliateLink}
                onChange={(e) => setForm((p) => ({ ...p, affiliateLink: e.target.value }))}
                placeholder="https://..."
                data-testid="input-resource-link"
              />
            </div>
            <div className="space-y-2">
              <Label>Image URL (optional)</Label>
              <Input
                value={form.image}
                onChange={(e) => setForm((p) => ({ ...p, image: e.target.value }))}
                placeholder="https://..."
                data-testid="input-resource-image"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isAffiliate}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isAffiliate: v }))}
                data-testid="switch-is-affiliate"
              />
              <Label>This is an affiliate link</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-resource">Cancel</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-resource">
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
