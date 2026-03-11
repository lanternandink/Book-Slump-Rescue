import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  ArrowLeft, BookOpen, Plus, Edit2, Save, Trash2, Globe,
  ExternalLink, Loader2, PenTool, Link2, Eye, Download,
  ShoppingCart, Tag, CheckCircle, Users, Clock, Shield,
  AlertTriangle, Ban, BarChart3, Calendar, Lock, UserX,
  ListChecks, TrendingUp, Upload, ImageIcon, Activity, Copy, Mail,
} from "lucide-react";
import { SiInstagram, SiGoodreads, SiTiktok } from "react-icons/si";
import { SEOHead } from "@/components/SEOHead";
import { MediaKitGenerator } from "@/components/MediaKitGenerator";

interface AuthorProfile {
  id: number;
  userId: string;
  penName: string;
  slug: string;
  bio: string | null;
  website: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  goodreadsUrl: string | null;
  amazonAuthorUrl: string | null;
  bookbubUrl: string | null;
  tiktokHandle: string | null;
  genres: string[] | null;
  avatarUrl: string | null;
  isVerified: boolean | null;
}

interface AuthorBook {
  id: number;
  authorId: number;
  title: string;
  description: string | null;
  coverUrl: string | null;
  genres: string[] | null;
  amazonUrl: string | null;
  bookshopUrl: string | null;
  seriesName: string | null;
  seriesNumber: number | null;
  publishedDate: string | null;
  isUpcoming: boolean | null;
  arcEnabled: boolean | null;
  arcDownloadUrl: string | null;
  arcCouponCode: string | null;
  arcMaxClaims: number | null;
  arcClaimCount: number | null;
  arcDescription: string | null;
  arcExpiresAt: string | null;
  arcDownloadExpiryHours: number | null;
  arcWaitlistEnabled: boolean | null;
  arcVisibility: string | null;
  arcShareToken: string | null;
  arcAmazonReviewUrl: string | null;
  arcGoodreadsReviewUrl: string | null;
  arcStorygraphReviewUrl: string | null;
  arcBookbubReviewUrl: string | null;
}

interface ArcClaimRecord {
  id: number;
  bookId: number;
  userId: string;
  userDisplayName: string | null;
  claimedAt: string | null;
  isFlagged: boolean | null;
  hasReviewed: boolean;
  readingProgress: number;
  status: string | null;
}

interface BlockedUser {
  id: number;
  blockedUserId: string;
  blockedUserName: string | null;
  reason: string | null;
  blockedAt: string | null;
}

interface SecurityStats {
  totalClaims: number;
  blockedUsersCount: number;
  flaggedClaimsCount: number;
  pendingReportsCount: number;
  waitlistSize: number;
  claimsByDay: { date: string; count: number }[];
  reviewConversionRate: number;
  averageReadingProgress: number;
  totalReviews: number;
}

