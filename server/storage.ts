import { 
  type User, 
  type UpsertUser, 
  type Book, 
  type InsertBook,
  type CatalogBook,
  type InsertCatalogBook,
  type UserBook,
  type InsertUserBook,
  type UserChallenge,
  type InsertUserChallenge,
  type BookStatus,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type QuizHistory,
  type InsertQuizHistory,
  type ReadingStreak,
  type InsertReadingStreak,
  type ReadingList,
  type InsertReadingList,
  type ReadingListItem,
  type InsertReadingListItem,
  type BookQuote,
  type InsertBookQuote,
  type BookSeries,
  type InsertBookSeries,
  type SeriesBook,
  type InsertSeriesBook,
  type AuthorProfile,
  type InsertAuthorProfile,
  type AuthorBook,
  type InsertAuthorBook,
  type FeaturedPlacement,
  type InsertFeaturedPlacement,
  type ArcClaim,
  type ArcBlockedUser,
  type ArcWaitlistEntry,
  type ArcClaimReport,
  type ArcFeedback,
  type InsertArcFeedback,
  type Follow,
  type InsertFollow,
  type ActivityEvent,
  type InsertActivityEvent,
  type Notification,
  type InsertNotification,
  type AuthorBookReview,
  type InsertAuthorBookReview,
  type BookClub,
  type InsertBookClub,
  type ClubMember,
  type InsertClubMember,
  type ClubDiscussion,
  type InsertClubDiscussion,
  type ClubReadingBook,
  type InsertClubReadingBook,
  type ClubVote,
  type InsertClubVote,
  type ClubMeeting,
  type InsertClubMeeting,
  type ClubMeetingRsvp,
  type InsertClubMeetingRsvp,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type Discussion,
  type InsertDiscussion,
  type DiscussionComment,
  type InsertDiscussionComment,
  type BookSubmission,
  type InsertBookSubmission,
  type ShopProduct,
  type InsertShopProduct,
  type ChildProfile,
  type InsertChildProfile,
  type ChildReadingLog,
  type InsertChildReadingLog,
  type ChildReadingGoal,
  type InsertChildReadingGoal,
  type ChildChallenge,
  type InsertChildChallenge,
  type BookTagSuggestion,
  type InsertBookTagSuggestion,
  type IndieSpotlight,
  type InsertIndieSpotlight,
  type IndieSpotlightRequest,
  type InsertIndieSpotlightRequest,
  type TopicFollow,
  type InterviewRequest,
  type InsertInterviewRequest,
  type DiscoveryTag,
  type InsertDiscoveryTag,
  type BookDiscoveryTag,
  type SavedFilterPreset,
  type InsertSavedFilterPreset,
} from "@shared/schema";

export interface IStorage {
  deleteUserAccount(userId: string): Promise<void>;

  // Legacy book methods (for backwards compatibility)
  getAllBooks(): Promise<Book[]>;
  getBook(id: number): Promise<Book | undefined>;
  
  // Catalog book methods
  getCatalogBooks(): Promise<CatalogBook[]>;
  getCatalogBook(id: number): Promise<CatalogBook | undefined>;
  getCatalogBookByIsbn13(isbn: string): Promise<CatalogBook | undefined>;
  getCatalogBookByTitleAuthor(title: string, author: string): Promise<CatalogBook | undefined>;
  getCatalogBookBySourceId(sourceId: string): Promise<CatalogBook | undefined>;
  createCatalogBook(book: InsertCatalogBook): Promise<CatalogBook>;
  getCatalogBookCount(): Promise<number>;
  
  // User library methods
  getUserBooks(userId: string): Promise<UserBook[]>;
  getUserBook(id: number): Promise<UserBook | undefined>;
  getUserBookByTitle(userId: string, bookTitle: string): Promise<UserBook | undefined>;
  createUserBook(book: InsertUserBook): Promise<UserBook>;
  updateUserBook(id: number, updates: Partial<InsertUserBook>): Promise<UserBook | undefined>;
  deleteUserBook(id: number): Promise<boolean>;
  getUserStats(userId: string): Promise<{ totalBooks: number; booksRead: number; booksThisYear: number; averageRating: number }>;
  
  // User challenge methods
  getUserChallenge(userId: string, year: number): Promise<UserChallenge | undefined>;
  createUserChallenge(challenge: InsertUserChallenge): Promise<UserChallenge>;
  updateUserChallenge(id: number, updates: Partial<InsertUserChallenge>): Promise<UserChallenge | undefined>;
  deleteUserChallenge(id: number): Promise<boolean>;
  
  // Newsletter methods
  createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;
  getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined>;
  
  // Quiz history methods
  createQuizHistory(history: InsertQuizHistory): Promise<QuizHistory>;
  getUserQuizHistory(userId: string): Promise<QuizHistory[]>;
  
  // Reading streak methods
  getUserStreak(userId: string): Promise<ReadingStreak | undefined>;
  upsertUserStreak(userId: string, updates: Partial<InsertReadingStreak>): Promise<ReadingStreak>;
  
  // Reading lists methods
  getUserReadingLists(userId: string): Promise<ReadingList[]>;
  getReadingList(id: number): Promise<ReadingList | undefined>;
  createReadingList(list: InsertReadingList): Promise<ReadingList>;
  updateReadingList(id: number, updates: Partial<InsertReadingList>): Promise<ReadingList | undefined>;
  deleteReadingList(id: number): Promise<boolean>;
  getReadingListItems(listId: number): Promise<ReadingListItem[]>;
  addReadingListItem(item: InsertReadingListItem): Promise<ReadingListItem>;
  removeReadingListItem(id: number): Promise<boolean>;
  
  // Book quotes methods
  getUserQuotes(userId: string): Promise<BookQuote[]>;
  getQuote(id: number): Promise<BookQuote | undefined>;
  createQuote(quote: InsertBookQuote): Promise<BookQuote>;
  updateQuote(id: number, updates: Partial<InsertBookQuote>): Promise<BookQuote | undefined>;
  deleteQuote(id: number): Promise<boolean>;
  
  // Book series methods
  getUserSeries(userId: string): Promise<BookSeries[]>;
  getSeries(id: number): Promise<BookSeries | undefined>;
  createSeries(series: InsertBookSeries): Promise<BookSeries>;
  updateSeries(id: number, updates: Partial<InsertBookSeries>): Promise<BookSeries | undefined>;
  deleteSeries(id: number): Promise<boolean>;
  getSeriesBooks(seriesId: number): Promise<SeriesBook[]>;
  addSeriesBook(book: InsertSeriesBook): Promise<SeriesBook>;
  updateSeriesBook(id: number, updates: Partial<InsertSeriesBook>): Promise<SeriesBook | undefined>;
  removeSeriesBook(id: number): Promise<boolean>;
  
  // Author profile methods
  getAuthorProfile(userId: string): Promise<AuthorProfile | undefined>;
  getAuthorProfileById(id: number): Promise<AuthorProfile | undefined>;
  getAuthorProfileBySlug(slug: string): Promise<AuthorProfile | undefined>;
  getAllAuthorProfiles(): Promise<AuthorProfile[]>;
  getAuthorProfilesByUserIds(userIds: string[]): Promise<AuthorProfile[]>;
  createAuthorProfile(profile: InsertAuthorProfile): Promise<AuthorProfile>;
  updateAuthorProfile(userId: string, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined>;
  updateAuthorProfileById(id: number, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined>;
  
  // Author books methods
  getAuthorBooks(authorProfileId: number): Promise<AuthorBook[]>;
  getAuthorBook(id: number): Promise<AuthorBook | undefined>;
  createAuthorBook(book: InsertAuthorBook): Promise<AuthorBook>;
  updateAuthorBook(id: number, updates: Partial<InsertAuthorBook>): Promise<AuthorBook | undefined>;
  deleteAuthorBook(id: number): Promise<boolean>;
  incrementArcClaimCount(id: number): Promise<AuthorBook | undefined>;
  
  // ARC claim tracking methods
  hasUserClaimedArc(userId: string, bookId: number): Promise<boolean>;
  getUserArcClaimsToday(userId: string): Promise<number>;
  createArcClaim(claim: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null; downloadExpiresAt?: Date | null }): Promise<ArcClaim>;
  getArcClaimsForBook(bookId: number): Promise<ArcClaim[]>;
  getArcClaimsForAuthor(authorProfileId: number): Promise<ArcClaim[]>;
  getArcClaim(id: number): Promise<ArcClaim | undefined>;
  updateArcClaim(id: number, updates: Partial<ArcClaim>): Promise<ArcClaim | undefined>;
  
  // ARC blocked users methods
  getBlockedUsers(authorProfileId: number): Promise<ArcBlockedUser[]>;
  isUserBlocked(authorProfileId: number, userId: string): Promise<boolean>;
  blockUser(data: { authorProfileId: number; blockedUserId: string; blockedUserName: string | null; reason: string | null }): Promise<ArcBlockedUser>;
  unblockUser(id: number): Promise<boolean>;
  
  // ARC waitlist methods
  getWaitlist(bookId: number): Promise<ArcWaitlistEntry[]>;
  isUserOnWaitlist(bookId: number, userId: string): Promise<boolean>;
  joinWaitlist(data: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null }): Promise<ArcWaitlistEntry>;
  leaveWaitlist(id: number): Promise<boolean>;
  
  // ARC claim reports methods
  createClaimReport(data: { authorProfileId: number; claimId: number; userId: string; reason: string; details: string | null }): Promise<ArcClaimReport>;
  getReportsForAuthor(authorProfileId: number): Promise<ArcClaimReport[]>;
  updateReportStatus(id: number, status: string): Promise<ArcClaimReport | undefined>;
  
  // ARC reading progress
  updateArcReadingProgress(claimId: number, progress: number): Promise<ArcClaim | undefined>;

  // ARC pipeline status
  updateArcClaimStatus(claimId: number, status: import("@shared/schema").ArcClaimStatus): Promise<ArcClaim | undefined>;
  getUserArcClaims(userId: string): Promise<(ArcClaim & { book: import("@shared/schema").AuthorBook | null })[]>;

  // ARC invite methods
  getArcInvite(token: string): Promise<import("@shared/schema").ArcInvite | undefined>;
  createArcInvite(data: import("@shared/schema").InsertArcInvite): Promise<import("@shared/schema").ArcInvite>;
  getArcInvitesForBook(bookId: number): Promise<import("@shared/schema").ArcInvite[]>;
  markArcInviteUsed(token: string, userId: string): Promise<import("@shared/schema").ArcInvite | undefined>;

  // ARC share token / discovery
  generateArcShareToken(bookId: number): Promise<string>;
  getAuthorBookByShareToken(token: string): Promise<import("@shared/schema").AuthorBook | undefined>;

  // ARC private feedback methods
  createArcFeedback(feedback: InsertArcFeedback): Promise<ArcFeedback>;
  getArcFeedbackForBook(bookId: number): Promise<ArcFeedback[]>;
  getArcFeedbackForAuthor(authorProfileId: number): Promise<ArcFeedback[]>;

  // ARC analytics / security stats
  getArcSecurityStats(authorProfileId: number): Promise<{
    totalClaims: number;
    blockedUsersCount: number;
    flaggedClaimsCount: number;
    pendingReportsCount: number;
    waitlistSize: number;
    claimsByDay: { date: string; count: number }[];
  }>;

