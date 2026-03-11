import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEOHead } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { DisclosureTag } from "@/components/DisclosureTag";
import { BookOpen, ExternalLink, Loader2, Search, Heart } from "lucide-react";

interface Resource {
  id: string;
  title: string;
  category: string;
  description: string;
  affiliateLink: string;
  isAffiliate: boolean;
  image: string;
}

const CATEGORIES = ["All", "Writing Books", "Author Tools", "Marketing", "Courses"];

export default function Resources() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  const filtered = resources.filter((r) => {
    const matchesCategory = selectedCategory === "All" || r.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleVisitClick = async (resource: Resource) => {
    try {
      await fetch(`/api/resources/${resource.id}/click`, { method: "POST" });
    } catch {}
    if (resource.affiliateLink) {
      window.open(resource.affiliateLink, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Author Tools & Resources - Book Slump Rescue"
        description="Discover our curated list of author tools, writing resources, courses, and marketing guides to help you on your writing journey."
      />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-resources-title">
              Author Tools & Resources We Love
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Some links may be affiliate links, which help keep BookSlumpRescue running.
            </p>
          </motion.div>

          <div className="flex flex-wrap items-center gap-3 mb-8">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-resources-search"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]" data-testid="select-resource-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-2" data-testid="text-no-resources">
                {resources.length === 0 ? "No resources available yet." : "No resources match your filters."}
              </p>
              <p className="text-sm text-muted-foreground">
                Check back soon for curated author tools and resources.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((resource, i) => (
                <motion.div
                  key={resource.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-5 h-full flex flex-col" data-testid={`card-resource-${resource.id}`}>
                    {resource.image && (
                      <div className="rounded-md overflow-hidden mb-3 bg-muted aspect-video">
                        <img
                          src={resource.image}
                          alt={resource.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{resource.category}</Badge>
                      {resource.isAffiliate ? (
                        <DisclosureTag type="affiliate" />
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <Heart className="w-3 h-3 mr-1" />
                          Recommended Resource
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg mb-1" data-testid={`text-resource-title-${resource.id}`}>
                      {resource.title}
                    </h3>
                    <p className="text-sm text-muted-foreground flex-1 mb-3">
                      {resource.description}
                    </p>
                    {resource.affiliateLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVisitClick(resource)}
                        data-testid={`button-visit-resource-${resource.id}`}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        Visit Link
                      </Button>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center">
            <p className="text-xs text-muted-foreground">
              Some links on this page are affiliate links. See our{" "}
              <Link href="/disclosure-policy" className="underline hover:text-foreground" data-testid="link-disclosure-inline">
                Disclosure Policy
              </Link>{" "}
              for more details.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
