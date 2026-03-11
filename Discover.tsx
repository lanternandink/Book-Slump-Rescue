import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BookOpen, Search, SlidersHorizontal, X, ArrowRight, ChevronDown, ChevronUp, Save, Trash2, MinusCircle, PlusCircle, Bookmark } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CatalogBook, DiscoveryTag, SavedFilterPreset } from "@shared/schema";
import { BookCard } from "@/components/BookCard";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FacetEntry = { id: number; name: string; slug: string; count: number; isSensitive: boolean };
type SearchResponse = {
  results: CatalogBook[];
  facets: Record<string, FacetEntry[]>;
  totalResults: number;
  page: number;
  totalPages: number;
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "title", label: "Title A-Z" },
  { value: "oldest", label: "Oldest First" },
  { value: "pages_asc", label: "Shortest First" },
  { value: "pages_desc", label: "Longest First" },
];

const GENRE_QUICK_TABS = [
  { label: "All", slug: "" },
  { label: "Romance", slug: "romance" },
  { label: "Fantasy", slug: "fantasy" },
  { label: "Thriller", slug: "thriller" },
  { label: "Mystery", slug: "mystery" },
  { label: "Sci-Fi", slug: "sci-fi" },
  { label: "Horror", slug: "horror" },
  { label: "Nonfiction", slug: "nonfiction" },
];

const CATEGORY_LABELS: Record<string, string> = {
  GENRE: "Genre",
  SUBGENRE: "Subgenre",
  TROPE: "Tropes",
  ROMANCE_TROPE: "Romance Tropes",
  THEME: "Themes",
  VIBE: "Vibe / Mood",
  PACING: "Pacing",
  SETTING: "Setting",
  POV: "POV",
  CONTENT: "Content Warnings",
  FORMAT: "Format",
  AUDIENCE: "Audience",
};

const EXCLUDABLE_CATEGORIES = new Set(["CONTENT", "TROPE", "ROMANCE_TROPE"]);

const CATEGORY_DISPLAY_ORDER = [
  "GENRE", "SUBGENRE", "TROPE", "ROMANCE_TROPE", "THEME",
  "VIBE", "PACING", "SETTING", "POV", "CONTENT", "FORMAT", "AUDIENCE"
];

function catalogToBookResponse(book: CatalogBook) {
  return {
    id: book.id,
    title: book.title,
    author: book.authors?.[0] || "Unknown",
    description: book.description || "",
    genre: book.categories?.[0] || "General",
    coverUrl: book.coverUrl || "",
    amazonUrl: "",
    spiceLevel: book.spiceLevel || 1,
    darknessLevel: book.darknessLevel || 2,
    length: book.length || "medium",
    tropes: book.tropes || [],
    tags: book.tags || [],
    mood: book.mood || "",
    pace: book.pace || "",
    pageCount: book.pageCount || undefined,
    moodTags: book.moodTags || [],
    romanceLevel: book.romanceLevel as "none" | "subplot" | "central" | undefined,
    tone: book.tone as "light" | "medium" | "dark" | undefined,
    primaryGenre: book.categories?.[0] || undefined,
    isbn13: book.isbn13 || undefined,
    catalogBookId: book.id,
    communityTags: book.communityTags || [],
    communityTropes: book.communityTropes || [],
    communityMoodTags: book.communityMoodTags || [],
  };
}

