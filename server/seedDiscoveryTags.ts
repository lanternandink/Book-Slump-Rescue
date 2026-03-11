import { db } from "./db";
import { discoveryTags, bookDiscoveryTags, catalogBooks } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const SEED_TAGS: Array<{ category: string; name: string; slug: string; isSensitive?: boolean }> = [
  { category: "GENRE", name: "Romance", slug: "romance" },
  { category: "GENRE", name: "Fantasy", slug: "fantasy" },
  { category: "GENRE", name: "Thriller", slug: "thriller" },
  { category: "GENRE", name: "Mystery", slug: "mystery" },
  { category: "GENRE", name: "Horror", slug: "horror" },
  { category: "GENRE", name: "Sci-Fi", slug: "sci-fi" },
  { category: "GENRE", name: "Contemporary", slug: "contemporary" },
  { category: "GENRE", name: "Nonfiction", slug: "nonfiction" },
  { category: "GENRE", name: "Historical Fiction", slug: "historical-fiction" },
  { category: "GENRE", name: "Literary Fiction", slug: "literary-fiction" },
  { category: "GENRE", name: "Young Adult", slug: "young-adult" },
  { category: "GENRE", name: "Biography", slug: "biography" },
  { category: "GENRE", name: "Self-Help", slug: "self-help" },

  { category: "SUBGENRE", name: "Urban Fantasy", slug: "urban-fantasy" },
  { category: "SUBGENRE", name: "Cozy Mystery", slug: "cozy-mystery" },
  { category: "SUBGENRE", name: "Space Opera", slug: "space-opera" },
  { category: "SUBGENRE", name: "Dark Fantasy", slug: "dark-fantasy" },
  { category: "SUBGENRE", name: "Romantic Suspense", slug: "romantic-suspense" },
  { category: "SUBGENRE", name: "Paranormal Romance", slug: "paranormal-romance" },
  { category: "SUBGENRE", name: "Historical Romance", slug: "historical-romance" },
  { category: "SUBGENRE", name: "Dystopian", slug: "dystopian" },
  { category: "SUBGENRE", name: "Epic Fantasy", slug: "epic-fantasy" },
  { category: "SUBGENRE", name: "Psychological Thriller", slug: "psychological-thriller" },
  { category: "SUBGENRE", name: "True Crime", slug: "true-crime" },
  { category: "SUBGENRE", name: "Memoir", slug: "memoir" },
  { category: "SUBGENRE", name: "New Adult", slug: "new-adult" },

  { category: "TROPE", name: "Found Family", slug: "found-family" },
  { category: "TROPE", name: "Chosen One", slug: "chosen-one" },
  { category: "TROPE", name: "Heist", slug: "heist" },
  { category: "TROPE", name: "Unreliable Narrator", slug: "unreliable-narrator" },
  { category: "TROPE", name: "Anti-Hero", slug: "anti-hero" },
  { category: "TROPE", name: "Survival", slug: "survival" },
  { category: "TROPE", name: "Redemption Arc", slug: "redemption-arc" },
  { category: "TROPE", name: "Coming of Age", slug: "coming-of-age" },
  { category: "TROPE", name: "Locked Room", slug: "locked-room" },
  { category: "TROPE", name: "Time Loop", slug: "time-loop" },
  { category: "TROPE", name: "Quest", slug: "quest" },
  { category: "TROPE", name: "Morally Grey", slug: "morally-grey" },
  { category: "TROPE", name: "Retelling", slug: "retelling" },
  { category: "TROPE", name: "Secret Identity", slug: "secret-identity" },
  { category: "TROPE", name: "Forbidden Love", slug: "forbidden-love" },

  { category: "ROMANCE_TROPE", name: "Enemies to Lovers", slug: "enemies-to-lovers" },
  { category: "ROMANCE_TROPE", name: "Fake Dating", slug: "fake-dating" },
  { category: "ROMANCE_TROPE", name: "Friends to Lovers", slug: "friends-to-lovers" },
  { category: "ROMANCE_TROPE", name: "Second Chance", slug: "second-chance" },
  { category: "ROMANCE_TROPE", name: "Slow Burn", slug: "slow-burn" },
  { category: "ROMANCE_TROPE", name: "Forced Proximity", slug: "forced-proximity" },
  { category: "ROMANCE_TROPE", name: "Grumpy/Sunshine", slug: "grumpy-sunshine" },
  { category: "ROMANCE_TROPE", name: "Age Gap", slug: "age-gap" },
  { category: "ROMANCE_TROPE", name: "Arranged Marriage", slug: "arranged-marriage" },
  { category: "ROMANCE_TROPE", name: "Secret Romance", slug: "secret-romance" },
  { category: "ROMANCE_TROPE", name: "Love Triangle", slug: "love-triangle" },
  { category: "ROMANCE_TROPE", name: "Only One Bed", slug: "only-one-bed" },
  { category: "ROMANCE_TROPE", name: "Workplace Romance", slug: "workplace-romance" },
  { category: "ROMANCE_TROPE", name: "Billionaire", slug: "billionaire" },

  { category: "THEME", name: "Grief", slug: "grief" },
  { category: "THEME", name: "Revenge", slug: "revenge" },
  { category: "THEME", name: "Identity", slug: "identity" },
  { category: "THEME", name: "Healing", slug: "healing" },
  { category: "THEME", name: "Power", slug: "power" },
  { category: "THEME", name: "Betrayal", slug: "betrayal" },
  { category: "THEME", name: "Family", slug: "family" },
  { category: "THEME", name: "Freedom", slug: "freedom" },
  { category: "THEME", name: "Justice", slug: "justice" },
  { category: "THEME", name: "Survival", slug: "survival-theme" },

  { category: "VIBE", name: "Cozy", slug: "cozy" },
  { category: "VIBE", name: "Dark", slug: "dark" },
  { category: "VIBE", name: "Funny", slug: "funny" },
  { category: "VIBE", name: "Angsty", slug: "angsty" },
  { category: "VIBE", name: "Atmospheric", slug: "atmospheric" },
  { category: "VIBE", name: "Wholesome", slug: "wholesome" },
  { category: "VIBE", name: "Chaotic", slug: "chaotic" },
  { category: "VIBE", name: "Emotional", slug: "emotional" },
  { category: "VIBE", name: "Intense", slug: "intense" },
  { category: "VIBE", name: "Dreamy", slug: "dreamy" },

  { category: "PACING", name: "Slow", slug: "slow" },
  { category: "PACING", name: "Medium", slug: "medium" },
  { category: "PACING", name: "Fast", slug: "fast" },

  { category: "SETTING", name: "Small Town", slug: "small-town" },
  { category: "SETTING", name: "Big City", slug: "big-city" },
  { category: "SETTING", name: "Regency", slug: "regency" },
  { category: "SETTING", name: "Medieval", slug: "medieval" },
  { category: "SETTING", name: "Space", slug: "space" },
  { category: "SETTING", name: "Academia", slug: "academia" },
  { category: "SETTING", name: "Wilderness", slug: "wilderness" },
  { category: "SETTING", name: "Victorian", slug: "victorian" },
  { category: "SETTING", name: "Contemporary Urban", slug: "contemporary-urban" },
  { category: "SETTING", name: "Ancient World", slug: "ancient-world" },

  { category: "POV", name: "First Person", slug: "first-person" },
  { category: "POV", name: "Third Person", slug: "third-person" },
  { category: "POV", name: "Multi POV", slug: "multi-pov" },
  { category: "POV", name: "Dual POV", slug: "dual-pov" },

  { category: "CONTENT", name: "Violence", slug: "violence", isSensitive: true },
  { category: "CONTENT", name: "Sexual Assault", slug: "sexual-assault", isSensitive: true },
  { category: "CONTENT", name: "Self-Harm", slug: "self-harm", isSensitive: true },
  { category: "CONTENT", name: "Cheating", slug: "cheating", isSensitive: true },
  { category: "CONTENT", name: "Pregnancy Loss", slug: "pregnancy-loss", isSensitive: true },
  { category: "CONTENT", name: "Substance Abuse", slug: "substance-abuse", isSensitive: true },
  { category: "CONTENT", name: "Death of Loved One", slug: "death-of-loved-one", isSensitive: true },
  { category: "CONTENT", name: "Child Abuse", slug: "child-abuse", isSensitive: true },
  { category: "CONTENT", name: "Gore", slug: "gore", isSensitive: true },
  { category: "CONTENT", name: "Torture", slug: "torture", isSensitive: true },

  { category: "FORMAT", name: "Novella", slug: "novella" },
  { category: "FORMAT", name: "Standalone", slug: "standalone" },
  { category: "FORMAT", name: "Series", slug: "series" },
  { category: "FORMAT", name: "Audio-First", slug: "audio-first" },
  { category: "FORMAT", name: "Graphic Novel", slug: "graphic-novel" },

  { category: "AUDIENCE", name: "Adult", slug: "adult" },
  { category: "AUDIENCE", name: "Young Adult", slug: "ya" },
  { category: "AUDIENCE", name: "Middle Grade", slug: "middle-grade" },
  { category: "AUDIENCE", name: "New Adult", slug: "na" },
];

