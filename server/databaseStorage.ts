import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, inArray, ilike, count, or } from "drizzle-orm";
import type { IStorage } from "./storage";
import {
  type Book,
  type CatalogBook,
  type InsertCatalogBook,
  type UserBook,
  type InsertUserBook,
  type UserChallenge,
  type InsertUserChallenge,
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
  type ArcClaimStatus,
  type ArcBlockedUser,
  type ArcWaitlistEntry,
  type ArcClaimReport,
  type ArcFeedback,
  type InsertArcFeedback,
  type ArcInvite,
  type InsertArcInvite,
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
  type User,
  users,
  books,
  catalogBooks,
  userBooks,
  userChallenges,
  newsletterSubscribers,
  quizHistory,
  readingStreaks,
  readingLists,
  readingListItems,
  bookQuotes,
  bookSeries,
  seriesBooks,
  authorProfiles,
  authorBooks,
  featuredPlacements,
  arcClaims,
  arcBlockedUsers,
  arcWaitlist,
  arcClaimReports,
  arcFeedback,
  arcInvites,
  follows,
  activityEvents,
  notifications,
  authorBookReviews,
  bookClubs,
  clubMembers,
  clubDiscussions,
  clubReadingBooks,
  clubVotes,
  clubMeetings,
  clubMeetingRsvps,
  clubReadingSchedules,
  analyticsEvents,
  discussions,
  discussionComments,
  bookSubmissions,
  shopProducts,
  childProfiles,
  childReadingLogs,
  childReadingGoals,
  childChallenges,
  bookTagSuggestions,
  type BookTagSuggestion,
  type InsertBookTagSuggestion,
  indieSpotlights,
  indieSpotlightRequests,
  topicFollows,
  interviewRequests,
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
  discoveryTags,
  bookDiscoveryTags,
  savedFilterPresets,
  userBlocks,
  userReports,
  followRequests,
  communityEvents,
} from "@shared/schema";

