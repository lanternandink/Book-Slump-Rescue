import { db } from "./db";
import { activityEvents } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "./storage";

export async function seedCommunityFeed() {
  try {
    const existing = await db.select().from(activityEvents)
      .where(eq(activityEvents.userId, "book-slump-rescue"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Community feed already seeded, skipping");
      return;
    }

    const oldJunk = await db.select({ id: activityEvents.id }).from(activityEvents).limit(100);
    if (oldJunk.length > 0) {
      console.log("Cleaning up", oldJunk.length, "old feed items before seeding...");
      await db.delete(activityEvents).where(sql`1=1`);
    }

    console.log("Seeding community feed with reading tips...");

    const tips = [
      { type: "status_update", text: "Reading tip: If you're in a slump, try switching genres! A cozy mystery or a short poetry collection can reignite your love for reading.", bookTitle: null, bookAuthor: null, rating: 0 },
      { type: "status_update", text: "Struggling to finish a book? Give yourself permission to DNF. Life's too short for books that don't spark joy!", bookTitle: null, bookAuthor: null, rating: 0 },
      { type: "status_update", text: "Try the 'five-book rule' — start five books at once and only continue the ones that grab you. No guilt allowed!", bookTitle: null, bookAuthor: null, rating: 0 },
      { type: "status_update", text: "Audiobooks count as reading! Sometimes switching format is all you need to get back into the groove.", bookTitle: null, bookAuthor: null, rating: 0 },
      { type: "status_update", text: "Reading tip: Set a tiny goal. Even 10 pages a day adds up to over 3,600 pages a year — that's about 12 novels!", bookTitle: null, bookAuthor: null, rating: 0 },
      { type: "status_update", text: "Rereading a favorite comfort book is a great way to ease back into reading. There's no rule that says it always has to be something new!", bookTitle: null, bookAuthor: null, rating: 0 },
    ];

    for (const tip of tips) {
      const metadata: Record<string, any> = { text: tip.text };
      if (tip.rating) metadata.rating = tip.rating;
      await storage.createActivityEvent({
        userId: "book-slump-rescue",
        type: tip.type,
        bookTitle: tip.bookTitle || null,
        bookAuthor: tip.bookAuthor || null,
        bookCoverUrl: null,
        metadata: JSON.stringify(metadata),
      });
    }

    console.log("Community feed seeded with", tips.length, "reading tips");
  } catch (err) {
    console.error("Failed to seed community feed:", err);
  }
}
