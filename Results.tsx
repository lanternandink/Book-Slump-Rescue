import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { BookResponse } from "@shared/routes";
import { Navigation } from "@/components/Navigation";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, RotateCcw, Sparkles, Share2, Twitter, Facebook, Link2, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SEOHead } from "@/components/SEOHead";

export default function Results() {
  const [books, setBooks] = useState<BookResponse[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const savedHistoryRef = useRef(false);

  const saveQuizHistoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/user/quiz-history", data);
    },
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("recommendations");
    const quizAnswers = sessionStorage.getItem("quizAnswers");
    
    if (stored) {
      const parsedBooks = JSON.parse(stored);
      setBooks(parsedBooks);
      
      if (isAuthenticated && quizAnswers && !savedHistoryRef.current) {
        savedHistoryRef.current = true;
        try {
          const answers = JSON.parse(quizAnswers);
          saveQuizHistoryMutation.mutate({
            fictionType: answers.fictionType || null,
            selectedGenres: answers.genres || [],
            mood: Array.isArray(answers.mood) ? answers.mood : answers.mood ? [answers.mood] : [],
            readingGoal: Array.isArray(answers.readingGoal) ? answers.readingGoal : answers.readingGoal ? [answers.readingGoal] : [],
            recommendedBooks: parsedBooks.slice(0, 5).map((b: any) => b.title),
          });
        } catch (e) {
          console.error("Failed to parse quiz answers:", e);
        }
      }
    } else {
      setLocation("/quiz");
    }
  }, [setLocation, isAuthenticated]);

  const shareText = `I just discovered ${books.length} amazing book recommendations with Book Slump Rescue! Take the quiz to find your next read:`;
  const shareUrl = window.location.origin;

  const copyLink = () => {
    navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
    toast({
      title: "Link copied!",
      description: "Share it with your book-loving friends.",
    });
  };

  const shareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const shareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  const shareEmail = () => {
    const subject = "Check out Book Slump Rescue!";
    const body = `${shareText}\n\n${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Your Recommendations" description="Personalized book recommendations based on your reading preferences and mood." />
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto mb-12 text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
               <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Your Curated Picks</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Based on your mood and preferences, we think these books will pull you right out of that slump.
            </p>
          </motion.div>
        </div>

        {books.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-xl mx-auto mb-12"
          >
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Share your results</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={shareTwitter} data-testid="button-share-twitter">
                  <Twitter className="w-4 h-4 mr-1" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={shareFacebook} data-testid="button-share-facebook">
                  <Facebook className="w-4 h-4 mr-1" />
                  Facebook
                </Button>
                <Button variant="outline" size="sm" onClick={shareEmail} data-testid="button-share-email">
                  <Mail className="w-4 h-4 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm" onClick={copyLink} data-testid="button-share-copy">
                  <Link2 className="w-4 h-4 mr-1" />
                  Copy Link
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {books.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
            {books.map((book, index) => (
              <BookCard key={book.id} book={book} priority={index < 2} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No recommendations found. Try adjusting your filters.</p>
          </div>
        )}

        <div className="mt-16 text-center space-x-4">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => setLocation("/quiz")}
            data-testid="button-start-over"
          >
            <RotateCcw className="mr-2 h-4 w-4" /> Start Over
          </Button>
          <Button 
            size="lg" 
            onClick={() => setLocation("/saved")}
            className="shadow-lg shadow-primary/20"
            data-testid="button-go-library"
          >
            Go to My Library <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