export async function seedLegacyBooks() {
  const existing = await db.select({ count: count() }).from(books);
  if (existing[0].count > 0) return;

  const seedData = [
    { title: "The Silent Patient", author: "Alex Michaelides", description: "A famous painter shoots her husband five times in the face and then never speaks another word.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1668782119i/40097951.jpg", mood: "scary", pace: "fast", length: "medium", spiceLevel: 1, darknessLevel: 4, tropes: ["whodunnit", "unreliable-narrator"], tags: ["thriller", "psychological", "murder", "mystery"] },
    { title: "Verity", author: "Colleen Hoover", description: "Lowen Ashleigh is a struggling writer on the brink of financial ruin when she accepts the job offer of a lifetime.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1634158558i/59344312.jpg", mood: "scary", pace: "fast", length: "medium", spiceLevel: 4, darknessLevel: 4, tropes: ["unreliable-narrator", "romantic-suspense", "dark-romance"], tags: ["thriller", "mystery", "dark", "romance"] },
    { title: "The Thursday Murder Club", author: "Richard Osman", description: "Four unlikely friends meet weekly in their retirement village to investigate cold cases.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1587142358i/46000520.jpg", mood: "happy", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 2, tropes: ["whodunnit", "found-family"], tags: ["mystery", "funny", "cozy"] },
    { title: "Book Lovers", author: "Emily Henry", description: "A cutthroat literary agent and a brooding editor are thrown together in a small town.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1638867089i/58690308.jpg", mood: "happy", pace: "fast", length: "medium", spiceLevel: 3, darknessLevel: 1, tropes: ["enemies-to-lovers", "small-town"], tags: ["romance", "funny", "contemporary"] },
    { title: "The Love Hypothesis", author: "Ali Hazelwood", description: "When a fake-dating agreement turns into real feelings between a PhD student and a young professor.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1611937942i/56732449.jpg", mood: "happy", pace: "medium", length: "medium", spiceLevel: 3, darknessLevel: 1, tropes: ["fake-dating", "grumpy-sunshine"], tags: ["romance", "funny", "academia", "stem"] },
    { title: "The House in the Cerulean Sea", author: "TJ Klune", description: "A magical island. A dangerous task. A burning secret. A story about discovering it's never too late.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1569514209i/45047384.jpg", mood: "happy", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 1, tropes: ["found-family", "magical-realism", "slow-burn"], tags: ["fantasy", "romance", "lgbtq", "wholesome"] },
    { title: "Fourth Wing", author: "Rebecca Yarros", description: "Enter the brutal and elite world of a war college for dragon riders.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1701980900i/61431922.jpg", mood: "adventurous", pace: "fast", length: "long", spiceLevel: 4, darknessLevel: 3, tropes: ["enemies-to-lovers", "chosen-one", "slow-burn"], tags: ["fantasy", "romance", "dragons", "new-adult"] },
    { title: "Project Hail Mary", author: "Andy Weir", description: "Ryland Grace is the sole survivor on a desperate, last-chance mission to save humanity.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1597695864i/54493401.jpg", mood: "adventurous", pace: "fast", length: "long", spiceLevel: 1, darknessLevel: 2, tropes: ["survival", "found-family"], tags: ["sci-fi", "space", "science"] },
    { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", description: "Aging Hollywood movie icon Evelyn Hugo is finally ready to tell the truth about her glamorous life.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1660763269i/32620332.jpg", mood: "thoughtful", pace: "medium", length: "medium", spiceLevel: 3, darknessLevel: 3, tropes: ["forbidden-love", "second-chance"], tags: ["historical-fiction", "romance", "lgbtq", "hollywood"] },
    { title: "Circe", author: "Madeline Miller", description: "In the house of Helios, god of the sun, a daughter is born. But Circe is a strange child.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1565909496i/35959740.jpg", mood: "thoughtful", pace: "medium", length: "medium", spiceLevel: 2, darknessLevel: 3, tropes: ["redemption-arc", "coming-of-age", "forbidden-love"], tags: ["mythology", "fantasy", "retelling"] },
    { title: "Educated", author: "Tara Westover", description: "A memoir about a young girl who grows up in a survivalist family in the mountains of Idaho and eventually earns a PhD from Cambridge University.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg", mood: "thoughtful", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 4, tropes: ["coming-of-age"], tags: ["non-fiction", "memoir", "biography", "education"] },
    { title: "Becoming", author: "Michelle Obama", description: "In her memoir, the former First Lady chronicles the experiences that have shaped her.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1528206996i/38746485.jpg", mood: "thoughtful", pace: "medium", length: "long", spiceLevel: 1, darknessLevel: 2, tropes: ["coming-of-age"], tags: ["non-fiction", "memoir", "biography", "politics"] },
    { title: "Atomic Habits", author: "James Clear", description: "No matter your goals, Atomic Habits offers a proven framework for improving every day.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg", mood: "happy", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 1, tropes: [], tags: ["non-fiction", "self-help", "productivity", "psychology"] },
    { title: "Sapiens: A Brief History of Humankind", author: "Yuval Noah Harari", description: "One hundred thousand years ago, at least six different species of humans inhabited Earth. Yet today there is only one.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1703329310i/23692271.jpg", mood: "thoughtful", pace: "slow", length: "long", spiceLevel: 1, darknessLevel: 2, tropes: [], tags: ["non-fiction", "history", "science", "anthropology"] },
    { title: "The Body Keeps the Score", author: "Bessel van der Kolk", description: "A pioneering researcher transforms our understanding of trauma and offers a bold new paradigm for healing.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1594559067i/18693771.jpg", mood: "thoughtful", pace: "slow", length: "long", spiceLevel: 1, darknessLevel: 4, tropes: [], tags: ["non-fiction", "psychology", "health", "science"] },
    { title: "Quiet: The Power of Introverts", author: "Susan Cain", description: "In a world that can't stop talking, this book celebrates the power of introverts.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1328562861i/8520610.jpg", mood: "thoughtful", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 1, tropes: [], tags: ["non-fiction", "psychology", "self-help"] },
    { title: "Born a Crime", author: "Trevor Noah", description: "Trevor Noah's unlikely path from apartheid South Africa to the desk of The Daily Show.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1473867911i/29780253.jpg", mood: "happy", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 3, tropes: ["coming-of-age"], tags: ["non-fiction", "memoir", "biography", "funny"] },
    { title: "In Cold Blood", author: "Truman Capote", description: "On November 15, 1959, in the small town of Holcomb, Kansas, four members of the Clutter family were savagely murdered.", coverUrl: "https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1424931136i/168642.jpg", mood: "scary", pace: "medium", length: "medium", spiceLevel: 1, darknessLevel: 5, tropes: [], tags: ["non-fiction", "true-crime", "history"] },
  ];

  await db.insert(books).values(seedData);
  console.log(`Seeded ${seedData.length} legacy books into the database.`);
}

export class DatabaseStorage implements IStorage {
  async deleteUserAccount(userId: string): Promise<void> {
    const authorProfile = await db.select().from(authorProfiles).where(eq(authorProfiles.userId, userId));
    const authorProfileId = authorProfile[0]?.id;

    if (authorProfileId) {
      const authorBookList = await db.select({ id: authorBooks.id }).from(authorBooks).where(eq(authorBooks.authorProfileId, authorProfileId));
      const authorBookIds = authorBookList.map(b => b.id);
      if (authorBookIds.length > 0) {
        await db.delete(arcClaims).where(inArray(arcClaims.bookId, authorBookIds));
        await db.delete(arcBlockedUsers).where(inArray(arcBlockedUsers.bookId, authorBookIds));
        await db.delete(arcWaitlist).where(inArray(arcWaitlist.bookId, authorBookIds));
        await db.delete(arcClaimReports).where(inArray(arcClaimReports.bookId, authorBookIds));
        await db.delete(arcFeedback).where(inArray(arcFeedback.bookId, authorBookIds));
        await db.delete(authorBookReviews).where(inArray(authorBookReviews.bookId, authorBookIds));
        await db.delete(authorBooks).where(eq(authorBooks.authorProfileId, authorProfileId));
      }
      await db.delete(authorProfiles).where(eq(authorProfiles.id, authorProfileId));
    }

    await db.delete(userBooks).where(eq(userBooks.userId, userId));
    await db.delete(userChallenges).where(eq(userChallenges.userId, userId));
    await db.delete(quizHistory).where(eq(quizHistory.userId, userId));
    await db.delete(readingStreaks).where(eq(readingStreaks.userId, userId));
    const userLists = await db.select({ id: readingLists.id }).from(readingLists).where(eq(readingLists.userId, userId));
    if (userLists.length > 0) {
      await db.delete(readingListItems).where(inArray(readingListItems.listId, userLists.map(l => l.id)));
    }
    await db.delete(readingLists).where(eq(readingLists.userId, userId));
    await db.delete(bookQuotes).where(eq(bookQuotes.userId, userId));
    const userSeriesList = await db.select({ id: bookSeries.id }).from(bookSeries).where(eq(bookSeries.userId, userId));
    if (userSeriesList.length > 0) {
      await db.delete(seriesBooks).where(inArray(seriesBooks.seriesId, userSeriesList.map(s => s.id)));
    }
    await db.delete(bookSeries).where(eq(bookSeries.userId, userId));
    await db.delete(follows).where(or(eq(follows.followerId, userId), eq(follows.followingId, userId)));
    await db.delete(activityEvents).where(eq(activityEvents.userId, userId));
    await db.delete(notifications).where(eq(notifications.userId, userId));
    await db.delete(arcClaims).where(eq(arcClaims.userId, userId));
    await db.delete(arcWaitlist).where(eq(arcWaitlist.userId, userId));
    await db.delete(arcClaimReports).where(eq(arcClaimReports.userId, userId));

    const userClubs = await db.select({ id: bookClubs.id }).from(bookClubs).where(eq(bookClubs.createdBy, userId));
    if (userClubs.length > 0) {
      const clubIds = userClubs.map(c => c.id);
      await db.delete(clubMeetingRsvps).where(inArray(clubMeetingRsvps.meetingId, 
        db.select({ id: clubMeetings.id }).from(clubMeetings).where(inArray(clubMeetings.clubId, clubIds))
      ));
      await db.delete(clubMeetings).where(inArray(clubMeetings.clubId, clubIds));
      await db.delete(clubVotes).where(inArray(clubVotes.bookId, 
        db.select({ id: clubReadingBooks.id }).from(clubReadingBooks).where(inArray(clubReadingBooks.clubId, clubIds))
      ));
      await db.delete(clubReadingBooks).where(inArray(clubReadingBooks.clubId, clubIds));
      await db.delete(clubDiscussions).where(inArray(clubDiscussions.clubId, clubIds));
      await db.delete(clubMembers).where(inArray(clubMembers.clubId, clubIds));
      await db.delete(bookClubs).where(inArray(bookClubs.id, clubIds));
    }
    await db.delete(clubMembers).where(eq(clubMembers.userId, userId));
    await db.delete(clubDiscussions).where(eq(clubDiscussions.userId, userId));
    await db.delete(discussions).where(eq(discussions.userId, userId));
    await db.delete(discussionComments).where(eq(discussionComments.userId, userId));
    await db.delete(bookSubmissions).where(eq(bookSubmissions.userId, userId));
    await db.delete(analyticsEvents).where(eq(analyticsEvents.visitorId, userId));
    await db.delete(bookTagSuggestions).where(eq(bookTagSuggestions.userId, userId));
    await db.delete(topicFollows).where(eq(topicFollows.userId, userId));
    await db.delete(savedFilterPresets).where(eq(savedFilterPresets.userId, userId));
    const kidProfiles = await db.select({ id: childProfiles.id }).from(childProfiles).where(eq(childProfiles.parentUserId, userId));
    if (kidProfiles.length > 0) {
      const kidIds = kidProfiles.map(p => p.id);
      await db.delete(childReadingLogs).where(inArray(childReadingLogs.childProfileId, kidIds));
      await db.delete(childReadingGoals).where(inArray(childReadingGoals.childProfileId, kidIds));
      await db.delete(childChallenges).where(inArray(childChallenges.childProfileId, kidIds));
    }
    await db.delete(childProfiles).where(eq(childProfiles.parentUserId, userId));

    await db.execute(sql`DELETE FROM feed_reactions WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM feed_comments WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM feed_reports WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM affiliate_clicks WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM summer_challenges WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM spring_challenges WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM user_badges WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM featured_picks WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM indie_spotlight_requests WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM interview_requests WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM media_kit_subscriptions WHERE user_id = ${userId}`);
    await db.execute(sql`DELETE FROM newsletter_subscribers WHERE email = (SELECT email FROM users WHERE id = ${userId})`);

    await db.delete(users).where(eq(users.id, userId));
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books);
  }

  async getBook(id: number): Promise<Book | undefined> {
    const result = await db.select().from(books).where(eq(books.id, id));
    return result[0];
  }

  async getCatalogBooks(): Promise<CatalogBook[]> {
    return await db.select().from(catalogBooks);
  }

  async getCatalogBook(id: number): Promise<CatalogBook | undefined> {
    const result = await db.select().from(catalogBooks).where(eq(catalogBooks.id, id));
    return result[0];
  }

  async getCatalogBookByIsbn13(isbn: string): Promise<CatalogBook | undefined> {
    const result = await db.select().from(catalogBooks).where(eq(catalogBooks.isbn13, isbn));
    return result[0];
  }

  async getCatalogBookByTitleAuthor(title: string, author: string): Promise<CatalogBook | undefined> {
    const results = await db.select().from(catalogBooks).where(
      ilike(catalogBooks.title, title.trim())
    );
    const authorLower = author.trim().toLowerCase();
    return results.find(b => b.authors.some(a => a.toLowerCase().includes(authorLower)));
  }

  async getCatalogBookBySourceId(sourceId: string): Promise<CatalogBook | undefined> {
    const result = await db.select().from(catalogBooks).where(eq(catalogBooks.sourceId, sourceId));
    return result[0];
  }

  async createCatalogBook(book: InsertCatalogBook): Promise<CatalogBook> {
    const [result] = await db.insert(catalogBooks).values(book).returning();
    return result;
  }

  async getCatalogBookCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(catalogBooks);
    return result.count;
  }

  async getUserBooks(userId: string): Promise<UserBook[]> {
    return await db.select().from(userBooks).where(eq(userBooks.userId, userId));
  }

  async getUserBook(id: number): Promise<UserBook | undefined> {
    const result = await db.select().from(userBooks).where(eq(userBooks.id, id));
    return result[0];
  }

  async getUserBookByTitle(userId: string, bookTitle: string): Promise<UserBook | undefined> {
    const result = await db.select().from(userBooks).where(
      and(eq(userBooks.userId, userId), eq(userBooks.bookTitle, bookTitle))
    );
    return result[0];
  }

  async createUserBook(book: InsertUserBook): Promise<UserBook> {
    const [result] = await db.insert(userBooks).values(book).returning();
    return result;
  }

  async updateUserBook(id: number, updates: Partial<InsertUserBook>): Promise<UserBook | undefined> {
    const [result] = await db.update(userBooks).set(updates).where(eq(userBooks.id, id)).returning();
    return result;
  }

  async deleteUserBook(id: number): Promise<boolean> {
    const result = await db.delete(userBooks).where(eq(userBooks.id, id)).returning();
    return result.length > 0;
  }

  async getUserStats(userId: string): Promise<{ totalBooks: number; booksRead: number; booksThisYear: number; averageRating: number }> {
    const allBooks = await db.select().from(userBooks).where(eq(userBooks.userId, userId));
    const totalBooks = allBooks.length;
    const finishedBooks = allBooks.filter(b => b.status === "finished");
    const booksRead = finishedBooks.length;
    const currentYear = new Date().getFullYear();
    const booksThisYear = finishedBooks.filter(b => {
      const finishDate = b.dateFinished || (b.dateAdded ? new Date(b.dateAdded).toISOString().split("T")[0] : null);
      return finishDate && finishDate.startsWith(currentYear.toString());
    }).length;
    const ratedBooks = allBooks.filter(b => b.rating !== null && b.rating !== undefined);
    const averageRating = ratedBooks.length > 0
      ? Math.round((ratedBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / ratedBooks.length) * 10) / 10
      : 0;
    return { totalBooks, booksRead, booksThisYear, averageRating };
  }

  async getUserChallenge(userId: string, year: number): Promise<UserChallenge | undefined> {
    const result = await db.select().from(userChallenges).where(
      and(eq(userChallenges.userId, userId), eq(userChallenges.year, year))
    );
    return result[0];
  }

  async createUserChallenge(challenge: InsertUserChallenge): Promise<UserChallenge> {
    const [result] = await db.insert(userChallenges).values(challenge).returning();
    return result;
  }

  async updateUserChallenge(id: number, updates: Partial<InsertUserChallenge>): Promise<UserChallenge | undefined> {
    const [result] = await db.update(userChallenges).set(updates).where(eq(userChallenges.id, id)).returning();
    return result;
  }

  async deleteUserChallenge(id: number): Promise<boolean> {
    const result = await db.delete(userChallenges).where(eq(userChallenges.id, id)).returning();
    return result.length > 0;
  }

  async createNewsletterSubscriber(subscriber: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [result] = await db.insert(newsletterSubscribers).values(subscriber).returning();
    return result;
  }

  async getNewsletterSubscriberByEmail(email: string): Promise<NewsletterSubscriber | undefined> {
    const result = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email));
    return result[0];
  }

  async createQuizHistory(history: InsertQuizHistory): Promise<QuizHistory> {
    const [result] = await db.insert(quizHistory).values(history).returning();
    return result;
  }

  async getUserQuizHistory(userId: string): Promise<QuizHistory[]> {
    return await db.select().from(quizHistory).where(eq(quizHistory.userId, userId)).orderBy(desc(quizHistory.takenAt));
  }

  async getUserStreak(userId: string): Promise<ReadingStreak | undefined> {
    const result = await db.select().from(readingStreaks).where(eq(readingStreaks.userId, userId));
    return result[0];
  }

  async upsertUserStreak(userId: string, updates: Partial<InsertReadingStreak>): Promise<ReadingStreak> {
    const existing = await this.getUserStreak(userId);
    if (existing) {
      const [result] = await db.update(readingStreaks).set(updates).where(eq(readingStreaks.userId, userId)).returning();
      return result;
    } else {
      const [result] = await db.insert(readingStreaks).values({ userId, ...updates }).returning();
      return result;
    }
  }

  async getUserReadingLists(userId: string): Promise<ReadingList[]> {
    return await db.select().from(readingLists).where(eq(readingLists.userId, userId));
  }

  async getReadingList(id: number): Promise<ReadingList | undefined> {
    const result = await db.select().from(readingLists).where(eq(readingLists.id, id));
    return result[0];
  }

  async createReadingList(list: InsertReadingList): Promise<ReadingList> {
    const [result] = await db.insert(readingLists).values(list).returning();
    return result;
  }

  async updateReadingList(id: number, updates: Partial<InsertReadingList>): Promise<ReadingList | undefined> {
    const [result] = await db.update(readingLists).set(updates).where(eq(readingLists.id, id)).returning();
    return result;
  }

  async deleteReadingList(id: number): Promise<boolean> {
    await db.delete(readingListItems).where(eq(readingListItems.listId, id));
    const result = await db.delete(readingLists).where(eq(readingLists.id, id)).returning();
    return result.length > 0;
  }

  async getReadingListItems(listId: number): Promise<ReadingListItem[]> {
    return await db.select().from(readingListItems)
      .where(eq(readingListItems.listId, listId))
      .orderBy(readingListItems.sortOrder);
  }

  async addReadingListItem(item: InsertReadingListItem): Promise<ReadingListItem> {
    const [result] = await db.insert(readingListItems).values(item).returning();
    return result;
  }

  async removeReadingListItem(id: number): Promise<boolean> {
    const result = await db.delete(readingListItems).where(eq(readingListItems.id, id)).returning();
    return result.length > 0;
  }

  async getUserQuotes(userId: string): Promise<BookQuote[]> {
    return await db.select().from(bookQuotes).where(eq(bookQuotes.userId, userId));
  }

  async getQuote(id: number): Promise<BookQuote | undefined> {
    const result = await db.select().from(bookQuotes).where(eq(bookQuotes.id, id));
    return result[0];
  }

  async createQuote(quote: InsertBookQuote): Promise<BookQuote> {
    const [result] = await db.insert(bookQuotes).values(quote).returning();
    return result;
  }

  async updateQuote(id: number, updates: Partial<InsertBookQuote>): Promise<BookQuote | undefined> {
    const [result] = await db.update(bookQuotes).set(updates).where(eq(bookQuotes.id, id)).returning();
    return result;
  }

  async deleteQuote(id: number): Promise<boolean> {
    const result = await db.delete(bookQuotes).where(eq(bookQuotes.id, id)).returning();
    return result.length > 0;
  }

  async getUserSeries(userId: string): Promise<BookSeries[]> {
    return await db.select().from(bookSeries).where(eq(bookSeries.userId, userId));
  }

  async getSeries(id: number): Promise<BookSeries | undefined> {
    const result = await db.select().from(bookSeries).where(eq(bookSeries.id, id));
    return result[0];
  }

  async createSeries(series: InsertBookSeries): Promise<BookSeries> {
    const [result] = await db.insert(bookSeries).values(series).returning();
    return result;
  }

  async updateSeries(id: number, updates: Partial<InsertBookSeries>): Promise<BookSeries | undefined> {
    const [result] = await db.update(bookSeries).set(updates).where(eq(bookSeries.id, id)).returning();
    return result;
  }

  async deleteSeries(id: number): Promise<boolean> {
    await db.delete(seriesBooks).where(eq(seriesBooks.seriesId, id));
    const result = await db.delete(bookSeries).where(eq(bookSeries.id, id)).returning();
    return result.length > 0;
  }

  async getSeriesBooks(seriesId: number): Promise<SeriesBook[]> {
    return await db.select().from(seriesBooks).where(eq(seriesBooks.seriesId, seriesId));
  }

  async addSeriesBook(book: InsertSeriesBook): Promise<SeriesBook> {
    const [result] = await db.insert(seriesBooks).values(book).returning();
    return result;
  }

  async updateSeriesBook(id: number, updates: Partial<InsertSeriesBook>): Promise<SeriesBook | undefined> {
    const [result] = await db.update(seriesBooks).set(updates).where(eq(seriesBooks.id, id)).returning();
    return result;
  }

  async removeSeriesBook(id: number): Promise<boolean> {
    const result = await db.delete(seriesBooks).where(eq(seriesBooks.id, id)).returning();
    return result.length > 0;
  }

  async getAuthorProfile(userId: string): Promise<AuthorProfile | undefined> {
    const result = await db.select().from(authorProfiles).where(eq(authorProfiles.userId, userId));
    return result[0];
  }

  async getAuthorProfileById(id: number): Promise<AuthorProfile | undefined> {
    const result = await db.select().from(authorProfiles).where(eq(authorProfiles.id, id));
    return result[0];
  }

  async getAuthorProfileBySlug(slug: string): Promise<AuthorProfile | undefined> {
    const result = await db.select().from(authorProfiles).where(eq(authorProfiles.slug, slug));
    return result[0];
  }

  async getAllAuthorProfiles(): Promise<AuthorProfile[]> {
    return await db.select().from(authorProfiles);
  }

  async getAuthorProfilesByUserIds(userIds: string[]): Promise<AuthorProfile[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(authorProfiles).where(inArray(authorProfiles.userId, userIds));
  }

  async createAuthorProfile(profile: InsertAuthorProfile): Promise<AuthorProfile> {
    const [result] = await db.insert(authorProfiles).values(profile).returning();
    return result;
  }

  async updateAuthorProfile(userId: string, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined> {
    const [result] = await db.update(authorProfiles).set(updates).where(eq(authorProfiles.userId, userId)).returning();
    return result;
  }

  async updateAuthorProfileById(id: number, updates: Partial<InsertAuthorProfile>): Promise<AuthorProfile | undefined> {
    const [result] = await db.update(authorProfiles).set(updates).where(eq(authorProfiles.id, id)).returning();
    return result;
  }

  async getAuthorBooks(authorProfileId: number): Promise<AuthorBook[]> {
    return await db.select().from(authorBooks).where(eq(authorBooks.authorProfileId, authorProfileId));
  }

  async getAuthorBook(id: number): Promise<AuthorBook | undefined> {
    const result = await db.select().from(authorBooks).where(eq(authorBooks.id, id));
    return result[0];
  }

  async createAuthorBook(book: InsertAuthorBook): Promise<AuthorBook> {
    const [result] = await db.insert(authorBooks).values(book).returning();
    return result;
  }

  async updateAuthorBook(id: number, updates: Partial<InsertAuthorBook>): Promise<AuthorBook | undefined> {
    const [result] = await db.update(authorBooks).set(updates).where(eq(authorBooks.id, id)).returning();
    return result;
  }

  async deleteAuthorBook(id: number): Promise<boolean> {
    const result = await db.delete(authorBooks).where(eq(authorBooks.id, id)).returning();
    return result.length > 0;
  }

  async incrementArcClaimCount(id: number): Promise<AuthorBook | undefined> {
    const [result] = await db.update(authorBooks)
      .set({ arcClaimCount: sql`${authorBooks.arcClaimCount} + 1` })
      .where(eq(authorBooks.id, id))
      .returning();
    return result;
  }

  async hasUserClaimedArc(userId: string, bookId: number): Promise<boolean> {
    const result = await db.select().from(arcClaims).where(
      and(eq(arcClaims.userId, userId), eq(arcClaims.bookId, bookId))
    );
    return result.length > 0;
  }

  async getUserArcClaimsToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await db.select({ count: count() }).from(arcClaims).where(
      and(eq(arcClaims.userId, userId), gte(arcClaims.claimedAt, today))
    );
    return result[0].count;
  }

  async createArcClaim(claim: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null; downloadExpiresAt?: Date | null }): Promise<ArcClaim> {
    const [result] = await db.insert(arcClaims).values(claim).returning();
    return result;
  }

  async getArcClaimsForBook(bookId: number): Promise<ArcClaim[]> {
    return await db.select().from(arcClaims).where(eq(arcClaims.bookId, bookId));
  }

  async getArcClaimsForAuthor(authorProfileId: number): Promise<ArcClaim[]> {
    return await db.select().from(arcClaims).where(eq(arcClaims.authorProfileId, authorProfileId));
  }

  async getArcClaim(id: number): Promise<ArcClaim | undefined> {
    const result = await db.select().from(arcClaims).where(eq(arcClaims.id, id));
    return result[0];
  }

  async updateArcClaim(id: number, updates: Partial<ArcClaim>): Promise<ArcClaim | undefined> {
    const [result] = await db.update(arcClaims).set(updates).where(eq(arcClaims.id, id)).returning();
    return result;
  }

  async getBlockedUsers(authorProfileId: number): Promise<ArcBlockedUser[]> {
    return await db.select().from(arcBlockedUsers).where(eq(arcBlockedUsers.authorProfileId, authorProfileId));
  }

  async isUserBlocked(authorProfileId: number, userId: string): Promise<boolean> {
    const result = await db.select().from(arcBlockedUsers).where(
      and(eq(arcBlockedUsers.authorProfileId, authorProfileId), eq(arcBlockedUsers.blockedUserId, userId))
    );
    return result.length > 0;
  }

  async blockUser(data: { authorProfileId: number; blockedUserId: string; blockedUserName: string | null; reason: string | null }): Promise<ArcBlockedUser> {
    const [result] = await db.insert(arcBlockedUsers).values(data).returning();
    return result;
  }

  async unblockUser(id: number): Promise<boolean> {
    const result = await db.delete(arcBlockedUsers).where(eq(arcBlockedUsers.id, id)).returning();
    return result.length > 0;
  }

  async getWaitlist(bookId: number): Promise<ArcWaitlistEntry[]> {
    return await db.select().from(arcWaitlist).where(eq(arcWaitlist.bookId, bookId));
  }

  async isUserOnWaitlist(bookId: number, userId: string): Promise<boolean> {
    const result = await db.select().from(arcWaitlist).where(
      and(eq(arcWaitlist.bookId, bookId), eq(arcWaitlist.userId, userId))
    );
    return result.length > 0;
  }

  async joinWaitlist(data: { bookId: number; authorProfileId: number; userId: string; userDisplayName: string | null }): Promise<ArcWaitlistEntry> {
    const [result] = await db.insert(arcWaitlist).values(data).returning();
    return result;
  }

  async leaveWaitlist(id: number): Promise<boolean> {
    const result = await db.delete(arcWaitlist).where(eq(arcWaitlist.id, id)).returning();
    return result.length > 0;
  }

  async createClaimReport(data: { authorProfileId: number; claimId: number; userId: string; reason: string; details: string | null }): Promise<ArcClaimReport> {
    const [result] = await db.insert(arcClaimReports).values(data).returning();
    return result;
  }

  async getReportsForAuthor(authorProfileId: number): Promise<ArcClaimReport[]> {
    return await db.select().from(arcClaimReports).where(eq(arcClaimReports.authorProfileId, authorProfileId));
  }

  async updateReportStatus(id: number, status: string): Promise<ArcClaimReport | undefined> {
    const [result] = await db.update(arcClaimReports).set({ status }).where(eq(arcClaimReports.id, id)).returning();
    return result;
  }

  async getArcSecurityStats(authorProfileId: number): Promise<{
    totalClaims: number;
    blockedUsersCount: number;
    flaggedClaimsCount: number;
    pendingReportsCount: number;
    waitlistSize: number;
    claimsByDay: { date: string; count: number }[];
  }> {
    const allClaims = await db.select().from(arcClaims).where(eq(arcClaims.authorProfileId, authorProfileId));
    const blocked = await db.select({ count: count() }).from(arcBlockedUsers).where(eq(arcBlockedUsers.authorProfileId, authorProfileId));
    const flagged = allClaims.filter(c => c.isFlagged).length;
    const pendingReports = await db.select({ count: count() }).from(arcClaimReports).where(
      and(eq(arcClaimReports.authorProfileId, authorProfileId), eq(arcClaimReports.status, "pending"))
    );
    const waitlistCount = await db.select({ count: count() }).from(arcWaitlist).where(eq(arcWaitlist.authorProfileId, authorProfileId));

    const claimsByDayMap: Record<string, number> = {};
    for (const claim of allClaims) {
      if (claim.claimedAt) {
        const dateStr = claim.claimedAt.toISOString().split("T")[0];
        claimsByDayMap[dateStr] = (claimsByDayMap[dateStr] || 0) + 1;
      }
    }
    const claimsByDay = Object.entries(claimsByDayMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalClaims: allClaims.length,
      blockedUsersCount: blocked[0].count,
      flaggedClaimsCount: flagged,
      pendingReportsCount: pendingReports[0].count,
      waitlistSize: waitlistCount[0].count,
      claimsByDay,
    };
  }

  async updateArcReadingProgress(claimId: number, progress: number): Promise<ArcClaim | undefined> {
    const [result] = await db.update(arcClaims)
      .set({ readingProgress: progress, progressUpdatedAt: new Date() })
      .where(eq(arcClaims.id, claimId))
      .returning();
    return result;
  }

  async createArcFeedback(feedback: InsertArcFeedback): Promise<ArcFeedback> {
    const [result] = await db.insert(arcFeedback).values(feedback).returning();
    return result;
  }

  async getArcFeedbackForBook(bookId: number): Promise<ArcFeedback[]> {
    return await db.select().from(arcFeedback).where(eq(arcFeedback.bookId, bookId)).orderBy(desc(arcFeedback.createdAt));
  }

  async getArcFeedbackForAuthor(authorProfileId: number): Promise<ArcFeedback[]> {
    return await db.select().from(arcFeedback).where(eq(arcFeedback.authorProfileId, authorProfileId)).orderBy(desc(arcFeedback.createdAt));
  }

  async getArcConversionStats(authorProfileId: number): Promise<{
    totalClaims: number;
    totalReviews: number;
    conversionRate: number;
    averageArcRating: number;
    averageNonArcRating: number;
    claimsWithReview: { bookId: number; bookTitle: string; claims: number; reviews: number; rate: number }[];
  }> {
    const allClaims = await db.select().from(arcClaims).where(eq(arcClaims.authorProfileId, authorProfileId));
    const authorBooksData = await db.select().from(authorBooks).where(eq(authorBooks.authorProfileId, authorProfileId));
    
    const arcReviews = await db.select().from(authorBookReviews).where(
      and(
        inArray(authorBookReviews.authorBookId, authorBooksData.map(b => b.id)),
        eq(authorBookReviews.isVerifiedArc, true)
      )
    );
    const nonArcReviews = await db.select().from(authorBookReviews).where(
      and(
        inArray(authorBookReviews.authorBookId, authorBooksData.map(b => b.id)),
        eq(authorBookReviews.isVerifiedArc, false)
      )
    );

    const avgArc = arcReviews.length > 0 ? arcReviews.reduce((s, r) => s + r.rating, 0) / arcReviews.length : 0;
    const avgNonArc = nonArcReviews.length > 0 ? nonArcReviews.reduce((s, r) => s + r.rating, 0) / nonArcReviews.length : 0;

    const claimsWithReview = authorBooksData
      .filter(b => b.arcEnabled)
      .map(book => {
        const bookClaims = allClaims.filter(c => c.bookId === book.id).length;
        const bookReviews = arcReviews.filter(r => r.authorBookId === book.id).length;
        return {
          bookId: book.id,
          bookTitle: book.title,
          claims: bookClaims,
          reviews: bookReviews,
          rate: bookClaims > 0 ? Math.round((bookReviews / bookClaims) * 100) : 0,
        };
      });

    return {
      totalClaims: allClaims.length,
      totalReviews: arcReviews.length,
      conversionRate: allClaims.length > 0 ? Math.round((arcReviews.length / allClaims.length) * 100) : 0,
      averageArcRating: Math.round(avgArc * 10) / 10,
      averageNonArcRating: Math.round(avgNonArc * 10) / 10,
      claimsWithReview,
    };
  }

  async getArcClaimExportData(authorProfileId: number): Promise<{
    bookTitle: string;
    claimerName: string;
    claimedAt: string;
    readingProgress: number;
    hasReviewed: boolean;
    isFlagged: boolean;
  }[]> {
    const allClaims = await db.select().from(arcClaims).where(eq(arcClaims.authorProfileId, authorProfileId));
    const authorBooksData = await db.select().from(authorBooks).where(eq(authorBooks.authorProfileId, authorProfileId));
    const allReviews = await db.select().from(authorBookReviews).where(
      and(
        inArray(authorBookReviews.authorBookId, authorBooksData.map(b => b.id)),
        eq(authorBookReviews.isVerifiedArc, true)
      )
    );

    const bookMap = new Map(authorBooksData.map(b => [b.id, b.title]));
    const reviewerSet = new Set(allReviews.map(r => `${r.authorBookId}-${r.userId}`));

    return allClaims.map(claim => ({
      bookTitle: bookMap.get(claim.bookId) || "Unknown",
      claimerName: claim.userDisplayName || "Anonymous",
      claimedAt: claim.claimedAt ? claim.claimedAt.toISOString().split("T")[0] : "",
      readingProgress: claim.readingProgress ?? 0,
      hasReviewed: reviewerSet.has(`${claim.bookId}-${claim.userId}`),
      isFlagged: claim.isFlagged ?? false,
    }));
  }

  async updateArcClaimStatus(claimId: number, status: ArcClaimStatus): Promise<ArcClaim | undefined> {
    const now = new Date();
    const timestampField: Partial<ArcClaim> = {};
    if (status === "approved") timestampField.approvedAt = now;
    if (status === "downloaded") timestampField.downloadedAt = now;
    if (status === "finished") timestampField.finishedAt = now;
    if (status === "reviewed") timestampField.reviewedAt = now;
    const [result] = await db.update(arcClaims)
      .set({ status, ...timestampField })
      .where(eq(arcClaims.id, claimId))
      .returning();
    return result;
  }

  async getUserArcClaims(userId: string): Promise<(ArcClaim & { book: typeof authorBooks.$inferSelect | null })[]> {
    const claims = await db.select().from(arcClaims).where(eq(arcClaims.userId, userId)).orderBy(desc(arcClaims.claimedAt));
    const bookIds = Array.from(new Set(claims.map(c => c.bookId)));
    const books = bookIds.length > 0
      ? await db.select().from(authorBooks).where(inArray(authorBooks.id, bookIds))
      : [];
    const bookMap = new Map(books.map(b => [b.id, b]));
    return claims.map(c => ({ ...c, book: bookMap.get(c.bookId) ?? null }));
  }

  async getArcInvite(token: string): Promise<ArcInvite | undefined> {
    const [result] = await db.select().from(arcInvites).where(eq(arcInvites.token, token));
    return result;
  }

  async createArcInvite(data: InsertArcInvite): Promise<ArcInvite> {
    const [result] = await db.insert(arcInvites).values(data).returning();
    return result;
  }

  async getArcInvitesForBook(bookId: number): Promise<ArcInvite[]> {
    return await db.select().from(arcInvites).where(eq(arcInvites.bookId, bookId)).orderBy(desc(arcInvites.createdAt));
  }

  async markArcInviteUsed(token: string, userId: string): Promise<ArcInvite | undefined> {
    const [result] = await db.update(arcInvites)
      .set({ usedAt: new Date(), acceptedByUserId: userId })
      .where(eq(arcInvites.token, token))
      .returning();
    return result;
  }

  async generateArcShareToken(bookId: number): Promise<string> {
    const existing = await db.select({ arcShareToken: authorBooks.arcShareToken }).from(authorBooks).where(eq(authorBooks.id, bookId));
    if (existing[0]?.arcShareToken) return existing[0].arcShareToken;
    const { randomUUID } = await import("crypto");
    const token = randomUUID();
    await db.update(authorBooks).set({ arcShareToken: token }).where(eq(authorBooks.id, bookId));
    return token;
  }

  async getAuthorBookByShareToken(token: string): Promise<typeof authorBooks.$inferSelect | undefined> {
    const [result] = await db.select().from(authorBooks).where(eq(authorBooks.arcShareToken, token));
    return result;
  }

  async getActiveFeaturedPlacements(type?: string): Promise<(FeaturedPlacement & { author?: AuthorProfile })[]> {
    const now = new Date();
    await db.update(featuredPlacements)
      .set({ isActive: false })
      .where(and(
        eq(featuredPlacements.isActive, true),
        lte(featuredPlacements.endDate, now)
      ));

    const conditions = [eq(featuredPlacements.isActive, true)];
    if (type) conditions.push(eq(featuredPlacements.type, type));

    const rows = await db.select({
      placement: featuredPlacements,
      author: authorProfiles,
    })
      .from(featuredPlacements)
      .leftJoin(authorProfiles, eq(featuredPlacements.authorProfileId, authorProfiles.id))
      .where(and(...conditions))
      .orderBy(
        desc(featuredPlacements.isSponsored),
        desc(featuredPlacements.priority),
        desc(featuredPlacements.createdAt)
      );

    return rows.map(row => ({
      ...row.placement,
      author: row.author ?? undefined,
    }));
  }

  async createFeaturedPlacement(placement: InsertFeaturedPlacement): Promise<FeaturedPlacement> {
    const [result] = await db.insert(featuredPlacements).values(placement).returning();
    return result;
  }

  async updateFeaturedPlacement(id: number, updates: Partial<InsertFeaturedPlacement>): Promise<FeaturedPlacement | undefined> {
    const [result] = await db.update(featuredPlacements).set(updates).where(eq(featuredPlacements.id, id)).returning();
    return result;
  }

  async deleteFeaturedPlacement(id: number): Promise<boolean> {
    const result = await db.delete(featuredPlacements).where(eq(featuredPlacements.id, id)).returning();
    return result.length > 0;
  }

  async followUser(follow: InsertFollow): Promise<Follow> {
    const [result] = await db.insert(follows).values(follow).returning();
    return result;
  }

  async unfollowUser(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.delete(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    ).returning();
    return result.length > 0;
  }

  async getFollowers(userId: string): Promise<Follow[]> {
    return await db.select().from(follows).where(eq(follows.followingId, userId));
  }

  async getFollowing(userId: string): Promise<Follow[]> {
    return await db.select().from(follows).where(eq(follows.followerId, userId));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const result = await db.select().from(follows).where(
      and(eq(follows.followerId, followerId), eq(follows.followingId, followingId))
    );
    return result.length > 0;
  }

  async getFollowCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followersResult] = await db.select({ count: count() }).from(follows).where(eq(follows.followingId, userId));
    const [followingResult] = await db.select({ count: count() }).from(follows).where(eq(follows.followerId, userId));
    return { followers: followersResult.count, following: followingResult.count };
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const pattern = `%${query}%`;
    return await db.select().from(users).where(
      or(
        ilike(users.firstName, pattern),
        ilike(users.lastName, pattern),
        ilike(users.displayName, pattern),
        ilike(users.email, pattern),
      )
    ).limit(limit);
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, userId));
    return result;
  }

  async createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent> {
    const [result] = await db.insert(activityEvents).values(event).returning();
    return result;
  }

  async getUserFeed(userId: string, followingIds: string[]): Promise<ActivityEvent[]> {
    if (followingIds.length === 0) {
      return [];
    }
    return await db.select().from(activityEvents)
      .where(inArray(activityEvents.userId, followingIds))
      .orderBy(desc(activityEvents.createdAt));
  }

  async getUserActivityEvents(userId: string): Promise<ActivityEvent[]> {
    return await db.select().from(activityEvents)
      .where(eq(activityEvents.userId, userId))
      .orderBy(desc(activityEvents.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
    return result.length > 0;
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    );
    return result.count;
  }

  async createAuthorBookReview(review: InsertAuthorBookReview): Promise<AuthorBookReview> {
    const [result] = await db.insert(authorBookReviews).values(review).returning();
    return result;
  }

  async getAuthorBookReviews(authorBookId: number): Promise<AuthorBookReview[]> {
    return await db.select().from(authorBookReviews).where(eq(authorBookReviews.authorBookId, authorBookId));
  }

  async getUserReviewForBook(userId: string, authorBookId: number): Promise<AuthorBookReview | undefined> {
    const result = await db.select().from(authorBookReviews).where(
      and(eq(authorBookReviews.userId, userId), eq(authorBookReviews.authorBookId, authorBookId))
    );
    return result[0];
  }

  async deleteAuthorBookReview(id: number): Promise<boolean> {
    const result = await db.delete(authorBookReviews).where(eq(authorBookReviews.id, id)).returning();
    return result.length > 0;
  }

  async createBookClub(club: InsertBookClub): Promise<BookClub> {
    const [result] = await db.insert(bookClubs).values(club).returning();
    return result;
  }

  async getBookClub(id: number): Promise<BookClub | undefined> {
    const result = await db.select().from(bookClubs).where(eq(bookClubs.id, id));
    return result[0];
  }

  async getPublicBookClubs(): Promise<BookClub[]> {
    return await db.select().from(bookClubs).where(eq(bookClubs.isPublic, true));
  }

  async getUserBookClubs(userId: string): Promise<BookClub[]> {
    const memberships = await db.select().from(clubMembers).where(eq(clubMembers.userId, userId));
    if (memberships.length === 0) return [];
    const clubIds = memberships.map(m => m.clubId);
    return await db.select().from(bookClubs).where(inArray(bookClubs.id, clubIds));
  }

  async updateBookClub(id: number, updates: Partial<InsertBookClub>): Promise<BookClub | undefined> {
    const [result] = await db.update(bookClubs).set(updates).where(eq(bookClubs.id, id)).returning();
    return result;
  }

  async deleteBookClub(id: number): Promise<boolean> {
    const result = await db.delete(bookClubs).where(eq(bookClubs.id, id)).returning();
    return result.length > 0;
  }

  async joinClub(member: InsertClubMember): Promise<ClubMember> {
    const [result] = await db.insert(clubMembers).values(member).returning();
    return result;
  }

  async leaveClub(clubId: number, userId: string): Promise<boolean> {
    const result = await db.delete(clubMembers).where(
      and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId))
    ).returning();
    return result.length > 0;
  }

  async getClubMembers(clubId: number): Promise<ClubMember[]> {
    return await db.select().from(clubMembers).where(eq(clubMembers.clubId, clubId));
  }

  async isClubMember(clubId: number, userId: string): Promise<boolean> {
    const result = await db.select().from(clubMembers).where(
      and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId))
    );
    return result.length > 0;
  }

  async getClubMemberRole(clubId: number, userId: string): Promise<string | null> {
    const result = await db.select().from(clubMembers).where(
      and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId))
    );
    return result[0]?.role ?? null;
  }

  async createClubDiscussion(post: InsertClubDiscussion): Promise<ClubDiscussion> {
    const [result] = await db.insert(clubDiscussions).values(post).returning();
    return result;
  }

  async getClubDiscussions(clubId: number): Promise<ClubDiscussion[]> {
    return await db.select().from(clubDiscussions).where(eq(clubDiscussions.clubId, clubId)).orderBy(desc(clubDiscussions.createdAt));
  }

  async deleteClubDiscussion(id: number): Promise<boolean> {
    const result = await db.delete(clubDiscussions).where(eq(clubDiscussions.id, id)).returning();
    return result.length > 0;
  }

  async addClubReadingBook(book: InsertClubReadingBook): Promise<ClubReadingBook> {
    const [result] = await db.insert(clubReadingBooks).values(book).returning();
    return result;
  }

  async getClubReadingBooks(clubId: number): Promise<ClubReadingBook[]> {
    return await db.select().from(clubReadingBooks).where(eq(clubReadingBooks.clubId, clubId));
  }

  async updateClubReadingBook(id: number, updates: Partial<InsertClubReadingBook>): Promise<ClubReadingBook | undefined> {
    const [result] = await db.update(clubReadingBooks).set(updates).where(eq(clubReadingBooks.id, id)).returning();
    return result;
  }

  async deleteClubReadingBook(id: number): Promise<boolean> {
    const result = await db.delete(clubReadingBooks).where(eq(clubReadingBooks.id, id)).returning();
    return result.length > 0;
  }

  async addClubVote(vote: InsertClubVote): Promise<ClubVote> {
    const [result] = await db.insert(clubVotes).values(vote).returning();
    return result;
  }

  async getClubVotes(clubId: number, bookId: number): Promise<ClubVote[]> {
    return await db.select().from(clubVotes).where(
      and(eq(clubVotes.clubId, clubId), eq(clubVotes.bookId, bookId))
    );
  }

  async hasUserVoted(clubId: number, bookId: number, userId: string): Promise<boolean> {
    const result = await db.select().from(clubVotes).where(
      and(eq(clubVotes.clubId, clubId), eq(clubVotes.bookId, bookId), eq(clubVotes.userId, userId))
    );
    return result.length > 0;
  }

  async createClubMeeting(meeting: InsertClubMeeting): Promise<ClubMeeting> {
    const [result] = await db.insert(clubMeetings).values(meeting).returning();
    return result;
  }

  async getClubMeetings(clubId: number): Promise<ClubMeeting[]> {
    return await db.select().from(clubMeetings)
      .where(eq(clubMeetings.clubId, clubId))
      .orderBy(desc(clubMeetings.meetingDate));
  }

  async deleteClubMeeting(id: number): Promise<void> {
    await db.delete(clubMeetingRsvps).where(eq(clubMeetingRsvps.meetingId, id));
    await db.delete(clubMeetings).where(eq(clubMeetings.id, id));
  }

  async getMeetingRsvps(meetingId: number): Promise<ClubMeetingRsvp[]> {
    return await db.select().from(clubMeetingRsvps)
      .where(eq(clubMeetingRsvps.meetingId, meetingId));
  }

  async upsertMeetingRsvp(rsvp: InsertClubMeetingRsvp): Promise<ClubMeetingRsvp> {
    const existing = await db.select().from(clubMeetingRsvps).where(
      and(eq(clubMeetingRsvps.meetingId, rsvp.meetingId), eq(clubMeetingRsvps.userId, rsvp.userId))
    );
    if (existing.length > 0) {
      const [updated] = await db.update(clubMeetingRsvps)
        .set({ status: rsvp.status, respondedAt: new Date() })
        .where(eq(clubMeetingRsvps.id, existing[0].id))
        .returning();
      return updated;
    }
    const [result] = await db.insert(clubMeetingRsvps).values(rsvp).returning();
    return result;
  }

  async updateMemberProgress(clubId: number, userId: string, updates: { currentChapter?: number; currentPage?: number }): Promise<void> {
    const setValues: Record<string, any> = {};
    if (updates.currentChapter !== undefined) setValues.currentChapter = updates.currentChapter;
    if (updates.currentPage !== undefined) setValues.currentPage = updates.currentPage;
    if (Object.keys(setValues).length > 0) {
      await db.update(clubMembers).set(setValues)
        .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.userId, userId)));
    }
  }

  async getClubReadingSchedule(clubId: number): Promise<any[]> {
    return await db.select().from(clubReadingSchedules)
      .where(eq(clubReadingSchedules.clubId, clubId))
      .orderBy(asc(clubReadingSchedules.weekNumber));
  }

  async upsertClubReadingSchedule(clubId: number, weeks: { weekNumber: number; label: string; chapterStart?: number; chapterEnd?: number }[]): Promise<void> {
    await db.delete(clubReadingSchedules).where(eq(clubReadingSchedules.clubId, clubId));
    if (weeks.length > 0) {
      await db.insert(clubReadingSchedules).values(
        weeks.map(w => ({ clubId, weekNumber: w.weekNumber, label: w.label, chapterStart: w.chapterStart || null, chapterEnd: w.chapterEnd || null }))
      );
    }
  }

  async deleteAllClubs(): Promise<void> {
    await db.delete(clubMeetingRsvps);
    await db.delete(clubMeetings);
    await db.delete(clubVotes);
    await db.delete(clubReadingBooks);
    await db.delete(clubDiscussions);
    await db.delete(clubReadingSchedules);
    await db.delete(clubMembers);
    await db.delete(bookClubs);
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [result] = await db.insert(analyticsEvents).values(event).returning();
    return result;
  }

  async getAuthorAnalytics(authorProfileId: number): Promise<{ profileViews: number; buyClicks: number; byDay: { date: string; views: number; clicks: number }[] }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const events = await db.select().from(analyticsEvents).where(
      and(
        eq(analyticsEvents.authorProfileId, authorProfileId),
        gte(analyticsEvents.createdAt, thirtyDaysAgo)
      )
    );

    const profileViews = events.filter(e => e.eventType === "profile_view").length;
    const buyClicks = events.filter(e => e.eventType === "buy_click").length;

    const byDayMap: Record<string, { views: number; clicks: number }> = {};
    for (const event of events) {
      if (event.createdAt) {
        const dateStr = event.createdAt.toISOString().split("T")[0];
        if (!byDayMap[dateStr]) {
          byDayMap[dateStr] = { views: 0, clicks: 0 };
        }
        if (event.eventType === "profile_view") {
          byDayMap[dateStr].views++;
        } else if (event.eventType === "buy_click") {
          byDayMap[dateStr].clicks++;
        }
      }
    }

    const byDay = Object.entries(byDayMap)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { profileViews, buyClicks, byDay };
  }

  async getDiscussions(): Promise<Discussion[]> {
    return db.select().from(discussions).orderBy(desc(discussions.isPinned), desc(discussions.createdAt));
  }

  async getDiscussion(id: number): Promise<Discussion | undefined> {
    const [discussion] = await db.select().from(discussions).where(eq(discussions.id, id));
    return discussion;
  }

  async createDiscussion(discussion: InsertDiscussion): Promise<Discussion> {
    const [created] = await db.insert(discussions).values(discussion).returning();
    return created;
  }

  async deleteDiscussion(id: number): Promise<boolean> {
    const result = await db.delete(discussions).where(eq(discussions.id, id));
    return true;
  }

  async getDiscussionComments(discussionId: number): Promise<DiscussionComment[]> {
    return db.select().from(discussionComments).where(eq(discussionComments.discussionId, discussionId)).orderBy(asc(discussionComments.createdAt));
  }

  async createDiscussionComment(comment: InsertDiscussionComment): Promise<DiscussionComment> {
    const [created] = await db.insert(discussionComments).values(comment).returning();
    await db.update(discussions).set({ commentCount: sql`comment_count + 1` }).where(eq(discussions.id, comment.discussionId));
    return created;
  }

  async deleteDiscussionComment(id: number): Promise<boolean> {
    const [comment] = await db.select().from(discussionComments).where(eq(discussionComments.id, id));
    if (comment) {
      await db.delete(discussionComments).where(eq(discussionComments.id, id));
      await db.update(discussions).set({ commentCount: sql`GREATEST(comment_count - 1, 0)` }).where(eq(discussions.id, comment.discussionId));
    }
    return true;
  }

  async createBookSubmission(submission: InsertBookSubmission): Promise<BookSubmission> {
    const [created] = await db.insert(bookSubmissions).values(submission).returning();
    return created;
  }

  async getBookSubmissions(): Promise<BookSubmission[]> {
    return db.select().from(bookSubmissions).orderBy(desc(bookSubmissions.submittedAt));
  }

  async getShopProducts(): Promise<ShopProduct[]> {
    return db.select().from(shopProducts).orderBy(asc(shopProducts.sortOrder), desc(shopProducts.createdAt));
  }

  async getActiveShopProducts(): Promise<ShopProduct[]> {
    return db.select().from(shopProducts).where(eq(shopProducts.isActive, true)).orderBy(asc(shopProducts.sortOrder), desc(shopProducts.createdAt));
  }

  async getShopProduct(id: number): Promise<ShopProduct | undefined> {
    const [product] = await db.select().from(shopProducts).where(eq(shopProducts.id, id));
    return product;
  }

  async createShopProduct(product: InsertShopProduct): Promise<ShopProduct> {
    const [created] = await db.insert(shopProducts).values(product).returning();
    return created;
  }

  async updateShopProduct(id: number, updates: Partial<InsertShopProduct>): Promise<ShopProduct | undefined> {
    const [updated] = await db.update(shopProducts).set(updates).where(eq(shopProducts.id, id)).returning();
    return updated;
  }

  async deleteShopProduct(id: number): Promise<boolean> {
    await db.delete(shopProducts).where(eq(shopProducts.id, id));
    return true;
  }

  async getShopCategories(): Promise<string[]> {
    const results = await db.selectDistinct({ category: shopProducts.category }).from(shopProducts).where(eq(shopProducts.isActive, true));
    return results.map(r => r.category);
  }

  async getChildProfiles(parentUserId: string): Promise<ChildProfile[]> {
    return db.select().from(childProfiles).where(eq(childProfiles.parentUserId, parentUserId)).orderBy(asc(childProfiles.createdAt));
  }

  async getChildProfile(id: number): Promise<ChildProfile | undefined> {
    const [profile] = await db.select().from(childProfiles).where(eq(childProfiles.id, id));
    return profile;
  }

  async createChildProfile(profile: InsertChildProfile): Promise<ChildProfile> {
    const [created] = await db.insert(childProfiles).values(profile).returning();
    return created;
  }

  async updateChildProfile(id: number, updates: Partial<ChildProfile>): Promise<ChildProfile | undefined> {
    const [updated] = await db.update(childProfiles).set(updates).where(eq(childProfiles.id, id)).returning();
    return updated;
  }

  async deleteChildProfile(id: number): Promise<boolean> {
    await db.delete(childReadingLogs).where(eq(childReadingLogs.childProfileId, id));
    await db.delete(childReadingGoals).where(eq(childReadingGoals.childProfileId, id));
    await db.delete(childProfiles).where(eq(childProfiles.id, id));
    return true;
  }

  async getChildReadingLogs(childProfileId: number): Promise<ChildReadingLog[]> {
    return db.select().from(childReadingLogs).where(eq(childReadingLogs.childProfileId, childProfileId)).orderBy(desc(childReadingLogs.logDate));
  }

  async createChildReadingLog(log: InsertChildReadingLog): Promise<ChildReadingLog> {
    const [created] = await db.insert(childReadingLogs).values(log).returning();
    return created;
  }

  async getChildReadingGoals(childProfileId: number): Promise<ChildReadingGoal[]> {
    return db.select().from(childReadingGoals).where(eq(childReadingGoals.childProfileId, childProfileId)).orderBy(desc(childReadingGoals.createdAt));
  }

  async createChildReadingGoal(goal: InsertChildReadingGoal): Promise<ChildReadingGoal> {
    const [created] = await db.insert(childReadingGoals).values(goal).returning();
    return created;
  }

  async updateChildReadingGoal(id: number, updates: Partial<ChildReadingGoal>): Promise<ChildReadingGoal | undefined> {
    const [updated] = await db.update(childReadingGoals).set(updates).where(eq(childReadingGoals.id, id)).returning();
    return updated;
  }

  async getChildChallenges(childProfileId: number): Promise<ChildChallenge[]> {
    return db.select().from(childChallenges).where(eq(childChallenges.childProfileId, childProfileId)).orderBy(desc(childChallenges.startedAt));
  }

  async createChildChallenge(challenge: InsertChildChallenge): Promise<ChildChallenge> {
    const [created] = await db.insert(childChallenges).values(challenge).returning();
    return created;
  }

  async updateChildChallenge(id: number, updates: Partial<ChildChallenge>): Promise<ChildChallenge | undefined> {
    const [updated] = await db.update(childChallenges).set(updates).where(eq(childChallenges.id, id)).returning();
    return updated;
  }

  async deleteChildChallenge(id: number): Promise<boolean> {
    const result = await db.delete(childChallenges).where(eq(childChallenges.id, id));
    return true;
  }

  async createBookTagSuggestion(suggestion: InsertBookTagSuggestion): Promise<BookTagSuggestion> {
    const [result] = await db.insert(bookTagSuggestions).values(suggestion).returning();
    return result;
  }

  async getBookTagSuggestions(catalogBookId: number): Promise<BookTagSuggestion[]> {
    return await db.select().from(bookTagSuggestions)
      .where(eq(bookTagSuggestions.catalogBookId, catalogBookId))
      .orderBy(desc(bookTagSuggestions.createdAt));
  }

  async getUserTagSuggestions(userId: string, catalogBookId: number): Promise<BookTagSuggestion[]> {
    return await db.select().from(bookTagSuggestions)
      .where(and(
        eq(bookTagSuggestions.userId, userId),
        eq(bookTagSuggestions.catalogBookId, catalogBookId)
      ));
  }

  async getApprovedCommunityTags(catalogBookId: number): Promise<BookTagSuggestion[]> {
    return await db.select().from(bookTagSuggestions)
      .where(and(
        eq(bookTagSuggestions.catalogBookId, catalogBookId),
        eq(bookTagSuggestions.status, "approved")
      ));
  }

  async getIndieSpotlights(): Promise<IndieSpotlight[]> {
    return await db.select().from(indieSpotlights).orderBy(desc(indieSpotlights.priority), desc(indieSpotlights.createdAt));
  }

  async getActiveIndieSpotlights(): Promise<IndieSpotlight[]> {
    const now = new Date();
    await db.update(indieSpotlights)
      .set({ isActive: false })
      .where(and(
        eq(indieSpotlights.isActive, true),
        lte(indieSpotlights.endDate, now)
      ));

    const results = await db.select().from(indieSpotlights)
      .where(eq(indieSpotlights.isActive, true))
      .orderBy(
        desc(indieSpotlights.pricePaid),
        desc(indieSpotlights.priority),
        desc(indieSpotlights.createdAt)
      );
    return results;
  }

  async getIndieSpotlight(id: number): Promise<IndieSpotlight | undefined> {
    const [result] = await db.select().from(indieSpotlights).where(eq(indieSpotlights.id, id));
    return result;
  }

  async createIndieSpotlight(spotlight: InsertIndieSpotlight): Promise<IndieSpotlight> {
    const [result] = await db.insert(indieSpotlights).values(spotlight).returning();
    return result;
  }

  async updateIndieSpotlight(id: number, updates: Partial<InsertIndieSpotlight>): Promise<IndieSpotlight | undefined> {
    const [result] = await db.update(indieSpotlights).set(updates).where(eq(indieSpotlights.id, id)).returning();
    return result;
  }

  async deleteIndieSpotlight(id: number): Promise<boolean> {
    await db.delete(indieSpotlights).where(eq(indieSpotlights.id, id));
    return true;
  }

  async createSpotlightRequest(data: InsertIndieSpotlightRequest): Promise<IndieSpotlightRequest> {
    const [result] = await db.insert(indieSpotlightRequests).values(data).returning();
    return result;
  }

  async getSpotlightRequests(): Promise<IndieSpotlightRequest[]> {
    return await db.select().from(indieSpotlightRequests).orderBy(desc(indieSpotlightRequests.createdAt));
  }

  async getSpotlightRequest(id: number): Promise<IndieSpotlightRequest | undefined> {
    const [result] = await db.select().from(indieSpotlightRequests).where(eq(indieSpotlightRequests.id, id));
    return result;
  }

  async updateSpotlightRequest(id: number, data: Partial<IndieSpotlightRequest>): Promise<IndieSpotlightRequest | undefined> {
    const [result] = await db.update(indieSpotlightRequests).set(data).where(eq(indieSpotlightRequests.id, id)).returning();
    return result;
  }

  async getUserTopicFollows(userId: string): Promise<TopicFollow[]> {
    return await db.select().from(topicFollows).where(eq(topicFollows.userId, userId));
  }

  async followTopic(userId: string, topic: string, category: string): Promise<TopicFollow> {
    const existing = await db.select().from(topicFollows)
      .where(and(eq(topicFollows.userId, userId), eq(topicFollows.topic, topic)));
    if (existing.length > 0) return existing[0];
    const [result] = await db.insert(topicFollows).values({ userId, topic, category }).returning();
    return result;
  }

  async unfollowTopic(userId: string, topic: string): Promise<boolean> {
    await db.delete(topicFollows).where(and(eq(topicFollows.userId, userId), eq(topicFollows.topic, topic)));
    return true;
  }

  async createInterviewRequest(data: InsertInterviewRequest): Promise<InterviewRequest> {
    const [result] = await db.insert(interviewRequests).values(data).returning();
    return result;
  }

  async getInterviewRequests(status?: string): Promise<InterviewRequest[]> {
    if (status) {
      return await db.select().from(interviewRequests)
        .where(eq(interviewRequests.status, status))
        .orderBy(desc(interviewRequests.createdAt));
    }
    return await db.select().from(interviewRequests).orderBy(desc(interviewRequests.createdAt));
  }

  async getInterviewRequest(id: number): Promise<InterviewRequest | undefined> {
    const [result] = await db.select().from(interviewRequests).where(eq(interviewRequests.id, id));
    return result;
  }

  async updateInterviewRequest(id: number, data: Partial<InterviewRequest>): Promise<InterviewRequest | undefined> {
    const [result] = await db.update(interviewRequests).set(data).where(eq(interviewRequests.id, id)).returning();
    return result;
  }

  async getDiscoveryTags(category?: string): Promise<DiscoveryTag[]> {
    if (category) {
      return db.select().from(discoveryTags).where(eq(discoveryTags.category, category)).orderBy(asc(discoveryTags.name));
    }
    return db.select().from(discoveryTags).orderBy(asc(discoveryTags.category), asc(discoveryTags.name));
  }

  async createDiscoveryTag(tag: InsertDiscoveryTag): Promise<DiscoveryTag> {
    const [result] = await db.insert(discoveryTags).values(tag).returning();
    return result;
  }

  async tagBook(bookId: number, tagId: number): Promise<BookDiscoveryTag> {
    const [result] = await db.insert(bookDiscoveryTags).values({ bookId, tagId }).onConflictDoNothing().returning();
    return result || { id: 0, bookId, tagId };
  }

  async untagBook(bookId: number, tagId: number): Promise<boolean> {
    const result = await db.delete(bookDiscoveryTags).where(and(eq(bookDiscoveryTags.bookId, bookId), eq(bookDiscoveryTags.tagId, tagId)));
    return (result?.rowCount ?? 0) > 0;
  }

  async getBookTags(bookId: number): Promise<DiscoveryTag[]> {
    const rows = await db
      .select({ tag: discoveryTags })
      .from(bookDiscoveryTags)
      .innerJoin(discoveryTags, eq(bookDiscoveryTags.tagId, discoveryTags.id))
      .where(eq(bookDiscoveryTags.bookId, bookId));
    return rows.map(r => r.tag);
  }

  async getUserFilterPresets(userId: string): Promise<SavedFilterPreset[]> {
    return db.select().from(savedFilterPresets).where(eq(savedFilterPresets.userId, userId)).orderBy(desc(savedFilterPresets.createdAt));
  }

  async createFilterPreset(preset: InsertSavedFilterPreset): Promise<SavedFilterPreset> {
    const [result] = await db.insert(savedFilterPresets).values(preset).returning();
    return result;
  }

  async deleteFilterPreset(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(savedFilterPresets).where(and(eq(savedFilterPresets.id, id), eq(savedFilterPresets.userId, userId)));
    return (result?.rowCount ?? 0) > 0;
  }

  async blockUser(blockerId: string, blockedUserId: string): Promise<void> {
    const existing = await db.select().from(userBlocks).where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));
    if (existing.length === 0) {
      await db.insert(userBlocks).values({ blockerId, blockedUserId });
    }
    await db.delete(follows).where(and(eq(follows.followerId, blockerId), eq(follows.followingId, blockedUserId)));
    await db.delete(follows).where(and(eq(follows.followerId, blockedUserId), eq(follows.followingId, blockerId)));
    await db.delete(followRequests).where(
      or(
        and(eq(followRequests.requesterId, blockerId), eq(followRequests.targetUserId, blockedUserId)),
        and(eq(followRequests.requesterId, blockedUserId), eq(followRequests.targetUserId, blockerId))
      )
    );
  }

  async unblockUser(blockerId: string, blockedUserId: string): Promise<void> {
    await db.delete(userBlocks).where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));
  }

  async getBlockedUsers(userId: string): Promise<any[]> {
    const blocks = await db.select().from(userBlocks).where(eq(userBlocks.blockerId, userId)).orderBy(desc(userBlocks.createdAt));
    const blockedIds = blocks.map(b => b.blockedUserId);
    if (blockedIds.length === 0) return [];
    const blockedUsers = await db.select().from(users).where(inArray(users.id, blockedIds));
    return blocks.map(b => {
      const user = blockedUsers.find(u => u.id === b.blockedUserId);
      return { ...b, user: user ? { id: user.id, displayName: user.displayName, profileImageUrl: user.profileImageUrl } : null };
    });
  }

  async isUserBlockedBy(blockerId: string, blockedUserId: string): Promise<boolean> {
    const result = await db.select().from(userBlocks).where(
      or(
        and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)),
        and(eq(userBlocks.blockerId, blockedUserId), eq(userBlocks.blockedUserId, blockerId))
      )
    );
    return result.length > 0;
  }

  async reportUser(report: { reporterId: string; reportedUserId: string; reportedContentId?: number; reportedContentType?: string; reason: string; details?: string }): Promise<void> {
    await db.insert(userReports).values({
      reporterId: report.reporterId,
      reportedUserId: report.reportedUserId,
      reportedContentId: report.reportedContentId ?? null,
      reportedContentType: report.reportedContentType ?? null,
      reason: report.reason,
      details: report.details ?? null,
    });
  }

  async createFollowRequest(requesterId: string, targetUserId: string): Promise<any> {
    const [result] = await db.insert(followRequests).values({ requesterId, targetUserId }).returning();
    return result;
  }

  async getFollowRequests(targetUserId: string): Promise<any[]> {
    const requests = await db.select().from(followRequests).where(and(eq(followRequests.targetUserId, targetUserId), eq(followRequests.status, "pending"))).orderBy(desc(followRequests.createdAt));
    const requesterIds = requests.map(r => r.requesterId);
    if (requesterIds.length === 0) return [];
    const requesters = await db.select().from(users).where(inArray(users.id, requesterIds));
    return requests.map(r => {
      const user = requesters.find(u => u.id === r.requesterId);
      return { ...r, user: user ? { id: user.id, displayName: user.displayName, profileImageUrl: user.profileImageUrl, bio: user.bio } : null };
    });
  }

  async respondToFollowRequest(requestId: number, status: string): Promise<any> {
    const [request] = await db.select().from(followRequests).where(and(eq(followRequests.id, requestId), eq(followRequests.status, "pending")));
    if (!request) return null;
    await db.update(followRequests).set({ status, respondedAt: new Date() }).where(eq(followRequests.id, requestId));
    if (status === "approved") {
      const blocked = await this.isUserBlockedBy(request.requesterId, request.targetUserId);
      if (!blocked) {
        const existing = await db.select().from(follows).where(and(eq(follows.followerId, request.requesterId), eq(follows.followingId, request.targetUserId)));
        if (existing.length === 0) {
          await db.insert(follows).values({ followerId: request.requesterId, followingId: request.targetUserId });
        }
      }
    }
    return { ...request, status, respondedAt: new Date() };
  }

  async getPendingFollowRequest(requesterId: string, targetUserId: string): Promise<any | undefined> {
    const [result] = await db.select().from(followRequests).where(and(eq(followRequests.requesterId, requesterId), eq(followRequests.targetUserId, targetUserId), eq(followRequests.status, "pending")));
    return result;
  }

  async cancelFollowRequest(requesterId: string, targetUserId: string): Promise<void> {
    await db.delete(followRequests).where(and(eq(followRequests.requesterId, requesterId), eq(followRequests.targetUserId, targetUserId), eq(followRequests.status, "pending")));
  }

  async getSentFollowRequests(requesterId: string): Promise<any[]> {
    return await db.select().from(followRequests).where(and(eq(followRequests.requesterId, requesterId), eq(followRequests.status, "pending")));
  }

  async getCommunityEvents(filters?: { upcoming?: boolean; category?: string }): Promise<any[]> {
    const conditions = [eq(communityEvents.status, "active")];
    if (filters?.upcoming) {
      conditions.push(gte(communityEvents.endDate, new Date()));
    }
    if (filters?.category && filters.category !== "all") {
      conditions.push(eq(communityEvents.category, filters.category));
    }
    return await db.select().from(communityEvents).where(and(...conditions)).orderBy(communityEvents.startDate);
  }

  async getCommunityEvent(id: number): Promise<any | undefined> {
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, id));
    return event;
  }

  async createCommunityEvent(data: any): Promise<any> {
    const [event] = await db.insert(communityEvents).values(data).returning();
    return event;
  }

  async updateCommunityEvent(id: number, data: any): Promise<any> {
    const [event] = await db.update(communityEvents).set(data).where(eq(communityEvents.id, id)).returning();
    return event;
  }

  async deleteCommunityEvent(id: number, userId: string): Promise<void> {
    await db.delete(communityEvents).where(and(eq(communityEvents.id, id), eq(communityEvents.userId, userId)));
  }
}
