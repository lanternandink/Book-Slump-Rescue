import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { ShieldCheck, Check, X, Loader2, ExternalLink, Newspaper, AlertTriangle, DollarSign } from "lucide-react";

interface NewsletterRequest {
  id: string;
  bookTitle: string;
  authorName: string;
  firstChapter: string;
  contactEmail: string;
  status: string;
  timestamp: string;
  stripeLink?: string;
  paymentAmount?: number;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  "approved-pending-payment": "outline",
  paid: "default",
  declined: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending Review",
  "approved-pending-payment": "Awaiting Payment",
  paid: "Paid",
  declined: "Declined",
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const isTestMode = import.meta.env.MODE !== "production";

export default function AdminNewsletters() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();

  const { data: requests = [], isLoading } = useQuery<NewsletterRequest[]>({
    queryKey: ["/api/admin/newsletter-requests"],
    enabled: isAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/approve-newsletter-request/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({
        title: "Request approved",
        description: "Stripe payment link has been generated.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to approve request.", variant: "destructive" });
    },
  });

  const declineMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/decline-newsletter-request/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/newsletter-requests"] });
      toast({ title: "Request declined" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to decline request.", variant: "destructive" });
    },
  });

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
      <SEOHead title="Newsletter Requests - Admin" description="Manage First Chapter Friday newsletter feature requests." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-5xl">
          {isTestMode && (
            <div className="mb-6 flex items-center gap-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-4 py-3" data-testid="banner-test-mode">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">TEST MODE — Using Stripe test keys. No real charges will be made.</span>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-newsletters-title">
              Newsletter Feature Requests
            </h1>
            <p className="text-muted-foreground text-lg">
              Review and manage First Chapter Friday newsletter submissions from authors.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <Card className="p-8 text-center">
              <Newspaper className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg" data-testid="text-no-newsletter-requests">No newsletter feature requests yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-5" data-testid={`card-newsletter-request-${req.id}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold truncate" data-testid={`text-nl-book-title-${req.id}`}>
                              {req.bookTitle}
                            </h3>
                            <Badge variant={STATUS_VARIANT[req.status] || "outline"} data-testid={`badge-nl-status-${req.id}`}>
                              {STATUS_LABEL[req.status] || req.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground" data-testid={`text-nl-author-${req.id}`}>
                            by <span className="font-medium">{req.authorName}</span>
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono">
                          <DollarSign className="w-3 h-3 mr-0.5" />
                          {formatAmount(req.paymentAmount || 1500)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span data-testid={`text-nl-email-${req.id}`}>{req.contactEmail}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted: </span>
                          <span data-testid={`text-nl-date-${req.id}`}>{new Date(req.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="text-sm">
                        <p className="text-muted-foreground mb-1 font-medium">First Chapter Preview:</p>
                        <p className="text-sm line-clamp-4 whitespace-pre-wrap">
                          {req.firstChapter}
                        </p>
                      </div>

                      {req.stripeLink && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground font-medium">Payment Link:</span>
                          <a href={req.stripeLink} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-xs" data-testid={`link-nl-stripe-${req.id}`}>
                            <ExternalLink className="w-3 h-3 inline mr-1" />
                            {req.stripeLink}
                          </a>
                        </div>
                      )}

                      {req.status === "pending" && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending || declineMutation.isPending}
                            data-testid={`button-nl-approve-${req.id}`}
                          >
                            {approveMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4 mr-1" />
                            )}
                            Approve & Generate Link
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => declineMutation.mutate(req.id)}
                            disabled={approveMutation.isPending || declineMutation.isPending}
                            data-testid={`button-nl-decline-${req.id}`}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