export default function Discover() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [includeTags, setIncludeTags] = useState<number[]>([]);
  const [excludeTags, setExcludeTags] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["GENRE"]));
  const [presetName, setPresetName] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const searchBody = useMemo(() => ({
    q: debouncedSearch,
    includeTags,
    excludeTags,
    sort: sortBy,
    page,
    pageSize: 24,
  }), [debouncedSearch, includeTags, excludeTags, sortBy, page]);

  const { data: searchResult, isLoading: searchLoading } = useQuery<SearchResponse>({
    queryKey: ["/api/discover/search", JSON.stringify(searchBody)],
    queryFn: async () => {
      const res = await fetch("/api/discover/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchBody),
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const { data: allTags = [] } = useQuery<DiscoveryTag[]>({
    queryKey: ["/api/discover/tags"],
  });

  const { data: presets = [] } = useQuery<SavedFilterPreset[]>({
    queryKey: ["/api/user/filter-presets"],
    enabled: !!user,
  });

  const tagMap = useMemo(() => {
    const map = new Map<number, DiscoveryTag>();
    allTags.forEach(t => map.set(t.id, t));
    return map;
  }, [allTags]);

  const tagsByCategory = useMemo(() => {
    const grouped: Record<string, DiscoveryTag[]> = {};
    allTags.forEach(t => {
      if (!grouped[t.category]) grouped[t.category] = [];
      grouped[t.category].push(t);
    });
    return grouped;
  }, [allTags]);

  const facets = searchResult?.facets || {};

  const facetCountMap = useMemo(() => {
    const map = new Map<number, number>();
    Object.values(facets).forEach(entries => {
      entries.forEach(e => map.set(e.id, e.count));
    });
    return map;
  }, [facets]);

  const savePresetMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/filter-presets", {
        name: presetName.trim(),
        includeTags,
        excludeTags,
        filters: { sort: sortBy, q: debouncedSearch },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/filter-presets"] });
      setPresetName("");
      toast({ title: "Preset saved" });
    },
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/user/filter-presets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/filter-presets"] });
      toast({ title: "Preset deleted" });
    },
  });

  const loadPreset = (preset: SavedFilterPreset) => {
    setIncludeTags(preset.includeTags || []);
    setExcludeTags(preset.excludeTags || []);
    const f = preset.filters as any;
    setSortBy(f?.sort || "newest");
    setSearchInput(f?.q || "");
    setDebouncedSearch(f?.q || "");
    setPage(1);
    toast({ title: `Loaded "${preset.name}"` });
  };

  const toggleIncludeTag = useCallback((tagId: number) => {
    setPage(1);
    setExcludeTags(prev => prev.filter(id => id !== tagId));
    setIncludeTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const toggleExcludeTag = useCallback((tagId: number) => {
    setPage(1);
    setIncludeTags(prev => prev.filter(id => id !== tagId));
    setExcludeTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }, []);

  const removeTag = useCallback((tagId: number) => {
    setIncludeTags(prev => prev.filter(id => id !== tagId));
    setExcludeTags(prev => prev.filter(id => id !== tagId));
    setPage(1);
  }, []);

  const quickGenreTag = useCallback((genreSlug: string) => {
    if (!genreSlug) {
      setIncludeTags([]);
      setExcludeTags([]);
      setPage(1);
      return;
    }
    const tag = allTags.find(t => t.category === "GENRE" && t.slug === genreSlug);
    if (tag) {
      setIncludeTags([tag.id]);
      setExcludeTags([]);
      setPage(1);
    }
  }, [allTags]);

  const clearFilters = () => {
    setIncludeTags([]);
    setExcludeTags([]);
    setSearchInput("");
    setDebouncedSearch("");
    setSortBy("newest");
    setPage(1);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const activeFilterCount = includeTags.length + excludeTags.length;
  const isActiveGenreQuick = (slug: string) => {
    if (!slug) return includeTags.length === 0 && excludeTags.length === 0;
    const tag = allTags.find(t => t.category === "GENRE" && t.slug === slug);
    return tag ? includeTags.includes(tag.id) && includeTags.length === 1 : false;
  };

  const FilterPanel = () => (
    <div className="space-y-3" data-testid="filter-panel">
      {CATEGORY_DISPLAY_ORDER.map(cat => {
        const tags = tagsByCategory[cat];
        if (!tags || tags.length === 0) return null;
        const isExpanded = expandedCategories.has(cat);
        const isExcludable = EXCLUDABLE_CATEGORIES.has(cat);
        const hasActiveInCat = tags.some(t => includeTags.includes(t.id) || excludeTags.includes(t.id));

        return (
          <div key={cat} className="border-b border-border/50 pb-2">
            <button
              className="flex items-center justify-between w-full text-left py-1.5 text-sm font-medium hover:text-primary transition-colors"
              onClick={() => toggleCategory(cat)}
              data-testid={`filter-category-${cat}`}
            >
              <span className="flex items-center gap-1.5">
                {CATEGORY_LABELS[cat] || cat}
                {hasActiveInCat && (
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                )}
              </span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isExpanded && (
              <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                {tags.map(tag => {
                  const isIncluded = includeTags.includes(tag.id);
                  const isExcluded = excludeTags.includes(tag.id);
                  const count = facetCountMap.get(tag.id) || 0;

                  return (
                    <div key={tag.id} className="flex items-center gap-0">
                      <Badge
                        variant={isIncluded ? "default" : isExcluded ? "destructive" : "outline"}
                        className="cursor-pointer select-none text-xs gap-1 transition-colors pr-1"
                        onClick={() => toggleIncludeTag(tag.id)}
                        data-testid={`filter-tag-${tag.slug}`}
                      >
                        {isIncluded && <PlusCircle className="w-3 h-3" />}
                        {isExcluded && <MinusCircle className="w-3 h-3" />}
                        {tag.name}
                        {count > 0 && (
                          <span className="text-[10px] opacity-60 ml-0.5">({count})</span>
                        )}
                      </Badge>
                      {isExcludable && !isExcluded && (
                        <button
                          className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleExcludeTag(tag.id); }}
                          title={`Exclude ${tag.name}`}
                          data-testid={`exclude-tag-${tag.slug}`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {user && (
        <div className="pt-3 border-t border-border/50 space-y-3">
          <div className="text-sm font-medium flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" /> Filter Presets
          </div>
          {presets.length > 0 && (
            <div className="space-y-1.5">
              {presets.map(p => (
                <div key={p.id} className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start text-xs h-7"
                    onClick={() => loadPreset(p)}
                    data-testid={`preset-load-${p.id}`}
                  >
                    {p.name}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => deletePresetMutation.mutate(p.id)}
                    data-testid={`preset-delete-${p.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {activeFilterCount > 0 && (
            <div className="flex gap-1.5">
              <Input
                placeholder="Preset name..."
                value={presetName}
                onChange={e => setPresetName(e.target.value)}
                className="h-8 text-xs"
                data-testid="input-preset-name"
              />
              <Button
                size="sm"
                className="h-8 gap-1"
                disabled={!presetName.trim() || savePresetMutation.isPending}
                onClick={() => savePresetMutation.mutate()}
                data-testid="button-save-preset"
              >
                <Save className="w-3 h-3" /> Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 mx-auto py-8 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-discover-title">
                Discover Books
              </h1>
              <p className="text-muted-foreground mt-1">
                Filter by tropes, vibes, content warnings, and more.
              </p>
            </div>
            <Link href="/quiz">
              <Button variant="outline" className="rounded-full gap-2" data-testid="link-take-quiz">
                Not sure? Take the Quiz <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4" data-testid="genre-quick-tabs">
            {GENRE_QUICK_TABS.map(tab => (
              <Badge
                key={tab.slug || "all"}
                variant={isActiveGenreQuick(tab.slug) ? "default" : "outline"}
                className="cursor-pointer select-none transition-colors px-3 py-1"
                onClick={() => quickGenreTag(tab.slug)}
                data-testid={`quick-genre-${tab.slug || "all"}`}
              >
                {tab.label}
              </Badge>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or author..."
                value={searchInput}
                onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                className="pl-10"
                data-testid="input-discover-search"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-sort">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 hidden md:flex"
              data-testid="button-toggle-filters"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 md:hidden" data-testid="button-mobile-filters">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <FilterPanel />
                </div>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3 gap-1 text-muted-foreground w-full" data-testid="button-clear-mobile">
                    <X className="w-3.5 h-3.5" /> Clear all filters
                  </Button>
                )}
              </SheetContent>
            </Sheet>
          </div>

          {(includeTags.length > 0 || excludeTags.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-4" data-testid="active-filters">
              {includeTags.map(id => {
                const tag = tagMap.get(id);
                return tag ? (
                  <Badge key={`inc-${id}`} variant="default" className="gap-1 text-xs cursor-pointer" onClick={() => removeTag(id)} data-testid={`pill-include-${tag.slug}`}>
                    <PlusCircle className="w-3 h-3" /> {tag.name} <X className="w-3 h-3" />
                  </Badge>
                ) : null;
              })}
              {excludeTags.map(id => {
                const tag = tagMap.get(id);
                return tag ? (
                  <Badge key={`exc-${id}`} variant="destructive" className="gap-1 text-xs cursor-pointer" onClick={() => removeTag(id)} data-testid={`pill-exclude-${tag.slug}`}>
                    <MinusCircle className="w-3 h-3" /> {tag.name} <X className="w-3 h-3" />
                  </Badge>
                ) : null;
              })}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground gap-1" data-testid="button-clear-filters">
                <X className="w-3 h-3" /> Clear all
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground mb-4" data-testid="text-result-count">
            {searchLoading ? "Searching..." : `${searchResult?.totalResults ?? 0} book${(searchResult?.totalResults ?? 0) !== 1 ? "s" : ""} found`}
          </div>
        </motion.div>

        <div className="flex gap-6">
          {showFilters && (
            <aside className="hidden md:block w-64 shrink-0">
              <Card className="p-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold">Filter by Tag</span>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground gap-1">
                      <X className="w-3 h-3" /> Clear
                    </Button>
                  )}
                </div>
                <FilterPanel />
              </Card>
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {searchLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-[2/3] w-full" />
                    <div className="p-3 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : !searchResult || searchResult.results.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold mb-2">No books match your filters</h3>
                <p className="text-muted-foreground mb-4">Try adjusting your search or removing some filters.</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={clearFilters} data-testid="button-clear-empty">Clear Filters</Button>
                  <Link href="/quiz">
                    <Button data-testid="button-try-quiz-empty">Take the Quiz Instead</Button>
                  </Link>
                </div>
              </motion.div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4" data-testid="discover-grid">
                  {searchResult.results.map((book, i) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.5) }}
                    >
                      <BookCard book={catalogToBookResponse(book)} />
                    </motion.div>
                  ))}
                </div>

                {searchResult.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8" data-testid="pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      Page {page} of {searchResult.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= searchResult.totalPages}
                      onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
