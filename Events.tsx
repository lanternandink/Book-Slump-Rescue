import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { Calendar, MapPin, Plus, Share2, ExternalLink, Pencil, Trash2, Copy, Check, ChevronDown } from "lucide-react";
import { SiX, SiFacebook } from "react-icons/si";
import { Navigation } from "@/components/Navigation";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CommunityEvent } from "@shared/schema";

const EVENT_CATEGORIES = [
  { value: "all", label: "All Events" },
  { value: "signing", label: "Book Signing" },
  { value: "author-meet", label: "Author Meet" },
  { value: "virtual", label: "Virtual" },
  { value: "book-fair", label: "Book Fair" },
  { value: "reading-group", label: "Reading Group" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  signing: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "author-meet": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  virtual: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  "book-fair": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "reading-group": "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  other: "bg-muted text-muted-foreground",
};

const CATEGORY_LABELS: Record<string, string> = {
  signing: "Book Signing",
  "author-meet": "Author Meet",
  virtual: "Virtual",
  "book-fair": "Book Fair",
  "reading-group": "Reading Group",
  other: "Other",
};

const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.string().min(2, "Location is required"),
  category: z.enum(["signing", "author-meet", "virtual", "book-fair", "reading-group", "other"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  websiteUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageFile: z.instanceof(File).optional(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (s.toDateString() === e.toDateString()) {
    return format(s, "MMMM d, yyyy");
  }
  return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
}

async function uploadImage(file: File): Promise<string | null> {
  try {
    const ext = file.name.split(".").pop();
    const res = await apiRequest("POST", "/api/uploads/request-url", {
      fileName: `event-${Date.now()}.${ext}`,
      contentType: file.type,
      directory: "public",
    });
    const { uploadURL, objectPath } = await res.json();
    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return objectPath;
  } catch {
    return null;
  }
}

function ShareButton({ event }: { event: CommunityEvent }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const url = `${window.location.origin}/events`;
  const text = `📚 ${event.title} — ${event.location}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: event.title, text, url });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ description: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if ('share' in navigator) {
    return (
      <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={handleNativeShare} data-testid={`button-share-${event.id}`}>
        <Share2 className="h-3.5 w-3.5" /> Share
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1.5 text-xs" data-testid={`button-share-${event.id}`}>
          <Share2 className="h-3.5 w-3.5" /> Share <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            data-testid={`link-share-x-${event.id}`}
          >
            <SiX className="h-3.5 w-3.5" /> Share on X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
            data-testid={`link-share-fb-${event.id}`}
          >
            <SiFacebook className="h-3.5 w-3.5" /> Share on Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink} className="flex items-center gap-2" data-testid={`button-copy-${event.id}`}>
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EventCard({ event, currentUserId, onEdit, onDelete }: {
  event: CommunityEvent;
  currentUserId?: string;
  onEdit: (e: CommunityEvent) => void;
  onDelete: (id: number) => void;
}) {
  const isOwner = currentUserId && event.userId === currentUserId;
  const imageUrl = event.imageUrl ? `/objects/${event.imageUrl}` : null;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow" data-testid={`card-event-${event.id}`}>
      {imageUrl && (
        <div className="aspect-[16/7] overflow-hidden bg-muted">
          <img src={imageUrl} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}
      {!imageUrl && (
        <div className="aspect-[16/7] bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
          <Calendar className="h-12 w-12 text-primary/30" />
        </div>
      )}
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <Badge className={`text-xs font-medium ${CATEGORY_COLORS[event.category] || CATEGORY_COLORS.other}`} data-testid={`badge-category-${event.id}`}>
              {CATEGORY_LABELS[event.category] || event.category}
            </Badge>
            <h3 className="font-display font-bold text-base leading-snug line-clamp-2" data-testid={`text-event-title-${event.id}`}>
              {event.title}
            </h3>
          </div>
          {isOwner && (
            <div className="flex gap-1 shrink-0">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(event)} data-testid={`button-edit-${event.id}`}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(event.id)} data-testid={`button-delete-${event.id}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-event-description-${event.id}`}>
          {event.description}
        </p>

        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5" data-testid={`text-event-date-${event.id}`}>
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDateRange(event.startDate as unknown as string, event.endDate as unknown as string)}</span>
          </div>
          <div className="flex items-center gap-1.5" data-testid={`text-event-location-${event.id}`}>
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1 border-t">
          <ShareButton event={event} />
          {event.websiteUrl && (
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs ml-auto" asChild data-testid={`link-event-website-${event.id}`}>
              <a href={event.websiteUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Details
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EventForm({ defaultValues, onSubmit, isPending, isEdit = false }: {
  defaultValues?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => void;
  isPending: boolean;
  isEdit?: boolean;
}) {
  const form = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      category: "other",
      startDate: "",
      endDate: "",
      websiteUrl: "",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Event Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Author Book Signing — Jane Doe" {...field} data-testid="input-event-title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea placeholder="Tell readers what to expect..." rows={3} {...field} data-testid="input-event-description" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-event-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_CATEGORIES.filter(c => c.value !== "all").map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="City, State or Virtual" {...field} data-testid="input-event-location" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-event-start-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} data-testid="input-event-end-date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="websiteUrl" render={({ field }) => (
          <FormItem>
            <FormLabel>Event Website <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
            <FormControl>
              <Input placeholder="https://..." {...field} data-testid="input-event-website" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="imageFile" render={({ field: { onChange } }) => (
          <FormItem>
            <FormLabel>Event Flyer / Image <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
            <FormControl>
              <Input
                type="file"
                accept="image/*"
                onChange={e => onChange(e.target.files?.[0])}
                data-testid="input-event-image"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-event">
          {isPending ? "Saving..." : isEdit ? "Update Event" : "Post Event"}
        </Button>
      </form>
    </Form>
  );
}

export default function Events() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEvent | null>(null);

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const currentUserId = user?.id;
  const isLoggedIn = !!user;

  const { data: events = [], isLoading } = useQuery<CommunityEvent[]>({
    queryKey: ["/api/events", selectedCategory, showUpcoming],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("upcoming", String(showUpcoming));
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      let imageUrl: string | null = null;
      if (data.imageFile) {
        imageUrl = await uploadImage(data.imageFile);
      }
      return apiRequest("POST", "/api/events", {
        title: data.title,
        description: data.description,
        location: data.location,
        category: data.category,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        websiteUrl: data.websiteUrl || null,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setDialogOpen(false);
      toast({ description: "Your event has been posted!" });
    },
    onError: () => toast({ variant: "destructive", description: "Failed to post event. Please try again." }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!editingEvent) return;
      let imageUrl: string | null = editingEvent.imageUrl ?? null;
      if (data.imageFile) {
        imageUrl = await uploadImage(data.imageFile);
      }
      return apiRequest("PATCH", `/api/events/${editingEvent.id}`, {
        title: data.title,
        description: data.description,
        location: data.location,
        category: data.category,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        websiteUrl: data.websiteUrl || null,
        imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setEditingEvent(null);
      toast({ description: "Event updated!" });
    },
    onError: () => toast({ variant: "destructive", description: "Failed to update event." }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ description: "Event removed." });
    },
    onError: () => toast({ variant: "destructive", description: "Failed to remove event." }),
  });

  function handlePostClick() {
    if (!isLoggedIn) {
      toast({ description: "Sign in to post an event.", variant: "destructive" });
      return;
    }
    setDialogOpen(true);
  }

  function handleEdit(event: CommunityEvent) {
    setEditingEvent(event);
  }

  function handleDelete(id: number) {
    if (confirm("Remove this event?")) {
      deleteMutation.mutate(id);
    }
  }

  const editDefaults = editingEvent ? {
    title: editingEvent.title,
    description: editingEvent.description,
    location: editingEvent.location,
    category: editingEvent.category as any,
    startDate: format(new Date(editingEvent.startDate as unknown as string), "yyyy-MM-dd"),
    endDate: format(new Date(editingEvent.endDate as unknown as string), "yyyy-MM-dd"),
    websiteUrl: editingEvent.websiteUrl ?? "",
  } : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Bookish Events Near You"
        description="Discover local and virtual book events — signings, author meets, book fairs, and reading groups — posted by readers like you."
      />
      <Navigation />

      <main className="flex-1 py-10 lg:py-14">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
                Bookish Events
              </h1>
              <p className="text-muted-foreground mt-1">
                Find events near you — or share your own with the community.
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handlePostClick} className="gap-2 shrink-0" data-testid="button-post-event">
                  <Plus className="h-4 w-4" /> Post an Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display">Post an Event</DialogTitle>
                </DialogHeader>
                <EventForm
                  onSubmit={(data) => createMutation.mutate(data)}
                  isPending={createMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="flex flex-wrap gap-1.5" role="tablist" data-testid="filter-categories">
              {EVENT_CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  size="sm"
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat.value)}
                  className="text-xs h-8"
                  data-testid={`filter-category-${cat.value}`}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              variant={showUpcoming ? "secondary" : "outline"}
              onClick={() => setShowUpcoming(!showUpcoming)}
              className="text-xs h-8 sm:ml-auto shrink-0"
              data-testid="filter-upcoming-toggle"
            >
              {showUpcoming ? "Upcoming Only" : "All Events"}
            </Button>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[16/7]" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && events.length === 0 && (
            <div className="text-center py-20" data-testid="events-empty-state">
              <Calendar className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-5 text-sm">
                Be the first to share a bookish event with the community!
              </p>
              <Button onClick={handlePostClick} className="gap-2" data-testid="button-post-event-empty">
                <Plus className="h-4 w-4" /> Post an Event
              </Button>
            </div>
          )}

          {!isLoading && events.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {events.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  currentUserId={currentUserId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!editingEvent} onOpenChange={(open) => { if (!open) setEditingEvent(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Event</DialogTitle>
          </DialogHeader>
          {editingEvent && (
            <EventForm
              defaultValues={editDefaults}
              onSubmit={(data) => updateMutation.mutate(data)}
              isPending={updateMutation.isPending}
              isEdit
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
