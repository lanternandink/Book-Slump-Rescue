import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, Mic, Loader2, Eye, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Calendar, Clock,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

interface InterviewReq {
  id: number;
  authorName: string;
  penName: string | null;
  email: string;
  timezone: string;
  website: string | null;
  socialLinks: string | null;
  bookTitle: string;
  genres: string[];
  releaseDate: string | null;
  shortBlurb: string;
  buyLinks: string | null;
  mediaKitLink: string | null;
  authorPhotoUrl: string | null;
  bookCoverUrl: string | null;
  interviewFormats: string[];
  preferredLength: number | null;
  topicPrompts: string[];
  topicOther: string | null;
  featuredLinks: string | null;
  preferredDays: string[];
  preferredTimeStart: string | null;
  preferredTimeEnd: string | null;
  earliestDate: string | null;
  schedulingNotes: string | null;
  ownershipConfirmed: boolean;
  consentConfirmed: boolean;
  affiliateConsent: boolean;
  contactConsent: boolean;
  status: string;
  adminNotes: string | null;
  rejectionReason: string | null;
  scheduledDateTime: string | null;
  scheduledFormat: string | null;
  assignedHost: string | null;
  contentTiktokUrl: string | null;
  contentYoutubeUrl: string | null;
  contentInstagramUrl: string | null;
  contentBlogUrl: string | null;
  createdAt: string;
}

const STATUSES = ["pending", "approved", "scheduled", "completed", "rejected"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    approved: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    scheduled: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return map[status] || "";
}

