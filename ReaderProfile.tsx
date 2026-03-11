import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import {
  UserPlus, UserMinus, BookOpen, Library, Star,
  Lock, Calendar, Loader2, ArrowLeft, Users,
  MoreHorizontal, ShieldBan, Flag, ShieldOff, Clock,
  Pen, Medal,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CommunityGuidelinesDialog } from "@/components/CommunityGuidelinesDialog";

interface PublicProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  favoriteGenres: string[];
  currentlyReading: string | null;
  isProfilePublic: boolean;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  booksFinished?: number;
  totalBooks?: number;
  currentlyReadingBooks?: Array<{
    id: number;
    bookTitle: string;
    bookAuthor: string;
    bookCoverUrl: string | null;
  }>;
  recentlyFinished?: Array<{
    id: number;
    bookTitle: string;
    bookAuthor: string;
    bookCoverUrl: string | null;
    rating: number | null;
    dateFinished: string | null;
  }>;
  arcBadges?: Array<{
    badgeKey: string;
    badgeName: string;
    badgeDescription: string;
    badgeIcon: string;
    earnedAt: string | null;
  }>;
}

interface FollowStatusData {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  isBlocked: boolean;
  hasPendingRequest: boolean;
  isPrivateAccount: boolean;
}

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "spam", label: "Spam" },
  { value: "inappropriate", label: "Inappropriate Content" },
  { value: "hate_speech", label: "Hate Speech" },
  { value: "impersonation", label: "Impersonation" },
  { value: "other", label: "Other" },
];

function getDisplayName(profile: PublicProfile): string {
  if (profile.displayName) return profile.displayName;
  const parts = [profile.firstName, profile.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Reader";
}

function getInitials(profile: PublicProfile): string {
  return getDisplayName(profile).charAt(0).toUpperCase();
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function FollowButton({
  followStatus,
  isAuthenticated,
  isSelf,
  followMutation,
  unfollowMutation,
  cancelRequestMutation,
  size = "sm",
}: {
  followStatus: FollowStatusData | undefined;
  isAuthenticated: boolean;
  isSelf: boolean;
  followMutation: any;
  unfollowMutation: any;
  cancelRequestMutation: any;
  size?: "sm" | "default";
}) {
  if (!isAuthenticated || isSelf || followStatus?.isBlocked) return null;

  const isFollowing = followStatus?.isFollowing ?? false;
  const hasPendingRequest = followStatus?.hasPendingRequest ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending;

  if (hasPendingRequest) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={() => cancelRequestMutation.mutate()}
        disabled={isPending}
        data-testid="button-follow-requested"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <><Clock className="w-4 h-4 mr-1" />Requested</>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size={size}
      onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
      disabled={isPending}
      data-testid="button-follow"
    >
      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isFollowing ? (
        <><UserMinus className="w-4 h-4 mr-1" />Unfollow</>
      ) : (
        <><UserPlus className="w-4 h-4 mr-1" />Follow</>
      )}
    </Button>
  );
}