export async function seedDiscoveryTags() {
  const existing = await db.select({ id: discoveryTags.id }).from(discoveryTags).limit(1);
  if (existing.length > 0) {
    console.log("Discovery tags already seeded, skipping");
    return;
  }

  console.log("Seeding discovery tags...");
  let created = 0;
  for (const tag of SEED_TAGS) {
    try {
      await db.insert(discoveryTags).values({
        category: tag.category,
        name: tag.name,
        slug: tag.slug,
        isSensitive: tag.isSensitive ?? false,
        description: null,
      }).onConflictDoNothing();
      created++;
    } catch {}
  }
  console.log(`Seeded ${created} discovery tags`);

  const allTags = await db.select().from(discoveryTags);
  const allBooks = await db.select().from(catalogBooks);

  const tagMap = new Map<string, Map<string, number>>();
  for (const t of allTags) {
    if (!tagMap.has(t.category)) tagMap.set(t.category, new Map());
    tagMap.get(t.category)!.set(t.slug, t.id);
  }

  let tagged = 0;
  for (const book of allBooks) {
    const genreSlugs = (book.categories || []).map((c: string) => c.toLowerCase().replace(/\s+/g, "-"));
    for (const gs of genreSlugs) {
      const id = tagMap.get("GENRE")?.get(gs) || tagMap.get("SUBGENRE")?.get(gs);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }

    const tropeSlugs = [...(book.tropes || []), ...(book.communityTropes || [])];
    for (const ts of tropeSlugs) {
      const slug = ts.toLowerCase().replace(/\s+/g, "-");
      const id = tagMap.get("TROPE")?.get(slug) || tagMap.get("ROMANCE_TROPE")?.get(slug);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }

    const moodSlugs = [...(book.moodTags || []), ...(book.communityMoodTags || [])];
    for (const ms of moodSlugs) {
      const slug = ms.toLowerCase().replace(/\s+/g, "-");
      const id = tagMap.get("VIBE")?.get(slug);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }

    if (book.mood) {
      const slug = book.mood.toLowerCase().replace(/\s+/g, "-");
      const id = tagMap.get("VIBE")?.get(slug);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }

    if (book.pace) {
      const slug = book.pace.toLowerCase().replace(/\s+/g, "-");
      const id = tagMap.get("PACING")?.get(slug);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }

    const cwSlugs = (book.contentWarnings || []);
    for (const cw of cwSlugs) {
      const slug = cw.toLowerCase().replace(/\s+/g, "-");
      const id = tagMap.get("CONTENT")?.get(slug);
      if (id) { try { await db.insert(bookDiscoveryTags).values({ bookId: book.id, tagId: id }).onConflictDoNothing(); tagged++; } catch {} }
    }
  }

  console.log(`Auto-tagged ${tagged} book-tag links from existing catalog data`);
}
