import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { BookOpen, Send, CheckCircle, Info, ArrowRight, User, BookText, Link2 } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const GENRE_OPTIONS = [
  "Romance",
  "Fantasy",
  "Sci-Fi",
  "Thriller",
  "Mystery",
  "Horror",
  "Contemporary Fiction",
  "Historical Fiction",
  "Literary Fiction",
  "Young Adult",
  "New Adult",
  "Paranormal",
  "Dystopian",
  "Memoir",
  "Self-Help",
  "Non-Fiction",
  "Poetry",
  "Other",
];

function SubmissionProgress({ formData }: { formData: Record<string, string> }) {
  const requiredFields = ["authorName", "bookTitle", "genre", "blurb", "contactEmail"];
  const optionalFields = ["penName", "tropes", "releaseDate", "amazonLink", "goodreadsLink"];
  const filledRequired = requiredFields.filter(f => formData[f]?.trim()).length;
  const filledOptional = optionalFields.filter(f => formData[f]?.trim()).length;
  const totalFilled = filledRequired + filledOptional;
  const totalFields = requiredFields.length + optionalFields.length;
  const percent = Math.round((totalFilled / totalFields) * 100);

  return (
    <div className="mb-6" data-testid="submission-progress">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>{filledRequired}/{requiredFields.length} required fields complete</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full transition-colors ${filledRequired === requiredFields.length ? "bg-green-500" : "bg-primary"}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {filledRequired === requiredFields.length && (
        <p className="text-xs text-green-600 dark:text-green-400 mt-1">All required fields filled — ready to submit!</p>
      )}
    </div>
  );
}

export default function AuthorSubmission() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    authorName: "",
    penName: "",
    bookTitle: "",
    genre: "",
    blurb: "",
    tropes: "",
    releaseDate: "",
    amazonLink: "",
    goodreadsLink: "",
    contactEmail: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.authorName.trim() || !formData.bookTitle.trim() || !formData.genre.trim() || !formData.blurb.trim() || !formData.contactEmail.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in author name, book title, genre, blurb, and contact email.",
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
      await apiRequest("POST", "/api/submit-book", formData);
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
        <SEOHead title="Book Submitted - Author Submission" description="Your book has been submitted to Book Slump Rescue." />
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
                  <h2 className="text-2xl font-bold" data-testid="text-submission-success">
                    Thank you, your book has been submitted!
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    We'll review your submission and be in touch. Keep writing amazing stories!
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({
                          authorName: "",
                          penName: "",
                          bookTitle: "",
                          genre: "",
                          blurb: "",
                          tropes: "",
                          releaseDate: "",
                          amazonLink: "",
                          goodreadsLink: "",
                          contactEmail: "",
                        });
                      }}
                      data-testid="button-submit-another"
                    >
                      Submit Another Book
                    </Button>
                    <Link href="/author-login">
                      <Button variant="default" data-testid="button-goto-portal">
                        Explore Author Portal <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
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
      <SEOHead title="Submit Your Book - Author Submission" description="Submit your book to be featured on Book Slump Rescue. Authors can share their titles for recommendation to our readers." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Author Book Submission
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Share your book with our readers. Fill out the form below and we'll review your submission.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-sm text-blue-700 dark:text-blue-300" data-testid="author-portal-callout">
              <Info className="w-4 h-4 shrink-0" />
              <span>Want to manage your own books and ARCs?{" "}
                <Link href="/author-login" className="font-medium underline underline-offset-2">
                  Join the Author Portal <ArrowRight className="w-3 h-3 inline" />
                </Link>
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <SubmissionProgress formData={formData} />
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                    <User className="w-4 h-4" />
                    <span>About You</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="authorName">Author Name *</Label>
                      <Input
                        id="authorName"
                        placeholder="Your full name"
                        value={formData.authorName}
                        onChange={e => handleChange("authorName", e.target.value)}
                        required
                        data-testid="input-author-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="penName">Pen Name</Label>
                      <Input
                        id="penName"
                        placeholder="If different from your name"
                        value={formData.penName}
                        onChange={e => handleChange("penName", e.target.value)}
                        data-testid="input-pen-name"
                      />
                      <p className="text-xs text-muted-foreground">Optional — leave blank to use your author name</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="contactEmail">Contact Email *</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.contactEmail}
                      onChange={e => handleChange("contactEmail", e.target.value)}
                      required
                      data-testid="input-contact-email"
                    />
                    <p className="text-xs text-muted-foreground">We'll only use this to follow up on your submission</p>
                  </div>
                </div>

                <hr className="border-border/50" />

                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                    <BookText className="w-4 h-4" />
                    <span>About Your Book</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bookTitle">Book Title *</Label>
                      <Input
                        id="bookTitle"
                        placeholder="Your book's title"
                        value={formData.bookTitle}
                        onChange={e => handleChange("bookTitle", e.target.value)}
                        required
                        data-testid="input-book-title"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="genre">Genre *</Label>
                        <Select
                          value={formData.genre}
                          onValueChange={value => handleChange("genre", value)}
                        >
                          <SelectTrigger data-testid="select-genre">
                            <SelectValue placeholder="Select a genre" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENRE_OPTIONS.map(genre => (
                              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="releaseDate">Release Date</Label>
                        <Input
                          id="releaseDate"
                          type="date"
                          value={formData.releaseDate}
                          onChange={e => handleChange("releaseDate", e.target.value)}
                          data-testid="input-release-date"
                        />
                        <p className="text-xs text-muted-foreground">Published or upcoming</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blurb">Book Blurb *</Label>
                      <Textarea
                        id="blurb"
                        placeholder="Write a brief, compelling description — think back cover copy. What's the hook?"
                        value={formData.blurb}
                        onChange={e => handleChange("blurb", e.target.value)}
                        rows={4}
                        required
                        data-testid="input-blurb"
                      />
                      <p className="text-xs text-muted-foreground">{formData.blurb.length}/500 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tropes">Tropes</Label>
                      <Input
                        id="tropes"
                        placeholder="e.g., enemies-to-lovers, found family, slow burn"
                        value={formData.tropes}
                        onChange={e => handleChange("tropes", e.target.value)}
                        data-testid="input-tropes"
                      />
                      <p className="text-xs text-muted-foreground">Separate with commas — helps readers find your book</p>
                    </div>
                  </div>
                </div>

                <hr className="border-border/50" />

                <div>
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-primary">
                    <Link2 className="w-4 h-4" />
                    <span>Links (Optional)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amazonLink">Amazon Link</Label>
                      <Input
                        id="amazonLink"
                        type="url"
                        placeholder="https://amazon.com/..."
                        value={formData.amazonLink}
                        onChange={e => handleChange("amazonLink", e.target.value)}
                        data-testid="input-amazon-link"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="goodreadsLink">Goodreads Link</Label>
                      <Input
                        id="goodreadsLink"
                        type="url"
                        placeholder="https://goodreads.com/..."
                        value={formData.goodreadsLink}
                        onChange={e => handleChange("goodreadsLink", e.target.value)}
                        data-testid="input-goodreads-link"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Adding purchase links helps readers find your book faster</p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-submit-book"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Book for Review
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
