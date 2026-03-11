import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Mic, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

const TIMEZONES = [
  "US/Eastern", "US/Central", "US/Mountain", "US/Pacific",
  "US/Alaska", "US/Hawaii", "Canada/Atlantic", "Europe/London",
  "Europe/Paris", "Europe/Berlin", "Asia/Tokyo", "Asia/Shanghai",
  "Australia/Sydney", "Pacific/Auckland", "Other",
];

const INTERVIEW_FORMATS = [
  { value: "pre_recorded_video", label: "Pre-recorded Video" },
  { value: "live_video", label: "Live Video" },
  { value: "written_qa", label: "Written Q&A" },
  { value: "podcast_audio", label: "Podcast-style Audio" },
];

const TOPIC_PROMPTS = [
  "Writing Process", "Tropes & Themes", "Character Deep Dive",
  "Worldbuilding", "Publishing Journey", "ARC/Review Team",
  "Upcoming Releases",
];

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function InterviewRequest() {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    authorName: "", penName: "", email: "", timezone: "", website: "", socialLinks: "",
    bookTitle: "", genres: "", releaseDate: "", shortBlurb: "",
    buyLinks: "", mediaKitLink: "", authorPhotoUrl: "", bookCoverUrl: "",
    interviewFormats: [] as string[],
    preferredLength: 30,
    topicPrompts: [] as string[],
    topicOther: "",
    featuredLinks: "",
    preferredDays: [] as string[],
    preferredTimeStart: "", preferredTimeEnd: "", earliestDate: "", schedulingNotes: "",
    ownershipConfirmed: false, consentConfirmed: false, affiliateConsent: false, contactConsent: false,
  });

  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        genres: form.genres ? form.genres.split(",").map(g => g.trim()).filter(Boolean) : [],
        penName: form.penName || null,
        website: form.website || null,
        socialLinks: form.socialLinks || null,
        buyLinks: form.buyLinks || null,
        mediaKitLink: form.mediaKitLink || null,
        authorPhotoUrl: form.authorPhotoUrl || null,
        bookCoverUrl: form.bookCoverUrl || null,
        releaseDate: form.releaseDate || null,
        topicOther: form.topicOther || null,
        featuredLinks: form.featuredLinks || null,
        preferredTimeStart: form.preferredTimeStart || null,
        preferredTimeEnd: form.preferredTimeEnd || null,
        earliestDate: form.earliestDate || null,
        schedulingNotes: form.schedulingNotes || null,
      };
      return apiRequest("POST", "/api/interview-requests", payload);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Request submitted!", description: "We'll review your submission and get back to you." });
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err?.message || "Check your form and try again.", variant: "destructive" });
    },
  });

  const canSubmit = form.authorName && form.email && form.timezone && form.bookTitle && form.genres &&
    form.shortBlurb && form.interviewFormats.length > 0 &&
    form.ownershipConfirmed && form.consentConfirmed && form.contactConsent;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Interview Request Submitted" description="Your interview request has been submitted." />
        <Navigation />
        <div className="container mx-auto px-4 py-16 max-w-lg text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-request-submitted">Request Submitted!</h1>
          <p className="text-muted-foreground mb-6">
            Thank you! Our team will review your interview request and reach out via email.
          </p>
          <Link href="/">
            <Button data-testid="link-back-home">Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Request an Author Interview" description="Submit a request for an author interview on Book Slump Rescue." />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" data-testid="link-back">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-interview-request-title">
              <Mic className="w-6 h-6" />
              Request an Author Interview
            </h1>
            <p className="text-sm text-muted-foreground">
              Submit your request for a video, live, written, or podcast-style interview
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Author Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Author Name *</Label>
                  <Input value={form.authorName} onChange={e => setForm({ ...form, authorName: e.target.value })} data-testid="input-author-name" />
                </div>
                <div className="space-y-2">
                  <Label>Pen Name</Label>
                  <Input value={form.penName} onChange={e => setForm({ ...form, penName: e.target.value })} data-testid="input-pen-name" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="input-email" />
                </div>
                <div className="space-y-2">
                  <Label>Timezone *</Label>
                  <Select value={form.timezone} onValueChange={v => setForm({ ...form, timezone: v })}>
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." data-testid="input-website" />
                </div>
                <div className="space-y-2">
                  <Label>Social Links</Label>
                  <Input value={form.socialLinks} onChange={e => setForm({ ...form, socialLinks: e.target.value })} placeholder="TikTok, Instagram, etc." data-testid="input-social-links" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Book / Brand Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Book Title *</Label>
                  <Input value={form.bookTitle} onChange={e => setForm({ ...form, bookTitle: e.target.value })} data-testid="input-book-title" />
                </div>
                <div className="space-y-2">
                  <Label>Genre(s) * (comma-separated)</Label>
                  <Input value={form.genres} onChange={e => setForm({ ...form, genres: e.target.value })} placeholder="Romance, Fantasy" data-testid="input-genres" />
                </div>
                <div className="space-y-2">
                  <Label>Release Date</Label>
                  <Input type="date" value={form.releaseDate} onChange={e => setForm({ ...form, releaseDate: e.target.value })} data-testid="input-release-date" />
                </div>
                <div className="space-y-2">
                  <Label>Buy Links</Label>
                  <Input value={form.buyLinks} onChange={e => setForm({ ...form, buyLinks: e.target.value })} data-testid="input-buy-links" />
                </div>
                <div className="space-y-2">
                  <Label>Media Kit Link</Label>
                  <Input value={form.mediaKitLink} onChange={e => setForm({ ...form, mediaKitLink: e.target.value })} data-testid="input-media-kit" />
                </div>
                <div className="space-y-2">
                  <Label>Author Photo URL</Label>
                  <Input value={form.authorPhotoUrl} onChange={e => setForm({ ...form, authorPhotoUrl: e.target.value })} data-testid="input-author-photo" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Book Cover URL</Label>
                  <Input value={form.bookCoverUrl} onChange={e => setForm({ ...form, bookCoverUrl: e.target.value })} data-testid="input-book-cover" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Short Blurb *</Label>
                <Textarea value={form.shortBlurb} onChange={e => setForm({ ...form, shortBlurb: e.target.value })} rows={3} placeholder="Brief description of your book..." data-testid="input-short-blurb" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interview Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Interview Format * (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVIEW_FORMATS.map(f => (
                    <div key={f.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`format-${f.value}`}
                        checked={form.interviewFormats.includes(f.value)}
                        onCheckedChange={() => setForm({ ...form, interviewFormats: toggleArray(form.interviewFormats, f.value) })}
                        data-testid={`checkbox-format-${f.value}`}
                      />
                      <Label htmlFor={`format-${f.value}`} className="text-sm cursor-pointer">{f.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Length</Label>
                <Select value={String(form.preferredLength)} onValueChange={v => setForm({ ...form, preferredLength: parseInt(v) })}>
                  <SelectTrigger data-testid="select-length">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic Prompts (select all that interest you)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TOPIC_PROMPTS.map(t => (
                    <div key={t} className="flex items-center gap-2">
                      <Checkbox
                        id={`topic-${t}`}
                        checked={form.topicPrompts.includes(t)}
                        onCheckedChange={() => setForm({ ...form, topicPrompts: toggleArray(form.topicPrompts, t) })}
                        data-testid={`checkbox-topic-${t.toLowerCase().replace(/[^a-z]/g, "-")}`}
                      />
                      <Label htmlFor={`topic-${t}`} className="text-sm cursor-pointer">{t}</Label>
                    </div>
                  ))}
                </div>
                <Input
                  placeholder="Other topics..."
                  value={form.topicOther}
                  onChange={e => setForm({ ...form, topicOther: e.target.value })}
                  className="mt-2"
                  data-testid="input-topic-other"
                />
              </div>

              <div className="space-y-2">
                <Label>Links to Feature During Interview</Label>
                <Input value={form.featuredLinks} onChange={e => setForm({ ...form, featuredLinks: e.target.value })} placeholder="Any links you'd like featured" data-testid="input-featured-links" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scheduling</CardTitle>
              <CardDescription>Simple availability — no calendar integration needed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred Days (pick up to 3)</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        if (form.preferredDays.includes(d) || form.preferredDays.length < 3) {
                          setForm({ ...form, preferredDays: toggleArray(form.preferredDays, d) });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                        form.preferredDays.includes(d)
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                      }`}
                      data-testid={`day-${d.toLowerCase()}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Time Start</Label>
                  <Input type="time" value={form.preferredTimeStart} onChange={e => setForm({ ...form, preferredTimeStart: e.target.value })} data-testid="input-time-start" />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time End</Label>
                  <Input type="time" value={form.preferredTimeEnd} onChange={e => setForm({ ...form, preferredTimeEnd: e.target.value })} data-testid="input-time-end" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Earliest Date Available</Label>
                <Input type="date" value={form.earliestDate} onChange={e => setForm({ ...form, earliestDate: e.target.value })} data-testid="input-earliest-date" />
              </div>

              <div className="space-y-2">
                <Label>Scheduling Notes</Label>
                <Textarea value={form.schedulingNotes} onChange={e => setForm({ ...form, schedulingNotes: e.target.value })} rows={2} placeholder="Any additional scheduling info..." data-testid="input-scheduling-notes" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Disclosures & Consent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox id="ownership" checked={form.ownershipConfirmed} onCheckedChange={v => setForm({ ...form, ownershipConfirmed: v === true })} data-testid="checkbox-ownership" />
                <Label htmlFor="ownership" className="text-sm leading-relaxed cursor-pointer">
                  I confirm I own the rights to all submitted materials (images, text). *
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="consent" checked={form.consentConfirmed} onCheckedChange={v => setForm({ ...form, consentConfirmed: v === true })} data-testid="checkbox-consent" />
                <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                  I consent to BSR featuring my name, book, and links in interview content. *
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="affiliate" checked={form.affiliateConsent} onCheckedChange={v => setForm({ ...form, affiliateConsent: v === true })} data-testid="checkbox-affiliate" />
                <Label htmlFor="affiliate" className="text-sm leading-relaxed cursor-pointer">
                  I understand BSR may include affiliate links and may earn a commission at no extra cost to readers.
                </Label>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox id="contact" checked={form.contactConsent} onCheckedChange={v => setForm({ ...form, contactConsent: v === true })} data-testid="checkbox-contact" />
                <Label htmlFor="contact" className="text-sm leading-relaxed cursor-pointer">
                  I agree to be contacted at the email provided. *
                </Label>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full"
            onClick={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}
            data-testid="button-submit-request"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            Submit Interview Request
          </Button>
        </div>
      </div>
    </div>
  );
}