  // ARC conversion stats
  getArcConversionStats(authorProfileId: number): Promise<{
    totalClaims: number;
    totalReviews: number;
    conversionRate: number;
    averageArcRating: number;
    averageNonArcRating: number;
    claimsWithReview: { bookId: number; bookTitle: string; claims: number; reviews: number; rate: number }[];
  }>;

  // ARC claim export data
  getArcClaimExportData(authorProfileId: number): Promise<{
    bookTitle: string;
    claimerName: string;
    claimedAt: string;
    readingProgress: number;
    hasReviewed: boolean;
    isFlagged: boolean;
  }[]>;
  
  // Featured placements methods
  getActiveFeaturedPlacements(type?: string): Promise<(FeaturedPlacement & { author?: AuthorProfile })[]>;
  createFeaturedPlacement(placement: InsertFeaturedPlacement): Promise<FeaturedPlacement>;
  updateFeaturedPlacement(id: number, updates: Partial<InsertFeaturedPlacement>): Promise<FeaturedPlacement | undefined>;
  deleteFeaturedPlacement(id: number): Promise<boolean>;
  
  // User search methods
  searchUsers(query: string, limit?: number): Promise<User[]>;
  getUserById(userId: string): Promise<User | undefined>;
  
  // Social following methods
  followUser(follow: InsertFollow): Promise<Follow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  getFollowers(userId: string): Promise<Follow[]>;
  getFollowing(userId: string): Promise<Follow[]>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  getFollowCounts(userId: string): Promise<{ followers: number; following: number }>;
  
