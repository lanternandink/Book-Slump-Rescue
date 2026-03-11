import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, Plus, MoreVertical, Trash2, Edit2, BookOpen, Loader2, Globe, Lock, ChevronUp, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ReadingList, ReadingListItem } from "@shared/schema";
import { SEOHead } from "@/components/SEOHead";

export default function ReadingLists() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editList, setEditList] = useState<ReadingList | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: lists = [], isLoading } = useQuery<ReadingList[]>({
    queryKey: ["/api/user/lists"],
  });

  const { data: selectedItems = [] } = useQuery<ReadingListItem[]>({
    queryKey: ["/api/user/lists", selectedListId, "items"],
    enabled: !!selectedListId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description: string }) => {
      return apiRequest("POST", "/api/user/lists", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/lists"] });
      setCreateOpen(false);
      setName("");
      setDescription("");
      toast({ title: "List created!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name: string; description: string; isPublic?: boolean }) => {
      return apiRequest("PATCH", `/api/user/lists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/lists"] });
      setEditList(null);
      toast({ title: "List updated!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/user/lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/lists"] });
      if (selectedListId) setSelectedListId(null);
      toast({ title: "List deleted" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ listId, itemId }: { listId: number; itemId: number }) => {
      return apiRequest("DELETE", `/api/user/lists/${listId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/lists", selectedListId, "items"] });
      toast({ title: "Book removed from list" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ listId, itemIds }: { listId: number; itemIds: number[] }) => {
      return apiRequest("PATCH", `/api/user/lists/${listId}/reorder`, { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/lists", selectedListId, "items"] });
    },
  });

  const togglePublic = async (list: ReadingList) => {
    const newVal = !list.isPublic;
    await apiRequest("PATCH", `/api/user/lists/${list.id}`, { isPublic: newVal });
    queryClient.invalidateQueries({ queryKey: ["/api/user/lists"] });
    toast({ title: newVal ? "List is now public" : "List is now private" });
  };

  const copyShareLink = (listId: number) => {
    const url = `${window.location.origin}/lists/${listId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(listId);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (!selectedListId) return;
    const items = [...selectedItems];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    [items[index], items[swapIdx]] = [items[swapIdx], items[index]];
    const itemIds = items.map(i => i.id);
    reorderMutation.mutate({ listId: selectedListId, itemIds });
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
      <SEOHead title="Reading Lists" description="Create and manage themed reading lists to organize your book collections." />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">My Reading Lists</h1>
            <p className="text-muted-foreground text-sm">Organize your books into custom collections</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-list">
                <Plus className="w-4 h-4 mr-2" />
                New List
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Reading List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="List name (e.g., Summer Reads)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-list-name"
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="input-list-description"
                />
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate({ name, description })}
                  disabled={!name.trim() || createMutation.isPending}
                  data-testid="button-save-list"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create List"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {lists.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No reading lists yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create lists to organize your books - try "Summer Reads" or "Book Club Picks"
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-list">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {lists.map((list) => (
              <Card
                key={list.id}
                className={`p-4 cursor-pointer transition-all hover-elevate ${selectedListId === list.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => setSelectedListId(selectedListId === list.id ? null : list.id)}
                data-testid={`card-list-${list.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{list.name}</h3>
                    {list.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{list.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {list.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`button-list-menu-${list.id}`}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditList(list); }} data-testid={`button-edit-list-${list.id}`}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); togglePublic(list); }} data-testid={`button-toggle-public-${list.id}`}>
                        {list.isPublic ? <Lock className="w-4 h-4 mr-2" /> : <Globe className="w-4 h-4 mr-2" />}
                        {list.isPublic ? "Make Private" : "Make Public"}
                      </DropdownMenuItem>
                      {list.isPublic && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyShareLink(list.id); }} data-testid={`button-copy-link-${list.id}`}>
                          {copiedId === list.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                          {copiedId === list.id ? "Copied!" : "Copy Share Link"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(list.id); }}
                        data-testid={`button-delete-list-${list.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        {selectedListId && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Books in this list</h2>
            {selectedItems.length === 0 ? (
              <Card className="p-6 text-center border-dashed">
                <p className="text-muted-foreground">No books in this list yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add books from your library or search results
                </p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {selectedItems.map((item, idx) => (
                  <Card key={item.id} className="p-3 flex items-center gap-3" data-testid={`list-item-${item.id}`}>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={idx === 0 || reorderMutation.isPending}
                        onClick={() => moveItem(idx, "up")}
                        data-testid={`button-move-up-${item.id}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={idx === selectedItems.length - 1 || reorderMutation.isPending}
                        onClick={() => moveItem(idx, "down")}
                        data-testid={`button-move-down-${item.id}`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                    {item.bookCoverUrl ? (
                      <img loading="lazy" decoding="async" src={item.bookCoverUrl} alt="" className="w-10 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-10 h-14 bg-muted rounded flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.bookTitle}</p>
                      <p className="text-sm text-muted-foreground truncate">{item.bookAuthor}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItemMutation.mutate({ listId: selectedListId, itemId: item.id })}
                      data-testid={`button-remove-item-${item.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <Dialog open={!!editList} onOpenChange={(open) => !open && setEditList(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="List name"
                value={editList?.name || ""}
                onChange={(e) => setEditList(editList ? { ...editList, name: e.target.value } : null)}
              />
              <Textarea
                placeholder="Description"
                value={editList?.description || ""}
                onChange={(e) => setEditList(editList ? { ...editList, description: e.target.value } : null)}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-public" className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4" /> Share publicly
                </Label>
                <Switch
                  id="edit-public"
                  checked={editList?.isPublic || false}
                  onCheckedChange={(v) => setEditList(editList ? { ...editList, isPublic: v } : null)}
                  data-testid="switch-public"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => editList && updateMutation.mutate({ id: editList.id, name: editList.name, description: editList.description || "", isPublic: editList.isPublic || false })}
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
