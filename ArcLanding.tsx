import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SEOHead } from "@/components/SEOHead";
import { Navigation } from "@/components/Navigation";
import { Link } from "wouter";
import { BookOpen, Users, Calendar, CheckCircle, Loader2, Lock, Clock, Mail } from "lucide-react";

interface ArcLandingData {
  id: number;
  title: string;
  coverUrl: string | null;
  description: string | null;
  publishedDate: string | null;
  genres: string[] | null;
  arcVisibility: string;
  arcDescription: string | null;
  arcExpiresAt: string | null;
  arcMaxClaims: number | null;
  arcClaimCount: number;
  arcWaitlistEnabled: boolean;
  authorProfileId: number;
  authorSlug: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
}

interface InviteData {
  invite: { id: number; token: string; expiresAt: string | null };
  book: { id: number; title: string; arcShareToken: string | null };
}

function getInviteParam(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("invite");
  } catch {
    return null;
  }
}

export default function ArcLanding() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const inviteToken = getInviteParam();

  const { data: arc, isLoading, error } = useQuery<ArcLandingData>({
    queryKey: ["/api/arc-landing", token],
    queryFn: async () => {
      const res = await fetch(`/api/arc-landing/${token}`);
      if (!res.ok) throw new Error("ARC not found");
      return res.json();
    },
    staleTime: 60_000,
    enabled: !!token,
  });

  const { data: inviteData, isLoading: inviteLoading } = useQuery<InviteData>({
    queryKey: ["/api/arc-invite", inviteToken],
    queryFn: async () => {
      const res = await fetch(`/api/arc-invite/${inviteToken}`);
      if (!res.ok) throw new Error("Invalid invite");
      return res.json();
    },
    enabled: !!inviteToken,
    staleTime: 60_000,
    retry: false,
  });

  const hasValidInvite = !!inviteData && !inviteLoading;

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!arc) throw new Error("No ARC data");
      const res = await apiRequest("POST", `/api/authors/${arc.authorProfileId}/books/${arc.id}/claim-arc`, {});
      return res;
    },
    onSuccess: () => {
      toast({ title: "ARC claimed!", description: "Check My ARCs in your account to track your progress." });
      setLocation("/my-arcs");
    },
    onError: async (err: any) => {
      const msg = err?.message || "Could not claim this ARC. Please try again.";
      toast({ title: "Could not claim ARC", description: msg, variant: "destructive" });
    },
  });

  const claimWithInviteMutation = useMutation({
    mutationFn: async () => {
      if (!inviteToken) throw new Error("No invite token");
      const res = await apiRequest("POST", `/api/arc-invite/${inviteToken}/claim`, {});
      return res;
    },
    onSuccess: () => {
      toast({ title: "ARC claimed!", description: "Your invite has been accepted. Check My ARCs to get started." });
      setLocation("/my-arcs");
    },
    onError: async (err: any) => {
      const msg = err?.message || "Could not claim this ARC with your invite.";
      toast({ title: "Could not claim ARC", description: msg, variant: "destructive" });
    },
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      if (!arc) throw new Error("No ARC data");
      return apiRequest("POST", `/api/authors/${arc.authorProfileId}/books/${arc.id}/claim-arc`, { status: "requested" });
    },
    onSuccess: () => {
      toast({ title: "Request sent!", description: "The author will review your request." });
    },
    onError: () => toast({ title: "Could not send request", variant: "destructive" }),
  });

  const isExpired = arc?.arcExpiresAt && new Date(arc.arcExpiresAt) < new Date();
  const isFull = arc && arc.arcMaxClaims !== null && arc.arcClaimCount >= arc.arcMaxClaims;
  const isPending = claimMutation.isPending || claimWithInviteMutation.isPending;

  function renderClaimArea() {
    if (!arc) return null;

    if (isExpired) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          This ARC offer has expired.
        </div>
      );
    }

    if (isFull && !arc.arcWaitlistEnabled && arc.arcVisibility === "discoverable") {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          All ARC copies have been claimed.
        </div>
      );
    }

    if (!user) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Sign in to claim this ARC or request access.</p>
          <Link href="/api/login">
            <Button className="gap-2" data-testid="button-arc-signin">
              Sign In to Claim
            </Button>
          </Link>
        </div>
      );
    }

    if (arc.arcVisibility === "private") {
      if (hasValidInvite) {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <Mail className="w-4 h-4" />
              You have a personal invite for this ARC.
            </div>
            <Button
              onClick={() => claimWithInviteMutation.mutate()}
              disabled={isPending}
              className="gap-2"
              data-testid="button-arc-claim-invite"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Claim My ARC
            </Button>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4" />
          This ARC is available by direct invitation only.
        </div>
      );
    }

    if (arc.arcVisibility === "invite-only") {
      if (hasValidInvite) {
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <Mail className="w-4 h-4" />
              You have been personally invited to claim this ARC.
            </div>
            <Button
              onClick={() => claimWithInviteMutation.mutate()}
              disabled={isPending}
              className="gap-2"
              data-testid="button-arc-claim-invite"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Claim My ARC
            </Button>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This ARC is invite-only. Request access and the author will review your request.
          </p>
          <Button
            onClick={() => requestMutation.mutate()}
            disabled={requestMutation.isPending || requestMutation.isSuccess}
            variant="outline"
            className="gap-2"
            data-testid="button-arc-request"
          >
            {requestMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : requestMutation.isSuccess ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            {requestMutation.isSuccess ? "Request Sent" : "Request Access"}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Claim your free advance copy and share an honest review after reading.
        </p>
        {isFull && arc.arcWaitlistEnabled ? (
          <Button
            onClick={() => claimMutation.mutate()}
            disabled={isPending}
            variant="outline"
            className="gap-2"
            data-testid="button-arc-join-waitlist"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
            Join Waitlist
          </Button>
        ) : (
          <Button
            onClick={() => claimMutation.mutate()}
            disabled={isPending}
            className="gap-2"
            data-testid="button-arc-claim"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Claim Free ARC
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={arc ? `${arc.title} — Free ARC | Book Slump Rescue` : "ARC | Book Slump Rescue"}
        description={arc?.arcDescription || arc?.description || "Advance Reader Copy available on Book Slump Rescue"}
      />
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-10">
        {isLoading && (
          <div className="space-y-6">
            <div className="flex gap-6">
              <Skeleton className="w-28 h-40 rounded-lg shrink-0" />
              <div className="flex-1 space-y-3 pt-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        )}

        {!isLoading && (error || !arc) && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-lg font-semibold mb-2">ARC not found</h2>
            <p className="text-muted-foreground text-sm mb-4">This ARC link may have expired or doesn't exist.</p>
            <Link href="/">
              <Button variant="outline" data-testid="button-arc-back-home">Back to Home</Button>
            </Link>
          </div>
        )}

        {!isLoading && arc && (
          <div className="space-y-6">
            <div className="flex gap-6 items-start">
              {arc.coverUrl ? (
                <img
                  src={arc.coverUrl}
                  alt={arc.title}
                  className="w-28 h-40 object-cover rounded-lg border shadow-md shrink-0"
                  data-testid="img-arc-cover"
                />
              ) : (
                <div className="w-28 h-40 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight leading-tight" data-testid="text-arc-title">
                    {arc.title}
                  </h1>
                  {arc.arcVisibility === "invite-only" && (
                    <Badge variant="secondary" className="mt-0.5 gap-1">
                      <Lock className="w-3 h-3" /> Invite Only
                    </Badge>
                  )}
                  {arc.arcVisibility === "private" && (
                    <Badge variant="outline" className="mt-0.5 gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </Badge>
                  )}
                </div>

                {arc.authorName && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    by{" "}
                    {arc.authorSlug ? (
                      <Link href={`/author/${arc.authorSlug}`} className="hover:underline font-medium text-foreground" data-testid="link-arc-author">
                        {arc.authorName}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{arc.authorName}</span>
                    )}
                  </p>
                )}

                {arc.genres && arc.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {arc.genres.slice(0, 4).map(g => (
                      <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  {arc.publishedDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {arc.publishedDate}
                    </span>
                  )}
                  {arc.arcMaxClaims !== null && (
                    <span className="flex items-center gap-1" data-testid="text-arc-slots">
                      <Users className="w-3.5 h-3.5" />
                      {arc.arcClaimCount}/{arc.arcMaxClaims} claimed
                    </span>
                  )}
                  {arc.arcExpiresAt && !isExpired && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Closes {new Date(arc.arcExpiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {arc.arcDescription && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm font-medium mb-1">About this ARC</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{arc.arcDescription}</p>
              </div>
            )}

            {arc.description && (
              <div>
                <p className="text-sm font-medium mb-2">Synopsis</p>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-5">{arc.description}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              {renderClaimArea()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
