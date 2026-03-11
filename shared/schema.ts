import { pgTable, text, serial, integer, boolean, timestamp, date, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Re-export auth models (users and sessions tables are defined in models/auth.ts)
export * from "./models/auth";

// Book status enum values
export const BOOK_STATUSES = ["want_to_read", "currently_reading", "finished", "dnf"] as const;
export type BookStatus = typeof BOOK_STATUSES[number];

// DNF reason options
export const DNF_REASONS = [
  "boring",
  "pacing",
  "not-for-me",
  "writing-style",
  "characters",
  "too-dark",
  "too-slow",
  "confusing",
  "other",
] as const;

// Book format/edition options
export const BOOK_FORMATS = [
  "hardcover",
  "paperback",
  "ebook",
  "kindle",
  "audiobook",
  "special-edition",
] as const;

// UserBooks - tracks user's library with ratings, reviews, and status
export const userBooks = pgTable("user_books", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  bookCoverUrl: text("book_cover_url"),
  catalogBookId: integer("catalog_book_id"),
  googleBooksId: text("google_books_id"),
  status: text("status").notNull().default("want_to_read"),
  rating: integer("rating"),
  review: text("review"),
  notes: text("notes"),
  isSpoiler: boolean("is_spoiler").default(false),
  dnfReason: text("dnf_reason"),
  dnfStopPoint: text("dnf_stop_point"),
  isOwned: boolean("is_owned").default(false),
  format: text("format"),
  shelfLocation: text("shelf_location"),
  dateAdded: timestamp("date_added").defaultNow(),
  dateStarted: date("date_started"),
  dateFinished: date("date_finished"),
  pageCount: integer("page_count"),
  currentPage: integer("current_page").default(0),
  importBatchId: text("import_batch_id"),
}, (table) => [
  index("idx_user_books_user_id").on(table.userId),
]);

export const insertUserBookSchema = createInsertSchema(userBooks).omit({ id: true, dateAdded: true });
export type UserBook = typeof userBooks.$inferSelect;
export type InsertUserBook = z.infer<typeof insertUserBookSchema>;

// UserChallenges - annual reading goals
export const userChallenges = pgTable("user_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  year: integer("year").notNull(),
  goal: integer("goal").notNull(), // Target books to read
  booksRead: text("books_read").array().notNull().default([]), // Titles of books read
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_challenges_user_id").on(table.userId),
]);

export const insertUserChallengeSchema = createInsertSchema(userChallenges).omit({ id: true, createdAt: true, updatedAt: true });
export type UserChallenge = typeof userChallenges.$inferSelect;
export type InsertUserChallenge = z.infer<typeof insertUserChallengeSchema>;

export const summerChallenges = pgTable("summer_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  year: integer("year").notNull().default(2026),
  completedSquares: text("completed_squares").array().notNull().default([]),
  booksLogged: text("books_logged").array().notNull().default([]),
  tierReached: integer("tier_reached").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_summer_challenges_user_year").on(table.userId, table.year),
]);

export const insertSummerChallengeSchema = createInsertSchema(summerChallenges).omit({ id: true, createdAt: true, updatedAt: true });
export type SummerChallenge = typeof summerChallenges.$inferSelect;
export type InsertSummerChallenge = z.infer<typeof insertSummerChallengeSchema>;

export const springChallenges = pgTable("spring_challenges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  year: integer("year").notNull().default(2026),
  completedPrompts: text("completed_prompts").array().notNull().default([]),
  booksLogged: text("books_logged").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_spring_challenges_user_year").on(table.userId, table.year),
]);

export const insertSpringChallengeSchema = createInsertSchema(springChallenges).omit({ id: true, createdAt: true, updatedAt: true });
export type SpringChallenge = typeof springChallenges.$inferSelect;
export type InsertSpringChallenge = z.infer<typeof insertSpringChallengeSchema>;

export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  badgeName: text("badge_name").notNull(),
  badgeDescription: text("badge_description").notNull(),
  badgeIcon: text("badge_icon").notNull(),
  badgeKey: text("badge_key").notNull().default(""),
  editionYear: integer("edition_year"),
  category: text("category").notNull().default("milestone"),
  activeFrom: timestamp("active_from"),
  activeTo: timestamp("active_to"),
  isShareable: boolean("is_shareable").notNull().default(true),
  earnedAt: timestamp("earned_at").defaultNow(),
}, (table) => [
  index("idx_user_badges_user_id").on(table.userId),
  index("idx_user_badges_user_badge_key").on(table.userId, table.badgeKey),
]);

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

// Newsletter Subscribers
export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({ id: true, subscribedAt: true });
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;

// Quiz History - tracks user's past quiz results for mood history
export const quizHistory = pgTable("quiz_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  takenAt: timestamp("taken_at").defaultNow(),
  fictionType: text("fiction_type"), // fiction, nonfiction, both
  selectedGenres: text("selected_genres").array().default([]),
  mood: text("mood").array().default([]),
  readingGoal: text("reading_goal").array().default([]),
  recommendedBooks: text("recommended_books").array().default([]), // Titles of books recommended
}, (table) => [
  index("idx_quiz_history_user_id").on(table.userId),
]);

export const insertQuizHistorySchema = createInsertSchema(quizHistory).omit({ id: true, takenAt: true });
export type QuizHistory = typeof quizHistory.$inferSelect;
export type InsertQuizHistory = z.infer<typeof insertQuizHistorySchema>;

// Milestone badge types
export const MILESTONE_BADGES = [
  "first-book",
  "5-books",
  "10-books",
  "25-books",
  "50-books",
  "100-books",
  "first-dnf",
  "7-day-streak",
  "30-day-streak",
  "first-review",
  "bookworm",
] as const;

// Reading Streaks - gamification
export const readingStreaks = pgTable("reading_streaks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: date("last_activity_date"),
  totalBooksFinished: integer("total_books_finished").default(0),
  totalDnf: integer("total_dnf").default(0),
  earnedBadges: text("earned_badges").array().default([]), // Milestone badges earned
});

export const insertReadingStreakSchema = createInsertSchema(readingStreaks).omit({ id: true });
export type ReadingStreak = typeof readingStreaks.$inferSelect;
export type InsertReadingStreak = z.infer<typeof insertReadingStreakSchema>;

// Reading Lists - user-created custom shelves/collections
export const readingLists = pgTable("reading_lists", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(), // "Summer Reads", "Book Club Picks"
  description: text("description"),
  emoji: text("emoji"), // Optional icon for the list
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reading_lists_user_id").on(table.userId),
]);

export const insertReadingListSchema = createInsertSchema(readingLists).omit({ id: true, createdAt: true, updatedAt: true });
export type ReadingList = typeof readingLists.$inferSelect;
export type InsertReadingList = z.infer<typeof insertReadingListSchema>;

// Reading List Items - books in a reading list
export const readingListItems = pgTable("reading_list_items", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),
  userBookId: integer("user_book_id"), // Link to user's library
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  bookCoverUrl: text("book_cover_url"),
  googleBooksId: text("google_books_id"),
  addedAt: timestamp("added_at").defaultNow(),
  sortOrder: integer("sort_order").default(0),
}, (table) => [
  index("idx_reading_list_items_list_id").on(table.listId),
]);

export const insertReadingListItemSchema = createInsertSchema(readingListItems).omit({ id: true, addedAt: true });
export type ReadingListItem = typeof readingListItems.$inferSelect;
export type InsertReadingListItem = z.infer<typeof insertReadingListItemSchema>;

// Book Quotes - favorite quotes from books
export const bookQuotes = pgTable("book_quotes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userBookId: integer("user_book_id"), // Optional link to user's library entry
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  quote: text("quote").notNull(),
  pageNumber: integer("page_number"),
  chapter: text("chapter"),
  notes: text("notes"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_book_quotes_user_id").on(table.userId),
]);

export const insertBookQuoteSchema = createInsertSchema(bookQuotes).omit({ id: true, createdAt: true });
export type BookQuote = typeof bookQuotes.$inferSelect;
export type InsertBookQuote = z.infer<typeof insertBookQuoteSchema>;