export default function AdminInterviewRequests() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [scheduledFormat, setScheduledFormat] = useState("");
  const [assignedHost, setAssignedHost] = useState("");
  const [contentUrls, setContentUrls] = useState({ tiktok: "", youtube: "", instagram: "", blog: "" });

  const queryParams = statusFilter === "all" ? "" : `?status=${statusFilter}`;
  const { data: requests = [], isLoading } = useQuery<InterviewReq[]>({
    queryKey: ["/api/admin/interview-requests", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/admin/interview-requests${queryParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, any> }) =>
      apiRequest("PATCH", `/api/admin/interview-requests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/interview-requests"] });
      toast({ title: "Request updated" });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const handleExpand = (req: InterviewReq) => {
    if (expandedId === req.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(req.id);
    setAdminNotes(req.adminNotes || "");
    setRejectionReason(req.rejectionReason || "");
    setScheduledDateTime(req.scheduledDateTime || "");
    setScheduledFormat(req.scheduledFormat || "");
    setAssignedHost(req.assignedHost || "");
    setContentUrls({
      tiktok: req.contentTiktokUrl || "",
      youtube: req.contentYoutubeUrl || "",
      instagram: req.contentInstagramUrl || "",
      blog: req.contentBlogUrl || "",
    });
  };

  const saveAdmin = (id: number) => {
    updateMutation.mutate({
      id,
      data: {
        adminNotes: adminNotes || null,
        rejectionReason: rejectionReason || null,
        scheduledDateTime: scheduledDateTime || null,
        scheduledFormat: scheduledFormat || null,
        assignedHost: assignedHost || null,
        contentTiktokUrl: contentUrls.tiktok || null,
        contentYoutubeUrl: contentUrls.youtube || null,
        contentInstagramUrl: contentUrls.instagram || null,
        contentBlogUrl: contentUrls.blog || null,
      },
    });
  };

  const setStatus = (id: number, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4" data-testid="text-access-denied">Access Denied</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Admin - Interview Requests" description="Manage author interview requests" />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/dashboard" data-testid="link-back-admin">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-admin-interview-requests-title">
              <Mic className="w-6 h-6" />
              Interview Requests
            </h1>
            <p className="text-sm text-muted-foreground">Manage author interview submissions</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {["all", ...STATUSES].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs capitalize"
              data-testid={`filter-${s}`}
            >
              {s}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-empty">
              No interview requests {statusFilter !== "all" ? `with status "${statusFilter}"` : "yet"}.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <Card key={req.id} data-testid={`card-request-${req.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 cursor-pointer" onClick={() => handleExpand(req)}>
                    {req.bookCoverUrl && (
                      <img loading="lazy" decoding="async" src={req.bookCoverUrl} alt="Cover" className="w-12 h-16 object-cover rounded flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-sm" data-testid={`text-title-${req.id}`}>{req.bookTitle}</h3>
                        <Badge className={`text-[10px] ${statusBadge(req.status)}`}>{req.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.authorName}{req.penName ? ` (${req.penName})` : ""} · {req.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(req.genres || []).join(", ")} · {(req.interviewFormats || []).join(", ")} · {req.preferredLength}min
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {expandedId === req.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {expandedId === req.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Timezone</Label>
                          <p>{req.timezone}</p>
                        </div>
                        {req.website && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Website</Label>
                            <p className="truncate">{req.website}</p>
                          </div>
                        )}
                        {req.socialLinks && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Social</Label>
                            <p className="truncate">{req.socialLinks}</p>
                          </div>
                        )}
                        {req.mediaKitLink && (
                          <div>
                            <Label className="text-xs text-muted-foreground">Media Kit</Label>
                            <p className="truncate">{req.mediaKitLink}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Blurb</Label>
                        <p className="text-sm">{req.shortBlurb}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Topics</Label>
                          <p>{(req.topicPrompts || []).join(", ")}{req.topicOther ? `, ${req.topicOther}` : ""}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Scheduling</Label>
                          <p>
                            {(req.preferredDays || []).join(", ")}
                            {req.preferredTimeStart && ` ${req.preferredTimeStart}`}
                            {req.preferredTimeEnd && `-${req.preferredTimeEnd}`}
                            {req.earliestDate && ` (earliest: ${req.earliestDate})`}
                          </p>
                          {req.schedulingNotes && <p className="text-xs text-muted-foreground mt-0.5">{req.schedulingNotes}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className={req.ownershipConfirmed ? "text-green-600" : "text-red-500"}>Rights: {req.ownershipConfirmed ? "✓" : "✗"}</span>
                        <span className={req.consentConfirmed ? "text-green-600" : "text-red-500"}>Consent: {req.consentConfirmed ? "✓" : "✗"}</span>
                        <span className={req.affiliateConsent ? "text-green-600" : "text-muted-foreground"}>Affiliate: {req.affiliateConsent ? "✓" : "–"}</span>
                        <span className={req.contactConsent ? "text-green-600" : "text-red-500"}>Contact: {req.contactConsent ? "✓" : "✗"}</span>
                      </div>

                      <div className="space-y-3 pt-2 border-t">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setStatus(req.id, "approved")} disabled={updateMutation.isPending} data-testid={`button-approve-${req.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(req.id, "scheduled")} disabled={updateMutation.isPending} data-testid={`button-schedule-${req.id}`}>
                            <Calendar className="w-3.5 h-3.5 mr-1" /> Schedule
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(req.id, "completed")} disabled={updateMutation.isPending} data-testid={`button-complete-${req.id}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setStatus(req.id, "rejected")} disabled={updateMutation.isPending} data-testid={`button-reject-${req.id}`}>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Admin Notes</Label>
                          <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2} data-testid={`input-admin-notes-${req.id}`} />
                        </div>

                        {req.status === "rejected" && (
                          <div className="space-y-2">
                            <Label className="text-xs">Rejection Reason</Label>
                            <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} data-testid={`input-rejection-reason-${req.id}`} />
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Scheduled Date/Time</Label>
                            <Input type="datetime-local" value={scheduledDateTime} onChange={e => setScheduledDateTime(e.target.value)} data-testid={`input-scheduled-dt-${req.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Format</Label>
                            <Select value={scheduledFormat} onValueChange={setScheduledFormat}>
                              <SelectTrigger data-testid={`select-format-${req.id}`}><SelectValue placeholder="Pick format" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pre_recorded_video">Pre-recorded Video</SelectItem>
                                <SelectItem value="live_video">Live Video</SelectItem>
                                <SelectItem value="written_qa">Written Q&A</SelectItem>
                                <SelectItem value="podcast_audio">Podcast Audio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Assigned Host</Label>
                            <Input value={assignedHost} onChange={e => setAssignedHost(e.target.value)} placeholder="Me / Name" data-testid={`input-host-${req.id}`} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">TikTok URL</Label>
                            <Input value={contentUrls.tiktok} onChange={e => setContentUrls({ ...contentUrls, tiktok: e.target.value })} data-testid={`input-tiktok-${req.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">YouTube URL</Label>
                            <Input value={contentUrls.youtube} onChange={e => setContentUrls({ ...contentUrls, youtube: e.target.value })} data-testid={`input-youtube-${req.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Instagram URL</Label>
                            <Input value={contentUrls.instagram} onChange={e => setContentUrls({ ...contentUrls, instagram: e.target.value })} data-testid={`input-instagram-${req.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Blog Post URL</Label>
                            <Input value={contentUrls.blog} onChange={e => setContentUrls({ ...contentUrls, blog: e.target.value })} data-testid={`input-blog-${req.id}`} />
                          </div>
                        </div>

                        <Button
                          onClick={() => saveAdmin(req.id)}
                          disabled={updateMutation.isPending}
                          className="w-full"
                          data-testid={`button-save-${req.id}`}
                        >
                          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                          Save Admin Details
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