export default function ReaderProfile() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const currentUserId = user?.id ?? null;
  const isSelf = currentUserId === userId;

  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showReportGuidelines, setShowReportGuidelines] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");

  const { data: profile, isLoading } = useQuery<PublicProfile>({
    queryKey: ["/api/users", userId, "profile"],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: followStatus } = useQuery<FollowStatusData>({
    queryKey: ["/api/user/follow-status", userId],
    enabled: !!currentUserId && !isSelf,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/user/follow-status", userId] });
    queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/followers"] });
  };

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/follow", { followingId: userId }),
    onSuccess: invalidateAll,
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/follow/${userId}`),
    onSuccess: invalidateAll,
  });

  const cancelRequestMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/follow-request/${userId}`),
    onSuccess: invalidateAll,
  });

  const blockMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/block", { blockedUserId: userId }),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["/api/user/blocked"] });
      toast({ title: "User blocked", description: `${displayName} has been blocked.` });
      setShowBlockDialog(false);
    },
  });

  const unblockMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/block/${userId}`),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["/api/user/blocked"] });
      toast({ title: "User unblocked", description: `${displayName} has been unblocked.` });
    },
  });

  const reportMutation = useMutation({
    mutationFn: (data: { reason: string; details?: string }) =>
      apiRequest("POST", "/api/user/report", {
        reportedUserId: userId,
        reason: data.reason,
        details: data.details || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thank you for reporting. We will review it." });
      setShowReportDialog(false);
      setReportReason("");
      setReportDetails("");
    },
  });

  const isBlocked = followStatus?.isBlocked ?? false;
  const displayName = profile ? getDisplayName(profile) : "Reader";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <Navigation />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">User Not Found</h1>
          <p className="text-muted-foreground mb-6">This profile doesn't exist or has been removed.</p>
          <Link href="/readers">
            <Button variant="outline" data-testid="button-back-readers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Readers
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title={`${displayName} | Book Slump Rescue`} description="This user is blocked." />
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link href="/readers">
            <Button variant="ghost" size="sm" className="mb-4 gap-1" data-testid="button-back-readers">
              <ArrowLeft className="w-4 h-4" />
              Back to Readers
            </Button>
          </Link>
          <Card className="p-8 text-center">
            <ShieldBan className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h1 className="text-xl font-bold mb-2" data-testid="text-blocked-message">You have blocked this user</h1>
            <p className="text-muted-foreground text-sm mb-6">
              You won't see their content or activity. Unblock them to view their profile.
            </p>
            <Button
              variant="outline"
              onClick={() => unblockMutation.mutate()}
              disabled={unblockMutation.isPending}
              data-testid="button-unblock"
            >
              {unblockMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShieldOff className="w-4 h-4 mr-2" />
              )}
              Unblock {displayName}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const profileActionsMenu = isAuthenticated && !isSelf ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="button-profile-actions">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isBlocked ? (
          <DropdownMenuItem
            onClick={() => unblockMutation.mutate()}
            data-testid="menu-unblock"
          >
            <ShieldOff className="w-4 h-4 mr-2" />
            Unblock User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => setShowBlockDialog(true)}
            data-testid="menu-block"
          >
            <ShieldBan className="w-4 h-4 mr-2" />
            Block User
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => setShowReportDialog(true)}
          data-testid="menu-report"
        >
          <Flag className="w-4 h-4 mr-2" />
          Report User
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  if (!profile.isProfilePublic && !isSelf) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title={`${displayName} | Book Slump Rescue`} description="This reader's profile is private." />
        <Navigation />
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <Link href="/readers">
            <Button variant="ghost" size="sm" className="mb-4 gap-1" data-testid="button-back-readers">
              <ArrowLeft className="w-4 h-4" />
              Back to Readers
            </Button>
          </Link>
          <Card className="p-8 text-center">
            <div className="flex justify-end mb-2">
              {profileActionsMenu}
            </div>
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={profile.profileImageUrl || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl">{getInitials(profile)}</AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-bold mb-2" data-testid="text-profile-name">{displayName}</h1>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-4">
              <Lock className="w-4 h-4" />
              <span className="text-sm">This profile is private</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-6">
              <span data-testid="text-follower-count">{profile.followerCount} follower{profile.followerCount !== 1 ? "s" : ""}</span>
              <span data-testid="text-following-count">{profile.followingCount} following</span>
            </div>
            <FollowButton
              followStatus={followStatus}
              isAuthenticated={isAuthenticated}
              isSelf={isSelf}
              followMutation={followMutation}
              unfollowMutation={unfollowMutation}
              cancelRequestMutation={cancelRequestMutation}
              size="default"
            />
          </Card>
        </div>

        <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Block {displayName}?</AlertDialogTitle>
              <AlertDialogDescription>
                They won't be able to see your profile, follow you, or interact with you. You will also unfollow each other.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-block">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => blockMutation.mutate()}
                disabled={blockMutation.isPending}
                data-testid="button-confirm-block"
              >
                {blockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Block
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report {displayName}</DialogTitle>
              <DialogDescription>
                Help us understand what's wrong. Your report will be reviewed by our team.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Additional details (optional)"
                value={reportDetails}
                onChange={e => setReportDetails(e.target.value)}
                data-testid="input-report-details"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowReportDialog(false)}
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!reportReason) return;
                  setShowReportDialog(false);
                  setShowReportGuidelines(true);
                }}
                disabled={!reportReason || reportMutation.isPending}
                data-testid="button-submit-report"
              >
                {reportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Submit Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <CommunityGuidelinesDialog
        open={showReportGuidelines}
        onOpenChange={setShowReportGuidelines}
        onAccept={() => reportMutation.mutate({ reason: reportReason, details: reportDetails })}
        context="report"
      />
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title={`${displayName} | Book Slump Rescue`}
        description={profile.bio || `${displayName}'s reading profile on Book Slump Rescue.`}
      />
      <Navigation />

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/readers">
          <Button variant="ghost" size="sm" className="mb-4 gap-1" data-testid="button-back-readers">
            <ArrowLeft className="w-4 h-4" />
            Back to Readers
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <Avatar className="h-20 w-20 flex-shrink-0">
                <AvatarImage src={profile.profileImageUrl || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl">{getInitials(profile)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold" data-testid="text-profile-name">{displayName}</h1>
                    {profile.bio && (
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed" data-testid="text-profile-bio">{profile.bio}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <FollowButton
                      followStatus={followStatus}
                      isAuthenticated={isAuthenticated}
                      isSelf={isSelf}
                      followMutation={followMutation}
                      unfollowMutation={unfollowMutation}
                      cancelRequestMutation={cancelRequestMutation}
                    />
                    {isSelf && (
                      <Link href="/profile">
                        <Button variant="outline" size="sm" data-testid="button-edit-profile">
                          Edit Profile
                        </Button>
                      </Link>
                    )}
                    {profileActionsMenu}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid="text-follower-count">
                    <Users className="w-3.5 h-3.5" />
                    {profile.followerCount} follower{profile.followerCount !== 1 ? "s" : ""}
                  </span>
                  <span data-testid="text-following-count">{profile.followingCount} following</span>
                  {profile.booksFinished !== undefined && (
                    <span className="flex items-center gap-1" data-testid="text-books-finished">
                      <BookOpen className="w-3.5 h-3.5" />
                      {profile.booksFinished} finished
                    </span>
                  )}
                  {profile.totalBooks !== undefined && (
                    <span className="flex items-center gap-1" data-testid="text-total-books">
                      <Library className="w-3.5 h-3.5" />
                      {profile.totalBooks} in library
                    </span>
                  )}
                  {profile.createdAt && (
                    <span className="flex items-center gap-1" data-testid="text-joined">
                      <Calendar className="w-3.5 h-3.5" />
                      Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>

                {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3" data-testid="profile-genres">
                    {profile.favoriteGenres.map(genre => (
                      <Badge key={genre} variant="secondary" className="text-xs">{genre}</Badge>
                    ))}
                  </div>
                )}

                {profile.arcBadges && profile.arcBadges.length > 0 && (
                  <div className="mt-4" data-testid="profile-arc-badges">
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">ARC Reviewer Badges</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.arcBadges.map(badge => (
                        <div
                          key={badge.badgeKey}
                          className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-full px-3 py-1"
                          title={badge.badgeDescription}
                          data-testid={`arc-badge-${badge.badgeKey}`}
                        >
                          {badge.badgeIcon === "pen" ? (
                            <Pen className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Medal className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          )}
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">{badge.badgeName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {profile.currentlyReading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Currently Reading</p>
              <p className="font-medium" data-testid="text-currently-reading">{profile.currentlyReading}</p>
            </Card>
          </motion.div>
        )}

        {profile.currentlyReadingBooks && profile.currentlyReadingBooks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Currently Reading
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
              {profile.currentlyReadingBooks.map(book => (
                <Card key={book.id} className="overflow-hidden" data-testid={`reading-book-${book.id}`}>
                  {book.bookCoverUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={book.bookCoverUrl}
                      alt={book.bookTitle}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center p-2">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{book.bookTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{book.bookAuthor}</p>
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {profile.recentlyFinished && profile.recentlyFinished.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Recently Finished
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-6">
              {profile.recentlyFinished.map(book => (
                <Card key={book.id} className="overflow-hidden" data-testid={`finished-book-${book.id}`}>
                  {book.bookCoverUrl ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={book.bookCoverUrl}
                      alt={book.bookTitle}
                      className="w-full aspect-[2/3] object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-muted flex items-center justify-center p-2">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{book.bookTitle}</p>
                    <p className="text-xs text-muted-foreground truncate">{book.bookAuthor}</p>
                    {book.rating && <StarRating rating={book.rating} />}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {(!profile.currentlyReadingBooks || profile.currentlyReadingBooks.length === 0) &&
         (!profile.recentlyFinished || profile.recentlyFinished.length === 0) &&
         !profile.currentlyReading && (
          <Card className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {displayName} hasn't added any books to their library yet.
            </p>
          </Card>
        )}
      </div>

      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your profile, follow you, or interact with you. You will also unfollow each other.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-block">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockMutation.mutate()}
              disabled={blockMutation.isPending}
              data-testid="button-confirm-block"
            >
              {blockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {displayName}</DialogTitle>
            <DialogDescription>
              Help us understand what's wrong. Your report will be reviewed by our team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger data-testid="select-report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional details (optional)"
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              data-testid="input-report-details"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!reportReason) return;
                setShowReportDialog(false);
                setShowReportGuidelines(true);
              }}
              disabled={!reportReason || reportMutation.isPending}
              data-testid="button-submit-report"
            >
              {reportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}
