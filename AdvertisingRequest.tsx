import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Megaphone, Send, CheckCircle, Star } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const AD_TYPE_OPTIONS = [
  { value: "homepage", label: "Homepage Placement" },
  { value: "spotlight", label: "Spotlight Feature" },
  { value: "featured", label: "Featured Pick" },
];

const GENRE_OPTIONS = [
  "Romance", "Dark Romance", "Fantasy", "Sci-Fi", "Mystery/Thriller",
  "Horror", "Literary Fiction", "Historical Fiction", "Young Adult",
  "New Adult", "Contemporary", "Paranormal", "Suspense", "Nonfiction", "Other",
];

export default function AdvertisingRequest() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    authorName: "",
    bookTitle: "",
    genre: "",
    adType: "",
    featuredPlacement: false,
    startDate: "",
    endDate: "",
    notes: "",
    contactEmail: "",
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.authorName.trim() || !formData.bookTitle.trim() || !formData.genre || !formData.adType || !formData.startDate || !formData.endDate || !formData.contactEmail.trim()) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
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

    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/submit-ad-request", formData);
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
        <SEOHead title="Request Submitted - Advertising" description="Your advertising request has been submitted." />
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
                  <h2 className="text-2xl font-bold" data-testid="text-ad-submission-success">
                    Your advertising request has been submitted!
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    We'll review your request and get back to you with pricing and availability details.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        authorName: "",
                        bookTitle: "",
                        genre: "",
                        adType: "",
                        featuredPlacement: false,
                        startDate: "",
                        endDate: "",
                        notes: "",
                        contactEmail: "",
                      });
                    }}
                    data-testid="button-submit-another-ad"
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
      <SEOHead title="Request Advertising - Paid Promo" description="Request a paid promotional slot on Book Slump Rescue for your book." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Megaphone className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
              Advertising Request
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Promote your book to our readers with a paid advertising slot. Fill out the form and we'll get back to you.
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
                      data-testid="input-ad-author-name"
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
                      data-testid="input-ad-book-title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genre">Genre *</Label>
                  <Select
                    value={formData.genre}
                    onValueChange={value => handleChange("genre", value)}
                  >
                    <SelectTrigger data-testid="select-ad-genre">
                      <SelectValue placeholder="Select your book's genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRE_OPTIONS.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adType">Ad Type *</Label>
                  <Select
                    value={formData.adType}
                    onValueChange={value => handleChange("adType", value)}
                  >
                    <SelectTrigger data-testid="select-ad-type">
                      <SelectValue placeholder="Select ad placement type" />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 rounded-md border p-4">
                  <Checkbox
                    id="featuredPlacement"
                    checked={formData.featuredPlacement}
                    onCheckedChange={(checked) => handleChange("featuredPlacement", !!checked)}
                    data-testid="checkbox-featured-placement"
                  />
                  <div className="flex-1">
                    <Label htmlFor="featuredPlacement" className="flex items-center gap-1.5 cursor-pointer">
                      <Star className="w-4 h-4 text-yellow-500" />
                      Request Featured Placement
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Premium placement with extra visibility. Additional fees may apply.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={e => handleChange("startDate", e.target.value)}
                      required
                      data-testid="input-ad-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={e => handleChange("endDate", e.target.value)}
                      required
                      data-testid="input-ad-end-date"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional details about your advertising needs"
                    value={formData.notes}
                    onChange={e => handleChange("notes", e.target.value)}
                    rows={3}
                    data-testid="input-ad-notes"
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
                    data-testid="input-ad-contact-email"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  data-testid="button-submit-ad-request"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">Submitting...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Submit Advertising Request
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