  // Activity feed methods
  createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent>;
  getUserFeed(userId: string, followingIds: string[]): Promise<ActivityEvent[]>;
  getUserActivityEvents(userId: string): Promise<ActivityEvent[]>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<boolean>;
  markAllNotificationsRead(userId: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // Author book review methods
  createAuthorBookReview(review: InsertAuthorBookReview): Promise<AuthorBookReview>;
  getAuthorBookReviews(authorBookId: number): Promise<AuthorBookReview[]>;
  getUserReviewForBook(userId: string, authorBookId: number): Promise<AuthorBookReview | undefined>;
  deleteAuthorBookReview(id: number): Promise<boolean>;
  
  // Book club methods
  createBookClub(club: InsertBookClub): Promise<BookClub>;
  getBookClub(id: number): Promise<BookClub | undefined>;
  getPublicBookClubs(): Promise<BookClub[]>;
  getUserBookClubs(userId: string): Promise<BookClub[]>;
  updateBookClub(id: number, updates: Partial<InsertBookClub>): Promise<BookClub | undefined>;
  deleteBookClub(id: number): Promise<boolean>;
  
  // Club member methods
  joinClub(member: InsertClubMember): Promise<ClubMember>;
  leaveClub(clubId: number, userId: string): Promise<boolean>;
  getClubMembers(clubId: number): Promise<ClubMember[]>;
  isClubMember(clubId: number, userId: string): Promise<boolean>;
  getClubMemberRole(clubId: number, userId: string): Promise<string | null>;
  
  // Club discussion methods
  createClubDiscussion(post: InsertClubDiscussion): Promise<ClubDiscussion>;
  getClubDiscussions(clubId: number): Promise<ClubDiscussion[]>;
  deleteClubDiscussion(id: number): Promise<boolean>;
  
  // Club reading book methods
  addClubReadingBook(book: InsertClubReadingBook): Promise<ClubReadingBook>;
  getClubReadingBooks(clubId: number): Promise<ClubReadingBook[]>;
  updateClubReadingBook(id: number, updates: Partial<InsertClubReadingBook>): Promise<ClubReadingBook | undefined>;
  deleteClubReadingBook(id: number): Promise<boolean>;
  
  // Club meeting methods
  createClubMeeting(meeting: InsertClubMeeting): Promise<ClubMeeting>;
  getClubMeetings(clubId: number): Promise<ClubMeeting[]>;
  deleteClubMeeting(id: number): Promise<void>;
  getMeetingRsvps(meetingId: number): Promise<ClubMeetingRsvp[]>;
  upsertMeetingRsvp(rsvp: InsertClubMeetingRsvp): Promise<ClubMeetingRsvp>;
  updateMemberProgress(clubId: number, userId: string, updates: { currentChapter?: number; currentPage?: number }): Promise<void>;

  // Club reading schedule methods
  getClubReadingSchedule(clubId: number): Promise<any[]>;
  upsertClubReadingSchedule(clubId: number, weeks: { weekNumber: number; label: string; chapterStart?: number; chapterEnd?: number }[]): Promise<void>;
  deleteAllClubs(): Promise<void>;

  // Club vote methods
  addClubVote(vote: InsertClubVote): Promise<ClubVote>;
  getClubVotes(clubId: number, bookId: number): Promise<ClubVote[]>;
  hasUserVoted(clubId: number, bookId: number, userId: string): Promise<boolean>;
  
  // Analytics methods
  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  getAuthorAnalytics(authorProfileId: number): Promise<{ profileViews: number; buyClicks: number; byDay: { date: string; views: number; clicks: number }[] }>;

  // Community discussion methods
  getDiscussions(): Promise<Discussion[]>;
  getDiscussion(id: number): Promise<Discussion | undefined>;
  createDiscussion(discussion: InsertDiscussion): Promise<Discussion>;
  deleteDiscussion(id: number): Promise<boolean>;
  getDiscussionComments(discussionId: number): Promise<DiscussionComment[]>;
  createDiscussionComment(comment: InsertDiscussionComment): Promise<DiscussionComment>;
  deleteDiscussionComment(id: number): Promise<boolean>;

  // Book submission methods
  createBookSubmission(submission: InsertBookSubmission): Promise<BookSubmission>;
  getBookSubmissions(): Promise<BookSubmission[]>;

  // Shop product methods
  getShopProducts(): Promise<ShopProduct[]>;
  getActiveShopProducts(): Promise<ShopProduct[]>;
  getShopProduct(id: number): Promise<ShopProduct | undefined>;
  createShopProduct(product: InsertShopProduct): Promise<ShopProduct>;
  updateShopProduct(id: number, updates: Partial<InsertShopProduct>): Promise<ShopProduct | undefined>;
  deleteShopProduct(id: number): Promise<boolean>;
  getShopCategories(): Promise<string[]>;

  // Child profile methods
  getChildProfiles(parentUserId: string): Promise<ChildProfile[]>;
  getChildProfile(id: number): Promise<ChildProfile | undefined>;
  createChildProfile(profile: InsertChildProfile): Promise<ChildProfile>;
  updateChildProfile(id: number, updates: Partial<ChildProfile>): Promise<ChildProfile | undefined>;
  deleteChildProfile(id: number): Promise<boolean>;

  // Child reading log methods
  getChildReadingLogs(childProfileId: number): Promise<ChildReadingLog[]>;
  createChildReadingLog(log: InsertChildReadingLog): Promise<ChildReadingLog>;

  // Child reading goal methods
  getChildReadingGoals(childProfileId: number): Promise<ChildReadingGoal[]>;
  createChildReadingGoal(goal: InsertChildReadingGoal): Promise<ChildReadingGoal>;
  updateChildReadingGoal(id: number, updates: Partial<ChildReadingGoal>): Promise<ChildReadingGoal | undefined>;

  // Child challenge methods
  getChildChallenges(childProfileId: number): Promise<ChildChallenge[]>;
  createChildChallenge(challenge: InsertChildChallenge): Promise<ChildChallenge>;
  updateChildChallenge(id: number, updates: Partial<ChildChallenge>): Promise<ChildChallenge | undefined>;
  deleteChildChallenge(id: number): Promise<boolean>;

  // Book tag suggestion methods
  createBookTagSuggestion(suggestion: InsertBookTagSuggestion): Promise<BookTagSuggestion>;
  getBookTagSuggestions(catalogBookId: number): Promise<BookTagSuggestion[]>;
  getUserTagSuggestions(userId: string, catalogBookId: number): Promise<BookTagSuggestion[]>;
  getApprovedCommunityTags(catalogBookId: number): Promise<BookTagSuggestion[]>;

  // Indie spotlight methods
  getIndieSpotlights(): Promise<IndieSpotlight[]>;
  getActiveIndieSpotlights(): Promise<IndieSpotlight[]>;
  getIndieSpotlight(id: number): Promise<IndieSpotlight | undefined>;
  createIndieSpotlight(spotlight: InsertIndieSpotlight): Promise<IndieSpotlight>;
  updateIndieSpotlight(id: number, updates: Partial<InsertIndieSpotlight>): Promise<IndieSpotlight | undefined>;
  deleteIndieSpotlight(id: number): Promise<boolean>;
  createSpotlightRequest(data: InsertIndieSpotlightRequest): Promise<IndieSpotlightRequest>;
  getSpotlightRequests(): Promise<IndieSpotlightRequest[]>;
  getSpotlightRequest(id: number): Promise<IndieSpotlightRequest | undefined>;
  updateSpotlightRequest(id: number, data: Partial<IndieSpotlightRequest>): Promise<IndieSpotlightRequest | undefined>;
  getUserTopicFollows(userId: string): Promise<TopicFollow[]>;
  followTopic(userId: string, topic: string, category: string): Promise<TopicFollow>;
  unfollowTopic(userId: string, topic: string): Promise<boolean>;
  createInterviewRequest(data: InsertInterviewRequest): Promise<InterviewRequest>;
  getInterviewRequests(status?: string): Promise<InterviewRequest[]>;
  getInterviewRequest(id: number): Promise<InterviewRequest | undefined>;
  updateInterviewRequest(id: number, data: Partial<InterviewRequest>): Promise<InterviewRequest | undefined>;

  getDiscoveryTags(category?: string): Promise<DiscoveryTag[]>;
  createDiscoveryTag(tag: InsertDiscoveryTag): Promise<DiscoveryTag>;
  tagBook(bookId: number, tagId: number): Promise<BookDiscoveryTag>;
  untagBook(bookId: number, tagId: number): Promise<boolean>;
  getBookTags(bookId: number): Promise<DiscoveryTag[]>;
  getUserFilterPresets(userId: string): Promise<SavedFilterPreset[]>;
  createFilterPreset(preset: InsertSavedFilterPreset): Promise<SavedFilterPreset>;
  deleteFilterPreset(id: number, userId: string): Promise<boolean>;

  blockUser(blockerId: string, blockedUserId: string): Promise<void>;
  unblockUser(blockerId: string, blockedUserId: string): Promise<void>;
  getBlockedUsers(userId: string): Promise<any[]>;
  isUserBlockedBy(blockerId: string, blockedUserId: string): Promise<boolean>;

  reportUser(report: { reporterId: string; reportedUserId: string; reportedContentId?: number; reportedContentType?: string; reason: string; details?: string }): Promise<void>;

  createFollowRequest(requesterId: string, targetUserId: string): Promise<any>;
  getFollowRequests(targetUserId: string): Promise<any[]>;
  respondToFollowRequest(requestId: number, status: string): Promise<any>;
  getPendingFollowRequest(requesterId: string, targetUserId: string): Promise<any | undefined>;
  cancelFollowRequest(requesterId: string, targetUserId: string): Promise<void>;
  getSentFollowRequests(requesterId: string): Promise<any[]>;

  getCommunityEvents(filters?: { upcoming?: boolean; category?: string }): Promise<import("@shared/schema").CommunityEvent[]>;
  getCommunityEvent(id: number): Promise<import("@shared/schema").CommunityEvent | undefined>;
  createCommunityEvent(data: import("@shared/schema").InsertCommunityEvent): Promise<import("@shared/schema").CommunityEvent>;
  updateCommunityEvent(id: number, data: Partial<import("@shared/schema").InsertCommunityEvent>): Promise<import("@shared/schema").CommunityEvent>;
  deleteCommunityEvent(id: number, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private books: Map<number, Book>;
  private catalogBooks: Map<number, CatalogBook>;
  private userBooks: Map<number, UserBook>;
  private userChallenges: Map<number, UserChallenge>;
  private newsletterSubscribers: Map<number, NewsletterSubscriber>;
  private quizHistories: Map<number, QuizHistory>;
  private readingStreaks: Map<string, ReadingStreak>;
  private readingLists: Map<number, ReadingList>;
  private readingListItems: Map<number, ReadingListItem>;
  private bookQuotes: Map<number, BookQuote>;
  private bookSeries: Map<number, BookSeries>;
  private seriesBooks: Map<number, SeriesBook>;
  private authorProfiles: Map<string, AuthorProfile>;
  private authorBooksMap: Map<number, AuthorBook>;
  private featuredPlacementsMap: Map<number, FeaturedPlacement>;
  private arcClaimsMap: Map<number, ArcClaim>;
  private arcBlockedUsersMap: Map<number, ArcBlockedUser>;
  private arcWaitlistMap: Map<number, ArcWaitlistEntry>;
  private arcClaimReportsMap: Map<number, ArcClaimReport>;
  private followsMap: Map<number, Follow>;
  private activityEventsMap: Map<number, ActivityEvent>;
  private notificationsMap: Map<number, Notification>;
  private authorBookReviewsMap: Map<number, AuthorBookReview>;
  private bookClubsMap: Map<number, BookClub>;
  private clubMembersMap: Map<number, ClubMember>;
  private clubDiscussionsMap: Map<number, ClubDiscussion>;
  private clubReadingBooksMap: Map<number, ClubReadingBook>;
  private clubVotesMap: Map<number, ClubVote>;
  private analyticsEventsMap: Map<number, AnalyticsEvent>;
  private discussionsMap: Map<number, Discussion>;
  private discussionCommentsMap: Map<number, DiscussionComment>;
  private bookSubmissionsMap: Map<number, BookSubmission>;
  private currentBookId: number;
  private currentCatalogBookId: number;
  private currentUserBookId: number;
  private currentChallengeId: number;
  private currentSubscriberId: number;
  private currentQuizHistoryId: number;
  private currentReadingListId: number;
  private currentListItemId: number;
  private currentQuoteId: number;
  private currentSeriesId: number;
  private currentSeriesBookId: number;
  private currentAuthorProfileId: number;
  private currentAuthorBookId: number;
  private currentFeaturedPlacementId: number;
  private currentArcClaimId: number;
  private currentBlockedUserId: number;
  private currentWaitlistId: number;
  private currentClaimReportId: number;
  private currentFollowId: number;
  private currentActivityEventId: number;
  private currentNotificationId: number;
  private currentAuthorBookReviewId: number;
  private currentBookClubId: number;
  private currentClubMemberId: number;
  private currentClubDiscussionId: number;
  private currentClubReadingBookId: number;
  private currentClubVoteId: number;
  private currentAnalyticsEventId: number;
  private currentDiscussionId: number;
  private currentDiscussionCommentId: number;
  private currentBookSubmissionId: number;

  constructor() {
    this.books = new Map();
    this.catalogBooks = new Map();
    this.userBooks = new Map();
    this.userChallenges = new Map();
    this.newsletterSubscribers = new Map();
    this.quizHistories = new Map();
    this.readingStreaks = new Map();
    this.readingLists = new Map();
    this.readingListItems = new Map();
    this.bookQuotes = new Map();
    this.bookSeries = new Map();
    this.seriesBooks = new Map();
    this.authorProfiles = new Map();
    this.authorBooksMap = new Map();
    this.featuredPlacementsMap = new Map();
    this.arcClaimsMap = new Map();
    this.arcBlockedUsersMap = new Map();
    this.arcWaitlistMap = new Map();
    this.arcClaimReportsMap = new Map();
    this.followsMap = new Map();
    this.activityEventsMap = new Map();
    this.notificationsMap = new Map();
    this.authorBookReviewsMap = new Map();
    this.bookClubsMap = new Map();
    this.clubMembersMap = new Map();
    this.clubDiscussionsMap = new Map();
    this.clubReadingBooksMap = new Map();
    this.clubVotesMap = new Map();
    this.analyticsEventsMap = new Map();
    this.discussionsMap = new Map();
    this.discussionCommentsMap = new Map();
    this.bookSubmissionsMap = new Map();
    this.currentBookId = 1;
    this.currentCatalogBookId = 1;
    this.currentUserBookId = 1;
    this.currentChallengeId = 1;
    this.currentSubscriberId = 1;
    this.currentQuizHistoryId = 1;
    this.currentReadingListId = 1;
    this.currentListItemId = 1;
    this.currentQuoteId = 1;
    this.currentSeriesId = 1;
    this.currentSeriesBookId = 1;
    this.currentAuthorProfileId = 1;
    this.currentAuthorBookId = 1;
    this.currentFeaturedPlacementId = 1;
    this.currentArcClaimId = 1;
    this.currentBlockedUserId = 1;
    this.currentWaitlistId = 1;
    this.currentClaimReportId = 1;
    this.currentFollowId = 1;
    this.currentActivityEventId = 1;
    this.currentNotificationId = 1;
    this.currentAuthorBookReviewId = 1;
    this.currentBookClubId = 1;
    this.currentClubMemberId = 1;
    this.currentClubDiscussionId = 1;
    this.currentClubReadingBookId = 1;
    this.currentClubVoteId = 1;
    this.currentAnalyticsEventId = 1;
    this.currentDiscussionId = 1;
    this.currentDiscussionCommentId = 1;
    this.currentBookSubmissionId = 1;
    this.seedBooks();
  }

  async getAllBooks(): Promise<Book[]> {
    return Array.from(this.books.values());
  }

  async getBook(id: number): Promise<Book | undefined> {
    return this.books.get(id);
  }

  // Catalog book methods
  async getCatalogBooks(): Promise<CatalogBook[]> {
    return Array.from(this.catalogBooks.values());
  }

  async getCatalogBook(id: number): Promise<CatalogBook | undefined> {
    return this.catalogBooks.get(id);
  }

  async getCatalogBookByIsbn13(isbn: string): Promise<CatalogBook | undefined> {
    return Array.from(this.catalogBooks.values()).find(
      (book) => book.isbn13 === isbn
    );
  }

  async getCatalogBookByTitleAuthor(title: string, author: string): Promise<CatalogBook | undefined> {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedAuthor = author.toLowerCase().trim();
    
    return Array.from(this.catalogBooks.values()).find(
      (book) => 
        book.title.toLowerCase().trim() === normalizedTitle &&
        book.authors.some(a => a.toLowerCase().trim() === normalizedAuthor)
    );
  }

  async getCatalogBookBySourceId(sourceId: string): Promise<CatalogBook | undefined> {
    return Array.from(this.catalogBooks.values()).find(
      (book) => book.sourceId === sourceId
    );
  }

  async createCatalogBook(book: InsertCatalogBook): Promise<CatalogBook> {
    const id = this.currentCatalogBookId++;
    const catalogBook: CatalogBook = {
      id,
      title: book.title,
      authors: book.authors,
      description: book.description ?? null,
      isbn10: book.isbn10 ?? null,
      isbn13: book.isbn13 ?? null,
      categories: book.categories ?? null,
      pageCount: book.pageCount ?? null,
      publishedDate: book.publishedDate ?? null,
      coverUrl: book.coverUrl ?? null,
      source: book.source ?? "google_books",
      sourceId: book.sourceId,
      mood: book.mood ?? null,
      pace: book.pace ?? null,
      length: book.length ?? null,
      spiceLevel: book.spiceLevel ?? 1,
      darknessLevel: book.darknessLevel ?? 2,
      tropes: book.tropes ?? [],
      tags: book.tags ?? [],
      moodTags: book.moodTags ?? [],
      contentWarnings: book.contentWarnings ?? [],
      romanceLevel: book.romanceLevel ?? "none",
      tone: book.tone ?? "medium",
      hasEbook: book.hasEbook ?? true,
      hasAudiobook: book.hasAudiobook ?? false,
      kindleUnlimited: book.kindleUnlimited ?? false,
      libbyAvailable: book.libbyAvailable ?? false,
      importedAt: new Date(),
    };
    this.catalogBooks.set(id, catalogBook);
    return catalogBook;
  }

  async getCatalogBookCount(): Promise<number> {
    return this.catalogBooks.size;
  }

  // User library methods
  async getUserBooks(userId: string): Promise<UserBook[]> {
    return Array.from(this.userBooks.values()).filter(
      (book) => book.userId === userId
    );
  }

  async getUserBook(id: number): Promise<UserBook | undefined> {
    return this.userBooks.get(id);
  }

  async getUserBookByTitle(userId: string, bookTitle: string): Promise<UserBook | undefined> {
    const normalizedTitle = bookTitle.toLowerCase().trim();
    return Array.from(this.userBooks.values()).find(
      (book) => book.userId === userId && book.bookTitle.toLowerCase().trim() === normalizedTitle
    );
  }

  async createUserBook(book: InsertUserBook): Promise<UserBook> {
    const id = this.currentUserBookId++;
    const userBook: UserBook = {
      id,
      userId: book.userId,
      bookTitle: book.bookTitle,
      bookAuthor: book.bookAuthor,
      bookCoverUrl: book.bookCoverUrl ?? null,
      catalogBookId: book.catalogBookId ?? null,
      googleBooksId: book.googleBooksId ?? null,
      status: book.status ?? "want_to_read",
      rating: book.rating ?? null,
      review: book.review ?? null,
      notes: book.notes ?? null,
      isSpoiler: book.isSpoiler ?? false,
      dnfReason: book.dnfReason ?? null,
      dnfStopPoint: book.dnfStopPoint ?? null,
      isOwned: book.isOwned ?? false,
      format: book.format ?? null,
      shelfLocation: book.shelfLocation ?? null,
      currentPage: book.currentPage ?? 0,
      dateAdded: new Date(),
      dateStarted: book.dateStarted ?? null,
      dateFinished: book.dateFinished ?? null,
      pageCount: book.pageCount ?? null,
    };
    this.userBooks.set(id, userBook);
    return userBook;
  }

  async updateUserBook(id: number, updates: Partial<InsertUserBook>): Promise<UserBook | undefined> {
    const existing = this.userBooks.get(id);
    if (!existing) return undefined;
    
    const updated: UserBook = {
      ...existing,
      ...updates,
      id: existing.id,
      dateAdded: existing.dateAdded,
    };
    this.userBooks.set(id, updated);
    return updated;
  }

  async deleteUserBook(id: number): Promise<boolean> {
    return this.userBooks.delete(id);
  }

  async getUserStats(userId: string): Promise<{ totalBooks: number; booksRead: number; booksThisYear: number; averageRating: number }> {
    const userBooks = await this.getUserBooks(userId);
    const currentYear = new Date().getFullYear();
    
    const finished = userBooks.filter(b => b.status === "finished");
    const thisYear = finished.filter(b => {
      if (!b.dateFinished) return false;
      const date = new Date(b.dateFinished);
      return date.getFullYear() === currentYear;
    });
    
    const ratings = finished.filter(b => b.rating !== null).map(b => b.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
    
    return {
      totalBooks: userBooks.length,
      booksRead: finished.length,
      booksThisYear: thisYear.length,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }

  // User challenge methods
  async getUserChallenge(userId: string, year: number): Promise<UserChallenge | undefined> {
    return Array.from(this.userChallenges.values()).find(
      (c) => c.userId === userId && c.year === year
    );
  }

  async createUserChallenge(challenge: InsertUserChallenge): Promise<UserChallenge> {
    const id = this.currentChallengeId++;
    const newChallenge: UserChallenge = {
      id,
      userId: challenge.userId,
      year: challenge.year,
      goal: challenge.goal,
      booksRead: challenge.booksRead ?? [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userChallenges.set(id, newChallenge);
    return newChallenge;
  }

  async updateUserChallenge(id: number, updates: Partial<InsertUserChallenge>): Promise<UserChallenge | undefined> {
    const existing = this.userChallenges.get(id);
    if (!existing) return undefined;
    
    const updated: UserChallenge = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    this.userChallenges.set(id, updated);
    return updated;
  }

  async deleteUserChallenge(id: number): Promise<boolean> {
    return this.userChallenges.delete(id);
  }

  // Newsletter methods
  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const id = this.currentSubscriberId++;
    const newSubscriber: NewsletterSubscriber = {
      id,
      email: subscriber.email,
      subscribedAt: new Date(),
      isActive: subscriber.isActive ?? true,
    };
    this.newsletterSubscribers.set(id, newSubscriber);
    return newSubscriber;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    return Array.from(this.newsletterSubscribers.values()).find(
      (s) => s.email.toLowerCase() === email.toLowerCase()
    );
  }

  // Quiz history methods
  async createQuizHistory(history: InsertQuizHistory): Promise<QuizHistory> {
    const id = this.currentQuizHistoryId++;
    const newHistory: QuizHistory = {
      id,
      userId: history.userId,
      takenAt: new Date(),
      fictionType: history.fictionType ?? null,
      selectedGenres: history.selectedGenres ?? [],
      mood: history.mood ?? null,
      readingGoal: history.readingGoal ?? null,
      recommendedBooks: history.recommendedBooks ?? [],
    };
    this.quizHistories.set(id, newHistory);
    return newHistory;
  }

  async getUserQuizHistory(userId: string): Promise<QuizHistory[]> {
    return Array.from(this.quizHistories.values())
      .filter((h) => h.userId === userId)
      .sort((a, b) => (b.takenAt?.getTime() || 0) - (a.takenAt?.getTime() || 0));
  }

  // Reading streak methods
  async getUserStreak(userId: string): Promise<ReadingStreak | undefined> {
    return this.readingStreaks.get(userId);
  }

  async upsertUserStreak(userId: string, updates: Partial<InsertReadingStreak>): Promise<ReadingStreak> {
    const existing = this.readingStreaks.get(userId);
    if (existing) {
      const updated: ReadingStreak = {
        ...existing,
        ...updates,
        userId,
      };
      this.readingStreaks.set(userId, updated);
      return updated;
    } else {
      const newStreak: ReadingStreak = {
        id: this.readingStreaks.size + 1,
        userId,
        currentStreak: updates.currentStreak ?? 0,
        longestStreak: updates.longestStreak ?? 0,
        lastActivityDate: updates.lastActivityDate ?? null,
        totalBooksFinished: updates.totalBooksFinished ?? 0,
        totalDnf: updates.totalDnf ?? 0,
        earnedBadges: updates.earnedBadges ?? [],
      };
      this.readingStreaks.set(userId, newStreak);
      return newStreak;
    }
  }

  private seedBooks() {
    const books: InsertBook[] = [
      // THRILLERS & MYSTERY
      {
        title: "The Silent Patient",
        author: "Alex Michaelides",
        description: "A famous painter shoots her husband five times in the face and then never speaks another word.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1668782119i/40097951.jpg",
        mood: "scary",
        pace: "fast",
        length: "medium",
        spiceLevel: 2,
        darknessLevel: 4,
        tropes: ["whodunnit", "unreliable-narrator"],
        tags: ["thriller", "psychological", "murder", "mystery"],
      },
      {
        title: "Verity",
        author: "Colleen Hoover",
        description: "Lowen Ashleigh is a struggling writer on the brink of financial ruin when she accepts the job offer of a lifetime.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1634158558i/59344312.jpg",
        mood: "scary",
        pace: "fast",
        length: "medium",
        spiceLevel: 4,
        darknessLevel: 4,
        tropes: ["unreliable-narrator", "romantic-suspense"],
        tags: ["thriller", "mystery", "dark", "romance"],
      },
      {
        title: "The Thursday Murder Club",
        author: "Richard Osman",
        description: "Four unlikely friends meet weekly in their retirement village to investigate cold cases.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1587142358i/46000520.jpg",
        mood: "happy",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 2,
        tropes: ["whodunnit", "found-family"],
        tags: ["mystery", "funny", "cozy"],
      },
      // ROMANCE
      {
        title: "Book Lovers",
        author: "Emily Henry",
        description: "A cutthroat literary agent and a brooding editor are thrown together in a small town.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1638867089i/58690308.jpg",
        mood: "happy",
        pace: "fast",
        length: "medium",
        spiceLevel: 3,
        darknessLevel: 1,
        tropes: ["enemies-to-lovers", "small-town"],
        tags: ["romance", "funny", "contemporary"],
      },
      {
        title: "The Love Hypothesis",
        author: "Ali Hazelwood",
        description: "When a fake-dating agreement turns into real feelings between a PhD student and a young professor.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1611937942i/56732449.jpg",
        mood: "happy",
        pace: "medium",
        length: "medium",
        spiceLevel: 3,
        darknessLevel: 1,
        tropes: ["fake-dating", "grumpy-sunshine"],
        tags: ["romance", "funny", "academia", "stem"],
      },
      // FANTASY
      {
        title: "The House in the Cerulean Sea",
        author: "TJ Klune",
        description: "A magical island. A dangerous task. A burning secret. A story about discovering it's never too late.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1569514209i/45047384.jpg",
        mood: "happy",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 1,
        tropes: ["found-family", "magical-realism"],
        tags: ["fantasy", "lgbtq", "wholesome"],
      },
      {
        title: "Fourth Wing",
        author: "Rebecca Yarros",
        description: "Enter the brutal and elite world of a war college for dragon riders.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1701980900i/61431922.jpg",
        mood: "adventurous",
        pace: "fast",
        length: "long",
        spiceLevel: 4,
        darknessLevel: 3,
        tropes: ["enemies-to-lovers", "chosen-one"],
        tags: ["fantasy", "romance", "dragons", "new-adult"],
      },
      // SCI-FI
      {
        title: "Project Hail Mary",
        author: "Andy Weir",
        description: "Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1597695864i/54493401.jpg",
        mood: "adventurous",
        pace: "fast",
        length: "long",
        spiceLevel: 1,
        darknessLevel: 2,
        tropes: ["survival", "found-family"],
        tags: ["sci-fi", "space", "science"],
      },
      // LITERARY FICTION
      {
        title: "The Seven Husbands of Evelyn Hugo",
        author: "Taylor Jenkins Reid",
        description: "Aging Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous life.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1660763269i/32620332.jpg",
        mood: "thoughtful",
        pace: "medium",
        length: "medium",
        spiceLevel: 2,
        darknessLevel: 2,
        tropes: ["forbidden-love"],
        tags: ["historical-fiction", "romance", "lgbtq", "hollywood"],
      },
      {
        title: "Circe",
        author: "Madeline Miller",
        description: "In the house of Helios, god of the sun, a daughter is born. But Circe is a strange child.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1565909496i/35959740.jpg",
        mood: "thoughtful",
        pace: "medium",
        length: "medium",
        spiceLevel: 2,
        darknessLevel: 3,
        tropes: ["redemption-arc", "coming-of-age"],
        tags: ["mythology", "fantasy", "retelling"],
      },
      // NONFICTION - Biography & Memoir
      {
        title: "Educated",
        author: "Tara Westover",
        description: "A memoir about a young girl who grows up in a survivalist family in the mountains of Idaho and eventually earns a PhD from Cambridge University.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg",
        mood: "thoughtful",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 4,
        tropes: ["coming-of-age"],
        tags: ["non-fiction", "memoir", "biography", "education"],
      },
      {
        title: "Becoming",
        author: "Michelle Obama",
        description: "In her memoir, the former First Lady chronicles the experiences that have shaped her—from her childhood on the South Side of Chicago to her years as an executive.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1528206996i/38746485.jpg",
        mood: "thoughtful",
        pace: "medium",
        length: "long",
        spiceLevel: 1,
        darknessLevel: 2,
        tropes: ["coming-of-age"],
        tags: ["non-fiction", "memoir", "biography", "politics"],
      },
      {
        title: "Atomic Habits",
        author: "James Clear",
        description: "No matter your goals, Atomic Habits offers a proven framework for improving—every day. Learn how tiny changes can lead to remarkable results.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
        mood: "happy",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 1,
        tropes: [],
        tags: ["non-fiction", "self-help", "productivity", "psychology"],
      },
      {
        title: "Sapiens: A Brief History of Humankind",
        author: "Yuval Noah Harari",
        description: "One hundred thousand years ago, at least six different species of humans inhabited Earth. Yet today there is only one—homo sapiens. What happened?",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1703329310i/23692271.jpg",
        mood: "thoughtful",
        pace: "slow",
        length: "long",
        spiceLevel: 1,
        darknessLevel: 2,
        tropes: [],
        tags: ["non-fiction", "history", "science", "anthropology"],
      },
      {
        title: "The Body Keeps the Score",
        author: "Bessel van der Kolk",
        description: "A pioneering researcher transforms our understanding of trauma and offers a bold new paradigm for healing.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1594559067i/18693771.jpg",
        mood: "thoughtful",
        pace: "slow",
        length: "long",
        spiceLevel: 1,
        darknessLevel: 4,
        tropes: [],
        tags: ["non-fiction", "psychology", "health", "science"],
      },
      {
        title: "Quiet: The Power of Introverts",
        author: "Susan Cain",
        description: "In a world that can't stop talking, this book celebrates the power of introverts and shows how our culture undervalues them.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1328562861i/8520610.jpg",
        mood: "thoughtful",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 1,
        tropes: [],
        tags: ["non-fiction", "psychology", "self-help"],
      },
      {
        title: "Born a Crime",
        author: "Trevor Noah",
        description: "Trevor Noah's unlikely path from apartheid South Africa to the desk of The Daily Show, told in his uniquely funny and moving voice.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1473867911i/29780253.jpg",
        mood: "happy",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 3,
        tropes: ["coming-of-age"],
        tags: ["non-fiction", "memoir", "biography", "funny"],
      },
      {
        title: "In Cold Blood",
        author: "Truman Capote",
        description: "On November 15, 1959, in the small town of Holcomb, Kansas, four members of the Clutter family were savagely murdered by blasts from a shotgun.",
        coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1424931136i/168642.jpg",
        mood: "scary",
        pace: "medium",
        length: "medium",
        spiceLevel: 1,
        darknessLevel: 5,
        tropes: [],
        tags: ["non-fiction", "true-crime", "history"],
      },
    ];

    for (const book of books) {
      const id = this.currentBookId++;
      this.books.set(id, { ...book, id });
    }
  }

  // Reading Lists methods
  async getUserReadingLists(userId: string): Promise<ReadingList[]> {
    return Array.from(this.readingLists.values()).filter(l => l.userId === userId);
  }

  async getReadingList(id: number): Promise<ReadingList | undefined> {
    return this.readingLists.get(id);
  }

  async createReadingList(list: InsertReadingList): Promise<ReadingList> {
    const id = this.currentReadingListId++;
    const newList: ReadingList = { 
      ...list, 
      id, 
      description: list.description ?? null, 
      emoji: list.emoji ?? null,
      isPublic: list.isPublic ?? false,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.readingLists.set(id, newList);
    return newList;
  }

  async updateReadingList(id: number, updates: Partial<InsertReadingList>): Promise<ReadingList | undefined> {
    const list = this.readingLists.get(id);
    if (!list) return undefined;
    const updated = { ...list, ...updates, updatedAt: new Date() };
    this.readingLists.set(id, updated);
    return updated;
  }

  async deleteReadingList(id: number): Promise<boolean> {
    Array.from(this.readingListItems.entries())
      .filter(([_, item]) => item.listId === id)
      .forEach(([itemId]) => this.readingListItems.delete(itemId));
    return this.readingLists.delete(id);
  }

  async getReadingListItems(listId: number): Promise<ReadingListItem[]> {
    return Array.from(this.readingListItems.values())
      .filter(item => item.listId === listId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async addReadingListItem(item: InsertReadingListItem): Promise<ReadingListItem> {
    const id = this.currentListItemId++;
    const newItem: ReadingListItem = { 
      ...item, 
      id, 
      bookCoverUrl: item.bookCoverUrl ?? null,
      googleBooksId: item.googleBooksId ?? null,
      userBookId: item.userBookId ?? null,
      sortOrder: item.sortOrder ?? null,
      addedAt: new Date() 
    };
    this.readingListItems.set(id, newItem);
    return newItem;
  }

  async removeReadingListItem(id: number): Promise<boolean> {
    return this.readingListItems.delete(id);
  }

  // Book Quotes methods
  async getUserQuotes(userId: string): Promise<BookQuote[]> {
    return Array.from(this.bookQuotes.values())
      .filter(q => q.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getQuote(id: number): Promise<BookQuote | undefined> {
    return this.bookQuotes.get(id);
  }

  async createQuote(quote: InsertBookQuote): Promise<BookQuote> {
    const id = this.currentQuoteId++;
    const newQuote: BookQuote = { 
      ...quote, 
      id, 
      notes: quote.notes ?? null,
      userBookId: quote.userBookId ?? null,
      pageNumber: quote.pageNumber ?? null,
      chapter: quote.chapter ?? null,
      isFavorite: quote.isFavorite ?? false,
      createdAt: new Date() 
    };
    this.bookQuotes.set(id, newQuote);
    return newQuote;
  }

  async updateQuote(id: number, updates: Partial<InsertBookQuote>): Promise<BookQuote | undefined> {
    const quote = this.bookQuotes.get(id);
    if (!quote) return undefined;
    const updated = { ...quote, ...updates };
    this.bookQuotes.set(id, updated);
    return updated;
  }

  async deleteQuote(id: number): Promise<boolean> {
    return this.bookQuotes.delete(id);
  }

  // Book Series methods
  async getUserSeries(userId: string): Promise<BookSeries[]> {
    return Array.from(this.bookSeries.values()).filter(s => s.userId === userId);
  }

  async getSeries(id: number): Promise<BookSeries | undefined> {
    return this.bookSeries.get(id);
  }

  async createSeries(series: InsertBookSeries): Promise<BookSeries> {
    const id = this.currentSeriesId++;
    const newSeries: BookSeries = { 
      ...series, 
      id, 
      coverUrl: series.coverUrl ?? null,
      totalBooks: series.totalBooks ?? null,
      isComplete: series.isComplete ?? false,
      createdAt: new Date() 
    };
    this.bookSeries.set(id, newSeries);
    return newSeries;
  }

  async updateSeries(id: number, updates: Partial<InsertBookSeries>): Promise<BookSeries | undefined> {
    const series = this.bookSeries.get(id);
    if (!series) return undefined;
    const updated = { ...series, ...updates };
    this.bookSeries.set(id, updated);
    return updated;
  }

  async deleteSeries(id: number): Promise<boolean> {
    Array.from(this.seriesBooks.entries())
      .filter(([_, book]) => book.seriesId === id)
      .forEach(([bookId]) => this.seriesBooks.delete(bookId));
    return this.bookSeries.delete(id);
  }

  async getSeriesBooks(seriesId: number): Promise<SeriesBook[]> {
    return Array.from(this.seriesBooks.values())
      .filter(book => book.seriesId === seriesId)
      .sort((a, b) => a.bookNumber - b.bookNumber);
  }

  async addSeriesBook(book: InsertSeriesBook): Promise<SeriesBook> {
    const id = this.currentSeriesBookId++;
    const newBook: SeriesBook = { 
      ...book, 
      id, 
      coverUrl: book.coverUrl ?? null,
      status: book.status ?? null,
      googleBooksId: book.googleBooksId ?? null,
      userBookId: book.userBookId ?? null,
    };
    this.seriesBooks.set(id, newBook);
    return newBook;
  }

  async updateSeriesBook(id: number, updates: Partial<InsertSeriesBook>): Promise<SeriesBook | undefined> {
    const book = this.seriesBooks.get(id);
    if (!book) return undefined;
    const updated = { ...book, ...updates };
    this.seriesBooks.set(id, updated);
    return updated;
  }

  async removeSeriesBook(id: number): Promise<boolean> {
    return this.seriesBooks.delete(id);
  }

  // Author Profile methods
  async getAuthorProfile(userId: string): Promise<AuthorProfile | undefined> {
    return this.authorProfiles.get(userId);
  }

  async getAuthorProfileById(id: number): Promise<AuthorProfile | undefined> {
    return Array.from(this.authorProfiles.values()).find(p => p.id === id);
  }

  async getAuthorProfileBySlug(slug: string): Promise<AuthorProfile | undefined> {
    return Array.from(this.authorProfiles.values()).find(p => p.slug === slug);
  }

  async getAllAuthorProfiles(): Promise<AuthorProfile[]> {
    return Array.from(this.authorProfiles.values());
  }

  async getAuthorProfilesByUserIds(userIds: string[]): Promise<AuthorProfile[]> {
    return Array.from(this.authorProfiles.values()).filter(ap => ap.userId && userIds.includes(ap.userId));
  }

  async createAuthorProfile(profile: InsertAuthorProfile): Promise<AuthorProfile> {
    const id = this.currentAuthorProfileId++;
    const defaults = {
      bio: null, website: null, twitterHandle: null, instagramHandle: null,
      goodreadsUrl: null, amazonAuthorUrl: null, bookbubUrl: null, tiktokHandle: null,
      genres: [], avatarUrl: null, isVerified: false,
    };
    const newProfile: AuthorProfile = { ...defaults, ...profile, id, createdAt: new Date(), updatedAt: new Date() };
    this.authorProfiles.set(profile.userId, newProfile);
    return newProfile;
  }

  async updateAuthorProfile(userId: string, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined> {
    const profile = this.authorProfiles.get(userId);
    if (!profile) return undefined;
    const updated = { ...profile, ...updates, updatedAt: new Date() };
    this.authorProfiles.set(userId, updated);
    return updated;
  }

  async updateAuthorProfileById(id: number, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined> {
    for (const [key, profile] of this.authorProfiles.entries()) {
      if (profile.id === id) {
        const updated = { ...profile, ...updates, updatedAt: new Date() };
        this.authorProfiles.set(key, updated);
        return updated;
      }
    }
    return undefined;
  }

  // Author Books methods
  async getAuthorBooks(authorProfileId: number): Promise<AuthorBook[]> {
    return Array.from(this.authorBooksMap.values())
      .filter(b => b.authorProfileId === authorProfileId)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getAuthorBook(id: number): Promise<AuthorBook | undefined> {
    return this.authorBooksMap.get(id);
  }

  async createAuthorBook(book: InsertAuthorBook): Promise<AuthorBook> {
    const id = this.currentAuthorBookId++;
    const defaults = {
      description: null, coverUrl: null, genres: [], amazonUrl: null, bookshopUrl: null,
      googleBooksId: null, seriesName: null, seriesNumber: null, publishedDate: null,
      isUpcoming: false, arcEnabled: false, arcDescription: null, arcDownloadUrl: null,
      arcCouponCode: null, arcMaxClaims: null, arcExpiresAt: null,
      arcDownloadExpiryHours: null, arcWaitlistEnabled: false, sortOrder: 0,
    };
    const newBook: AuthorBook = { ...defaults, ...book, id, arcClaimCount: 0, createdAt: new Date() };
    this.authorBooksMap.set(id, newBook);
    return newBook;
  }

  async updateAuthorBook(id: number, updates: Partial<InsertAuthorBook>): Promise<AuthorBook | undefined> {
    const book = this.authorBooksMap.get(id);
    if (!book) return undefined;
    const updated = { ...book, ...updates };
    this.authorBooksMap.set(id, updated);
    return updated;
  }

  async deleteAuthorBook(id: number): Promise<boolean> {
    return this.authorBooksMap.delete(id);
  }

  async incrementArcClaimCount(id: number): Promise<AuthorBook | undefined> {
    const book = this.authorBooksMap.get(id);
    if (!book) return undefined;
    const updated = { ...book, arcClaimCount: (book.arcClaimCount ?? 0) + 1 };
    this.authorBooksMap.set(id, updated);
    return updated;
  }

  // Featured Placements methods
  async getActiveFeaturedPlacements(type?: string): Promise<(FeaturedPlacement & { author?: AuthorProfile })[]> {
    const now = new Date();
    return Array.from(this.featuredPlacementsMap.values())
      .filter(p => {
        if (!p.isActive) return false;
        if (type && p.type !== type) return false;
        if (p.endDate && p.endDate < now) return false;
        return true;
      })
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map(p => {
        const author = Array.from(this.authorProfiles.values()).find(a => a.id === p.authorProfileId);
        return { ...p, author };
      });
  }

  async createFeaturedPlacement(placement: InsertFeaturedPlacement): Promise<FeaturedPlacement> {
    const id = this.currentFeaturedPlacementId++;
    const defaults = {
      title: null, description: null, isActive: true, isSponsored: false,
      priority: 0, startDate: new Date(), endDate: null,
    };
    const newPlacement: FeaturedPlacement = { ...defaults, ...placement, id, createdAt: new Date() };
    this.featuredPlacementsMap.set(id, newPlacement);
    return newPlacement;
  }

  async updateFeaturedPlacement(id: number, updates: Partial<InsertFeaturedPlacement>): Promise<FeaturedPlacement | undefined> {
    const placement = this.featuredPlacementsMap.get(id);
    if (!placement) return undefined;
    const updated = { ...placement, ...updates };
    this.featuredPlacementsMap.set(id, updated);
    return updated;
  }

  async deleteFeaturedPlacement(id: number): Promise<boolean> {
    return this.featuredPlacementsMap.delete(id);
  }

  async hasUserClaimedArc(userId: string, bookId: number): Promise<boolean> {
    return Array.from(this.arcClaimsMap.values()).some(
      c => c.userId === userId && c.bookId === bookId
    );
  }

  async getUserArcClaimsToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from(this.arcClaimsMap.values()).filter(
      c => c.userId === userId && c.claimedAt && c.claimedAt >= today
    ).length;
  }

  async createArcClaim(claim: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null; downloadExpiresAt?: Date | null }): Promise<ArcClaim> {
    const id = this.currentArcClaimId++;
    const newClaim: ArcClaim = {
      ...claim,
      id,
      claimedAt: new Date(),
      downloadExpiresAt: claim.downloadExpiresAt ?? null,
      reviewReminded: false,
      isFlagged: false,
    };
    this.arcClaimsMap.set(id, newClaim);
    return newClaim;
  }

  async getArcClaimsForBook(bookId: number): Promise<ArcClaim[]> {
    return Array.from(this.arcClaimsMap.values())
      .filter(c => c.bookId === bookId)
      .sort((a, b) => (b.claimedAt?.getTime() ?? 0) - (a.claimedAt?.getTime() ?? 0));
  }

  async getArcClaimsForAuthor(authorProfileId: number): Promise<ArcClaim[]> {
    return Array.from(this.arcClaimsMap.values())
      .filter(c => c.authorProfileId === authorProfileId)
      .sort((a, b) => (b.claimedAt?.getTime() ?? 0) - (a.claimedAt?.getTime() ?? 0));
  }

  async getArcClaim(id: number): Promise<ArcClaim | undefined> {
    return this.arcClaimsMap.get(id);
  }

  async updateArcClaim(id: number, updates: Partial<ArcClaim>): Promise<ArcClaim | undefined> {
    const claim = this.arcClaimsMap.get(id);
    if (!claim) return undefined;
    const updated = { ...claim, ...updates };
    this.arcClaimsMap.set(id, updated);
    return updated;
  }

  async getBlockedUsers(authorProfileId: number): Promise<ArcBlockedUser[]> {
    return Array.from(this.arcBlockedUsersMap.values())
      .filter(b => b.authorProfileId === authorProfileId)
      .sort((a, b) => (b.blockedAt?.getTime() ?? 0) - (a.blockedAt?.getTime() ?? 0));
  }

  async isUserBlocked(authorProfileId: number, userId: string): Promise<boolean> {
    return Array.from(this.arcBlockedUsersMap.values()).some(
      b => b.authorProfileId === authorProfileId && b.blockedUserId === userId
    );
  }

  async blockUser(data: { authorProfileId: number; blockedUserId: string; blockedUserName: string | null; reason: string | null }): Promise<ArcBlockedUser> {
    const id = this.currentBlockedUserId++;
    const entry: ArcBlockedUser = { ...data, id, blockedAt: new Date() };
    this.arcBlockedUsersMap.set(id, entry);
    return entry;
  }

  async unblockUser(id: number): Promise<boolean> {
    return this.arcBlockedUsersMap.delete(id);
  }

  async getWaitlist(bookId: number): Promise<ArcWaitlistEntry[]> {
    return Array.from(this.arcWaitlistMap.values())
      .filter(w => w.bookId === bookId)
      .sort((a, b) => (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0));
  }

  async isUserOnWaitlist(bookId: number, userId: string): Promise<boolean> {
    return Array.from(this.arcWaitlistMap.values()).some(
      w => w.bookId === bookId && w.userId === userId
    );
  }

  async joinWaitlist(data: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null }): Promise<ArcWaitlistEntry> {
    const id = this.currentWaitlistId++;
    const entry: ArcWaitlistEntry = { ...data, id, joinedAt: new Date(), notified: false };
    this.arcWaitlistMap.set(id, entry);
    return entry;
  }

  async leaveWaitlist(id: number): Promise<boolean> {
    return this.arcWaitlistMap.delete(id);
  }

  async createClaimReport(data: { authorProfileId: number; claimId: number; userId: string; reason: string; details: string | null }): Promise<ArcClaimReport> {
    const id = this.currentClaimReportId++;
    const report: ArcClaimReport = { ...data, id, status: "pending", createdAt: new Date() };
    this.arcClaimReportsMap.set(id, report);
    return report;
  }

  async getReportsForAuthor(authorProfileId: number): Promise<ArcClaimReport[]> {
    return Array.from(this.arcClaimReportsMap.values())
      .filter(r => r.authorProfileId === authorProfileId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async updateReportStatus(id: number, status: string): Promise<ArcClaimReport | undefined> {
    const report = this.arcClaimReportsMap.get(id);
    if (!report) return undefined;
    const updated = { ...report, status };
    this.arcClaimReportsMap.set(id, updated);
    return updated;
  }

  async getArcSecurityStats(authorProfileId: number): Promise<{
    totalClaims: number;
    blockedUsersCount: number;
    flaggedClaimsCount: number;
    pendingReportsCount: number;
    waitlistSize: number;
    claimsByDay: { date: string; count: number }[];
  }> {
    const claims = Array.from(this.arcClaimsMap.values()).filter(c => c.authorProfileId === authorProfileId);
    const blocked = Array.from(this.arcBlockedUsersMap.values()).filter(b => b.authorProfileId === authorProfileId);
    const flagged = claims.filter(c => c.isFlagged);
    const reports = Array.from(this.arcClaimReportsMap.values()).filter(r => r.authorProfileId === authorProfileId && r.status === "pending");
    const authorBooks = Array.from(this.authorBooksMap.values()).filter(b => b.authorProfileId === authorProfileId);
    const bookIds = new Set(authorBooks.map(b => b.id));
    const waitlist = Array.from(this.arcWaitlistMap.values()).filter(w => bookIds.has(w.bookId));

    const claimsByDay: Record<string, number> = {};
    for (const claim of claims) {
      if (claim.claimedAt) {
        const day = claim.claimedAt.toISOString().split("T")[0];
        claimsByDay[day] = (claimsByDay[day] || 0) + 1;
      }
    }
    const sortedDays = Object.entries(claimsByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);

    return {
      totalClaims: claims.length,
      blockedUsersCount: blocked.length,
      flaggedClaimsCount: flagged.length,
      pendingReportsCount: reports.length,
      waitlistSize: waitlist.length,
      claimsByDay: sortedDays,
    };
  }

  async updateArcClaimStatus(_claimId: number, _status: import("@shared/schema").ArcClaimStatus): Promise<ArcClaim | undefined> {
    return undefined;
  }

  async getUserArcClaims(_userId: string): Promise<(ArcClaim & { book: import("@shared/schema").AuthorBook | null })[]> {
    return [];
  }

  async getArcInvite(_token: string): Promise<import("@shared/schema").ArcInvite | undefined> {
    return undefined;
  }

  async createArcInvite(data: import("@shared/schema").InsertArcInvite): Promise<import("@shared/schema").ArcInvite> {
    throw new Error("Not implemented in MemStorage");
  }

  async getArcInvitesForBook(_bookId: number): Promise<import("@shared/schema").ArcInvite[]> {
    return [];
  }

  async markArcInviteUsed(_token: string, _userId: string): Promise<import("@shared/schema").ArcInvite | undefined> {
    return undefined;
  }

  async generateArcShareToken(_bookId: number): Promise<string> {
    const { randomUUID } = await import("crypto");
    return randomUUID();
  }

  async getAuthorBookByShareToken(_token: string): Promise<import("@shared/schema").AuthorBook | undefined> {
    return undefined;
  }

  async searchUsers(_query: string, _limit: number = 20): Promise<User[]> {
    return [];
  }

  async getUserById(_userId: string): Promise<User | undefined> {
    return undefined;
  }

  async followUser(follow: InsertFollow): Promise<Follow> {
    const id = this.currentFollowId++;
    const newFollow: Follow = {
      id,
      followerId: follow.followerId,
      followingId: follow.followingId,
      followedAt: new Date(),
    };
    this.followsMap.set(id, newFollow);
    return newFollow;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const entry = Array.from(this.followsMap.entries()).find(
      ([, f]) => f.followerId === followerId && f.followingId === followingId
    );
    if (!entry) return false;
    return this.followsMap.delete(entry[0]);
  }

  async getFollowers(userId: string): Promise<Follow[]> {
    return Array.from(this.followsMap.values()).filter(f => f.followingId === userId);
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    return Array.from(this.followsMap.values()).filter(f => f.followerId === userId);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return Array.from(this.followsMap.values()).some(
      f => f.followerId === followerId && f.followingId === followingId
    );
  }

  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const followers = Array.from(this.followsMap.values()).filter(f => f.followingId === userId).length;
    const following = Array.from(this.followsMap.values()).filter(f => f.followerId === userId).length;
    return { followers, following };
  }

  async createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent> {
    const id = this.currentActivityEventId++;
    const newEvent: ActivityEvent = {
      id,
      userId: event.userId,
      type: event.type,
      bookTitle: event.bookTitle ?? null,
      bookAuthor: event.bookAuthor ?? null,
      bookCoverUrl: event.bookCoverUrl ?? null,
      metadata: event.metadata ?? null,
      createdAt: new Date(),
    };
    this.activityEventsMap.set(id, newEvent);
    return newEvent;
  }

  async getUserFeed(userId: string, followingIds: string[]): Promise<ActivityEvent[]> {
    return Array.from(this.activityEventsMap.values())
      .filter(e => followingIds.includes(e.userId))
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      .slice(0, 50);
  }

  async getUserActivityEvents(userId: string): Promise<ActivityEvent[]> {
    return Array.from(this.activityEventsMap.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const newNotification: Notification = {
      id,
      userId: notification.userId,
      type: notification.type,
      message: notification.message,
      linkUrl: notification.linkUrl ?? null,
      fromUserId: notification.fromUserId ?? null,
      isRead: notification.isRead ?? false,
      createdAt: new Date(),
    };
    this.notificationsMap.set(id, newNotification);
    return newNotification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const notification = this.notificationsMap.get(id);
    if (!notification) return false;
    this.notificationsMap.set(id, { ...notification, isRead: true });
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    Array.from(this.notificationsMap.entries()).forEach(([id, notification]) => {
      if (notification.userId === userId && !notification.isRead) {
        this.notificationsMap.set(id, { ...notification, isRead: true });
      }
    });
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId && !n.isRead).length;
  }

  async createAuthorBookReview(review: InsertAuthorBookReview): Promise<AuthorBookReview> {
    const id = this.currentAuthorBookReviewId++;
    const newReview: AuthorBookReview = {
      id,
      authorBookId: review.authorBookId,
      userId: review.userId,
      userDisplayName: review.userDisplayName ?? null,
      rating: review.rating,
      reviewText: review.reviewText ?? null,
      isVerifiedArc: review.isVerifiedArc ?? false,
      createdAt: new Date(),
    };
    this.authorBookReviewsMap.set(id, newReview);
    return newReview;
  }

  async getAuthorBookReviews(authorBookId: number): Promise<AuthorBookReview[]> {
    return Array.from(this.authorBookReviewsMap.values())
      .filter(r => r.authorBookId === authorBookId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async getUserReviewForBook(userId: string, authorBookId: number): Promise<AuthorBookReview | undefined> {
    return Array.from(this.authorBookReviewsMap.values()).find(
      r => r.userId === userId && r.authorBookId === authorBookId
    );
  }

  async deleteAuthorBookReview(id: number): Promise<boolean> {
    return this.authorBookReviewsMap.delete(id);
  }

  async createBookClub(club: InsertBookClub): Promise<BookClub> {
    const id = this.currentBookClubId++;
    const newClub: BookClub = {
      id,
      name: club.name,
      description: club.description ?? null,
      createdBy: club.createdBy,
      coverImageUrl: club.coverImageUrl ?? null,
      isPublic: club.isPublic ?? true,
      maxMembers: club.maxMembers ?? 50,
      createdAt: new Date(),
    };
    this.bookClubsMap.set(id, newClub);
    return newClub;
  }

  async getBookClub(id: number): Promise<BookClub | undefined> {
    return this.bookClubsMap.get(id);
  }

  async getPublicBookClubs(): Promise<BookClub[]> {
    return Array.from(this.bookClubsMap.values()).filter(c => c.isPublic);
  }

  async getUserBookClubs(userId: string): Promise<BookClub[]> {
    const memberClubIds = new Set(
      Array.from(this.clubMembersMap.values())
        .filter(m => m.userId === userId)
        .map(m => m.clubId)
    );
    return Array.from(this.bookClubsMap.values()).filter(c => memberClubIds.has(c.id));
  }

  async updateBookClub(id: number, updates: Partial<InsertBookClub>): Promise<BookClub | undefined> {
    const existing = this.bookClubsMap.get(id);
    if (!existing) return undefined;
    const updated: BookClub = { ...existing, ...updates, id: existing.id, createdAt: existing.createdAt };
    this.bookClubsMap.set(id, updated);
    return updated;
  }

  async deleteBookClub(id: number): Promise<boolean> {
    return this.bookClubsMap.delete(id);
  }

  async joinClub(member: InsertClubMember): Promise<ClubMember> {
    const id = this.currentClubMemberId++;
    const newMember: ClubMember = {
      id,
      clubId: member.clubId,
      userId: member.userId,
      role: member.role ?? "member",
      joinedAt: new Date(),
    };
    this.clubMembersMap.set(id, newMember);
    return newMember;
  }

  async leaveClub(clubId: number, userId: string): Promise<boolean> {
    const entry = Array.from(this.clubMembersMap.entries()).find(
      ([, m]) => m.clubId === clubId && m.userId === userId
    );
    if (!entry) return false;
    return this.clubMembersMap.delete(entry[0]);
  }

  async getClubMembers(clubId: number): Promise<ClubMember[]> {
    return Array.from(this.clubMembersMap.values()).filter(m => m.clubId === clubId);
  }

  async isClubMember(clubId: number, userId: string): Promise<boolean> {
    return Array.from(this.clubMembersMap.values()).some(
      m => m.clubId === clubId && m.userId === userId
    );
  }

  async getClubMemberRole(clubId: number, userId: string): Promise<string | null> {
    const member = Array.from(this.clubMembersMap.values()).find(
      m => m.clubId === clubId && m.userId === userId
    );
    return member?.role ?? null;
  }

  async createClubDiscussion(post: InsertClubDiscussion): Promise<ClubDiscussion> {
    const id = this.currentClubDiscussionId++;
    const newPost: ClubDiscussion = {
      id,
      clubId: post.clubId,
      userId: post.userId,
      userDisplayName: post.userDisplayName ?? null,
      title: post.title ?? null,
      content: post.content,
      parentId: post.parentId ?? null,
      createdAt: new Date(),
    };
    this.clubDiscussionsMap.set(id, newPost);
    return newPost;
  }

  async getClubDiscussions(clubId: number): Promise<ClubDiscussion[]> {
    return Array.from(this.clubDiscussionsMap.values())
      .filter(d => d.clubId === clubId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
  }

  async deleteClubDiscussion(id: number): Promise<boolean> {
    return this.clubDiscussionsMap.delete(id);
  }

  async addClubReadingBook(book: InsertClubReadingBook): Promise<ClubReadingBook> {
    const id = this.currentClubReadingBookId++;
    const newBook: ClubReadingBook = {
      id,
      clubId: book.clubId,
      bookTitle: book.bookTitle,
      bookAuthor: book.bookAuthor,
      bookCoverUrl: book.bookCoverUrl ?? null,
      googleBooksId: book.googleBooksId ?? null,
      status: book.status ?? "current",
      startDate: book.startDate ?? null,
      endDate: book.endDate ?? null,
      addedBy: book.addedBy,
      voteCount: book.voteCount ?? 0,
      addedAt: new Date(),
    };
    this.clubReadingBooksMap.set(id, newBook);
    return newBook;
  }

  async getClubReadingBooks(clubId: number): Promise<ClubReadingBook[]> {
    return Array.from(this.clubReadingBooksMap.values())
      .filter(b => b.clubId === clubId)
      .sort((a, b) => (b.addedAt?.getTime() ?? 0) - (a.addedAt?.getTime() ?? 0));
  }

  async updateClubReadingBook(id: number, updates: Partial<InsertClubReadingBook>): Promise<ClubReadingBook | undefined> {
    const existing = this.clubReadingBooksMap.get(id);
    if (!existing) return undefined;
    const updated: ClubReadingBook = { ...existing, ...updates, id: existing.id, addedAt: existing.addedAt };
    this.clubReadingBooksMap.set(id, updated);
    return updated;
  }

  async deleteClubReadingBook(id: number): Promise<boolean> {
    return this.clubReadingBooksMap.delete(id);
  }

  async addClubVote(vote: InsertClubVote): Promise<ClubVote> {
    const id = this.currentClubVoteId++;
    const newVote: ClubVote = {
      id,
      clubId: vote.clubId,
      bookId: vote.bookId,
      userId: vote.userId,
      votedAt: new Date(),
    };
    this.clubVotesMap.set(id, newVote);
    return newVote;
  }

  async getClubVotes(clubId: number, bookId: number): Promise<ClubVote[]> {
    return Array.from(this.clubVotesMap.values())
      .filter(v => v.clubId === clubId && v.bookId === bookId);
  }

  async hasUserVoted(clubId: number, bookId: number, userId: string): Promise<boolean> {
    return Array.from(this.clubVotesMap.values()).some(
      v => v.clubId === clubId && v.bookId === bookId && v.userId === userId
    );
  }

  async getClubReadingSchedule(_clubId: number): Promise<any[]> {
    return [];
  }

  async upsertClubReadingSchedule(_clubId: number, _weeks: { weekNumber: number; label: string; chapterStart?: number; chapterEnd?: number }[]): Promise<void> {}

  async deleteAllClubs(): Promise<void> {
    this.clubMeetingRsvpsMap?.clear();
    this.clubMeetingsMap?.clear();
    this.clubVotesMap.clear();
    this.clubReadingBooksMap.clear();
    this.clubDiscussionsMap.clear();
    this.clubMembersMap.clear();
    this.bookClubsMap.clear();
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const id = this.currentAnalyticsEventId++;
    const newEvent: AnalyticsEvent = {
      id,
      eventType: event.eventType,
      authorProfileId: event.authorProfileId ?? null,
      authorBookId: event.authorBookId ?? null,
      linkType: event.linkType ?? null,
      visitorId: event.visitorId ?? null,
      createdAt: new Date(),
    };
    this.analyticsEventsMap.set(id, newEvent);
    return newEvent;
  }

  async getAuthorAnalytics(authorProfileId: number): Promise<{ profileViews: number; buyClicks: number; byDay: { date: string; views: number; clicks: number }[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = Array.from(this.analyticsEventsMap.values())
      .filter(e => e.authorProfileId === authorProfileId && e.createdAt && e.createdAt >= thirtyDaysAgo);

    const profileViews = events.filter(e => e.eventType === "profile_view").length;
    const buyClicks = events.filter(e => e.eventType === "buy_click").length;

    const byDayMap: Record<string, { views: number; clicks: number }> = {};
    for (const event of events) {
      if (event.createdAt) {
        const day = event.createdAt.toISOString().split("T")[0];
        if (!byDayMap[day]) byDayMap[day] = { views: 0, clicks: 0 };
        if (event.eventType === "profile_view") byDayMap[day].views++;
        if (event.eventType === "buy_click") byDayMap[day].clicks++;
      }
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, data]) => ({ date, views: data.views, clicks: data.clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { profileViews, buyClicks, byDay };
  }

  async getDiscussions(): Promise<Discussion[]> {
    return Array.from(this.discussionsMap.values()).sort((a, b) => {
      if (a.isPinned !== b.isPinned) return (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0);
      return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
    });
  }

  async getDiscussion(id: number): Promise<Discussion | undefined> {
    return this.discussionsMap.get(id);
  }

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const id = this.currentDiscussionId++;
    const newDiscussion: Discussion = {
      ...discussion,
      id,
      category: discussion.category ?? "general",
      authorRole: discussion.authorRole ?? "member",
      isPinned: discussion.isPinned ?? false,
      commentCount: 0,
      createdAt: new Date(),
      userId: discussion.userId ?? null,
    };
    this.discussionsMap.set(id, newDiscussion);
    return newDiscussion;
  }

  async deleteDiscussion(id: number): Promise<boolean> {
    return this.discussionsMap.delete(id);
  }

  async getDiscussionComments(discussionId: number): Promise<DiscussionComment[]> {
    return Array.from(this.discussionCommentsMap.values())
      .filter(c => c.discussionId === discussionId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async createDiscussionComment(comment: InsertDiscussionComment): Promise<DiscussionComment> {
    const id = this.currentDiscussionCommentId++;
    const newComment: DiscussionComment = {
      ...comment,
      id,
      authorRole: comment.authorRole ?? "member",
      createdAt: new Date(),
      userId: comment.userId ?? null,
      parentId: comment.parentId ?? null,
    };
    this.discussionCommentsMap.set(id, newComment);
    const discussion = this.discussionsMap.get(comment.discussionId);
    if (discussion) {
      discussion.commentCount = (discussion.commentCount || 0) + 1;
    }
    return newComment;
  }

  async deleteDiscussionComment(id: number): Promise<boolean> {
    const comment = this.discussionCommentsMap.get(id);
    if (comment) {
      const discussion = this.discussionsMap.get(comment.discussionId);
      if (discussion) {
        discussion.commentCount = Math.max((discussion.commentCount || 0) - 1, 0);
      }
    }
    return this.discussionCommentsMap.delete(id);
  }

  async createBookSubmission(submission: InsertBookSubmission): Promise<BookSubmission> {
    const id = this.currentBookSubmissionId++;
    const newSubmission: BookSubmission = { ...submission, id, submittedAt: new Date() };
    this.bookSubmissionsMap.set(id, newSubmission);
    return newSubmission;
  }

  async getBookSubmissions(): Promise<BookSubmission[]> {
    return Array.from(this.bookSubmissionsMap.values());
  }

  async getShopProducts(): Promise<ShopProduct[]> { return []; }
  async getActiveShopProducts(): Promise<ShopProduct[]> { return []; }
  async getShopProduct(_id: number): Promise<ShopProduct | undefined> { return undefined; }
  async createShopProduct(product: InsertShopProduct): Promise<ShopProduct> { return { id: 1, ...product, createdAt: new Date() } as ShopProduct; }
  async updateShopProduct(_id: number, _updates: Partial<InsertShopProduct>): Promise<ShopProduct | undefined> { return undefined; }
  async deleteShopProduct(_id: number): Promise<boolean> { return true; }
  async getShopCategories(): Promise<string[]> { return []; }

  async getChildProfiles(_parentUserId: string): Promise<ChildProfile[]> { return []; }
  async getChildProfile(_id: number): Promise<ChildProfile | undefined> { return undefined; }
  async createChildProfile(profile: InsertChildProfile): Promise<ChildProfile> { return { id: 1, ...profile, totalBooksRead: 0, totalPagesRead: 0, totalMinutesRead: 0, currentStreak: 0, longestStreak: 0, lastActivityDate: null, earnedBadges: [], createdAt: new Date() } as ChildProfile; }
  async updateChildProfile(_id: number, _updates: Partial<ChildProfile>): Promise<ChildProfile | undefined> { return undefined; }
  async deleteChildProfile(_id: number): Promise<boolean> { return true; }
  async getChildReadingLogs(_childProfileId: number): Promise<ChildReadingLog[]> { return []; }
  async createChildReadingLog(log: InsertChildReadingLog): Promise<ChildReadingLog> { return { id: 1, ...log, createdAt: new Date() } as ChildReadingLog; }
  async getChildReadingGoals(_childProfileId: number): Promise<ChildReadingGoal[]> { return []; }
  async createChildReadingGoal(goal: InsertChildReadingGoal): Promise<ChildReadingGoal> { return { id: 1, ...goal, currentAmount: 0, isCompleted: false, createdAt: new Date() } as ChildReadingGoal; }
  async updateChildReadingGoal(_id: number, _updates: Partial<ChildReadingGoal>): Promise<ChildReadingGoal | undefined> { return undefined; }
  async getChildChallenges(_childProfileId: number): Promise<ChildChallenge[]> { return []; }
  async createChildChallenge(challenge: InsertChildChallenge): Promise<ChildChallenge> { return { id: 1, ...challenge, progress: 0, startedAt: new Date(), completedAt: null } as ChildChallenge; }
  async updateChildChallenge(_id: number, _updates: Partial<ChildChallenge>): Promise<ChildChallenge | undefined> { return undefined; }
  async deleteChildChallenge(_id: number): Promise<boolean> { return true; }

  private tagSuggestions: Map<number, BookTagSuggestion> = new Map();
  private currentTagSuggestionId = 1;
  async createBookTagSuggestion(suggestion: InsertBookTagSuggestion): Promise<BookTagSuggestion> {
    const id = this.currentTagSuggestionId++;
    const s = { id, ...suggestion, status: "pending", createdAt: new Date() } as BookTagSuggestion;
    this.tagSuggestions.set(id, s);
    return s;
  }
  async getBookTagSuggestions(catalogBookId: number): Promise<BookTagSuggestion[]> {
    return Array.from(this.tagSuggestions.values()).filter(s => s.catalogBookId === catalogBookId);
  }
  async getUserTagSuggestions(userId: string, catalogBookId: number): Promise<BookTagSuggestion[]> {
    return Array.from(this.tagSuggestions.values()).filter(s => s.userId === userId && s.catalogBookId === catalogBookId);
  }
  async getApprovedCommunityTags(catalogBookId: number): Promise<BookTagSuggestion[]> {
    return Array.from(this.tagSuggestions.values()).filter(s => s.catalogBookId === catalogBookId && s.status === "approved");
  }

  private spotlights: Map<number, IndieSpotlight> = new Map();
  private currentSpotlightId = 1;
  async getIndieSpotlights(): Promise<IndieSpotlight[]> { return Array.from(this.spotlights.values()); }
  async getActiveIndieSpotlights(): Promise<IndieSpotlight[]> { return Array.from(this.spotlights.values()).filter(s => s.isActive); }
  async getIndieSpotlight(id: number): Promise<IndieSpotlight | undefined> { return this.spotlights.get(id); }
  async createIndieSpotlight(spotlight: InsertIndieSpotlight): Promise<IndieSpotlight> {
    const id = this.currentSpotlightId++;
    const s = { id, ...spotlight, createdAt: new Date() } as IndieSpotlight;
    this.spotlights.set(id, s);
    return s;
  }
  async updateIndieSpotlight(id: number, updates: Partial<InsertIndieSpotlight>): Promise<IndieSpotlight | undefined> {
    const s = this.spotlights.get(id);
    if (!s) return undefined;
    const updated = { ...s, ...updates };
    this.spotlights.set(id, updated);
    return updated;
  }
  async deleteIndieSpotlight(id: number): Promise<boolean> { return this.spotlights.delete(id); }
  private spotlightRequests = new Map<number, IndieSpotlightRequest>();
  private spotlightRequestId = 1;
  async createSpotlightRequest(data: InsertIndieSpotlightRequest): Promise<IndieSpotlightRequest> {
    const id = this.spotlightRequestId++;
    const req = { ...data, id, status: "pending", adminNotes: null, rejectionReason: null, spotlightId: null, createdAt: new Date() } as IndieSpotlightRequest;
    this.spotlightRequests.set(id, req);
    return req;
  }
  async getSpotlightRequests(): Promise<IndieSpotlightRequest[]> { return Array.from(this.spotlightRequests.values()); }
  async getSpotlightRequest(id: number): Promise<IndieSpotlightRequest | undefined> { return this.spotlightRequests.get(id); }
  async updateSpotlightRequest(id: number, data: Partial<IndieSpotlightRequest>): Promise<IndieSpotlightRequest | undefined> {
    const r = this.spotlightRequests.get(id);
    if (!r) return undefined;
    const updated = { ...r, ...data };
    this.spotlightRequests.set(id, updated);
    return updated;
  }
  private topicFollowsMap = new Map<number, TopicFollow>();
  private topicFollowId = 1;
  async getUserTopicFollows(userId: string): Promise<TopicFollow[]> {
    return Array.from(this.topicFollowsMap.values()).filter(t => t.userId === userId);
  }
  async followTopic(userId: string, topic: string, category: string): Promise<TopicFollow> {
    const id = this.topicFollowId++;
    const tf = { id, userId, topic, category, createdAt: new Date() } as TopicFollow;
    this.topicFollowsMap.set(id, tf);
    return tf;
  }
  async unfollowTopic(userId: string, topic: string): Promise<boolean> {
    for (const [k, v] of this.topicFollowsMap) {
      if (v.userId === userId && v.topic === topic) { this.topicFollowsMap.delete(k); return true; }
    }
    return false;
  }
  private interviewReqs = new Map<number, InterviewRequest>();
  private interviewReqId = 1;
  async createInterviewRequest(data: InsertInterviewRequest): Promise<InterviewRequest> {
    const id = this.interviewReqId++;
    const req = { ...data, id, status: "pending", adminNotes: null, rejectionReason: null, scheduledDateTime: null, scheduledFormat: null, assignedHost: null, contentTiktokUrl: null, contentYoutubeUrl: null, contentInstagramUrl: null, contentBlogUrl: null, createdAt: new Date() } as InterviewRequest;
    this.interviewReqs.set(id, req);
    return req;
  }
  async getInterviewRequests(status?: string): Promise<InterviewRequest[]> {
    const all = Array.from(this.interviewReqs.values());
    return status ? all.filter(r => r.status === status) : all;
  }
  async getInterviewRequest(id: number): Promise<InterviewRequest | undefined> { return this.interviewReqs.get(id); }
  async updateInterviewRequest(id: number, data: Partial<InterviewRequest>): Promise<InterviewRequest | undefined> {
    const r = this.interviewReqs.get(id);
    if (!r) return undefined;
    const updated = { ...r, ...data };
    this.interviewReqs.set(id, updated);
    return updated;
  }

  async getDiscoveryTags(_category?: string): Promise<DiscoveryTag[]> { return []; }
  async createDiscoveryTag(tag: InsertDiscoveryTag): Promise<DiscoveryTag> { return { id: 1, ...tag, isSensitive: tag.isSensitive ?? false, description: tag.description ?? null, createdAt: new Date() } as DiscoveryTag; }
  async tagBook(_bookId: number, _tagId: number): Promise<BookDiscoveryTag> { return { id: 1, bookId: _bookId, tagId: _tagId }; }
  async untagBook(_bookId: number, _tagId: number): Promise<boolean> { return true; }
  async getBookTags(_bookId: number): Promise<DiscoveryTag[]> { return []; }
  async getUserFilterPresets(_userId: string): Promise<SavedFilterPreset[]> { return []; }
  async createFilterPreset(preset: InsertSavedFilterPreset): Promise<SavedFilterPreset> { return { id: 1, ...preset, includeTags: preset.includeTags ?? [], excludeTags: preset.excludeTags ?? [], filters: preset.filters ?? {}, createdAt: new Date() } as SavedFilterPreset; }
  async deleteFilterPreset(_id: number, _userId: string): Promise<boolean> { return true; }

  async blockUser(_blockerId: string, _blockedUserId: string): Promise<void> {}
  async unblockUser(_blockerId: string, _blockedUserId: string): Promise<void> {}
  async getBlockedUsers(_userId: string): Promise<any[]> { return []; }
  async isUserBlockedBy(_blockerId: string, _blockedUserId: string): Promise<boolean> { return false; }
  async reportUser(_report: any): Promise<void> {}
  async createFollowRequest(_requesterId: string, _targetUserId: string): Promise<any> { return { id: 1, requesterId: _requesterId, targetUserId: _targetUserId, status: "pending", createdAt: new Date() }; }
  async getFollowRequests(_targetUserId: string): Promise<any[]> { return []; }
  async respondToFollowRequest(_requestId: number, _status: string): Promise<any> { return null; }
  async getPendingFollowRequest(_requesterId: string, _targetUserId: string): Promise<any | undefined> { return undefined; }
  async cancelFollowRequest(_requesterId: string, _targetUserId: string): Promise<void> {}
  async getSentFollowRequests(_requesterId: string): Promise<any[]> { return []; }

  async getCommunityEvents(_filters?: { upcoming?: boolean; category?: string }): Promise<any[]> { return []; }
  async getCommunityEvent(_id: number): Promise<any | undefined> { return undefined; }
  async createCommunityEvent(_data: any): Promise<any> { return _data; }
  async updateCommunityEvent(_id: number, _data: any): Promise<any> { return _data; }
  async deleteCommunityEvent(_id: number, _userId: string): Promise<void> {}
}

import { DatabaseStorage } from "./databaseStorage";
export const storage: IStorage = new DatabaseStorage();