// Book Series - track series progress
export const bookSeries = pgTable("book_series", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  seriesName: text("series_name").notNull(),
  authorName: text("author_name").notNull(),
  totalBooks: integer("total_books"), // null if unknown/ongoing
  isComplete: boolean("is_complete").default(false), // Is the series finished publishing?
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_book_series_user_id").on(table.userId),
]);

export const insertBookSeriesSchema = createInsertSchema(bookSeries).omit({ id: true, createdAt: true });
export type BookSeries = typeof bookSeries.$inferSelect;
export type InsertBookSeries = z.infer<typeof insertBookSeriesSchema>;

// Series Books - individual books in a series
export const seriesBooks = pgTable("series_books", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id").notNull(),
  bookNumber: integer("book_number").notNull(), // Order in series
  bookTitle: text("book_title").notNull(),
  googleBooksId: text("google_books_id"),
  userBookId: integer("user_book_id"), // Link to user's library if they have it
  status: text("status").default("not_started"), // not_started, reading, finished
  coverUrl: text("cover_url"),
}, (table) => [
  index("idx_series_books_series_id").on(table.seriesId),
]);

export const insertSeriesBookSchema = createInsertSchema(seriesBooks).omit({ id: true });
export type SeriesBook = typeof seriesBooks.$inferSelect;
export type InsertSeriesBook = z.infer<typeof insertSeriesBookSchema>;

