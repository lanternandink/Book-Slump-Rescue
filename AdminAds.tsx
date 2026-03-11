import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { ShieldCheck, Check, X, Loader2, ExternalLink, Megaphone, AlertTriangle, DollarSign, Pencil, Save, Calendar, Link2, StickyNote, Star, ArrowRight } from "lucide-react";

interface AdRequest {
  id: string;
  authorName: string;
  bookTitle: string;
  genre?: string;
  adType: string;
  featuredPlacement?: boolean;
  startDate: string;
  endDate: string;
  notes: string;
  contactEmail: string;
  status: string;
  timestamp: string;
  stripeLink?: string;
  paymentAmount?: number;
  amazonAffiliateUrl?: string | null;
  adminNotes?: string | null;
  scheduledStartDate?: string | null;
  scheduledEndDate?: string | null;
}

const AD_TYPE_LABELS: Record<string, string> = {
  homepage: "Homepage Placement",
  spotlight: "Spotlight Feature",
  featured: "Featured Pick",
};

const AD_PRICING: Record<string, number> = {
  homepage: 5000,
  spotlight: 3000,
  featured: 2500,
};

const AD_STATUSES = ["new", "reviewing", "needs-info", "approved", "approved-pending-payment", "paid", "scheduled", "live", "ended", "declined"] as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  new: "secondary",
  reviewing: "outline",
  "needs-info": "outline",
  approved: "default",
  scheduled: "default",
  live: "default",
  ended: "secondary",
  declined: "destructive",
  pending: "secondary",
  "approved-pending-payment": "outline",
  paid: "default",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  "needs-info": "Needs Info",
  approved: "Approved",
  scheduled: "Scheduled",
  live: "Live",
  ended: "Ended",
  declined: "Declined",
  pending: "Pending",
  "approved-pending-payment": "Awaiting Payment",
  paid: "Paid",
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const isTestMode = import.meta.env.MODE !== "production";

