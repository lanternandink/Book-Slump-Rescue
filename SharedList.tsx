import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, BookOpen, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import type { ReadingList, ReadingListItem } from "@shared/schema";

export default function SharedList() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<{ list: ReadingList; items: ReadingListItem[] }>({
    queryKey: ["/api/lists", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="List Not Found" description="This reading list is private or doesn't exist." />
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-list-not-found">List Not Found</h1>
          <p className="text-muted-foreground mb-6">This reading list is private or doesn't exist.</p>
          <Link href="/">
            <Button data-testid="link-home">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { list, items } = data;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`${list.name} | Reading List`} description={list.description || `A curated reading list with ${items.length} books.`} />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-list-name">{list.name}</h1>
            {list.description && <p className="text-muted-foreground text-sm">{list.description}</p>}
            <p className="text-xs text-muted-foreground mt-1">{items.length} book{items.length !== 1 ? "s" : ""}</p>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">This list is empty.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((item, idx) => (
              <Card key={item.id} className="p-3 flex items-center gap-3" data-testid={`shared-list-item-${item.id}`}>
                <span className="text-xs font-mono text-muted-foreground w-6 text-center">{idx + 1}</span>
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
