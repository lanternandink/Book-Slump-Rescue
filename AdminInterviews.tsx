import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  Mic,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";

interface Interview {
  id: string;
  authorName: string;
  bookTitle: string;
  highlightQuote: string;
  questionsAnswers: { q: string; a: string }[];
  authorImage: string;
  socialLinks: Record<string, string>;
  sponsored: boolean;
  status: string;
  createdAt: string;
}

interface FormState {
  authorName: string;
  bookTitle: string;
  highlightQuote: string;
  questionsAnswers: { q: string; a: string }[];
  authorImage: string;
  socialWebsite: string;
  sponsored: boolean;
  status: string;
}

const emptyForm: FormState = {
  authorName: "",
  bookTitle: "",
  highlightQuote: "",
  questionsAnswers: [{ q: "", a: "" }],
  authorImage: "",
  socialWebsite: "",
  sponsored: false,
  status: "draft",
};

export default function AdminInterviews() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.isAdmin;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...emptyForm });
  const [uploading, setUploading] = useState(false);

  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ["/api/admin/interviews"],
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        authorName: form.authorName,
        bookTitle: form.bookTitle,
        highlightQuote: form.highlightQuote,
        questionsAnswers: form.questionsAnswers.filter((qa) => qa.q.trim() && qa.a.trim()),
        authorImage: form.authorImage,
        socialLinks: form.socialWebsite ? { website: form.socialWebsite } : {},
        sponsored: form.sponsored,
        status: form.status,
      };
      if (editingId) {
        const res = await apiRequest("PUT", `/api/admin/interviews/${editingId}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/admin/interviews", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({ title: editingId ? "Interview updated" : "Interview created", description: "Changes saved successfully." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to save interview.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/interviews/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      toast({ title: "Interview deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete interview.", variant: "destructive" });
    },
  });

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(interview: Interview) {
    setEditingId(interview.id);
    setForm({
      authorName: interview.authorName,
      bookTitle: interview.bookTitle,
      highlightQuote: interview.highlightQuote || "",
      questionsAnswers: interview.questionsAnswers.length > 0 ? interview.questionsAnswers : [{ q: "", a: "" }],
      authorImage: interview.authorImage || "",
      socialWebsite: interview.socialLinks?.website || "",
      sponsored: interview.sponsored,
      status: interview.status,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  }

  function addQA() {
    setForm((f) => ({ ...f, questionsAnswers: [...f.questionsAnswers, { q: "", a: "" }] }));
  }

  function removeQA(idx: number) {
    setForm((f) => ({
      ...f,
      questionsAnswers: f.questionsAnswers.filter((_, i) => i !== idx),
    }));
  }

  function updateQA(idx: number, field: "q" | "a", value: string) {
    setForm((f) => {
      const updated = [...f.questionsAnswers];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, questionsAnswers: updated };
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 2MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/admin/interviews/upload-image", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }
      const data = await res.json();
      setForm((f) => ({ ...f, authorImage: data.path }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Manage Interviews - Admin" description="Create and manage indie author interviews." />
      <Navigation />

      <main className="flex-1 py-10">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4" /> Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-interviews-title">
                  <Mic className="w-6 h-6" /> Manage Interviews
                </h1>
                <p className="text-sm text-muted-foreground">{interviews.length} interview{interviews.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <Button onClick={openCreate} className="gap-1.5" data-testid="button-create-interview">
              <Plus className="w-4 h-4" /> New Interview
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : interviews.length === 0 ? (
            <Card className="p-12 text-center">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Interviews</h2>
              <p className="text-muted-foreground mb-4">Create your first author interview.</p>
              <Button onClick={openCreate} className="gap-1.5" data-testid="button-create-first-interview">
                <Plus className="w-4 h-4" /> New Interview
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {interviews.map((interview, idx) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4" data-testid={`card-admin-interview-${interview.id}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-admin-author-${interview.id}`}>
                          {interview.authorName}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">{interview.bookTitle}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={interview.status === "published" ? "default" : "secondary"} data-testid={`badge-status-${interview.id}`}>
                          {interview.status}
                        </Badge>
                        {interview.sponsored && <Badge variant="outline">Sponsored</Badge>}
                        <span className="text-xs text-muted-foreground">
                          {new Date(interview.createdAt).toLocaleDateString()}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(interview)} data-testid={`button-edit-${interview.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { if (confirm("Delete this interview?")) deleteMutation.mutate(interview.id); }}
                          data-testid={`button-delete-${interview.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingId ? "Edit Interview" : "New Interview"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="authorName">Author Name *</Label>
                <Input
                  id="authorName"
                  value={form.authorName}
                  onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))}
                  placeholder="Jane Doe"
                  data-testid="input-author-name"
                />
              </div>
              <div>
                <Label htmlFor="bookTitle">Book Title *</Label>
                <Input
                  id="bookTitle"
                  value={form.bookTitle}
                  onChange={(e) => setForm((f) => ({ ...f, bookTitle: e.target.value }))}
                  placeholder="Whispers of the Sea"
                  data-testid="input-book-title"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="highlightQuote">Highlight Quote</Label>
              <Input
                id="highlightQuote"
                value={form.highlightQuote}
                onChange={(e) => setForm((f) => ({ ...f, highlightQuote: e.target.value }))}
                placeholder="In every wave there's a story."
                data-testid="input-highlight-quote"
              />
            </div>

            <div>
              <Label>Author Photo</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.authorImage && (
                  <img loading="lazy" decoding="async" src={form.authorImage} alt="Author" className="w-14 h-14 rounded-md object-cover" />
                )}
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none" asChild>
                    <span>
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading..." : "Upload Image"}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    data-testid="input-upload-image"
                  />
                </label>
                {form.authorImage && (
                  <Button variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, authorImage: "" }))} data-testid="button-remove-image">
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="socialWebsite">Author Website URL</Label>
              <Input
                id="socialWebsite"
                value={form.socialWebsite}
                onChange={(e) => setForm((f) => ({ ...f, socialWebsite: e.target.value }))}
                placeholder="https://janedoeauthor.com"
                data-testid="input-social-website"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Questions & Answers *</Label>
                <Button variant="outline" size="sm" onClick={addQA} className="gap-1" data-testid="button-add-qa">
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </Button>
              </div>
              <div className="space-y-4">
                {form.questionsAnswers.map((qa, i) => (
                  <Card key={i} className="p-3 relative">
                    {form.questionsAnswers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => removeQA(i)}
                        data-testid={`button-remove-qa-${i}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <div className="space-y-2 pr-8">
                      <Input
                        placeholder={`Question ${i + 1}`}
                        value={qa.q}
                        onChange={(e) => updateQA(i, "q", e.target.value)}
                        data-testid={`input-question-${i}`}
                      />
                      <Textarea
                        placeholder="Answer..."
                        value={qa.a}
                        onChange={(e) => updateQA(i, "a", e.target.value)}
                        className="resize-none"
                        rows={3}
                        data-testid={`input-answer-${i}`}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sponsored"
                    checked={form.sponsored}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, sponsored: !!v }))}
                    data-testid="checkbox-sponsored"
                  />
                  <Label htmlFor="sponsored" className="cursor-pointer">Sponsored Interview</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!form.authorName.trim() || !form.bookTitle.trim() || saveMutation.isPending}
                data-testid="button-save-interview"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                {editingId ? "Update Interview" : "Create Interview"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
