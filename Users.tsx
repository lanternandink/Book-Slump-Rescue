import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  UserPlus,
  UserMinus,
  User,
  Users as UsersIcon,
  Loader2,
  LogIn,
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Link } from "wouter";

interface UserResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  bio?: string | null;
  isProfilePublic?: boolean;
}

interface UserProfile {
  id: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  followerCount: number;
  followingCount: number;
}

function getUserDisplayName(user: UserResult | UserProfile): string {
  if (user.displayName) return user.displayName;
  const parts = [user.firstName, user.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Reader";
}

function getInitials(user: UserResult | UserProfile): string {
  const name = getUserDisplayName(user);
  return name.charAt(0).toUpperCase();
}

function UserCard({ user, currentUserId }: { user: UserResult; currentUserId: string | null }) {
  const queryClient = useQueryClient();
  const isSelf = currentUserId === user.id;

  const { data: followStatus } = useQuery<{
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
  }>({
    queryKey: ["/api/user/follow-status", user.id],
    enabled: !!currentUserId && !isSelf,
  });

  const followMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/user/follow", { followingId: user.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/follow-status", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/followers"] });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/user/follow/${user.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/follow-status", user.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/followers"] });
    },
  });

  const isFollowing = followStatus?.isFollowing ?? false;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Card data-testid={`user-card-${user.id}`} className="hover-elevate">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/readers/${user.id}`} data-testid={`link-profile-${user.id}`}>
            <Avatar className="h-12 w-12 flex-shrink-0 cursor-pointer">
              <AvatarImage src={user.profileImageUrl || undefined} alt={getUserDisplayName(user)} />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
          </Link>

          <div className="flex-1 min-w-0">
            <Link href={`/readers/${user.id}`}>
              <p className="font-medium text-sm truncate cursor-pointer hover:underline" data-testid={`user-name-${user.id}`}>
                {getUserDisplayName(user)}
              </p>
            </Link>
            {user.bio && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.bio}</p>
            )}
            {followStatus && (
              <p className="text-xs text-muted-foreground mt-0.5" data-testid={`user-stats-${user.id}`}>
                {followStatus.followerCount} follower{followStatus.followerCount !== 1 ? "s" : ""}
                {" \u00B7 "}
                {followStatus.followingCount} following
              </p>
            )}
          </div>

          {currentUserId && !isSelf && (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={() => isFollowing ? unfollowMutation.mutate() : followMutation.mutate()}
              disabled={isPending}
              data-testid={`button-follow-${user.id}`}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isFollowing ? (
                <>
                  <UserMinus className="h-4 w-4 mr-1" />
                  Unfollow
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Follow
                </>
              )}
            </Button>
          )}

          {isSelf && (
            <Link href="/profile">
              <Button variant="ghost" size="sm" data-testid="button-edit-own-profile">
                Edit Profile
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      setDebouncedQuery(value.trim());
    }, 300);
    setDebounceTimer(timer);
  };

  const { data: searchResults = [], isLoading: isSearching } = useQuery<UserResult[]>({
    queryKey: ["/api/users/search", debouncedQuery],
    queryFn: async () => {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(debouncedQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: debouncedQuery.length >= 2,
  });

  const { data: followingList = [] } = useQuery<Array<{ id: number; followingId: string }>>({
    queryKey: ["/api/user/following"],
    enabled: isAuthenticated,
  });

  const { data: followersList = [] } = useQuery<Array<{ id: number; followerId: string }>>({
    queryKey: ["/api/user/followers"],
    enabled: isAuthenticated,
  });

  const currentUserId = user?.id ?? null;

  return (
    <>
      <SEOHead
        title="Find Readers | Book Slump Rescue"
        description="Discover and connect with fellow readers. Search for users, follow their reading journeys, and build your reading community."
      />
      <Navigation />
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <UsersIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Find Readers</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Search for fellow readers and connect with your community
            </p>
          </motion.div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or display name..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
              data-testid="input-user-search"
            />
          </div>

          {debouncedQuery.length >= 2 && (
            <div className="space-y-3 mb-8">
              <h2 className="text-sm font-medium text-muted-foreground" data-testid="text-search-results-label">
                {isSearching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${debouncedQuery}"`}
              </h2>
              {isSearching ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full rounded-lg" />
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((u, index) => (
                    <motion.div
                      key={u.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <UserCard user={u} currentUserId={currentUserId} />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <User className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground text-sm" data-testid="text-no-results">
                      No readers found matching "{debouncedQuery}"
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {debouncedQuery.length < 2 && !isAuthenticated && (
            <Card>
              <CardContent className="p-8 text-center">
                <LogIn className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground mb-4">
                  Sign in to see your followers and people you follow
                </p>
                <a href="/api/login">
                  <Button data-testid="button-sign-in">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

          {debouncedQuery.length < 2 && isAuthenticated && (
            <div className="space-y-6">
              {followingList.length > 0 && (
                <FollowSection
                  title="People You Follow"
                  userIds={followingList.map(f => f.followingId)}
                  currentUserId={currentUserId}
                  testId="section-following"
                />
              )}

              {followersList.length > 0 && (
                <FollowSection
                  title="Your Followers"
                  userIds={followersList.map(f => f.followerId)}
                  currentUserId={currentUserId}
                  testId="section-followers"
                />
              )}

              {followingList.length === 0 && followersList.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <UsersIcon className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm mb-1" data-testid="text-empty-connections">
                      You haven't connected with anyone yet
                    </p>
                    <p className="text-muted-foreground/70 text-xs">
                      Use the search bar above to find fellow readers
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function FollowSection({ title, userIds, currentUserId, testId }: {
  title: string;
  userIds: string[];
  currentUserId: string | null;
  testId: string;
}) {
  const userQueries = userIds.map(id => ({
    queryKey: ["/api/users", id, "profile"],
    enabled: true,
  }));

  return (
    <div data-testid={testId}>
      <h2 className="text-sm font-medium text-muted-foreground mb-3">{title} ({userIds.length})</h2>
      <div className="space-y-3">
        {userIds.map(id => (
          <FollowUserCard key={id} userId={id} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  );
}

function FollowUserCard({ userId, currentUserId }: { userId: string; currentUserId: string | null }) {
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/users", userId, "profile"],
  });

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-lg" />;
  }

  if (!profile) return null;

  const userResult: UserResult = {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    displayName: profile.displayName,
    profileImageUrl: profile.profileImageUrl,
  };

  return <UserCard user={userResult} currentUserId={currentUserId} />;
}
