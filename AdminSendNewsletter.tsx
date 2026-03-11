import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { ShieldCheck, Send, Loader2, Mail, Users, AlertTriangle } from "lucide-react";

interface Subscriber {
  id: string;
  name: string;
  email: string;
  subscriptions: string[];
  joinedAt: string;
}

const NEWSLETTER_TYPE_OPTIONS = [
  { value: "Community Corner", label: "Community Corner (Tuesdays)" },
  { value: "First Chapter Friday", label: "First Chapter Friday (Fridays)" },
];

export default function AdminSendNewsletter() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const [newsletterType, setNewsletterType] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/admin/subscribers"],
    enabled: isAdmin,
  });

  const recipientCount = newsletterType
    ? subscribers.filter(s => s.subscriptions.includes(newsletterType)).length
    : 0;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/send-newsletter", {
        newsletterType,
        subject,
        content,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Newsletter sent",
        description: data.message,
      });
      setSubject("");
      setContent("");
    },
    onError: (err: any) => {
      toast({
        title: "Send failed",
        description: err?.message || "Failed to send newsletter.",
        variant: "destructive",
      });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterType || !subject.trim() || !content.trim()) {
      toast({
        title: "Missing fields",
        description: "Please select a newsletter type, enter a subject, and write your content.",
        variant: "destructive",
      });
      return;
    }
    sendMutation.mutate();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Access Denied" description="Admin access only." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-access-denied">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page. This area is restricted to administrators only.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Send Newsletter - Admin" description="Admin page for sending newsletters." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-send-newsletter-title">
              Send Newsletter
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Compose and send newsletters to your subscribers.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-total-subscribers">{subscribers.length}</p>
              <p className="text-xs text-muted-foreground">Total Subscribers</p>
            </Card>
            <Card className="p-4 text-center">
              <Mail className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-cc-count">
                {subscribers.filter(s => s.subscriptions.includes("Community Corner")).length}
              </p>
              <p className="text-xs text-muted-foreground">Community Corner</p>
            </Card>
            <Card className="p-4 text-center">
              <Mail className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold" data-testid="text-fcf-count">
                {subscribers.filter(s => s.subscriptions.includes("First Chapter Friday")).length}
              </p>
              <p className="text-xs text-muted-foreground">First Chapter Friday</p>
            </Card>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <form onSubmit={handleSend} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newsletterType">Newsletter Type *</Label>
                  <Select value={newsletterType} onValueChange={setNewsletterType}>
                    <SelectTrigger data-testid="select-newsletter-type">
                      <SelectValue placeholder="Select newsletter to send" />
                    </SelectTrigger>
                    <SelectContent>
                      {NEWSLETTER_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {newsletterType && (
                    <p className="text-sm text-muted-foreground" data-testid="text-recipient-count">
                      This will be sent to <span className="font-medium">{recipientCount}</span> subscriber{recipientCount !== 1 ? "s" : ""}.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Newsletter subject line"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                    data-testid="input-nl-subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    placeholder="Write your newsletter content here..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={10}
                    required
                    data-testid="input-nl-content"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendMutation.isPending}
                  data-testid="button-send-newsletter"
                >
                  {sendMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Newsletter
                    </span>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>

          {subscribers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <h2 className="text-xl font-semibold mb-4">Subscriber List</h2>
              <Card className="divide-y">
                {subscribers.map(sub => (
                  <div key={sub.id} className="flex flex-wrap items-center justify-between gap-3 p-4" data-testid={`row-subscriber-${sub.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" data-testid={`text-sub-name-${sub.id}`}>{sub.name}</p>
                      <p className="text-sm text-muted-foreground truncate" data-testid={`text-sub-email-${sub.id}`}>{sub.email}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sub.subscriptions.map(s => (
                        <Badge key={s} variant="secondary" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`text-sub-date-${sub.id}`}>
                      {new Date(sub.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