// Author Profiles - for the Author Portal
export const authorProfiles = pgTable("author_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  penName: text("pen_name").notNull(),
  slug: text("slug").notNull().unique(),
  bio: text("bio"),
  website: text("website"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  goodreadsUrl: text("goodreads_url"),
  amazonAuthorUrl: text("amazon_author_url"),
  bookbubUrl: text("bookbub_url"),
  tiktokHandle: text("tiktok_handle"),
  genres: text("genres").array().default([]),
  avatarUrl: text("avatar_url"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAuthorProfileSchema = createInsertSchema(authorProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type AuthorProfile = typeof authorProfiles.$inferSelect;
export type InsertAuthorProfile = z.infer<typeof insertAuthorProfileSchema>;

export const authorBooks = pgTable("author_books", {
  id: serial("id").primaryKey(),
  authorProfileId: integer("author_profile_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverUrl: text("cover_url"),
  genres: text("genres").array().default([]),
  amazonUrl: text("amazon_url"),
  bookshopUrl: text("bookshop_url"),
  googleBooksId: text("google_books_id"),
  seriesName: text("series_name"),
  seriesNumber: integer("series_number"),
  publishedDate: text("published_date"),
  isUpcoming: boolean("is_upcoming").default(false),
  arcEnabled: boolean("arc_enabled").default(false),
  arcDescription: text("arc_description"),
  arcDownloadUrl: text("arc_download_url"),
  arcCouponCode: text("arc_coupon_code"),
  arcMaxClaims: integer("arc_max_claims"),
  arcClaimCount: integer("arc_claim_count").default(0),
  arcExpiresAt: timestamp("arc_expires_at"),
  arcDownloadExpiryHours: integer("arc_download_expiry_hours"),
  arcWaitlistEnabled: boolean("arc_waitlist_enabled").default(false),
  arcVisibility: text("arc_visibility").notNull().default("discoverable"),
  arcShareToken: text("arc_share_token"),
  arcAmazonReviewUrl: text("arc_amazon_review_url"),
  arcGoodreadsReviewUrl: text("arc_goodreads_review_url"),
  arcStorygraphReviewUrl: text("arc_storygraph_review_url"),
  arcBookbubReviewUrl: text("arc_bookbub_review_url"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthorBookSchema = createInsertSchema(authorBooks).omit({ id: true, arcClaimCount: true, createdAt: true });
export type AuthorBook = typeof authorBooks.$inferSelect;
export type InsertAuthorBook = z.infer<typeof insertAuthorBookSchema>;

export const FEATURED_PLACEMENT_TYPES = ["spotlight", "frontpage", "recommendation_boost"] as const;
export const PLACEMENT_TYPES = ["spotlight", "feedBoost", "searchBoost"] as const;

export const PLACEMENT_PRICING_TIERS = [
  { durationDays: 7, price: 1500 },
  { durationDays: 14, price: 2900 },
  { durationDays: 30, price: 3900 },
] as const;

export function getPlacementPrice(durationDays: number): number | null {
  const tier = PLACEMENT_PRICING_TIERS.find(t => t.durationDays === durationDays);
  return tier ? tier.price : null;
}

export const featuredPlacements = pgTable("featured_placements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  authorProfileId: integer("author_profile_id").notNull(),
  title: text("title"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  isSponsored: boolean("is_sponsored").default(false),
  priority: integer("priority").default(0),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  durationDays: integer("duration_days"),
  pricePaid: integer("price_paid"),
  placementType: text("placement_type"),
  orderId: text("order_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeaturedPlacementSchema = createInsertSchema(featuredPlacements).omit({ id: true, createdAt: true });
export type FeaturedPlacement = typeof featuredPlacements.$inferSelect;
export type InsertFeaturedPlacement = z.infer<typeof insertFeaturedPlacementSchema>;

export const ARC_CLAIM_STATUSES = ["invited", "requested", "approved", "downloaded", "reading", "finished", "reviewed"] as const;
export type ArcClaimStatus = typeof ARC_CLAIM_STATUSES[number];

export const arcClaims = pgTable("arc_claims", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  authorProfileId: integer("author_profile_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  claimedAt: timestamp("claimed_at").defaultNow(),
  downloadExpiresAt: timestamp("download_expires_at"),
  reviewReminded: boolean("review_reminded").default(false),
  isFlagged: boolean("is_flagged").default(false),
  readingProgress: integer("reading_progress").default(0),
  progressUpdatedAt: timestamp("progress_updated_at"),
  status: text("status").notNull().default("approved"),
  approvedAt: timestamp("approved_at"),
  downloadedAt: timestamp("downloaded_at"),
  finishedAt: timestamp("finished_at"),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => [
  index("idx_arc_claims_user_id").on(table.userId),
  index("idx_arc_claims_book_id").on(table.bookId),
  index("idx_arc_claims_author_profile_id").on(table.authorProfileId),
  uniqueIndex("idx_arc_claims_user_book").on(table.userId, table.bookId),
]);

export type ArcClaim = typeof arcClaims.$inferSelect;

export const arcBlockedUsers = pgTable("arc_blocked_users", {
  id: serial("id").primaryKey(),
  authorProfileId: integer("author_profile_id").notNull(),
  blockedUserId: text("blocked_user_id").notNull(),
  blockedUserName: text("blocked_user_name"),
  reason: text("reason"),
  blockedAt: timestamp("blocked_at").defaultNow(),
}, (table) => [
  index("idx_arc_blocked_author_profile_id").on(table.authorProfileId),
  index("idx_arc_blocked_user_id").on(table.blockedUserId),
]);

export type ArcBlockedUser = typeof arcBlockedUsers.$inferSelect;

export const arcWaitlist = pgTable("arc_waitlist", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  authorProfileId: integer("author_profile_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  joinedAt: timestamp("joined_at").defaultNow(),
  notified: boolean("notified").default(false),
}, (table) => [
  index("idx_arc_waitlist_book_id").on(table.bookId),
  index("idx_arc_waitlist_user_id").on(table.userId),
]);

export type ArcWaitlistEntry = typeof arcWaitlist.$inferSelect;

export const ARC_REPORT_REASONS = ["suspicious_activity", "fake_account", "bulk_claiming", "no_review", "other"] as const;

export const arcClaimReports = pgTable("arc_claim_reports", {
  id: serial("id").primaryKey(),
  authorProfileId: integer("author_profile_id").notNull(),
  claimId: integer("claim_id").notNull(),
  userId: text("user_id").notNull(),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_arc_claim_reports_author_profile_id").on(table.authorProfileId),
  index("idx_arc_claim_reports_claim_id").on(table.claimId),
]);

export type ArcClaimReport = typeof arcClaimReports.$inferSelect;

export const arcFeedback = pgTable("arc_feedback", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  authorProfileId: integer("author_profile_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  feedbackText: text("feedback_text").notNull(),
  feedbackType: text("feedback_type").notNull().default("general"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_arc_feedback_book_id").on(table.bookId),
  index("idx_arc_feedback_author_profile_id").on(table.authorProfileId),
]);

export const insertArcFeedbackSchema = createInsertSchema(arcFeedback).omit({ id: true, createdAt: true });
export type ArcFeedback = typeof arcFeedback.$inferSelect;
export type InsertArcFeedback = z.infer<typeof insertArcFeedbackSchema>;

export const ARC_FEEDBACK_TYPES = ["general", "typo", "plot_issue", "pacing", "character", "formatting", "other"] as const;

export const ARC_VISIBILITY_OPTIONS = ["discoverable", "invite-only", "private"] as const;
export type ArcVisibility = typeof ARC_VISIBILITY_OPTIONS[number];

export const arcInvites = pgTable("arc_invites", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  authorProfileId: integer("author_profile_id").notNull(),
  token: text("token").notNull().unique(),
  email: text("email"),
  invitedUserId: text("invited_user_id"),
  acceptedByUserId: text("accepted_by_user_id"),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
}, (table) => [
  index("idx_arc_invites_book_id").on(table.bookId),
  index("idx_arc_invites_author_profile_id").on(table.authorProfileId),
  index("idx_arc_invites_token").on(table.token),
]);

export const insertArcInviteSchema = createInsertSchema(arcInvites).omit({ id: true, createdAt: true });
export type ArcInvite = typeof arcInvites.$inferSelect;
export type InsertArcInvite = z.infer<typeof insertArcInviteSchema>;

// Follows - Social following system
export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: text("follower_id").notNull(),
  followingId: text("following_id").notNull(),
  followedAt: timestamp("followed_at").defaultNow(),
}, (table) => [
  index("idx_follows_follower_id").on(table.followerId),
  index("idx_follows_following_id").on(table.followingId),
]);

export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, followedAt: true });
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;

// Activity Events - Activity feed events
export const activityEvents = pgTable("activity_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  bookTitle: text("book_title"),
  bookAuthor: text("book_author"),
  bookCoverUrl: text("book_cover_url"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_activity_events_user_id").on(table.userId),
  index("idx_activity_events_created_at").on(table.createdAt),
]);

export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({ id: true, createdAt: true });
export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;

// Notifications - In-app notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  fromUserId: text("from_user_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_notifications_user_id").on(table.userId),
]);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Author Book Reviews - Reader reviews on author portal books
export const authorBookReviews = pgTable("author_book_reviews", {
  id: serial("id").primaryKey(),
  authorBookId: integer("author_book_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  pacingRating: integer("pacing_rating"),
  charactersRating: integer("characters_rating"),
  writingRating: integer("writing_rating"),
  wouldRecommend: boolean("would_recommend"),
  isVerifiedArc: boolean("is_verified_arc").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuthorBookReviewSchema = createInsertSchema(authorBookReviews).omit({ id: true, createdAt: true });
export type AuthorBookReview = typeof authorBookReviews.$inferSelect;
export type InsertAuthorBookReview = z.infer<typeof insertAuthorBookReviewSchema>;

// Book Clubs - Book clubs
export const bookClubs = pgTable("book_clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull(),
  coverImageUrl: text("cover_image_url"),
  isPublic: boolean("is_public").default(true),
  maxMembers: integer("max_members").default(50),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookClubSchema = createInsertSchema(bookClubs).omit({ id: true, createdAt: true });
export type BookClub = typeof bookClubs.$inferSelect;
export type InsertBookClub = z.infer<typeof insertBookClubSchema>;

// Club Members - Club membership
export const clubMembers = pgTable("club_members", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").default("member"),
  currentChapter: integer("current_chapter"),
  currentPage: integer("current_page"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_club_members_club_id").on(table.clubId),
  index("idx_club_members_user_id").on(table.userId),
]);

export const insertClubMemberSchema = createInsertSchema(clubMembers).omit({ id: true, joinedAt: true });
export type ClubMember = typeof clubMembers.$inferSelect;
export type InsertClubMember = z.infer<typeof insertClubMemberSchema>;

// Club Discussions - Discussion posts in clubs
export const clubDiscussions = pgTable("club_discussions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  title: text("title"),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  chapterStart: integer("chapter_start"),
  chapterEnd: integer("chapter_end"),
  hasSpoilers: boolean("has_spoilers").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_club_discussions_club_id").on(table.clubId),
]);

export const insertClubDiscussionSchema = createInsertSchema(clubDiscussions).omit({ id: true, createdAt: true });
export type ClubDiscussion = typeof clubDiscussions.$inferSelect;
export type InsertClubDiscussion = z.infer<typeof insertClubDiscussionSchema>;

// Club Reading Books - Current/past books the club is reading
export const clubReadingBooks = pgTable("club_reading_books", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author").notNull(),
  bookCoverUrl: text("book_cover_url"),
  googleBooksId: text("google_books_id"),
  status: text("status").default("current"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  addedBy: text("added_by").notNull(),
  voteCount: integer("vote_count").default(0),
  addedAt: timestamp("added_at").defaultNow(),
}, (table) => [
  index("idx_club_reading_books_club_id").on(table.clubId),
]);

export const insertClubReadingBookSchema = createInsertSchema(clubReadingBooks).omit({ id: true, addedAt: true });
export type ClubReadingBook = typeof clubReadingBooks.$inferSelect;
export type InsertClubReadingBook = z.infer<typeof insertClubReadingBookSchema>;

// Club Votes - Votes on nominated books
export const clubVotes = pgTable("club_votes", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  bookId: integer("book_id").notNull(),
  userId: text("user_id").notNull(),
  votedAt: timestamp("voted_at").defaultNow(),
}, (table) => [
  index("idx_club_votes_club_id").on(table.clubId),
  index("idx_club_votes_user_id").on(table.userId),
]);

export const insertClubVoteSchema = createInsertSchema(clubVotes).omit({ id: true, votedAt: true });
export type ClubVote = typeof clubVotes.$inferSelect;
export type InsertClubVote = z.infer<typeof insertClubVoteSchema>;

// Club Meetings - Scheduled club events
export const clubMeetings = pgTable("club_meetings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  meetingDate: timestamp("meeting_date").notNull(),
  location: text("location"),
  meetingLink: text("meeting_link"),
  agenda: text("agenda"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClubMeetingSchema = createInsertSchema(clubMeetings).omit({ id: true, createdAt: true });
export type ClubMeeting = typeof clubMeetings.$inferSelect;
export type InsertClubMeeting = z.infer<typeof insertClubMeetingSchema>;

// Club Meeting RSVPs
export const clubMeetingRsvps = pgTable("club_meeting_rsvps", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("going"),
  respondedAt: timestamp("responded_at").defaultNow(),
});

export const insertClubMeetingRsvpSchema = createInsertSchema(clubMeetingRsvps).omit({ id: true, respondedAt: true });
export type ClubMeetingRsvp = typeof clubMeetingRsvps.$inferSelect;
export type InsertClubMeetingRsvp = z.infer<typeof insertClubMeetingRsvpSchema>;

export const clubReadingSchedules = pgTable("club_reading_schedules", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").notNull(),
  weekNumber: integer("week_number").notNull(),
  label: text("label").notNull(),
  chapterStart: integer("chapter_start"),
  chapterEnd: integer("chapter_end"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertClubReadingScheduleSchema = createInsertSchema(clubReadingSchedules).omit({ id: true, createdAt: true });
export type ClubReadingSchedule = typeof clubReadingSchedules.$inferSelect;
export type InsertClubReadingSchedule = z.infer<typeof insertClubReadingScheduleSchema>;

// Analytics Events - Track profile views and link clicks for authors
export const analyticsEvents = pgTable("analytics_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  authorProfileId: integer("author_profile_id"),
  authorBookId: integer("author_book_id"),
  linkType: text("link_type"),
  visitorId: text("visitor_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({ id: true, createdAt: true });
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;

// Community Discussions - Site-wide reading discussion topics
export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull().default("general"),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull().default("member"),
  userId: text("user_id"),
  isPinned: boolean("is_pinned").default(false),
  commentCount: integer("comment_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDiscussionSchema = createInsertSchema(discussions).omit({ id: true, createdAt: true, commentCount: true });
export type Discussion = typeof discussions.$inferSelect;
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;

// Discussion Comments - Replies on discussion topics
export const discussionComments = pgTable("discussion_comments", {
  id: serial("id").primaryKey(),
  discussionId: integer("discussion_id").notNull(),
  content: text("content").notNull(),
  authorName: text("author_name").notNull(),
  authorRole: text("author_role").notNull().default("member"),
  userId: text("user_id"),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_discussion_comments_discussion_id").on(table.discussionId),
]);

export const insertDiscussionCommentSchema = createInsertSchema(discussionComments).omit({ id: true, createdAt: true });
export type DiscussionComment = typeof discussionComments.$inferSelect;
export type InsertDiscussionComment = z.infer<typeof insertDiscussionCommentSchema>;

// Relations
export const userBooksRelations = relations(userBooks, ({ one }) => ({
  catalogBook: one(catalogBooks, {
    fields: [userBooks.catalogBookId],
    references: [catalogBooks.id],
  }),
}));

// CatalogBook - books imported from Google Books API
export const catalogBooks = pgTable("catalog_books", {
  id: serial("id").primaryKey(),
  
  // Core book info
  title: text("title").notNull(),
  authors: text("authors").array().notNull(), // Multiple authors
  description: text("description"),
  
  // Identifiers
  isbn10: text("isbn10"),
  isbn13: text("isbn13"),
  
  // Metadata
  categories: text("categories").array(), // Genres from Google Books
  pageCount: integer("page_count"),
  publishedDate: text("published_date"),
  coverUrl: text("cover_url"),
  
  // Source tracking
  source: text("source").notNull().default("google_books"),
  sourceId: text("source_id").notNull(), // Google Books volume ID
  
  // Our custom attributes for matching (can be set later via admin or AI)
  mood: text("mood"), // happy, emotional, adventurous, scary, thoughtful
  pace: text("pace"), // fast, medium, slow  
  length: text("length"), // short, medium, long (derived from pageCount)
  spiceLevel: integer("spice_level").default(1),
  darknessLevel: integer("darkness_level").default(2),
  tropes: text("tropes").array().default([]),
  tags: text("tags").array().default([]),
  
  // Extended attributes for enhanced recommendations
  moodTags: text("mood_tags").array().default([]), // cozy, dark, fast-paced, emotional, etc.
  contentWarnings: text("content_warnings").array().default([]), // violence, abuse, death, etc.
  
  // Classification for non-romance-centric display
  romanceLevel: text("romance_level").default("none"), // none, subplot, central
  tone: text("tone").default("medium"), // light, medium, dark
  
  // Format availability flags
  hasEbook: boolean("has_ebook").default(true), // Assume ebook available
  hasAudiobook: boolean("has_audiobook").default(false),
  kindleUnlimited: boolean("kindle_unlimited").default(false),
  libbyAvailable: boolean("libby_available").default(false),
  
  communityTags: text("community_tags").array().default([]),
  communityTropes: text("community_tropes").array().default([]),
  communityMoodTags: text("community_mood_tags").array().default([]),

  // Import metadata
  importedAt: timestamp("imported_at").defaultNow(),
}, (table) => [
  index("idx_catalog_books_isbn13").on(table.isbn13),
  index("idx_catalog_books_source_id").on(table.sourceId),
  index("idx_catalog_books_title").on(table.title),
]);

export const insertCatalogBookSchema = createInsertSchema(catalogBooks).omit({ id: true, importedAt: true });
export type CatalogBook = typeof catalogBooks.$inferSelect;
export type InsertCatalogBook = z.infer<typeof insertCatalogBookSchema>;

// Legacy Book type for backwards compatibility
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url").notNull(),
  mood: text("mood").notNull(),
  pace: text("pace").notNull(),
  length: text("length").notNull(),
  spiceLevel: integer("spice_level").notNull(),
  darknessLevel: integer("darkness_level").notNull(),
  tropes: text("tropes").array().notNull(), 
  tags: text("tags").array().notNull(),
});

export const insertBookSchema = createInsertSchema(books).omit({ id: true });
export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

// All available genres for selection
export const ALL_GENRES = [
  "romance",
  "fantasy",
  "thriller",
  "mystery",
  "sci-fi",
  "horror",
  "young-adult",
  "literary-fiction",
  "historical-fiction",
  "contemporary",
  "nonfiction",
  "biography",
  "self-help",
] as const;

// Romance-specific tropes (only shown if romance is selected)
export const ROMANCE_TROPES = [
  "enemies-to-lovers",
  "friends-to-lovers",
  "forced-proximity",
  "second-chance",
  "forbidden-love",
  "slow-burn",
  "fake-dating",
  "grumpy-sunshine",
  "royal-court",
  "romantic-suspense",
] as const;

// General tropes for all fiction
export const GENERAL_TROPES = [
  "found-family",
  "chosen-one",
  "redemption-arc",
  "unreliable-narrator",
  "whodunnit",
  "locked-room",
  "time-travel",
  "multiverse",
  "survival",
  "coming-of-age",
  "mentor-student",
  "heist",
  "revenge",
  "cozy-fantasy",
  "dark-academia",
  "small-town",
  "trauma",
  "magical-realism",
] as const;

// Romance level indicators
export const ROMANCE_LEVELS = ["none", "subplot", "central"] as const;
export type RomanceLevel = typeof ROMANCE_LEVELS[number];

// Tone indicators
export const TONES = ["light", "medium", "dark"] as const;
export type Tone = typeof TONES[number];

// Nonfiction categories for more specific recommendations
export const NONFICTION_CATEGORY_OPTIONS = [
  { value: "memoir", label: "Memoir / Autobiography" },
  { value: "biography", label: "Biography" },
  { value: "self-help", label: "Self-Help / Personal Development" },
  { value: "history", label: "History" },
  { value: "science", label: "Popular Science" },
  { value: "psychology", label: "Psychology" },
  { value: "health", label: "Health & Wellness" },
  { value: "business", label: "Business & Leadership" },
  { value: "true-crime", label: "True Crime" },
  { value: "philosophy", label: "Philosophy" },
  { value: "travel", label: "Travel & Adventure" },
  { value: "nature", label: "Nature & Environment" },
] as const;

// Quiz Schema - fictionType and genres are required early questions, rest optional
export const quizSchema = z.object({
  // Required early questions
  fictionType: z.enum(["fiction", "nonfiction", "both"]).optional(),
  ageGroup: z.enum(["children", "middle-grade", "young-adult", "new-adult", "adult"]).optional(),
  genres: z.array(z.string()).optional(),
  nonfictionCategory: z.array(z.string()).optional(),
  
  // Standard questions (mood and readingGoal are multi-select)
  mood: z.array(z.enum(["happy", "emotional", "adventurous", "scary", "thoughtful"])).optional(),
  pace: z.enum(["fast", "medium", "slow"]).optional(),
  length: z.enum(["short", "medium", "long"]).optional(),
  maxSpice: z.number().min(1).max(5).optional(),
  maxDarkness: z.number().min(1).max(5).optional(),
  
  // Tropes - general and romance-specific
  tropes: z.array(z.string()).optional(),
  romanceTropes: z.array(z.string()).optional(),
  avoidTropes: z.array(z.string()).optional(),
  avoidTopics: z.array(z.string()).optional(),
  
  // Preferences (multi-select)
  settings: z.array(z.enum(["contemporary", "historical", "fantasy-world", "space", "small-town"])).optional(),
  protagonists: z.array(z.enum(["strong-female", "morally-gray", "underdog", "antihero", "ensemble"])).optional(),
  endingPreferences: z.array(z.enum(["happy", "bittersweet", "open", "twist"])).optional(),
  readingGoal: z.array(z.enum(["escape", "learn", "cry", "laugh", "think"])).optional(),
  standalone: z.boolean().optional(),
  audioFriendly: z.boolean().optional(),
  recentlyPopular: z.boolean().optional(),
  classicOrNew: z.enum(["classic", "new", "either"]).optional(),
  diverseVoices: z.boolean().optional(),
  triggerSensitive: z.boolean().optional(),
  
  // Exclusion and format fields
  avoidGenres: z.array(z.string()).optional(),
  avoidAuthors: z.array(z.string()).optional(),
  minSpice: z.number().min(1).max(5).optional(),
  wantAudiobook: z.boolean().optional(),
  wantKindleUnlimited: z.boolean().optional(),
  resultCount: z.number().min(5).max(15).optional(),
});

export type QuizAnswers = z.infer<typeof quizSchema>;

// All available tropes (combines romance and general for backwards compatibility)
export const ALL_TROPES = [...ROMANCE_TROPES, ...GENERAL_TROPES] as const;

// Quiz question interface
export interface QuizQuestion {
  id: string;
  question: string;
  type: "single" | "multiple" | "slider" | "boolean";
  field: keyof QuizAnswers;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  romanceOnly?: boolean; // Only show if Romance is selected
  fictionOnly?: boolean; // Only show for fiction, not nonfiction
  nonfictionOnly?: boolean; // Only show if Nonfiction is selected
  adultOnly?: boolean; // Only show for new-adult and adult audiences
  maxSelections?: number; // Maximum number of selections for multiple choice questions
}

// MANDATORY EARLY QUESTIONS (always asked first, in order)
export const MANDATORY_QUESTIONS: QuizQuestion[] = [
  {
    id: "fictionType",
    question: "What are you in the mood for?",
    type: "single",
    field: "fictionType",
    options: [
      { value: "fiction", label: "Fiction" },
      { value: "nonfiction", label: "Non-fiction" },
    ],
  },
  {
    id: "ageGroup",
    question: "Who are you finding books for?",
    type: "single",
    field: "ageGroup",
    options: [
      { value: "children", label: "Children (ages 5-8)" },
      { value: "middle-grade", label: "Middle Grade (ages 9-12)" },
      { value: "young-adult", label: "Young Adult / Teen (ages 13-17)" },
      { value: "new-adult", label: "New Adult (ages 18-25)" },
      { value: "adult", label: "Adult (18+)" },
    ],
  },
  {
    id: "genres",
    question: "Pick up to 3 genres you're in the mood for:",
    type: "multiple",
    field: "genres",
    maxSelections: 3,
    options: [
      { value: "romance", label: "Romance" },
      { value: "fantasy", label: "Fantasy" },
      { value: "thriller", label: "Mystery / Thriller" },
      { value: "mystery", label: "Mystery" },
      { value: "sci-fi", label: "Sci-Fi" },
      { value: "horror", label: "Horror" },
      { value: "literary-fiction", label: "Literary Fiction" },
      { value: "historical-fiction", label: "Historical" },
      { value: "contemporary", label: "Contemporary" },
      { value: "nonfiction", label: "Non-fiction" },
      { value: "biography", label: "Biography / Memoir" },
      { value: "self-help", label: "Self-Help" },
    ],
  },
];

// ROMANCE-SPECIFIC QUESTIONS (only if Romance selected)
export const ROMANCE_QUESTIONS: QuizQuestion[] = [
  {
    id: "romanceTropes",
    question: "Pick up to 3 romance tropes you love:",
    type: "multiple",
    field: "romanceTropes",
    romanceOnly: true,
    maxSelections: 3,
    options: ROMANCE_TROPES.map(t => ({ 
      value: t, 
      label: t.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
    })),
  },
  {
    id: "maxSpice",
    question: "What's your maximum comfort level for romantic content? (1 = None, 5 = Explicit)",
    type: "slider",
    field: "maxSpice",
    romanceOnly: true,
    adultOnly: true,
    min: 1,
    max: 5,
  },
  {
    id: "minSpice",
    question: "What's your MINIMUM spice level? (1 = None required, 5 = Bring the heat)",
    type: "slider",
    field: "minSpice",
    romanceOnly: true,
    adultOnly: true,
    min: 1,
    max: 5,
  },
];

// NONFICTION-SPECIFIC QUESTIONS (only if Nonfiction selected)
export const NONFICTION_QUESTIONS: QuizQuestion[] = [
  {
    id: "nonfictionCategory",
    question: "Pick up to 3 topics that interest you most:",
    type: "multiple",
    field: "nonfictionCategory",
    nonfictionOnly: true,
    maxSelections: 3,
    options: NONFICTION_CATEGORY_OPTIONS.map(opt => ({ value: opt.value, label: opt.label })),
  },
];

// GENERAL RANDOM QUESTIONS POOL (fiction-applicable)
export const RANDOM_QUESTIONS: QuizQuestion[] = [
  {
    id: "mood",
    question: "Pick up to 2 moods that fit you right now:",
    type: "multiple",
    field: "mood",
    maxSelections: 2,
    options: [
      { value: "happy", label: "Happy & Light" },
      { value: "emotional", label: "Emotional & Moving" },
      { value: "adventurous", label: "Adventurous & Exciting" },
      { value: "scary", label: "Dark & Thrilling" },
      { value: "thoughtful", label: "Thoughtful & Deep" },
    ],
  },
  {
    id: "pace",
    question: "How fast do you want the story to move?",
    type: "single",
    field: "pace",
    fictionOnly: true,
    options: [
      { value: "fast", label: "Fast-paced, can't put it down" },
      { value: "medium", label: "Steady, well-balanced" },
      { value: "slow", label: "Slow, atmospheric" },
    ],
  },
  {
    id: "length",
    question: "How long of a book are you looking for?",
    type: "single",
    field: "length",
    options: [
      { value: "short", label: "Short (under 300 pages)" },
      { value: "medium", label: "Medium (300-450 pages)" },
      { value: "long", label: "Long (450+ pages)" },
    ],
  },
  {
    id: "maxDarkness",
    question: "How dark are you willing to go? (1 = Light, 5 = Very Dark)",
    type: "slider",
    field: "maxDarkness",
    fictionOnly: true,
    adultOnly: true,
    min: 1,
    max: 5,
  },
  {
    id: "tropes",
    question: "Pick up to 3 story elements you love:",
    type: "multiple",
    field: "tropes",
    fictionOnly: true,
    maxSelections: 3,
    options: GENERAL_TROPES.map(t => ({ 
      value: t, 
      label: t.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
    })),
  },
  {
    id: "avoidTropes",
    question: "Any tropes you want to AVOID? (Pick up to 3)",
    type: "multiple",
    field: "avoidTropes",
    fictionOnly: true,
    maxSelections: 3,
    options: [...GENERAL_TROPES, ...ROMANCE_TROPES].map(t => ({ 
      value: t, 
      label: t.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") 
    })),
  },
  {
    id: "settings",
    question: "Where do you want the story to take place? (Select all that apply)",
    type: "multiple",
    field: "settings",
    fictionOnly: true,
    options: [
      { value: "contemporary", label: "Modern day, real world" },
      { value: "historical", label: "Historical period" },
      { value: "fantasy-world", label: "Fantasy realm" },
      { value: "space", label: "Space / Sci-fi" },
      { value: "small-town", label: "Cozy small town" },
    ],
  },
  {
    id: "protagonists",
    question: "What kind of main character appeals to you? (Select all that apply)",
    type: "multiple",
    field: "protagonists",
    fictionOnly: true,
    options: [
      { value: "strong-female", label: "Strong female lead" },
      { value: "morally-gray", label: "Morally gray" },
      { value: "underdog", label: "Underdog hero" },
      { value: "antihero", label: "Antihero" },
      { value: "ensemble", label: "Ensemble cast" },
    ],
  },
  {
    id: "endingPreferences",
    question: "What kind of endings do you enjoy? (Select all that apply)",
    type: "multiple",
    field: "endingPreferences",
    fictionOnly: true,
    options: [
      { value: "happy", label: "Happily ever after" },
      { value: "bittersweet", label: "Bittersweet" },
      { value: "open", label: "Open-ended" },
      { value: "twist", label: "Mind-bending twist" },
    ],
  },
  {
    id: "readingGoal",
    question: "Pick up to 2 things you want from this book:",
    type: "multiple",
    field: "readingGoal",
    maxSelections: 2,
    options: [
      { value: "escape", label: "Escape reality" },
      { value: "learn", label: "Learn something new" },
      { value: "cry", label: "Have a good cry" },
      { value: "laugh", label: "Laugh out loud" },
      { value: "think", label: "Think deeply" },
    ],
  },
  {
    id: "standalone",
    question: "Do you prefer standalone books?",
    type: "boolean",
    field: "standalone",
  },
  {
    id: "wantAudiobook",
    question: "Do you prefer books available as audiobooks?",
    type: "boolean",
    field: "wantAudiobook",
  },
  {
    id: "classicOrNew",
    question: "Classic literature or something published recently?",
    type: "single",
    field: "classicOrNew",
    options: [
      { value: "classic", label: "Classic (pre-2000)" },
      { value: "new", label: "Recent (2015+)" },
      { value: "either", label: "Either is fine" },
    ],
  },
  {
    id: "diverseVoices",
    question: "Are you specifically looking for diverse authors or characters?",
    type: "boolean",
    field: "diverseVoices",
  },
  {
    id: "triggerSensitive",
    question: "Are you sensitive to heavy topics (trauma, violence, death)?",
    type: "boolean",
    field: "triggerSensitive",
    fictionOnly: true,
  },
  {
    id: "avoidTopics",
    question: "Any topics you want to completely avoid?",
    type: "multiple",
    field: "avoidTopics",
    options: [
      { value: "death", label: "Death/Grief" },
      { value: "violence", label: "Violence" },
      { value: "abuse", label: "Abuse" },
      { value: "war", label: "War" },
      { value: "illness", label: "Terminal illness" },
      { value: "infidelity", label: "Cheating/Infidelity" },
      { value: "animal-harm", label: "Animal harm" },
      { value: "child-harm", label: "Child in danger" },
    ],
  },
];

// Combined for backwards compatibility
export const QUIZ_QUESTIONS: QuizQuestion[] = [...MANDATORY_QUESTIONS, ...ROMANCE_QUESTIONS, ...RANDOM_QUESTIONS];

// Import result types
export interface ImportResult {
  totalInCatalog: number;
  booksAdded: number;
  duplicatesSkipped: number;
  errors: string[];
}

// Genre queries for diverse catalog building - balanced across all genres
export const GENRE_QUERIES: Record<string, string[]> = {
  // ROMANCE (8 queries) - reduced prominence
  romance: [
    "small town romance",
    "enemies to lovers romance",
    "historical romance regency",
    "contemporary romance",
    "slow burn romance",
  ],
  // FANTASY (10 queries) - expanded for balance
  fantasy: [
    "epic fantasy dragons",
    "cozy fantasy",
    "urban fantasy",
    "fairy tale retelling",
    "dark fantasy",
    "portal fantasy",
    "high fantasy magic",
    "grimdark fantasy",
    "fantasy adventure quest",
    "sword and sorcery",
  ],
  // THRILLER (8 queries) - expanded
  thriller: [
    "psychological thriller",
    "domestic thriller",
    "crime thriller",
    "legal thriller",
    "espionage thriller",
    "suspense thriller",
    "political thriller",
    "techno thriller",
  ],
  // MYSTERY (8 queries) - expanded
  mystery: [
    "cozy mystery",
    "detective mystery",
    "murder mystery",
    "whodunit mystery",
    "amateur sleuth",
    "police procedural",
    "noir mystery",
    "locked room mystery",
  ],
  // SCI-FI (10 queries) - expanded
  scifi: [
    "space opera",
    "hard science fiction",
    "dystopian fiction",
    "cyberpunk",
    "first contact aliens",
    "time travel fiction",
    "post apocalyptic",
    "military science fiction",
    "generation ship",
    "AI artificial intelligence fiction",
  ],
  // HORROR (8 queries) - expanded
  horror: [
    "gothic horror",
    "supernatural horror",
    "psychological horror",
    "haunted house",
    "folk horror",
    "cosmic horror",
    "slasher horror",
    "body horror",
  ],
  // YOUNG ADULT (8 queries) - expanded
  ya: [
    "young adult fantasy",
    "young adult dystopian",
    "young adult contemporary",
    "coming of age fiction",
    "young adult thriller",
    "young adult mystery",
    "young adult science fiction",
    "teen adventure",
  ],
  // LITERARY FICTION (8 queries) - expanded
  literary: [
    "literary fiction",
    "book club fiction",
    "family saga",
    "historical fiction bestseller",
    "magical realism fiction",
    "contemporary literary fiction",
    "prize winning fiction",
    "modern classics",
  ],
  // NONFICTION (10 queries) - significantly expanded for balance
  nonfiction: [
    "memoir bestseller",
    "popular science",
    "self help motivation",
    "biography",
    "history nonfiction",
    "true crime",
    "essay collection",
    "business leadership",
    "psychology popular",
    "philosophy accessible",
  ],
  // BIOGRAPHY/MEMOIR (5 queries) - new category
  biography: [
    "autobiography celebrity",
    "political biography",
    "sports biography",
    "artist biography",
    "historical figure biography",
  ],
  // HISTORICAL FICTION (5 queries) - new category for tone diversity
  historical: [
    "historical fiction war",
    "historical fiction regency",
    "historical fiction medieval",
    "historical fiction ancient",
    "historical fiction 20th century",
  ],
};

export const bookSubmissions = pgTable("book_submissions", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  penName: text("pen_name"),
  bookTitle: text("book_title").notNull(),
  genre: text("genre").notNull(),
  blurb: text("blurb").notNull(),
  tropes: text("tropes"),
  releaseDate: text("release_date"),
  amazonLink: text("amazon_link"),
  goodreadsLink: text("goodreads_link"),
  contactEmail: text("contact_email").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (table) => [
  index("idx_book_submissions_submitted_at").on(table.submittedAt),
]);

export const insertBookSubmissionSchema = createInsertSchema(bookSubmissions).omit({ id: true, submittedAt: true });
export type InsertBookSubmission = z.infer<typeof insertBookSubmissionSchema>;
export type BookSubmission = typeof bookSubmissions.$inferSelect;

export const AD_REQUEST_STATUSES = ["new", "reviewing", "needs-info", "approved", "approved-pending-payment", "paid", "scheduled", "live", "ended", "declined"] as const;

export const adRequests = pgTable("ad_requests", {
  id: text("id").primaryKey(),
  authorName: text("author_name").notNull(),
  bookTitle: text("book_title").notNull(),
  genre: text("genre").notNull(),
  adType: text("ad_type").notNull(),
  featuredPlacement: boolean("featured_placement").default(false),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  notes: text("notes").default(""),
  contactEmail: text("contact_email").notNull(),
  status: text("status").notNull().default("new"),
  stripeLink: text("stripe_link"),
  paymentAmount: integer("payment_amount"),
  amazonAffiliateUrl: text("amazon_affiliate_url"),
  adminNotes: text("admin_notes"),
  scheduledStartDate: text("scheduled_start_date"),
  scheduledEndDate: text("scheduled_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ad_requests_status").on(table.status),
]);

export const insertAdRequestSchema = createInsertSchema(adRequests).omit({ createdAt: true });
export type AdRequest = typeof adRequests.$inferSelect;
export type InsertAdRequest = z.infer<typeof insertAdRequestSchema>;

export const shopProducts = pgTable("shop_products", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  price: text("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull().default("Books"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShopProductSchema = createInsertSchema(shopProducts).omit({ id: true, createdAt: true });
export type InsertShopProduct = z.infer<typeof insertShopProductSchema>;
export type ShopProduct = typeof shopProducts.$inferSelect;

export const childProfiles = pgTable("child_profiles", {
  id: serial("id").primaryKey(),
  parentUserId: text("parent_user_id").notNull(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  avatarEmoji: text("avatar_emoji").notNull().default("📚"),
  readingLevel: text("reading_level").notNull().default("Reading Sprout"),
  totalBooksRead: integer("total_books_read").default(0),
  totalPagesRead: integer("total_pages_read").default(0),
  totalMinutesRead: integer("total_minutes_read").default(0),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  earnedBadges: text("earned_badges").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChildProfileSchema = createInsertSchema(childProfiles).omit({ id: true, createdAt: true, totalBooksRead: true, totalPagesRead: true, totalMinutesRead: true, currentStreak: true, longestStreak: true, lastActivityDate: true, earnedBadges: true });
export type InsertChildProfile = z.infer<typeof insertChildProfileSchema>;
export type ChildProfile = typeof childProfiles.$inferSelect;

export const childReadingLogs = pgTable("child_reading_logs", {
  id: serial("id").primaryKey(),
  childProfileId: integer("child_profile_id").notNull(),
  bookTitle: text("book_title").notNull(),
  bookAuthor: text("book_author"),
  bookCoverUrl: text("book_cover_url"),
  pagesRead: integer("pages_read").default(0),
  minutesRead: integer("minutes_read").default(0),
  completed: boolean("completed").default(false),
  rating: integer("rating"),
  note: text("note"),
  logDate: timestamp("log_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChildReadingLogSchema = createInsertSchema(childReadingLogs).omit({ id: true, createdAt: true });
export type InsertChildReadingLog = z.infer<typeof insertChildReadingLogSchema>;
export type ChildReadingLog = typeof childReadingLogs.$inferSelect;

export const childReadingGoals = pgTable("child_reading_goals", {
  id: serial("id").primaryKey(),
  childProfileId: integer("child_profile_id").notNull(),
  goalType: text("goal_type").notNull(),
  targetAmount: integer("target_amount").notNull(),
  currentAmount: integer("current_amount").default(0),
  period: text("period").notNull().default("weekly"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChildReadingGoalSchema = createInsertSchema(childReadingGoals).omit({ id: true, createdAt: true, currentAmount: true, isCompleted: true });
export type InsertChildReadingGoal = z.infer<typeof insertChildReadingGoalSchema>;
export type ChildReadingGoal = typeof childReadingGoals.$inferSelect;

export const childChallenges = pgTable("child_challenges", {
  id: serial("id").primaryKey(),
  childProfileId: integer("child_profile_id").notNull(),
  challengeId: text("challenge_id").notNull(),
  status: text("status").notNull().default("active"),
  progress: integer("progress").default(0),
  target: integer("target").default(1),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertChildChallengeSchema = createInsertSchema(childChallenges).omit({ id: true, startedAt: true, completedAt: true, progress: true });
export type InsertChildChallenge = z.infer<typeof insertChildChallengeSchema>;
export type ChildChallenge = typeof childChallenges.$inferSelect;

export const featuredPicks = pgTable("featured_picks", {
  id: serial("id").primaryKey(),
  genre: text("genre").notNull(),
  genreLabel: text("genre_label").notNull(),
  bookTitle: text("book_title").notNull(),
  authorName: text("author_name").notNull(),
  coverImageUrl: text("cover_image_url"),
  shortBlurb: text("short_blurb").notNull(),
  amazonUrl: text("amazon_url"),
  isIndie: boolean("is_indie").default(false),
  isSponsored: boolean("is_sponsored").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeaturedPickSchema = createInsertSchema(featuredPicks).omit({ id: true, createdAt: true });
export type InsertFeaturedPick = z.infer<typeof insertFeaturedPickSchema>;
export type FeaturedPick = typeof featuredPicks.$inferSelect;

export const feedReactions = pgTable("feed_reactions", {
  id: serial("id").primaryKey(),
  feedItemId: integer("feed_item_id").notNull(),
  userId: text("user_id").notNull(),
  type: text("type").notNull().default("like"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feed_reactions_feed_item_id").on(table.feedItemId),
]);

export const insertFeedReactionSchema = createInsertSchema(feedReactions).omit({ id: true, createdAt: true });
export type FeedReaction = typeof feedReactions.$inferSelect;
export type InsertFeedReaction = z.infer<typeof insertFeedReactionSchema>;

export const feedComments = pgTable("feed_comments", {
  id: serial("id").primaryKey(),
  feedItemId: integer("feed_item_id").notNull(),
  userId: text("user_id").notNull(),
  userDisplayName: text("user_display_name"),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_feed_comments_feed_item_id").on(table.feedItemId),
]);

export const insertFeedCommentSchema = createInsertSchema(feedComments).omit({ id: true, createdAt: true });
export type FeedComment = typeof feedComments.$inferSelect;
export type InsertFeedComment = z.infer<typeof insertFeedCommentSchema>;

export const feedReports = pgTable("feed_reports", {
  id: serial("id").primaryKey(),
  feedItemId: integer("feed_item_id").notNull(),
  reporterId: text("reporter_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFeedReportSchema = createInsertSchema(feedReports).omit({ id: true, createdAt: true });
export type FeedReport = typeof feedReports.$inferSelect;
export type InsertFeedReport = z.infer<typeof insertFeedReportSchema>;

export const affiliateClicks = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  feedItemId: integer("feed_item_id"),
  bookTitle: text("book_title").notNull(),
  source: text("source").notNull(),
  affiliateUrl: text("affiliate_url").notNull(),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({ id: true, createdAt: true });
export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type InsertAffiliateClick = z.infer<typeof insertAffiliateClickSchema>;

export const TAG_SUGGESTION_CATEGORIES = ["tropes", "moodTags", "contentWarnings", "tags"] as const;

export const bookTagSuggestions = pgTable("book_tag_suggestions", {
  id: serial("id").primaryKey(),
  catalogBookId: integer("catalog_book_id").notNull(),
  userId: text("user_id").notNull(),
  category: text("category").notNull(),
  tagValue: text("tag_value").notNull(),
  action: text("action").notNull().default("add"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookTagSuggestionSchema = createInsertSchema(bookTagSuggestions).omit({ id: true, createdAt: true, status: true });
export type BookTagSuggestion = typeof bookTagSuggestions.$inferSelect;
export type InsertBookTagSuggestion = z.infer<typeof insertBookTagSuggestionSchema>;

export const SPOTLIGHT_TYPES = ["free", "sponsored"] as const;
export const SPOTLIGHT_PLACEMENTS = ["standard", "frontpage", "search_boost", "rotation_premium"] as const;
export const SPOTLIGHT_REQUEST_STATUSES = ["pending", "approved", "rejected", "pending_payment", "paid"] as const;

export const indieSpotlights = pgTable("indie_spotlights", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  penName: text("pen_name"),
  bookTitle: text("book_title").notNull(),
  genres: text("genres").array().default([]),
  shortBlurb: text("short_blurb").notNull(),
  longBlurb: text("long_blurb"),
  coverImageUrl: text("cover_image_url"),
  buyLinks: text("buy_links"),
  socialLinks: text("social_links"),
  spotlightType: text("spotlight_type").notNull().default("free"),
  placement: text("placement").notNull().default("standard"),
  isActive: boolean("is_active").default(false),
  priority: integer("priority").default(0),
  rankingWeight: integer("ranking_weight").default(0),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  durationDays: integer("duration_days"),
  pricePaid: integer("price_paid"),
  placementType: text("placement_type"),
  orderId: text("order_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertIndieSpotlightSchema = createInsertSchema(indieSpotlights).omit({ id: true, createdAt: true });
export type IndieSpotlight = typeof indieSpotlights.$inferSelect;
export type InsertIndieSpotlight = z.infer<typeof insertIndieSpotlightSchema>;

export const indieSpotlightRequests = pgTable("indie_spotlight_requests", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  penName: text("pen_name"),
  email: text("email").notNull(),
  bookTitle: text("book_title").notNull(),
  genres: text("genres").array().default([]),
  releaseDate: text("release_date"),
  shortBlurb: text("short_blurb").notNull(),
  coverImageUrl: text("cover_image_url"),
  buyLinks: text("buy_links"),
  socialLinks: text("social_links"),
  requestType: text("request_type").notNull().default("free"),
  sponsoredPlacement: text("sponsored_placement"),
  sponsoredDuration: integer("sponsored_duration"),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  spotlightId: integer("spotlight_id"),
  ownershipConfirmed: boolean("ownership_confirmed").default(false),
  consentConfirmed: boolean("consent_confirmed").default(false),
  affiliateConsent: boolean("affiliate_consent").default(false),
  sponsoredConsent: boolean("sponsored_consent").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_indie_spotlight_requests_status").on(table.status),
]);

export const insertIndieSpotlightRequestSchema = createInsertSchema(indieSpotlightRequests).omit({ id: true, createdAt: true, status: true, adminNotes: true, rejectionReason: true, spotlightId: true });
export type IndieSpotlightRequest = typeof indieSpotlightRequests.$inferSelect;
export type InsertIndieSpotlightRequest = z.infer<typeof insertIndieSpotlightRequestSchema>;

export const topicFollows = pgTable("topic_follows", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  topic: text("topic").notNull(),
  category: text("category").notNull().default("genre"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTopicFollowSchema = createInsertSchema(topicFollows).omit({ id: true, createdAt: true });
export type TopicFollow = typeof topicFollows.$inferSelect;
export type InsertTopicFollow = z.infer<typeof insertTopicFollowSchema>;

export const interviewRequests = pgTable("interview_requests", {
  id: serial("id").primaryKey(),
  authorName: text("author_name").notNull(),
  penName: text("pen_name"),
  email: text("email").notNull(),
  timezone: text("timezone").notNull(),
  website: text("website"),
  socialLinks: text("social_links"),
  bookTitle: text("book_title").notNull(),
  genres: text("genres").array().default([]),
  releaseDate: text("release_date"),
  shortBlurb: text("short_blurb").notNull(),
  buyLinks: text("buy_links"),
  mediaKitLink: text("media_kit_link"),
  authorPhotoUrl: text("author_photo_url"),
  bookCoverUrl: text("book_cover_url"),
  interviewFormats: text("interview_formats").array().default([]),
  preferredLength: integer("preferred_length").default(30),
  topicPrompts: text("topic_prompts").array().default([]),
  topicOther: text("topic_other"),
  featuredLinks: text("featured_links"),
  preferredDays: text("preferred_days").array().default([]),
  preferredTimeStart: text("preferred_time_start"),
  preferredTimeEnd: text("preferred_time_end"),
  earliestDate: text("earliest_date"),
  schedulingNotes: text("scheduling_notes"),
  ownershipConfirmed: boolean("ownership_confirmed").default(false),
  consentConfirmed: boolean("consent_confirmed").default(false),
  affiliateConsent: boolean("affiliate_consent").default(false),
  contactConsent: boolean("contact_consent").default(false),
  status: text("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  rejectionReason: text("rejection_reason"),
  scheduledDateTime: text("scheduled_date_time"),
  scheduledFormat: text("scheduled_format"),
  assignedHost: text("assigned_host"),
  contentTiktokUrl: text("content_tiktok_url"),
  contentYoutubeUrl: text("content_youtube_url"),
  contentInstagramUrl: text("content_instagram_url"),
  contentBlogUrl: text("content_blog_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_interview_requests_status").on(table.status),
]);

export const insertInterviewRequestSchema = createInsertSchema(interviewRequests).omit({
  id: true, createdAt: true, status: true, adminNotes: true, rejectionReason: true,
  scheduledDateTime: true, scheduledFormat: true, assignedHost: true,
  contentTiktokUrl: true, contentYoutubeUrl: true, contentInstagramUrl: true, contentBlogUrl: true,
});
export type InterviewRequest = typeof interviewRequests.$inferSelect;
export type InsertInterviewRequest = z.infer<typeof insertInterviewRequestSchema>;

export const TAG_CATEGORIES = [
  "GENRE", "SUBGENRE", "TROPE", "ROMANCE_TROPE", "THEME", "VIBE",
  "PACING", "SETTING", "POV", "CONTENT", "FORMAT", "AUDIENCE"
] as const;

export const discoveryTags = pgTable("discovery_tags", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  isSensitive: boolean("is_sensitive").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_discovery_tags_category_slug").on(table.category, table.slug),
  index("idx_discovery_tags_category").on(table.category),
]);

export const insertDiscoveryTagSchema = createInsertSchema(discoveryTags).omit({ id: true, createdAt: true });
export type DiscoveryTag = typeof discoveryTags.$inferSelect;
export type InsertDiscoveryTag = z.infer<typeof insertDiscoveryTagSchema>;

export const bookDiscoveryTags = pgTable("book_discovery_tags", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").notNull(),
  tagId: integer("tag_id").notNull(),
}, (table) => [
  uniqueIndex("idx_book_discovery_tags_book_tag").on(table.bookId, table.tagId),
  index("idx_book_discovery_tags_book_id").on(table.bookId),
  index("idx_book_discovery_tags_tag_id").on(table.tagId),
]);

export const insertBookDiscoveryTagSchema = createInsertSchema(bookDiscoveryTags).omit({ id: true });
export type BookDiscoveryTag = typeof bookDiscoveryTags.$inferSelect;
export type InsertBookDiscoveryTag = z.infer<typeof insertBookDiscoveryTagSchema>;

export const savedFilterPresets = pgTable("saved_filter_presets", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  includeTags: integer("include_tags").array().notNull().default([]),
  excludeTags: integer("exclude_tags").array().notNull().default([]),
  filters: jsonb("filters").default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_saved_filter_presets_user_id").on(table.userId),
]);

export const insertSavedFilterPresetSchema = createInsertSchema(savedFilterPresets).omit({ id: true, createdAt: true });
export type SavedFilterPreset = typeof savedFilterPresets.$inferSelect;
export type InsertSavedFilterPreset = z.infer<typeof insertSavedFilterPresetSchema>;

export const mediaKitSubscriptions = pgTable("media_kit_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  canceledAt: timestamp("canceled_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_media_kit_sub_user_id").on(table.userId),
  index("idx_media_kit_sub_stripe_sub_id").on(table.stripeSubscriptionId),
]);

export const insertMediaKitSubscriptionSchema = createInsertSchema(mediaKitSubscriptions).omit({ id: true, createdAt: true });
export type MediaKitSubscription = typeof mediaKitSubscriptions.$inferSelect;
export type InsertMediaKitSubscription = z.infer<typeof insertMediaKitSubscriptionSchema>;

export const USER_REPORT_REASONS = ["harassment", "spam", "inappropriate", "hate_speech", "impersonation", "other"] as const;
export const REPORTABLE_CONTENT_TYPES = ["post", "comment", "discussion", "review"] as const;

export const userBlocks = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: text("blocker_id").notNull(),
  blockedUserId: text("blocked_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_blocks_blocker").on(table.blockerId),
  index("idx_user_blocks_blocked").on(table.blockedUserId),
]);

export const insertUserBlockSchema = createInsertSchema(userBlocks).omit({ id: true, createdAt: true });
export type UserBlock = typeof userBlocks.$inferSelect;
export type InsertUserBlock = z.infer<typeof insertUserBlockSchema>;

export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  reportedUserId: text("reported_user_id").notNull(),
  reportedContentId: integer("reported_content_id"),
  reportedContentType: text("reported_content_type"),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_user_reports_reporter").on(table.reporterId),
  index("idx_user_reports_reported").on(table.reportedUserId),
]);

export const insertUserReportSchema = createInsertSchema(userReports).omit({ id: true, status: true, createdAt: true });
export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;

export const followRequests = pgTable("follow_requests", {
  id: serial("id").primaryKey(),
  requesterId: text("requester_id").notNull(),
  targetUserId: text("target_user_id").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
}, (table) => [
  index("idx_follow_requests_requester").on(table.requesterId),
  index("idx_follow_requests_target").on(table.targetUserId),
]);

export const insertFollowRequestSchema = createInsertSchema(followRequests).omit({ id: true, status: true, createdAt: true, respondedAt: true });
export type FollowRequest = typeof followRequests.$inferSelect;
export type InsertFollowRequest = z.infer<typeof insertFollowRequestSchema>;

export const EVENT_CATEGORIES = ["signing", "author-meet", "virtual", "book-fair", "reading-group", "other"] as const;
export type EventCategory = typeof EVENT_CATEGORIES[number];

export const communityEvents = pgTable("community_events", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  category: text("category").notNull().default("other"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  imageUrl: text("image_url"),
  websiteUrl: text("website_url"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_community_events_start_date").on(table.startDate),
  index("idx_community_events_user_id").on(table.userId),
]);

export const insertCommunityEventSchema = createInsertSchema(communityEvents).omit({ id: true, status: true, createdAt: true });
export type CommunityEvent = typeof communityEvents.$inferSelect;
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;

export const dailyIndieBooks = pgTable("daily_indie_books", {
  id: serial("id").primaryKey(),
  date: text("date").notNull().unique(),
  bookTitle: text("book_title").notNull(),
  authorName: text("author_name").notNull(),
  coverUrl: text("cover_url"),
  description: text("description"),
  genres: text("genres").array().default([]),
  buyLink: text("buy_link"),
  authorSlug: text("author_slug"),
  spotlightId: integer("spotlight_id"),
  authorBookId: integer("author_book_id"),
  sourceType: text("source_type").notNull().default("spotlight"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DailyIndieBook = typeof dailyIndieBooks.$inferSelect;
