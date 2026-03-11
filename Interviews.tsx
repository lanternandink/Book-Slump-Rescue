import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { DisclosureTag } from "@/components/DisclosureTag";
import { Mic, Loader2, ArrowRight, User } from "lucide-react";

interface Interview {
  id: string;
  authorName: string;
  bookTitle: string;
  highlightQuote: string;
  questionsAnswers: { q: string; a: string }[];
  authorImage: string;
  sponsored: boolean;
  status: string;
  createdAt: string;
}

export default function Interviews() {
  const { data: interviews = [], isLoading } = useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
  });

  function getExcerpt(interview: Interview): string {
    if (interview.highlightQuote) {
      return interview.highlightQuote.length > 150
        ? interview.highlightQuote.substring(0, 150) + "..."
        : interview.highlightQuote;
    }
    const firstAnswer = interview.questionsAnswers?.[0]?.a || "";
    return firstAnswer.length > 150
      ? firstAnswer.substring(0, 150) + "..."
      : firstAnswer;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Indie Author Interviews - Book Slump Rescue"
        description="Read in-depth interviews with indie authors about their books, writing process, and creative inspiration."
      />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-interviews-title">
              Indie Author Interviews
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Get to know the authors behind the stories. Discover their inspirations, writing routines, and what makes their books special.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : interviews.length === 0 ? (
            <Card className="p-12 text-center">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2" data-testid="text-no-interviews">No Interviews Yet</h2>
              <p className="text-muted-foreground">Stay tuned! Author interviews are coming soon.</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {interviews.map((interview, idx) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link href={`/interviews/${interview.id}`}>
                    <Card className="h-full flex flex-col overflow-visible hover-elevate cursor-pointer" data-testid={`card-interview-${interview.id}`}>
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {interview.authorImage ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={interview.authorImage}
                              alt={interview.authorName}
                              className="w-14 h-14 rounded-md object-cover flex-shrink-0"
                              data-testid={`img-author-${interview.id}`}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold leading-snug line-clamp-1" data-testid={`text-author-name-${interview.id}`}>
                              {interview.authorName}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-book-title-${interview.id}`}>
                              {interview.bookTitle}
                            </p>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground flex-1 mb-4 line-clamp-3 italic" data-testid={`text-excerpt-${interview.id}`}>
                          "{getExcerpt(interview)}"
                        </p>

                        <div className="flex items-center justify-between gap-2 mt-auto">
                          <div className="flex items-center gap-2">
                            {interview.sponsored && <DisclosureTag type="sponsored" />}
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-read-interview-${interview.id}`}>
                            Read Interview <ArrowRight className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