export default function AdminAds() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: adRequests = [], isLoading } = useQuery<AdRequest[]>({
    queryKey: ["/api/admin/ad-requests"],
    enabled: isAdmin,
  });

  const filteredRequests = activeTab === "all"
    ? adRequests
    : adRequests.filter((r) => r.status === activeTab);

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/approve-ad-request/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-requests"] });
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
      await apiRequest("POST", `/api/decline-ad-request/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-requests"] });
      toast({ title: "Request declined" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to decline request.", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("POST", `/api/admin/ad-requests/${id}/status`, { status });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard-stats"] });
      toast({ title: "Status updated", description: data.message });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/admin/ad-requests/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ad-requests"] });
      toast({ title: "Ad request updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update ad request.", variant: "destructive" });
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    amazonAffiliateUrl: "",
    adminNotes: "",
    scheduledStartDate: "",
    scheduledEndDate: "",
  });

  function startEditing(req: AdRequest) {
    setEditingId(req.id);
    setEditForm({
      amazonAffiliateUrl: req.amazonAffiliateUrl || "",
      adminNotes: req.adminNotes || "",
      scheduledStartDate: req.scheduledStartDate || "",
      scheduledEndDate: req.scheduledEndDate || "",
    });
  }

  function saveEditing(id: string) {
    updateMutation.mutate({
      id,
      data: {
        amazonAffiliateUrl: editForm.amazonAffiliateUrl || null,
        adminNotes: editForm.adminNotes || null,
        scheduledStartDate: editForm.scheduledStartDate || null,
        scheduledEndDate: editForm.scheduledEndDate || null,
      },
    });
    setEditingId(null);
  }

  const statusCounts = adRequests.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

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
      <SEOHead title="Ad Requests - Admin" description="Manage advertising requests." />
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
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-ads-title">
              Advertising Requests
            </h1>
            <p className="text-muted-foreground text-lg">
              Review and manage paid advertising requests from authors.
            </p>
          </motion.div>

          <div className="flex flex-wrap gap-2 mb-6" data-testid="status-filter-tabs">
            <Button
              size="sm"
              variant={activeTab === "all" ? "default" : "outline"}
              onClick={() => setActiveTab("all")}
              data-testid="tab-all"
            >
              All ({adRequests.length})
            </Button>
            {AD_STATUSES.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={activeTab === s ? "default" : "outline"}
                onClick={() => setActiveTab(s)}
                data-testid={`tab-${s}`}
              >
                {STATUS_LABEL[s]} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Megaphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg" data-testid="text-no-ad-requests">
                {activeTab === "all" ? "No advertising requests yet." : `No "${STATUS_LABEL[activeTab] || activeTab}" requests.`}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-5" data-testid={`card-ad-request-${req.id}`}>
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold truncate" data-testid={`text-ad-book-title-${req.id}`}>
                              {req.bookTitle}
                            </h3>
                            {req.featuredPlacement && (
                              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" data-testid={`icon-featured-${req.id}`} />
                            )}
                            <Badge variant={STATUS_VARIANT[req.status] || "outline"} data-testid={`badge-ad-status-${req.id}`}>
                              {STATUS_LABEL[req.status] || req.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            by <span className="font-medium">{req.authorName}</span>
                            {req.genre && <> — <span className="italic">{req.genre}</span></>}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{AD_TYPE_LABELS[req.adType] || req.adType}</Badge>
                          <Badge variant="outline" className="font-mono">
                            <DollarSign className="w-3 h-3 mr-0.5" />
                            {formatAmount(req.paymentAmount || AD_PRICING[req.adType] || 2500)}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Requested: </span>
                          <span>{req.startDate} to {req.endDate}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Email: </span>
                          <span>{req.contactEmail}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Submitted: </span>
                          <span>{new Date(req.timestamp).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {req.notes && (
                        <p className="text-sm text-muted-foreground italic">
                          {req.notes}
                        </p>
                      )}

                      {req.stripeLink && (
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="text-muted-foreground font-medium">Payment Link:</span>
                          <a href={req.stripeLink} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-xs" data-testid={`link-stripe-${req.id}`}>
                            <ExternalLink className="w-3 h-3 inline mr-1" />
                            {req.stripeLink}
                          </a>
                        </div>
                      )}

                      {editingId === req.id ? (
                        <div className="border-t pt-3 mt-1 space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Scheduling</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`scheduled-start-${req.id}`} className="text-xs mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Scheduled Start
                              </Label>
                              <Input
                                id={`scheduled-start-${req.id}`}
                                type="date"
                                value={editForm.scheduledStartDate}
                                onChange={(e) => setEditForm({ ...editForm, scheduledStartDate: e.target.value })}
                                data-testid={`input-scheduled-start-${req.id}`}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`scheduled-end-${req.id}`} className="text-xs mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Scheduled End
                              </Label>
                              <Input
                                id={`scheduled-end-${req.id}`}
                                type="date"
                                value={editForm.scheduledEndDate}
                                onChange={(e) => setEditForm({ ...editForm, scheduledEndDate: e.target.value })}
                                data-testid={`input-scheduled-end-${req.id}`}
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor={`affiliate-url-${req.id}`} className="text-xs mb-1 flex items-center gap-1">
                              <Link2 className="w-3 h-3" /> Amazon Affiliate URL
                            </Label>
                            <Input
                              id={`affiliate-url-${req.id}`}
                              type="url"
                              placeholder="https://amazon.com/..."
                              value={editForm.amazonAffiliateUrl}
                              onChange={(e) => setEditForm({ ...editForm, amazonAffiliateUrl: e.target.value })}
                              data-testid={`input-affiliate-url-${req.id}`}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`admin-notes-${req.id}`} className="text-xs mb-1 flex items-center gap-1">
                              <StickyNote className="w-3 h-3" /> Admin Notes
                            </Label>
                            <Textarea
                              id={`admin-notes-${req.id}`}
                              placeholder="Internal notes about this ad..."
                              rows={2}
                              value={editForm.adminNotes}
                              onChange={(e) => setEditForm({ ...editForm, adminNotes: e.target.value })}
                              data-testid={`input-admin-notes-${req.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => saveEditing(req.id)} disabled={updateMutation.isPending} data-testid={`button-save-admin-${req.id}`}>
                              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} data-testid={`button-cancel-edit-${req.id}`}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {(req.scheduledStartDate || req.scheduledEndDate || req.amazonAffiliateUrl || req.adminNotes) && (
                            <div className="border-t pt-3 mt-1 space-y-1.5 text-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin Details</p>
                              {(req.scheduledStartDate || req.scheduledEndDate) && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-muted-foreground">Scheduled:</span>
                                  <span data-testid={`text-scheduled-dates-${req.id}`}>
                                    {req.scheduledStartDate || "—"} to {req.scheduledEndDate || "—"}
                                  </span>
                                </div>
                              )}
                              {req.amazonAffiliateUrl && (
                                <div className="flex items-center gap-1.5">
                                  <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  <a href={req.amazonAffiliateUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-sm" data-testid={`link-affiliate-${req.id}`}>
                                    {req.amazonAffiliateUrl}
                                  </a>
                                </div>
                              )}
                              {req.adminNotes && (
                                <div className="flex items-start gap-1.5">
                                  <StickyNote className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                                  <span className="italic text-muted-foreground" data-testid={`text-admin-notes-${req.id}`}>{req.adminNotes}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t mt-1">
                        {(req.status === "new" || req.status === "pending" || req.status === "reviewing" || req.status === "approved") && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(req.id)}
                              disabled={approveMutation.isPending || declineMutation.isPending}
                              data-testid={`button-approve-${req.id}`}
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
                              data-testid={`button-decline-${req.id}`}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}

                        <div className="flex items-center gap-1.5 ml-auto">
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                          <Select
                            value=""
                            onValueChange={(val) => statusMutation.mutate({ id: req.id, status: val })}
                          >
                            <SelectTrigger className="h-8 w-[150px] text-xs" data-testid={`select-status-${req.id}`}>
                              <SelectValue placeholder="Move to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {AD_STATUSES.filter((s) => s !== req.status).map((s) => (
                                <SelectItem key={s} value={s} data-testid={`option-status-${s}-${req.id}`}>
                                  {STATUS_LABEL[s]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {editingId !== req.id && (
                          <Button size="sm" variant="outline" onClick={() => startEditing(req)} data-testid={`button-edit-admin-${req.id}`}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit Details
                          </Button>
                        )}
                      </div>
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