const ARC_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  invited: { label: "Invited", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  requested: { label: "Requested", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  downloaded: { label: "Downloaded", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  reading: { label: "Reading", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
  finished: { label: "Finished", color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300" },
  reviewed: { label: "Reviewed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

function ArcClaimViewer({ bookId, bookTitle }: { bookId: number; bookTitle: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: claims = [], isLoading } = useQuery<ArcClaimRecord[]>({
    queryKey: ["/api/user/author-books", bookId, "claims"],
    queryFn: async () => {
      const res = await fetch(`/api/user/author-books/${bookId}/claims`);
      if (!res.ok) throw new Error("Failed to load claims");
      return res.json();
    },
  });

  const reportMutation = useMutation({
    mutationFn: async ({ claimId, reason }: { claimId: number; reason: string }) => {
      return apiRequest("POST", "/api/user/arc-claim-reports", { claimId, reason });
    },
    onSuccess: () => {
      toast({ title: "Claim flagged for review" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/author-books", bookId, "claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-security-stats"] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ blockedUserId, blockedUserName }: { blockedUserId: string; blockedUserName: string | null }) => {
      return apiRequest("POST", "/api/user/arc-blocked-users", { blockedUserId, blockedUserName, reason: "Blocked from claim viewer" });
    },
    onSuccess: () => {
      toast({ title: "User blocked from future ARC claims" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-security-stats"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (claimId: number) => {
      return apiRequest("POST", `/api/user/arc-claims/${claimId}/approve`, {});
    },
    onSuccess: () => {
      toast({ title: "Claim approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/author-books", bookId, "claims"] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", `/api/user/author-books/${bookId}/invite`, { email });
      return res.json();
    },
    onSuccess: async (data) => {
      try {
        await navigator.clipboard.writeText(data.url);
        toast({ title: "Invite link copied!", description: `Link for ${inviteEmail} copied to clipboard.` });
      } catch {
        toast({ title: "Invite created", description: `Share this link: ${data.url}` });
      }
      setInviteEmail("");
      setShowInviteForm(false);
    },
    onError: () => toast({ title: "Failed to create invite", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="py-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading claim history...
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p>No one has claimed an ARC for "{bookTitle}" yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid={`arc-claims-list-${bookId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium">{claims.length} claim{claims.length !== 1 ? "s" : ""}</p>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowInviteForm(v => !v)}
            data-testid={`button-toggle-invite-${bookId}`}
          >
            <Mail className="w-3 h-3" /> Invite Reader
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={async () => {
              try {
                const res = await fetch(`/api/user/author-books/${bookId}/claims/export`, { credentials: "include" });
                if (!res.ok) throw new Error("Export failed");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `arc-claims-${bookTitle.replace(/\s+/g, "-")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              } catch {
                toast({ title: "Export failed", variant: "destructive" });
              }
            }}
            data-testid={`button-export-claims-${bookId}`}
          >
            <Download className="w-3 h-3" /> Export CSV
          </Button>
        </div>
      </div>

      {showInviteForm && (
        <div className="flex gap-2 p-2.5 rounded-md border bg-muted/20" data-testid={`invite-form-${bookId}`}>
          <Input
            type="email"
            placeholder="reader@example.com (optional)"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            className="text-xs h-8"
            data-testid={`input-invite-email-${bookId}`}
          />
          <Button
            size="sm"
            className="gap-1 h-8 text-xs shrink-0"
            onClick={() => inviteMutation.mutate(inviteEmail)}
            disabled={inviteMutation.isPending}
            data-testid={`button-send-invite-${bookId}`}
          >
            {inviteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
            Copy Link
          </Button>
        </div>
      )}

      <div className="max-h-56 overflow-y-auto space-y-1.5">
        {claims.map((claim) => {
          const statusInfo = claim.status ? ARC_STATUS_LABELS[claim.status] : null;
          return (
            <div key={claim.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 text-sm py-1.5 px-2 rounded bg-muted/30">
              <div className="flex items-center gap-2 min-w-0 flex-1 basis-36">
                <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{claim.userDisplayName || "Anonymous User"}</span>
                {statusInfo && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                )}
                {claim.isFlagged && <Badge variant="destructive" className="text-[9px] px-1 py-0">Flagged</Badge>}
                {claim.hasReviewed && <Badge variant="secondary" className="text-[9px] px-1 py-0"><CheckCircle className="w-2.5 h-2.5 mr-0.5" />Reviewed</Badge>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                {claim.status === "requested" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-1.5 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                    onClick={() => approveMutation.mutate(claim.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-claim-${claim.id}`}
                  >
                    Approve
                  </Button>
                )}
                <div className="flex items-center gap-1" title={`Reading progress: ${claim.readingProgress}%`}>
                  <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${claim.readingProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{claim.readingProgress}%</span>
                </div>
                {!claim.isFlagged && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-6 h-6"
                    onClick={() => reportMutation.mutate({ claimId: claim.id, reason: "suspicious_activity" })}
                    disabled={reportMutation.isPending}
                    data-testid={`button-flag-claim-${claim.id}`}
                    title="Flag as suspicious"
                  >
                    <AlertTriangle className="w-3 h-3 text-muted-foreground" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-6 h-6"
                  onClick={() => blockMutation.mutate({ blockedUserId: claim.userId, blockedUserName: claim.userDisplayName })}
                  disabled={blockMutation.isPending}
                  data-testid={`button-block-user-${claim.id}`}
                  title="Block this user"
                >
                  <Ban className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onSave }: { profile: AuthorProfile | null; onSave: (data: any) => void }) {
  const [penName, setPenName] = useState(profile?.penName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [website, setWebsite] = useState(profile?.website || "");
  const [twitterHandle, setTwitterHandle] = useState(profile?.twitterHandle || "");
  const [instagramHandle, setInstagramHandle] = useState(profile?.instagramHandle || "");
  const [goodreadsUrl, setGoodreadsUrl] = useState(profile?.goodreadsUrl || "");
  const [amazonAuthorUrl, setAmazonAuthorUrl] = useState(profile?.amazonAuthorUrl || "");
  const [bookbubUrl, setBookbubUrl] = useState(profile?.bookbubUrl || "");
  const [tiktokHandle, setTiktokHandle] = useState(profile?.tiktokHandle || "");
  const [genres, setGenres] = useState(profile?.genres?.join(", ") || "");

  const handleSubmit = () => {
    onSave({
      penName,
      bio: bio || null,
      website: website || null,
      twitterHandle: twitterHandle || null,
      instagramHandle: instagramHandle || null,
      goodreadsUrl: goodreadsUrl || null,
      amazonAuthorUrl: amazonAuthorUrl || null,
      bookbubUrl: bookbubUrl || null,
      tiktokHandle: tiktokHandle || null,
      genres: genres ? genres.split(",").map(g => g.trim()).filter(Boolean) : null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Pen Name *</Label>
        <Input value={penName} onChange={e => setPenName(e.target.value)} className="mt-1" data-testid="input-pen-name" />
      </div>
      <div>
        <Label>Bio</Label>
        <Textarea value={bio} onChange={e => setBio(e.target.value)} className="mt-1 min-h-[80px]" placeholder="Tell readers about yourself..." data-testid="input-author-bio" />
      </div>
      <div>
        <Label>Genres (comma-separated)</Label>
        <Input value={genres} onChange={e => setGenres(e.target.value)} className="mt-1" placeholder="Romance, Fantasy, Sci-Fi" data-testid="input-genres" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Website</Label>
          <Input value={website} onChange={e => setWebsite(e.target.value)} className="mt-1" placeholder="https://..." data-testid="input-website" />
        </div>
        <div>
          <Label>Amazon Author Page</Label>
          <Input value={amazonAuthorUrl} onChange={e => setAmazonAuthorUrl(e.target.value)} className="mt-1" placeholder="https://amazon.com/author/..." data-testid="input-amazon" />
        </div>
        <div>
          <Label>Goodreads URL</Label>
          <Input value={goodreadsUrl} onChange={e => setGoodreadsUrl(e.target.value)} className="mt-1" placeholder="https://goodreads.com/..." data-testid="input-goodreads" />
        </div>
        <div>
          <Label>BookBub URL</Label>
          <Input value={bookbubUrl} onChange={e => setBookbubUrl(e.target.value)} className="mt-1" placeholder="https://bookbub.com/..." data-testid="input-bookbub" />
        </div>
        <div>
          <Label>Instagram Handle</Label>
          <Input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} className="mt-1" placeholder="yourhandle" data-testid="input-instagram" />
        </div>
        <div>
          <Label>TikTok Handle</Label>
          <Input value={tiktokHandle} onChange={e => setTiktokHandle(e.target.value)} className="mt-1" placeholder="yourhandle" data-testid="input-tiktok" />
        </div>
        <div>
          <Label>Twitter/X Handle</Label>
          <Input value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} className="mt-1" placeholder="yourhandle" data-testid="input-twitter" />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={!penName.trim()} className="gap-1.5" data-testid="button-save-profile">
        <Save className="w-4 h-4" /> Save Profile
      </Button>
    </div>
  );
}

function BookEditor({ book, authorId, onSave, onCancel, arcLimits }: {
  book: AuthorBook | null;
  authorId: number;
  onSave: (data: any) => void;
  onCancel: () => void;
  arcLimits?: { subscribed: boolean; maxActive: number | null; maxDownloads: number | null; activeArcCount: number };
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(book?.title || "");
  const [description, setDescription] = useState(book?.description || "");
  const [coverUrl, setCoverUrl] = useState(book?.coverUrl || "");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [genres, setGenres] = useState(book?.genres?.join(", ") || "");
  const [amazonUrl, setAmazonUrl] = useState(book?.amazonUrl || "");
  const [bookshopUrl, setBookshopUrl] = useState(book?.bookshopUrl || "");
  const [seriesName, setSeriesName] = useState(book?.seriesName || "");
  const [seriesNumber, setSeriesNumber] = useState(book?.seriesNumber?.toString() || "");
  const [publishedDate, setPublishedDate] = useState(book?.publishedDate || "");
  const [isUpcoming, setIsUpcoming] = useState(book?.isUpcoming || false);
  const [arcEnabled, setArcEnabled] = useState(book?.arcEnabled || false);
  const [arcDownloadUrl, setArcDownloadUrl] = useState(book?.arcDownloadUrl || "");
  const [arcCouponCode, setArcCouponCode] = useState(book?.arcCouponCode || "");
  const [arcMaxClaims, setArcMaxClaims] = useState(book?.arcMaxClaims?.toString() || "50");
  const [arcDescription, setArcDescription] = useState(book?.arcDescription || "");
  const [arcExpiresAt, setArcExpiresAt] = useState(book?.arcExpiresAt ? book.arcExpiresAt.split("T")[0] : "");
  const [arcDownloadExpiryHours, setArcDownloadExpiryHours] = useState(book?.arcDownloadExpiryHours?.toString() || "");
  const [arcWaitlistEnabled, setArcWaitlistEnabled] = useState(book?.arcWaitlistEnabled || false);
  const [arcVisibility, setArcVisibility] = useState(book?.arcVisibility || "discoverable");
  const [arcAmazonReviewUrl, setArcAmazonReviewUrl] = useState(book?.arcAmazonReviewUrl || "");
  const [arcGoodreadsReviewUrl, setArcGoodreadsReviewUrl] = useState(book?.arcGoodreadsReviewUrl || "");
  const [arcStorygraphReviewUrl, setArcStorygraphReviewUrl] = useState(book?.arcStorygraphReviewUrl || "");
  const [arcBookbubReviewUrl, setArcBookbubReviewUrl] = useState(book?.arcBookbubReviewUrl || "");
  const [arcShareToken, setArcShareToken] = useState(book?.arcShareToken || "");
  const [isCopyingLink, setIsCopyingLink] = useState(false);

  const handleCopyArcLink = async () => {
    setIsCopyingLink(true);
    try {
      let token = arcShareToken;
      if (!token && book?.id) {
        const res = await fetch(`/api/user/author-books/${book.id}/generate-share-token`, { method: "POST", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          setArcShareToken(token);
        }
      }
      if (token) {
        await navigator.clipboard.writeText(`${window.location.origin}/arc/${token}`);
        toast({ title: "ARC link copied to clipboard!" });
      }
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    } finally {
      setIsCopyingLink(false);
    }
  };

  const handleSubmit = () => {
    onSave({
      title,
      description: description || null,
      coverUrl: coverUrl || null,
      genres: genres ? genres.split(",").map(g => g.trim()).filter(Boolean) : null,
      amazonUrl: amazonUrl || null,
      bookshopUrl: bookshopUrl || null,
      seriesName: seriesName || null,
      seriesNumber: seriesNumber ? parseInt(seriesNumber) : null,
      publishedDate: publishedDate || null,
      isUpcoming,
      arcEnabled,
      arcDownloadUrl: arcDownloadUrl || null,
      arcCouponCode: arcCouponCode || null,
      arcMaxClaims: arcMaxClaims ? parseInt(arcMaxClaims) : null,
      arcDescription: arcDescription || null,
      arcExpiresAt: arcExpiresAt ? new Date(arcExpiresAt).toISOString() : null,
      arcDownloadExpiryHours: arcDownloadExpiryHours ? parseInt(arcDownloadExpiryHours) : null,
      arcWaitlistEnabled,
      arcVisibility,
      arcAmazonReviewUrl: arcAmazonReviewUrl || null,
      arcGoodreadsReviewUrl: arcGoodreadsReviewUrl || null,
      arcStorygraphReviewUrl: arcStorygraphReviewUrl || null,
      arcBookbubReviewUrl: arcBookbubReviewUrl || null,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Book Title *</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} className="mt-1" data-testid="input-book-title" />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Book synopsis..." data-testid="input-book-description" />
      </div>
      <div>
        <Label>Cover Image</Label>
        <div className="mt-1 flex flex-col sm:flex-row gap-3 items-start">
          {coverUrl && (
            <div className="relative w-20 h-28 rounded overflow-hidden border bg-muted flex-shrink-0">
              <img loading="lazy" decoding="async" src={coverUrl} alt="Book cover preview" className="w-full h-full object-cover" data-testid="img-cover-preview" />
            </div>
          )}
          <div className="flex-1 space-y-2 w-full">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={isUploadingCover}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Please choose an image under 5MB.", variant: "destructive" });
                      return;
                    }
                    setIsUploadingCover(true);
                    try {
                      const metaRes = await fetch("/api/uploads/request-url", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
                      });
                      if (!metaRes.ok) throw new Error("Failed to get upload URL");
                      const { uploadURL, objectPath } = await metaRes.json();
                      const uploadRes = await fetch(uploadURL, {
                        method: "PUT",
                        body: file,
                        headers: { "Content-Type": file.type },
                      });
                      if (!uploadRes.ok) throw new Error("Failed to upload image");
                      setCoverUrl(objectPath);
                      toast({ title: "Cover image uploaded!" });
                    } catch (err: any) {
                      toast({ title: "Upload failed", description: err.message || "Please try again.", variant: "destructive" });
                    } finally {
                      setIsUploadingCover(false);
                    }
                  };
                  input.click();
                }}
                data-testid="button-upload-cover"
              >
                {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {isUploadingCover ? "Uploading..." : "Upload Image"}
              </Button>
              {coverUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCoverUrl("")}
                  data-testid="button-remove-cover"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>or paste a URL:</span>
            </div>
            <Input value={coverUrl} onChange={e => setCoverUrl(e.target.value)} placeholder="https://..." data-testid="input-book-cover" className="text-sm" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Genres (comma-separated)</Label>
          <Input value={genres} onChange={e => setGenres(e.target.value)} className="mt-1" placeholder="Fantasy, Romance" data-testid="input-book-genres" />
        </div>
        <div>
          <Label>Amazon Link (affiliate-ready)</Label>
          <Input value={amazonUrl} onChange={e => setAmazonUrl(e.target.value)} className="mt-1" placeholder="https://amazon.com/dp/..." data-testid="input-book-amazon" />
        </div>
        <div>
          <Label>Bookshop.org Link</Label>
          <Input value={bookshopUrl} onChange={e => setBookshopUrl(e.target.value)} className="mt-1" placeholder="https://bookshop.org/..." data-testid="input-book-bookshop" />
        </div>
        <div>
          <Label>Series Name</Label>
          <Input value={seriesName} onChange={e => setSeriesName(e.target.value)} className="mt-1" data-testid="input-book-series" />
        </div>
        <div>
          <Label>Series Number</Label>
          <Input type="number" value={seriesNumber} onChange={e => setSeriesNumber(e.target.value)} className="mt-1" data-testid="input-book-series-num" />
        </div>
        <div>
          <Label>Published Date</Label>
          <Input value={publishedDate} onChange={e => setPublishedDate(e.target.value)} className="mt-1" placeholder="2025-03-15" data-testid="input-book-pubdate" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="upcoming" checked={isUpcoming} onCheckedChange={setIsUpcoming} data-testid="switch-upcoming" />
        <Label htmlFor="upcoming">This is an upcoming/unreleased book</Label>
      </div>

      <Card className="p-4 bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Switch
            id="arc"
            checked={arcEnabled}
            onCheckedChange={(checked) => {
              if (checked && arcLimits && arcLimits.maxActive !== null) {
                const otherActiveCount = book?.arcEnabled ? arcLimits.activeArcCount - 1 : arcLimits.activeArcCount;
                if (otherActiveCount >= arcLimits.maxActive) {
                  return;
                }
              }
              setArcEnabled(checked);
            }}
            data-testid="switch-arc"
          />
          <Label htmlFor="arc" className="font-semibold">Enable ARC (Advance Reader Copy) Distribution</Label>
        </div>

        {arcLimits?.subscribed && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 rounded-lg" data-testid="arc-pro-banner">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Author Pro Plan</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
              {arcLimits.activeArcCount}/{arcLimits.maxActive} active ARCs used &middot; Unlimited downloads per ARC
            </p>
          </div>
        )}

        {arcLimits && !arcLimits.subscribed && (
          <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid="arc-limits-banner">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Free Plan Limits</p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
              {arcLimits.activeArcCount}/{arcLimits.maxActive} active ARC used &middot; {arcLimits.maxDownloads} downloads per ARC
            </p>
            {arcLimits.activeArcCount >= (arcLimits.maxActive || 1) && !book?.arcEnabled && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                You've reached your active ARC limit. Disable an existing ARC or subscribe for up to 5 active ARCs and unlimited downloads.
              </p>
            )}
            <Link href="/author-dashboard">
              <Button variant="link" size="sm" className="px-0 h-auto text-xs text-amber-700 dark:text-amber-400 underline mt-1" data-testid="link-upgrade-arc">
                Subscribe ($9.99/mo) for 5 active ARCs &amp; unlimited downloads
              </Button>
            </Link>
          </div>
        )}

        {arcEnabled && (
          <div className="space-y-3 ml-0">
            <div>
              <Label>ARC Description</Label>
              <Textarea
                value={arcDescription}
                onChange={e => setArcDescription(e.target.value)}
                className="mt-1 min-h-[40px]"
                placeholder="Get a free early copy in exchange for an honest review..."
                data-testid="input-arc-description"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Download URL</Label>
                <Input value={arcDownloadUrl} onChange={e => setArcDownloadUrl(e.target.value)} className="mt-1" placeholder="BookFunnel or direct link" data-testid="input-arc-url" />
              </div>
              <div>
                <Label>Coupon Code (optional)</Label>
                <Input value={arcCouponCode} onChange={e => setArcCouponCode(e.target.value)} className="mt-1" data-testid="input-arc-coupon" />
              </div>
              <div>
                <Label>Max Downloads{arcLimits && !arcLimits.subscribed ? ` (max ${arcLimits.maxDownloads})` : ""}</Label>
                <Input
                  type="number"
                  value={arcMaxClaims}
                  onChange={e => {
                    const val = e.target.value;
                    if (arcLimits && !arcLimits.subscribed && arcLimits.maxDownloads && parseInt(val) > arcLimits.maxDownloads) {
                      setArcMaxClaims(String(arcLimits.maxDownloads));
                    } else {
                      setArcMaxClaims(val);
                    }
                  }}
                  className="mt-1"
                  max={arcLimits && !arcLimits.subscribed ? arcLimits.maxDownloads || undefined : undefined}
                  data-testid="input-arc-max"
                />
                {arcLimits && !arcLimits.subscribed && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">Free plan: up to {arcLimits.maxDownloads} downloads. Subscribe for unlimited.</p>
                )}
              </div>
              <div>
                <Label>Claim Deadline</Label>
                <Input type="date" value={arcExpiresAt} onChange={e => setArcExpiresAt(e.target.value)} className="mt-1" data-testid="input-arc-expires" />
                <p className="text-[11px] text-muted-foreground mt-0.5">ARCs can't be claimed after this date</p>
              </div>
              <div>
                <Label>Download Link Expiry (hours)</Label>
                <Input type="number" value={arcDownloadExpiryHours} onChange={e => setArcDownloadExpiryHours(e.target.value)} className="mt-1" placeholder="e.g. 72" data-testid="input-arc-download-expiry" />
                <p className="text-[11px] text-muted-foreground mt-0.5">Download links expire after this many hours</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch id="waitlist" checked={arcWaitlistEnabled} onCheckedChange={setArcWaitlistEnabled} data-testid="switch-arc-waitlist" />
              <Label htmlFor="waitlist">Enable waitlist when max claims reached</Label>
            </div>

            <div className="mt-3 pt-3 border-t space-y-3">
              <div>
                <Label>ARC Visibility</Label>
                <div className="flex gap-1.5 mt-1.5" role="group" aria-label="ARC visibility">
                  {[
                    { value: "discoverable", label: "Discoverable", desc: "Anyone can find & claim" },
                    { value: "invite-only", label: "Invite Only", desc: "Readers request access" },
                    { value: "private", label: "Private", desc: "Direct link only" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setArcVisibility(opt.value)}
                      className={`flex-1 text-left px-2 py-1.5 rounded-md border text-xs transition-colors ${arcVisibility === opt.value ? "border-primary bg-primary/10 text-primary font-medium" : "border-border bg-background text-muted-foreground hover:border-primary/50"}`}
                      data-testid={`button-arc-visibility-${opt.value}`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="opacity-70 text-[10px] leading-tight mt-0.5">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {book?.id && (
                <div>
                  <Label>Shareable ARC Link</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      readOnly
                      value={arcShareToken ? `${window.location.origin}/arc/${arcShareToken}` : "Click to generate link"}
                      className="text-xs text-muted-foreground"
                      data-testid="input-arc-share-link"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={handleCopyArcLink}
                      disabled={isCopyingLink}
                      data-testid="button-copy-arc-link"
                    >
                      {isCopyingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Review Links (shown to readers after finishing)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Amazon</p>
                    <Input value={arcAmazonReviewUrl} onChange={e => setArcAmazonReviewUrl(e.target.value)} placeholder="https://amazon.com/review/..." className="text-xs" data-testid="input-arc-amazon-url" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">Goodreads</p>
                    <Input value={arcGoodreadsReviewUrl} onChange={e => setArcGoodreadsReviewUrl(e.target.value)} placeholder="https://goodreads.com/book/..." className="text-xs" data-testid="input-arc-goodreads-url" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">StoryGraph</p>
                    <Input value={arcStorygraphReviewUrl} onChange={e => setArcStorygraphReviewUrl(e.target.value)} placeholder="https://app.thestorygraph.com/..." className="text-xs" data-testid="input-arc-storygraph-url" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">BookBub</p>
                    <Input value={arcBookbubReviewUrl} onChange={e => setArcBookbubReviewUrl(e.target.value)} placeholder="https://bookbub.com/books/..." className="text-xs" data-testid="input-arc-bookbub-url" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={!title.trim()} className="gap-1.5" data-testid="button-save-book">
          <Save className="w-4 h-4" /> {book ? "Update Book" : "Add Book"}
        </Button>
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-book">Cancel</Button>
      </div>
    </div>
  );
}

interface BookAnalyticsData {
  books: {
    id: number;
    title: string;
    coverUrl: string | null;
    librarySaves: number;
    communityMentions: number;
    arcClaims: number;
    arcMaxClaims: number;
  }[];
  totals: {
    librarySaves: number;
    communityMentions: number;
    totalBooks: number;
    totalArcClaims: number;
  };
  trends?: {
    week: string;
    saves: number;
    mentions: number;
  }[];
}

function BookAnalyticsDashboard() {
  const { data, isLoading } = useQuery<BookAnalyticsData>({
    queryKey: ["/api/user/author-analytics"],
  });

  if (isLoading) {
    return (
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      </motion.section>
    );
  }

  if (!data || data.books.length === 0) return null;

  const statCards = [
    { icon: BookOpen, label: "Books Listed", value: data.totals.totalBooks, color: "text-blue-500" },
    { icon: Users, label: "Library Saves", value: data.totals.librarySaves, color: "text-green-500" },
    { icon: Activity, label: "Community Posts", value: data.totals.communityMentions, color: "text-purple-500" },
    { icon: Download, label: "ARC Claims", value: data.totals.totalArcClaims, color: "text-orange-500" },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-8">
      <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" /> Book Performance
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.trends && data.trends.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> 12-Week Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Saves</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Posts</span>
            </div>
            {(() => {
              const maxVal = Math.max(1, ...data.trends!.map(t => Math.max(t.saves, t.mentions)));
              return (
                <div className="flex items-end gap-1 h-32" data-testid="chart-trends">
                  {data.trends!.map((t, i) => {
                    const savesH = (t.saves / maxVal) * 100;
                    const mentionsH = (t.mentions / maxVal) * 100;
                    const label = new Date(t.week + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={`${label}: ${t.saves} saves, ${t.mentions} posts`}>
                        <div className="w-full flex gap-px justify-center items-end h-24">
                          <div className="w-1/2 bg-green-500/80 rounded-t-sm transition-all" style={{ height: `${Math.max(savesH, 2)}%` }} />
                          <div className="w-1/2 bg-purple-500/80 rounded-t-sm transition-all" style={{ height: `${Math.max(mentionsH, 2)}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground hidden sm:block">{label.split(" ")[0]}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {data.books.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Per-Book Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.books.map(book => (
                <div key={book.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors" data-testid={`analytics-book-${book.id}`}>
                  <div className="w-10 h-14 rounded bg-muted overflow-hidden flex-shrink-0">
                    {book.coverUrl ? (
                      <img loading="lazy" decoding="async" src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><BookOpen className="w-4 h-4 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{book.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1" data-testid={`saves-${book.id}`}>
                        <Users className="w-3 h-3 text-green-500" /> {book.librarySaves} saves
                      </span>
                      <span className="flex items-center gap-1" data-testid={`mentions-${book.id}`}>
                        <Activity className="w-3 h-3 text-purple-500" /> {book.communityMentions} posts
                      </span>
                      {book.arcClaims > 0 && (
                        <span className="flex items-center gap-1" data-testid={`arcs-${book.id}`}>
                          <Download className="w-3 h-3 text-orange-500" /> {book.arcClaims}/{book.arcMaxClaims || "∞"} ARCs
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}

function ArcSecurityDashboard({ profileId }: { profileId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<SecurityStats>({
    queryKey: ["/api/user/arc-security-stats"],
  });

  const { data: blockedUsers = [] } = useQuery<BlockedUser[]>({
    queryKey: ["/api/user/arc-blocked-users"],
  });

  const unblockMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/user/arc-blocked-users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "User unblocked" });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-blocked-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-security-stats"] });
    },
  });

  const protections = [
    { icon: Lock, label: "Login Required", desc: "Only signed-in users can claim ARCs" },
    { icon: Shield, label: "Duplicate Prevention", desc: "Each user can only claim each ARC once" },
    { icon: Clock, label: "Daily Rate Limit", desc: "Max 5 ARC claims per user per day" },
    { icon: Calendar, label: "Account Age Check", desc: "Accounts must be 24+ hours old to claim" },
    { icon: UserX, label: "Block List", desc: "Block specific users from claiming your ARCs" },
    { icon: AlertTriangle, label: "Claim Flagging", desc: "Flag suspicious claims for review" },
    { icon: ListChecks, label: "Waitlist Support", desc: "Users can join a waitlist when copies run out" },
    { icon: TrendingUp, label: "Expiration Controls", desc: "Set claim deadlines and download link expiry" },
  ];

  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
      <h2 className="font-display text-xl font-bold flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" /> ARC Security & Analytics
      </h2>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.totalClaims}</p>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.blockedUsersCount}</p>
                <p className="text-xs text-muted-foreground">Blocked Users</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.flaggedClaimsCount}</p>
                <p className="text-xs text-muted-foreground">Flagged Claims</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.pendingReportsCount}</p>
                <p className="text-xs text-muted-foreground">Pending Reports</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.waitlistSize}</p>
                <p className="text-xs text-muted-foreground">On Waitlist</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.totalReviews}</p>
                <p className="text-xs text-muted-foreground">ARC Reviews</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.reviewConversionRate}%</p>
                <p className="text-xs text-muted-foreground">Review Rate</p>
              </div>
              <div className="text-center p-3 rounded-md bg-muted/30">
                <p className="text-2xl font-bold">{stats.averageReadingProgress}%</p>
                <p className="text-xs text-muted-foreground">Avg. Progress</p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-20 w-full rounded-md" />
          )}

          {stats && stats.claimsByDay.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Claims Over Time (last 30 days)</p>
              <div className="flex items-end gap-[2px] h-16">
                {stats.claimsByDay.map((day) => {
                  const max = Math.max(...stats.claimsByDay.map(d => d.count));
                  const height = max > 0 ? (day.count / max) * 100 : 0;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 bg-primary/60 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.count} claims`}
                      data-testid={`bar-claims-${day.date}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Active Protections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {protections.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 p-2 rounded-md bg-muted/20">
                <div className="mt-0.5 p-1 rounded bg-primary/10">
                  <Icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {blockedUsers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Ban className="w-4 h-4" /> Blocked Users ({blockedUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {blockedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-2 text-sm py-1.5 px-2 rounded bg-muted/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <UserX className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{user.blockedUserName || user.blockedUserId}</span>
                    {user.reason && (
                      <span className="text-[10px] text-muted-foreground truncate">({user.reason})</span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => unblockMutation.mutate(user.id)}
                    disabled={unblockMutation.isPending}
                    data-testid={`button-unblock-${user.id}`}
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </motion.section>
  );
}

export default function AuthorDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingBook, setEditingBook] = useState<AuthorBook | null>(null);
  const [addingBook, setAddingBook] = useState(false);
  const [deleteDialogBook, setDeleteDialogBook] = useState<AuthorBook | null>(null);
  const [viewClaimsBookId, setViewClaimsBookId] = useState<number | null>(null);

  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useQuery<AuthorProfile | null>({
    queryKey: ["/api/user/author-profile"],
    enabled: isAuthenticated,
  });

  const { data: books = [], isLoading: booksLoading, isError: booksError, refetch: refetchBooks } = useQuery<AuthorBook[]>({
    queryKey: ["/api/user/author-books"],
    enabled: isAuthenticated && !!profile,
  });

  const { data: arcLimits } = useQuery<{ subscribed: boolean; maxActive: number | null; maxDownloads: number | null; activeArcCount: number }>({
    queryKey: ["/api/user/arc-limits"],
    enabled: isAuthenticated && !!profile,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      if (profile) {
        return apiRequest("PATCH", "/api/user/author-profile", data);
      } else {
        return apiRequest("POST", "/api/user/author-profile", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/author-profile"] });
      toast({ title: "Profile saved!" });
    },
    onError: (error: any) => {
      const msg = error?.message || "Failed to save profile.";
      toast({ title: "Error", description: msg.includes("400") ? "Please check your inputs and try again." : "Something went wrong saving your profile. Please try again.", variant: "destructive" });
    },
  });

  const saveBookMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBook) {
        return apiRequest("PATCH", `/api/user/author-books/${editingBook.id}`, data);
      } else {
        return apiRequest("POST", "/api/user/author-books", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/author-books"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/arc-limits"] });
      setEditingBook(null);
      setAddingBook(false);
      toast({ title: editingBook ? "Book updated!" : "Book added!" });
    },
    onError: (error: any) => {
      const msg = error?.message || "";
      if (msg.includes("arc_active_limit") || msg.includes("active ARC")) {
        toast({ title: "ARC Limit Reached", description: "Free accounts are limited to 1 active ARC. Subscribe to unlock unlimited ARCs.", variant: "destructive" });
        queryClient.invalidateQueries({ queryKey: ["/api/user/arc-limits"] });
      } else {
        toast({ title: "Error", description: "Failed to save book.", variant: "destructive" });
      }
    },
  });

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId: number) => {
      return apiRequest("DELETE", `/api/user/author-books/${bookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/author-books"] });
      setDeleteDialogBook(null);
      toast({ title: "Book removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove book.", variant: "destructive" });
    },
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-lg mb-6" />
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24 text-center max-w-md">
          <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold mb-2">Couldn't load your dashboard</h2>
          <p className="text-muted-foreground text-sm mb-4">Something went wrong fetching your author profile.</p>
          <Button variant="outline" onClick={() => refetchProfile()} data-testid="button-retry-dashboard">Try again</Button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 text-center">
          <PenTool className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Author Portal</h1>
          <p className="text-muted-foreground mb-6">Sign in to manage your author profile and books.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Author Dashboard" description="Manage your author profile, books, and advance reader copy distribution." />
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/profile">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5" data-testid="button-back-profile">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Button>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <PenTool className="w-6 h-6 text-primary" /> Author Portal
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your author profile, books, and ARC distribution</p>
          </div>
          {profile?.slug && (
            <Link href={`/authors/${profile.slug}`}>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-view-public-profile">
                <Eye className="w-4 h-4" /> View Public Page
              </Button>
            </Link>
          )}
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Edit2 className="w-5 h-5" /> Author Profile
                {profile?.isVerified && <CheckCircle className="w-4 h-4 text-primary" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile && (
                <div className="flex items-center gap-3 mb-4 p-3 rounded-md bg-muted/30">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={profile.avatarUrl || undefined} alt={profile.penName} />
                    <AvatarFallback>{profile.penName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{profile.penName}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> /authors/{profile.slug}
                    </p>
                  </div>
                </div>
              )}
              <ProfileEditor profile={profile ?? null} onSave={(data) => saveProfileMutation.mutate(data)} />
              {saveProfileMutation.isPending && (
                <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </div>
              )}
            </CardContent>
          </Card>
        </motion.section>

        {profile && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="font-display text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Your Books
              </h2>
              {!addingBook && !editingBook && (
                <Button size="sm" className="gap-1.5" onClick={() => setAddingBook(true)} data-testid="button-add-book">
                  <Plus className="w-4 h-4" /> Add Book
                </Button>
              )}
            </div>

            {(addingBook || editingBook) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">{editingBook ? "Edit Book" : "Add New Book"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookEditor
                    book={editingBook}
                    authorId={profile.id}
                    onSave={(data) => saveBookMutation.mutate(data)}
                    onCancel={() => {
                      setEditingBook(null);
                      setAddingBook(false);
                    }}
                    arcLimits={arcLimits}
                  />
                  {saveBookMutation.isPending && (
                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {booksLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-28 rounded-lg" />
                <Skeleton className="h-28 rounded-lg" />
              </div>
            ) : booksError ? (
              <Card className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="font-semibold mb-2">Couldn't load your books</h3>
                <p className="text-muted-foreground text-sm mb-4">Something went wrong. Please try again.</p>
                <Button variant="outline" onClick={() => refetchBooks()} data-testid="button-retry-books">Try again</Button>
              </Card>
            ) : books.length === 0 && !addingBook ? (
              <Card className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="font-display text-lg font-bold mb-2">No books yet</h3>
                <p className="text-muted-foreground mb-4">Add your first book to start building your author page.</p>
                <Button onClick={() => setAddingBook(true)} className="gap-1.5" data-testid="button-add-first-book">
                  <Plus className="w-4 h-4" /> Add Your First Book
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {books.map((book) => (
                  <Card key={book.id} className="flex overflow-hidden" data-testid={`card-author-book-${book.id}`}>
                    {book.coverUrl && (
                      <div className="w-24 flex-shrink-0 bg-muted">
                        <img loading="lazy" decoding="async" src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-base">{book.title}</h3>
                          {book.seriesName && (
                            <p className="text-xs text-muted-foreground">
                              {book.seriesName}{book.seriesNumber ? ` #${book.seriesNumber}` : ""}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingBook(book);
                              setAddingBook(false);
                            }}
                            data-testid={`button-edit-book-${book.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setDeleteDialogBook(book)}
                            data-testid={`button-delete-book-${book.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {book.isUpcoming && <Badge variant="secondary">Upcoming</Badge>}
                        {book.arcEnabled && (
                          <button
                            onClick={() => setViewClaimsBookId(viewClaimsBookId === book.id ? null : book.id)}
                            className="cursor-pointer"
                            data-testid={`button-view-claims-${book.id}`}
                          >
                            <Badge variant="outline" className="gap-1">
                              <Download className="w-3 h-3" />
                              ARC: {book.arcClaimCount || 0}/{book.arcMaxClaims || 0}
                              <Users className="w-3 h-3 ml-0.5" />
                            </Badge>
                          </button>
                        )}
                        {book.genres?.map(g => (
                          <Badge key={g} variant="outline" className="text-[10px]">
                            <Tag className="w-2.5 h-2.5 mr-0.5" /> {g}
                          </Badge>
                        ))}
                      </div>

                      {viewClaimsBookId === book.id && book.arcEnabled && (
                        <div className="mt-3 pt-3 border-t">
                          <ArcClaimViewer bookId={book.id} bookTitle={book.title} />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted-foreground">
                        {book.amazonUrl && (
                          <span className="flex items-center gap-0.5">
                            <ShoppingCart className="w-3 h-3" /> Amazon
                          </span>
                        )}
                        {book.bookshopUrl && (
                          <span className="flex items-center gap-0.5">
                            <BookOpen className="w-3 h-3" /> Bookshop
                          </span>
                        )}
                        {book.publishedDate && (
                          <span>{book.publishedDate}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.section>
        )}

        {profile && (
          <BookAnalyticsDashboard />
        )}

        {profile && (
          <MediaKitGenerator profile={profile} books={books} />
        )}

        {profile && (
          <ArcSecurityDashboard profileId={profile.id} />
        )}
      </div>

      <Dialog open={!!deleteDialogBook} onOpenChange={() => setDeleteDialogBook(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Book</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove "{deleteDialogBook?.title}" from your author profile? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogBook(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialogBook && deleteBookMutation.mutate(deleteDialogBook.id)}
              disabled={deleteBookMutation.isPending}
              data-testid="button-confirm-delete-book"
            >
              {deleteBookMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
