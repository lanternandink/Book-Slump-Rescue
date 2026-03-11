import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Newspaper, Send, CheckCircle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function NewsletterFeatureRequest() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    bookTitle: "",
    authorName: "",
    firstChapter: "",
    contactEmail: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bookTitle.trim() || !formData.authorName.trim() || !formData.firstChapter.trim() || !formData.contactEmail.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.contactEmail.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/submit-newsletter-request", formData);
      setIsSubmitted(true);
    } catch (err: any) {
      const msg = err?.message || "Something went wrong. Please try again.";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Request Submitted - First Chapter Friday" description="Your newsletter feature request has been submitted." />
        <Navigation />
        <main className="flex-1 py-12 lg:py-16">
          <div className="container px-4 mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <Card className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold" data-testid="text-newsletter-submission-success">
                    Your newsletter feature request has been submitted!
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    We'll review your first chapter and be in touch about featuring it in First Chapter Friday.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        bookTitle: "",
                        authorName: "",
                        firstChapter: "",
                        contactEmail: "",
                      });
                    }}
                    data-testid="button-submit-another-newsletter"
                  >
                    Submit Another Request
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="First Chapter Friday - Newsletter Feature Request" description="Submit your first chapter to be featured in our First Chapter Friday newsletter." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Newspaper className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
              First Chapter Friday
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Submit your book's first chapter to be featured in our newsletter. Share your opening pages with our readers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Author Name *</Label>
                    <Input
                      id="authorName"
                      placeholder="Your full name"
                      value={formData.authorName}
                      onChange={e => handleChange("authorName", e.target.value)}
                      required
                      data-testid="input-nl-author-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bookTitle">Book Title *</Label>
                    <Input
                      id="bookTitle"
                      placeholder="Your book's title"
                      value={formData.bookTitle}
                      onChange={e => handleChange("bookTitle", e.target.value)}
                      required
                      data-testid="input-nl-book-title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firstChapter">First Chapter *</Label>
                  <Textarea
                    id="firstChapter"
                    placeholder="Paste your first chapter text here..."
                    value={formData.firstChapter}
                    onChange={e => handleChange("firstChapter", e.target.value)}
                    rows={12}
                    required
                    data-testid="input-nl-first-chapter"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email *</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.contactEmail}
                    onChange={e => handleChange("contactEmail", e.target.value)}
                    required
                    data-testid="input-nl-contact-email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-submit-newsletter-request"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit for Feature
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
