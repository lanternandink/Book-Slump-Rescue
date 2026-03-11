import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api, errorSchemas } from "@shared/routes";
import { z } from "zod";
import { QuizAnswers, GENRE_QUERIES, type ImportResult, insertUserBookSchema, BOOK_STATUSES, insertBookSubmissionSchema, insertShopProductSchema, insertChildProfileSchema, insertChildReadingLogSchema, insertChildReadingGoalSchema, insertChildChallengeSchema, featuredPicks, insertFeaturedPickSchema, feedReactions, feedComments, feedReports, affiliateClicks, activityEvents, summerChallenges, springChallenges, userBadges, readingStreaks, insertIndieSpotlightSchema, insertIndieSpotlightRequestSchema, insertInterviewRequestSchema, discoveryTags, bookDiscoveryTags, catalogBooks, insertDiscoveryTagSchema, TAG_CATEGORIES, PLACEMENT_PRICING_TIERS, PLACEMENT_TYPES, getPlacementPrice, adRequests, AD_REQUEST_STATUSES, userBooks, readingListItems, clubMeetings, clubMeetingRsvps, clubMembers, mediaKitSubscriptions, insertCommunityEventSchema, arcClaims, indieSpotlights, authorBooks, authorProfiles, dailyIndieBooks } from "@shared/schema";
import { bulkImportBooks, searchGoogleBooks, deriveTags, deriveMoodTags, deriveRomanceLevel, deriveTone, deriveTropes, deriveContentWarnings, deriveSpiceLevel, deriveDarknessLevel } from "./googleBooks";
import { buildSearchQueries, NONFICTION_CATEGORIES } from "./queryBuilder";
import { setupAuth, registerAuthRoutes, isAuthenticated, isOwner } from "./replit_integrations/auth";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { PDFDocument, rgb, degrees, StandardFonts } from "pdf-lib";
import { createStripeLink, getAmountForItem } from "../utils/stripeHelper.js";
import { sendNewsletter } from "../utils/emailHelper.js";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { ObjectStorageService } from "./replit_integrations/object_storage";
import { authStorage } from "./replit_integrations/auth/storage";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sql, eq, and, desc, asc, gte, inArray, count as drizzleCount, lt, ilike, or, isNull, isNotNull, lte } from "drizzle-orm";
import { db } from "./db";

// Rate limiters for different endpoint types
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: "Too many search requests, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const arcActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many ARC actions, please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});

const arcPublicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { message: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});

const formSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many submissions, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiCache = new Map<string, { data: any; expires: number }>();
const MAX_CACHE_ENTRIES = 500;

function evictExpiredCache() {
  const now = Date.now();
  for (const [key, val] of apiCache) {
    if (val.expires < now) apiCache.delete(key);
  }
}

function invalidateCachePrefix(prefix: string) {
  for (const key of apiCache.keys()) {
    if (key.startsWith(prefix)) apiCache.delete(key);
  }
}

function cacheMiddleware(ttlSeconds: number) {
  return (req: any, res: any, next: any) => {
    const key = req.originalUrl;
    const cached = apiCache.get(key);
    if (cached && cached.expires > Date.now()) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", `public, max-age=${ttlSeconds}`);
      return res.json(cached.data);
    }
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        if (apiCache.size >= MAX_CACHE_ENTRIES) evictExpiredCache();
        if (apiCache.size < MAX_CACHE_ENTRIES) {
          apiCache.set(key, { data: body, expires: Date.now() + ttlSeconds * 1000 });
        }
      }
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", res.statusCode < 300 ? `public, max-age=${ttlSeconds}` : "no-store");
      return originalJson(body);
    };
    next();
  };
}

function isBotRequest(req: any): boolean {
  if (req.body?.website || req.body?._hp_field || req.body?.url_confirm) {
    return true;
  }

  const ua = (req.headers["user-agent"] || "").toLowerCase();
  if (!ua || ua.length < 10) return true;
  const botPatterns = ["bot", "crawl", "spider", "scraper", "curl", "wget", "python-requests", "go-http", "java/", "libwww"];
  if (botPatterns.some(p => ua.includes(p))) return true;

  return false;
}

function rejectBots(req: any, res: any, next: any) {
  if (isBotRequest(req)) {
    return res.status(200).json({ success: true });
  }
  next();
}

async function isAdminAuthorized(req: any): Promise<boolean> {
  const adminKey = req.headers["x-admin-key"] || req.body?.adminKey;
  if (process.env.ADMIN_KEY && adminKey === process.env.ADMIN_KEY) {
    return true;
  }
  const user = req.user as any;
  if (user?.claims?.sub) {
    if (isOwner(user.claims.sub)) return true;
    const dbUser = await authStorage.getUser(user.claims.sub);
    if (dbUser?.isAdmin) return true;
  }
  return false;
}

function getDisplayName(req: any): string {
  const claims = req.user?.claims;
  if (!claims) return "Unknown";
  return claims.first_name
    ? `${claims.first_name} ${claims.last_name || ""}`.trim()
    : "Anonymous";
}

async function getEffectiveDisplayName(req: any): Promise<string> {
  const userId = req.user?.claims?.sub;
  if (!userId) return getDisplayName(req);
  try {
    const user = await authStorage.getUser(userId);
    if (user?.displayName) return user.displayName;
    if (user?.firstName) {
      return user.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user.firstName;
    }
  } catch {}
  return getDisplayName(req);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);
  
  app.get("/.well-known/assetlinks.json", (_req, res) => {
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.bookslumprescue.app",
          sha256_cert_fingerprints: [
            "0B:FD:C5:25:1E:B1:3D:D3:74:A7:A4:7D:E1:35:9B:DA:DC:8D:85:66:F8:16:23:9E:FD:9C:95:B5:95:42:78:25"
          ],
        },
      },
    ]);
  });

  app.get("/.well-known/apple-app-site-association", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache");
    res.json({
      applinks: {
        apps: [],
        details: [
          {
            appIDs: [`${process.env.APPLE_TEAM_ID || "TEAMID"}.com.bookslumprescue.app`],
            components: [
              { "/": "*", comment: "Match all paths" }
            ],
          },
        ],
      },
      webcredentials: {
        apps: [`${process.env.APPLE_TEAM_ID || "TEAMID"}.com.bookslumprescue.app`],
      },
    });
  });

  function computePlacementEndDate(startDate: Date | string, durationDays: number): Date {
    const start = new Date(startDate);
    return new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
  }

  function computeExtendedEndDate(currentEndDate: Date | null, currentDuration: number, additionalDays: number) {
    const currentEnd = currentEndDate ? new Date(currentEndDate) : new Date();
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    return {
      endDate: new Date(baseDate.getTime() + additionalDays * 24 * 60 * 60 * 1000),
      durationDays: currentDuration + additionalDays,
    };
  }

  // Apply rate limiting to all API routes (must be before route definitions)
  app.use("/api/", generalLimiter);
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);
  
  // Track pending upload paths per user to prevent arbitrary objectPath injection
  const pendingUploads = new Map<string, { objectPath: string; expiresAt: number }>();

  // Periodically evict expired pendingUploads entries to prevent unbounded memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [uid, entry] of pendingUploads) {
      if (entry.expiresAt < now) pendingUploads.delete(uid);
    }
  }, 10 * 60 * 1000);
  
  // Profile photo upload endpoint
  const objectStorageService = new ObjectStorageService();
  
  app.post("/api/profile/photo/request-url", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      pendingUploads.set(userId, { objectPath, expiresAt: Date.now() + 15 * 60 * 1000 });
      
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error generating profile photo upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });
  
  app.post("/api/profile/photo/confirm", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const { objectPath } = req.body;
      if (!objectPath) {
        return res.status(400).json({ message: "Missing objectPath" });
      }
      
      const pending = pendingUploads.get(userId);
      if (!pending || pending.objectPath !== objectPath || pending.expiresAt < Date.now()) {
        pendingUploads.delete(userId);
        return res.status(403).json({ message: "Invalid or expired upload. Please try again." });
      }
      pendingUploads.delete(userId);
      
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectPath,
        { owner: userId, visibility: "public" }
      );
      
      await authStorage.upsertUser({
        id: userId,
        profileImageUrl: normalizedPath,
      });
      
      res.json({ profileImageUrl: normalizedPath });
    } catch (error) {
      console.error("Error confirming profile photo:", error);
      res.status(500).json({ message: "Failed to update profile photo" });
    }
  });
  
  const profileUpdateSchema = z.object({
    displayName: z.string().max(100).nullable().optional(),
    bio: z.string().max(500).nullable().optional(),
    favoriteGenres: z.array(z.string().max(50)).max(20).optional(),
    currentlyReading: z.string().max(200).nullable().optional(),
    isProfilePublic: z.boolean().optional(),
  });

  app.delete("/api/user/account", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { confirmation } = req.body || {};
      if (confirmation !== "DELETE_MY_ACCOUNT") {
        return res.status(400).json({ message: "Please provide the confirmation text 'DELETE_MY_ACCOUNT' to proceed." });
      }
      await storage.deleteUserAccount(userId);
      res.json({ message: "Account and all associated data have been permanently deleted." });
    } catch (err) {
      console.error("Delete account error:", err);
      res.status(500).json({ message: "Failed to delete account. Please try again or contact support." });
    }
  });

  app.patch("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const parsed = profileUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid profile data", errors: parsed.error.flatten() });
      }
      
      const data = parsed.data;
      const updates: any = {};
      if (data.displayName !== undefined) updates.displayName = data.displayName?.trim() || null;
      if (data.bio !== undefined) updates.bio = data.bio?.trim() || null;
      if (data.favoriteGenres !== undefined) updates.favoriteGenres = data.favoriteGenres;
      if (data.currentlyReading !== undefined) updates.currentlyReading = data.currentlyReading?.trim() || null;
      if (data.isProfilePublic !== undefined) updates.isProfilePublic = data.isProfilePublic;
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      await authStorage.upsertUser({ id: userId, ...updates });
      const updatedUser = await authStorage.getUser(userId);
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Apply stricter limits to search endpoints
  app.use("/api/books/search", searchLimiter);
  app.use("/api/catalog/search", searchLimiter);
  
  // Legacy books endpoint (for backwards compatibility)
  app.get(api.books.list.path, async (req, res) => {
    const books = await storage.getAllBooks();
    res.json(books.map(enrichLegacyBook));
  });

  // Dynamic book search endpoint - queries Google Books based on quiz answers
  // MUST be registered BEFORE /api/books/:id to prevent route shadowing
  app.get("/api/books/search", async (req, res) => {
    try {
      const toArray = (val: any): string[] => {
        if (Array.isArray(val)) return val as string[];
        if (typeof val === "string") return val.split(",");
        return [];
      };
      const answers: any = {};
      if (req.query.genres) answers.genres = toArray(req.query.genres);
      if (req.query.fictionType) answers.fictionType = req.query.fictionType;
      if (req.query.ageGroup) answers.ageGroup = req.query.ageGroup;
      if (req.query.mood) answers.mood = toArray(req.query.mood);
      if (req.query.readingGoal) answers.readingGoal = toArray(req.query.readingGoal);
      if (req.query.nonfictionCategory) answers.nonfictionCategory = toArray(req.query.nonfictionCategory);
      
      const queries = buildSearchQueries(answers);
      const allBooks = await fetchBooksFromQueries(queries);
      
      res.json({
        source: "google_books_api",
        queriesUsed: queries.slice(0, 4).map(q => q.query),
        totalResults: allBooks.length,
        books: allBooks.slice(0, 40).map(formatCatalogBook),
      });
    } catch (err) {
      console.error("Dynamic search error:", err);
      res.status(500).json({ message: "Search failed", error: String(err) });
    }
  });

  app.post("/api/books/search", async (req, res) => {
    try {
      const answers = api.recommendations.create.input.parse(req.body);
      const queries = buildSearchQueries(answers);
      const allBooks = await fetchBooksFromQueries(queries);
      
      res.json({
        source: "google_books_api",
        queriesUsed: queries.slice(0, 4).map(q => q.query),
        totalResults: allBooks.length,
        books: allBooks.slice(0, 40).map(formatCatalogBook),
      });
    } catch (err) {
      console.error("Dynamic search error:", err);
      res.status(500).json({ message: "Search failed", error: String(err) });
    }
  });

  app.get(api.books.get.path, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(404).json({ message: "Invalid ID" });
    }
    const book = await storage.getBook(id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json(enrichLegacyBook(book));
  });

  // Catalog endpoints
  app.get("/api/catalog", cacheMiddleware(120), async (req, res) => {
    const books = await storage.getCatalogBooks();
    res.json(books);
  });

  app.get("/api/catalog/count", async (req, res) => {
    const count = await storage.getCatalogBookCount();
    res.json({ count });
  });

  app.get("/api/catalog/:id", cacheMiddleware(300), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid book ID" });
      const book = await storage.getCatalogBook(id);
      if (!book) return res.status(404).json({ message: "Book not found" });

      const tags = await storage.getBookTags(id);
      res.json({ ...book, discoveryTags: tags });
    } catch (err) {
      console.error("Get catalog book error:", err);
      res.status(500).json({ message: "Failed to load book" });
    }
  });

  app.get("/api/discover/tags", cacheMiddleware(300), async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const tags = await storage.getDiscoveryTags(category);
      res.json(tags);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.post("/api/discover/search", async (req, res) => {
    try {
      const {
        q = "",
        includeTags = [],
        excludeTags = [],
        yearFrom,
        yearTo,
        pagesFrom,
        pagesTo,
        spiceFrom,
        spiceTo,
        sort = "newest",
        page = 1,
        pageSize = 24,
      } = req.body;

      const offset = (Math.max(1, page) - 1) * pageSize;
      const limit = Math.min(pageSize, 100);

      const conditions: any[] = [];

      if (q && q.trim()) {
        const searchTerm = `%${q.trim().toLowerCase()}%`;
        conditions.push(
          or(
            ilike(catalogBooks.title, searchTerm),
            sql`EXISTS (SELECT 1 FROM unnest(${catalogBooks.authors}) AS a WHERE lower(a) LIKE ${searchTerm})`
          )
        );
      }

      if (yearFrom) {
        conditions.push(sql`${catalogBooks.publishedDate} >= ${String(yearFrom)}`);
      }
      if (yearTo) {
        conditions.push(sql`${catalogBooks.publishedDate} <= ${String(yearTo) + "-12-31"}`);
      }
      if (pagesFrom) {
        conditions.push(sql`${catalogBooks.pageCount} >= ${pagesFrom}`);
      }
      if (pagesTo) {
        conditions.push(sql`${catalogBooks.pageCount} <= ${pagesTo}`);
      }
      if (spiceFrom) {
        conditions.push(sql`${catalogBooks.spiceLevel} >= ${spiceFrom}`);
      }
      if (spiceTo) {
        conditions.push(sql`${catalogBooks.spiceLevel} <= ${spiceTo}`);
      }

      if (includeTags.length > 0) {
        for (const tagId of includeTags) {
          conditions.push(
            sql`EXISTS (SELECT 1 FROM book_discovery_tags bdt WHERE bdt.book_id = ${catalogBooks.id} AND bdt.tag_id = ${tagId})`
          );
        }
      }

      if (excludeTags.length > 0) {
        conditions.push(
          sql`NOT EXISTS (SELECT 1 FROM book_discovery_tags bdt WHERE bdt.book_id = ${catalogBooks.id} AND bdt.tag_id = ANY(${excludeTags}))`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      let orderBy;
      switch (sort) {
        case "title": orderBy = [asc(catalogBooks.title)]; break;
        case "oldest": orderBy = [asc(catalogBooks.publishedDate)]; break;
        case "pages_asc": orderBy = [asc(catalogBooks.pageCount)]; break;
        case "pages_desc": orderBy = [desc(catalogBooks.pageCount)]; break;
        default: orderBy = [desc(catalogBooks.importedAt)]; break;
      }

      const [countResult] = await db
        .select({ total: drizzleCount() })
        .from(catalogBooks)
        .where(whereClause);

      const totalResults = countResult?.total ?? 0;

      const results = await db
        .select()
        .from(catalogBooks)
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset);

      const baseConditions: any[] = [];
      if (q && q.trim()) {
        const st = `%${q.trim().toLowerCase()}%`;
        baseConditions.push(
          or(
            ilike(catalogBooks.title, st),
            sql`EXISTS (SELECT 1 FROM unnest(${catalogBooks.authors}) AS a WHERE lower(a) LIKE ${st})`
          )
        );
      }
      if (yearFrom) baseConditions.push(sql`${catalogBooks.publishedDate} >= ${String(yearFrom)}`);
      if (yearTo) baseConditions.push(sql`${catalogBooks.publishedDate} <= ${String(yearTo) + "-12-31"}`);
      if (pagesFrom) baseConditions.push(sql`${catalogBooks.pageCount} >= ${pagesFrom}`);
      if (pagesTo) baseConditions.push(sql`${catalogBooks.pageCount} <= ${pagesTo}`);
      if (spiceFrom) baseConditions.push(sql`${catalogBooks.spiceLevel} >= ${spiceFrom}`);
      if (spiceTo) baseConditions.push(sql`${catalogBooks.spiceLevel} <= ${spiceTo}`);
      if (excludeTags.length > 0) {
        baseConditions.push(
          sql`NOT EXISTS (SELECT 1 FROM book_discovery_tags bdt2 WHERE bdt2.book_id = ${catalogBooks.id} AND bdt2.tag_id = ANY(${excludeTags}))`
        );
      }

      const facetWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

      const facetRows = await db
        .select({
          tagId: discoveryTags.id,
          category: discoveryTags.category,
          name: discoveryTags.name,
          slug: discoveryTags.slug,
          isSensitive: discoveryTags.isSensitive,
          bookCount: drizzleCount(),
        })
        .from(bookDiscoveryTags)
        .innerJoin(discoveryTags, eq(bookDiscoveryTags.tagId, discoveryTags.id))
        .innerJoin(catalogBooks, eq(bookDiscoveryTags.bookId, catalogBooks.id))
        .where(facetWhere)
        .groupBy(discoveryTags.id, discoveryTags.category, discoveryTags.name, discoveryTags.slug, discoveryTags.isSensitive);

      const facets: Record<string, Array<{ id: number; name: string; slug: string; count: number; isSensitive: boolean }>> = {};
      for (const row of facetRows) {
        if (!facets[row.category]) facets[row.category] = [];
        facets[row.category].push({
          id: row.tagId,
          name: row.name,
          slug: row.slug,
          count: Number(row.bookCount),
          isSensitive: row.isSensitive,
        });
      }

      res.json({
        results,
        facets,
        totalResults,
        page,
        totalPages: Math.ceil(totalResults / limit),
      });
    } catch (err: any) {
      console.error("Discover search error:", err);
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get("/api/discover/book/:bookId/tags", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const tags = await storage.getBookTags(bookId);
      res.json(tags);
    } catch (err) {
      res.status(500).json({ message: "Failed to get book tags" });
    }
  });

  app.get("/api/user/filter-presets", isAuthenticated, async (req: any, res) => {
    try {
      const presets = await storage.getUserFilterPresets(req.user.id);
      res.json(presets);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch presets" });
    }
  });

  app.post("/api/user/filter-presets", isAuthenticated, async (req: any, res) => {
    try {
      const { name, includeTags = [], excludeTags = [], filters = {} } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ message: "Name is required" });
      const preset = await storage.createFilterPreset({
        userId: req.user.id,
        name: name.trim(),
        includeTags,
        excludeTags,
        filters,
      });
      res.json(preset);
    } catch (err) {
      res.status(500).json({ message: "Failed to save preset" });
    }
  });

  app.delete("/api/user/filter-presets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFilterPreset(id, req.user.id);
      if (!deleted) return res.status(404).json({ message: "Preset not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete preset" });
    }
  });

  app.post("/api/admin/discover/tag-book", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
    try {
      const { bookId, tagId } = req.body;
      if (!bookId || !tagId) return res.status(400).json({ message: "bookId and tagId required" });
      const result = await storage.tagBook(bookId, tagId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to tag book" });
    }
  });

  app.post("/api/admin/discover/untag-book", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
    try {
      const { bookId, tagId } = req.body;
      if (!bookId || !tagId) return res.status(400).json({ message: "bookId and tagId required" });
      const result = await storage.untagBook(bookId, tagId);
      res.json({ success: result });
    } catch (err) {
      res.status(500).json({ message: "Failed to untag book" });
    }
  });

  app.post("/api/admin/discover/seed-tags", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
    try {
      const SEED_TAGS: Array<{ category: string; name: string; slug: string; isSensitive?: boolean; description?: string }> = [
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

      let created = 0;
      let skipped = 0;
      for (const tag of SEED_TAGS) {
        try {
          await storage.createDiscoveryTag({
            category: tag.category,
            name: tag.name,
            slug: tag.slug,
            isSensitive: tag.isSensitive ?? false,
            description: tag.description ?? null,
          });
          created++;
        } catch {
          skipped++;
        }
      }

      const allTags = await storage.getDiscoveryTags();
      const allBooks = await storage.getCatalogBooks();
      let tagged = 0;

      const tagMap = new Map<string, Map<string, number>>();
      for (const t of allTags) {
        if (!tagMap.has(t.category)) tagMap.set(t.category, new Map());
        tagMap.get(t.category)!.set(t.slug, t.id);
      }

      for (const book of allBooks) {
        const genreSlugs = (book.categories || []).map((c: string) => c.toLowerCase().replace(/\s+/g, "-"));
        for (const gs of genreSlugs) {
          const id = tagMap.get("GENRE")?.get(gs) || tagMap.get("SUBGENRE")?.get(gs);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }

        const tropeSlugs = [...(book.tropes || []), ...(book.communityTropes || [])];
        for (const ts of tropeSlugs) {
          const slug = ts.toLowerCase().replace(/\s+/g, "-");
          const id = tagMap.get("TROPE")?.get(slug) || tagMap.get("ROMANCE_TROPE")?.get(slug);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }

        const moodSlugs = [...(book.moodTags || []), ...(book.communityMoodTags || [])];
        for (const ms of moodSlugs) {
          const slug = ms.toLowerCase().replace(/\s+/g, "-");
          const id = tagMap.get("VIBE")?.get(slug);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }

        if (book.mood) {
          const slug = book.mood.toLowerCase().replace(/\s+/g, "-");
          const id = tagMap.get("VIBE")?.get(slug);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }

        if (book.pace) {
          const slug = book.pace.toLowerCase().replace(/\s+/g, "-");
          const id = tagMap.get("PACING")?.get(slug);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }

        const cwSlugs = (book.contentWarnings || []);
        for (const cw of cwSlugs) {
          const slug = cw.toLowerCase().replace(/\s+/g, "-");
          const id = tagMap.get("CONTENT")?.get(slug);
          if (id) { try { await storage.tagBook(book.id, id); tagged++; } catch {} }
        }
      }

      res.json({ message: "Seed complete", created, skipped, autoTagged: tagged, totalTags: allTags.length + created });
    } catch (err: any) {
      console.error("Seed tags error:", err);
      res.status(500).json({ message: "Failed to seed tags" });
    }
  });

  app.post("/api/admin/discover/create-tag", isAuthenticated, async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
    try {
      const parsed = insertDiscoveryTagSchema.parse(req.body);
      const tag = await storage.createDiscoveryTag(parsed);
      res.json(tag);
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ message: "Tag already exists" });
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  app.post("/api/catalog/:id/tag-suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const catalogBookId = parseInt(req.params.id);
      const { category, tagValue, action } = req.body;
      if (!category || !tagValue) {
        return res.status(400).json({ message: "category and tagValue are required" });
      }
      const validCategories = ["tropes", "moodTags", "contentWarnings", "tags"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const existing = await storage.getUserTagSuggestions(req.user.id, catalogBookId);
      if (existing.some(s => s.category === category && s.tagValue === tagValue)) {
        return res.status(409).json({ message: "You already suggested this tag" });
      }
      const suggestion = await storage.createBookTagSuggestion({
        catalogBookId,
        userId: req.user.id,
        category,
        tagValue: tagValue.trim().toLowerCase(),
        action: action || "add",
      });
      res.json(suggestion);
    } catch (err) {
      console.error("Tag suggestion error:", err);
      res.status(500).json({ message: "Failed to submit tag suggestion" });
    }
  });

  app.get("/api/catalog/:id/tag-suggestions", async (req, res) => {
    try {
      const catalogBookId = parseInt(req.params.id);
      const suggestions = await storage.getBookTagSuggestions(catalogBookId);
      res.json(suggestions);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tag suggestions" });
    }
  });

  app.get("/api/catalog/:id/community-tags", async (req, res) => {
    try {
      const catalogBookId = parseInt(req.params.id);
      const approved = await storage.getApprovedCommunityTags(catalogBookId);
      res.json(approved);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch community tags" });
    }
  });

  // Nonfiction categories endpoint
  app.get("/api/nonfiction-categories", cacheMiddleware(3600), (req, res) => {
    res.json(NONFICTION_CATEGORIES);
  });

  // Quick book search for adding books to library
  app.get("/api/book-search", cacheMiddleware(120), async (req, res) => {
    try {
      const query = req.query.q as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
      
      if (!query || query.length < 2) {
        return res.json({ books: [] });
      }
      
      const books = await searchGoogleBooks(query, limit);
      res.json({ books });
    } catch (err) {
      console.error("Book search error:", err);
      res.json({ books: [] });
    }
  });

  // Fetch book cover from Google Books by title and author
  app.get("/api/book-cover", cacheMiddleware(600), async (req, res) => {
    try {
      const title = req.query.title as string;
      const author = req.query.author as string;
      
      if (!title || !author) {
        return res.status(400).json({ message: "title and author are required" });
      }
      
      const query = `intitle:${title} inauthor:${author}`;
      const books = await searchGoogleBooks(query, 1);
      
      if (books.length > 0 && books[0].coverUrl) {
        res.json({ coverUrl: books[0].coverUrl });
      } else {
        res.json({ coverUrl: null });
      }
    } catch (err) {
      console.error("Cover fetch error:", err);
      res.status(500).json({ message: "Failed to fetch cover" });
    }
  });

  app.post("/api/admin/import", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get optional parameters
    const { 
      genres = Object.keys(GENRE_QUERIES), 
      queriesPerGenre = 2,
      maxResultsPerQuery = 40 
    } = req.body || {};
    
    try {
      // Build query list
      const queries: string[] = [];
      for (const genre of genres) {
        const genreQueries = GENRE_QUERIES[genre as keyof typeof GENRE_QUERIES];
        if (genreQueries) {
          // Take first N queries from each genre
          queries.push(...genreQueries.slice(0, queriesPerGenre));
        }
      }
      
      console.log(`Starting import with ${queries.length} queries...`);
      
      const result = await bulkImportBooks(queries, {
        getCatalogBookByIsbn13: storage.getCatalogBookByIsbn13.bind(storage),
        getCatalogBookByTitleAuthor: storage.getCatalogBookByTitleAuthor.bind(storage),
        createCatalogBook: storage.createCatalogBook.bind(storage),
        getCatalogBookCount: storage.getCatalogBookCount.bind(storage),
      });
      
      const totalInCatalog = await storage.getCatalogBookCount();
      
      const importResult: ImportResult = {
        totalInCatalog,
        booksAdded: result.added,
        duplicatesSkipped: result.skipped,
        errors: result.errors.slice(0, 10), // Limit error output
      };
      
      console.log(`Import complete: ${result.added} added, ${result.skipped} skipped`);
      
      res.json(importResult);
    } catch (err) {
      console.error("Import error:", err);
      res.status(500).json({ message: "Import failed", error: String(err) });
    }
  });

  app.post("/api/admin/import-quick", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Use a smaller subset for quick imports
      const allGenres = Object.keys(GENRE_QUERIES);
      // Rotate through genres based on current count
      const currentCount = await storage.getCatalogBookCount();
      const startIndex = Math.floor(currentCount / 50) % allGenres.length;
      const selectedGenres = [
        allGenres[startIndex],
        allGenres[(startIndex + 1) % allGenres.length],
      ];
      
      const queries: string[] = [];
      for (const genre of selectedGenres) {
        const genreQueries = GENRE_QUERIES[genre as keyof typeof GENRE_QUERIES];
        if (genreQueries) {
          // Use different queries based on run number
          const queryOffset = Math.floor(currentCount / 100) % genreQueries.length;
          queries.push(genreQueries[(queryOffset) % genreQueries.length]);
          queries.push(genreQueries[(queryOffset + 1) % genreQueries.length]);
        }
      }
      
      console.log(`Quick import with queries: ${queries.join(", ")}`);
      
      const result = await bulkImportBooks(queries, {
        getCatalogBookByIsbn13: storage.getCatalogBookByIsbn13.bind(storage),
        getCatalogBookByTitleAuthor: storage.getCatalogBookByTitleAuthor.bind(storage),
        createCatalogBook: storage.createCatalogBook.bind(storage),
        getCatalogBookCount: storage.getCatalogBookCount.bind(storage),
      });
      
      const totalInCatalog = await storage.getCatalogBookCount();
      
      res.json({
        totalInCatalog,
        booksAdded: result.added,
        duplicatesSkipped: result.skipped,
        errors: result.errors.slice(0, 5),
      });
    } catch (err) {
      console.error("Quick import error:", err);
      res.status(500).json({ message: "Import failed", error: String(err) });
    }
  });

  // =====================
  // USER LIBRARY ENDPOINTS (protected)
  // =====================

  // Get user's library
  app.get("/api/user/books", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const books = await storage.getUserBooks(userId);
      res.json(books);
    } catch (err) {
      console.error("Error fetching user books:", err);
      res.status(500).json({ message: "Failed to fetch library" });
    }
  });

  // Get user reading stats
  app.get("/api/user/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (err) {
      console.error("Error fetching user stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Get a random "want to read" book for quick pick feature
  app.get("/api/user/tbr-pick", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const books = await storage.getUserBooks(userId);
      
      // Filter for want_to_read status books
      const tbrBooks = books.filter(book => book.status === "want_to_read");
      
      if (tbrBooks.length === 0) {
        return res.status(404).json({ message: "No books found" });
      }
      
      // Pick a random book
      const randomIndex = Math.floor(Math.random() * tbrBooks.length);
      const pickedBook = tbrBooks[randomIndex];
      
      res.json(pickedBook);
    } catch (err) {
      console.error("Error fetching TBR pick:", err);
      res.status(500).json({ message: "Failed to fetch TBR pick" });
    }
  });

  // Add book to library
  app.post("/api/user/books", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const { bookTitle, bookAuthor, bookCoverUrl, catalogBookId, googleBooksId, status, rating, review, pageCount } = req.body;
      
      if (!bookTitle || typeof bookTitle !== "string") {
        return res.status(400).json({ message: "bookTitle is required" });
      }
      if (status && !BOOK_STATUSES.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      if (rating !== undefined && (typeof rating !== "number" || rating < 1 || rating > 5)) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      
      // Check for duplicate
      const existing = await storage.getUserBookByTitle(userId, bookTitle);
      if (existing) {
        return res.status(409).json({ message: "Book already in library", book: existing });
      }
      
      const effectiveStatus = status || "want_to_read";
      const today = new Date().toISOString().split("T")[0];
      const book = await storage.createUserBook({
        userId,
        bookTitle,
        bookAuthor: bookAuthor || "Unknown Author",
        bookCoverUrl: bookCoverUrl || null,
        catalogBookId: catalogBookId || null,
        googleBooksId: googleBooksId || null,
        status: effectiveStatus,
        rating: rating || null,
        review: review || null,
        pageCount: pageCount || null,
        dateStarted: effectiveStatus === "currently_reading" || effectiveStatus === "finished" ? today : null,
        dateFinished: effectiveStatus === "finished" ? today : null,
      });

      try {
        if (effectiveStatus === "finished") {
          const currentYear = new Date().getFullYear();
          const challenge = await storage.getUserChallenge(userId, currentYear);
          if (challenge) {
            const currentBooksRead = challenge.booksRead || [];
            if (!currentBooksRead.includes(bookTitle)) {
              await storage.updateUserChallenge(challenge.id, {
                booksRead: [...currentBooksRead, bookTitle],
              });
            }
          }
          await storage.createActivityEvent({
            userId,
            type: "finished_book",
            metadata: JSON.stringify({ bookTitle, bookAuthor: bookAuthor || "Unknown Author", bookCoverUrl: bookCoverUrl || null }),
          });
        } else if (effectiveStatus === "currently_reading") {
          await storage.createActivityEvent({
            userId,
            type: "started_book",
            metadata: JSON.stringify({ bookTitle, bookAuthor: bookAuthor || "Unknown Author", bookCoverUrl: bookCoverUrl || null }),
          });
        }

        const streak = await storage.getReadingStreak(userId);
        if (streak) {
          const today = new Date().toISOString().split("T")[0];
          if (streak.lastReadDate !== today) {
            const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
            const newCurrent = streak.lastReadDate === yesterday ? (streak.currentStreak || 0) + 1 : 1;
            const newLongest = Math.max(newCurrent, streak.longestStreak || 0);
            await storage.updateReadingStreak(streak.id, {
              currentStreak: newCurrent,
              longestStreak: newLongest,
              lastReadDate: today,
            });
          }
        } else {
          await storage.createReadingStreak({
            userId,
            currentStreak: 1,
            longestStreak: 1,
            lastReadDate: new Date().toISOString().split("T")[0],
          });
        }
      } catch (sideEffectErr) {
        console.log("Quick add side effects skipped:", sideEffectErr);
      }

      res.status(201).json(book);
    } catch (err) {
      console.error("Error adding book:", err);
      res.status(500).json({ message: "Failed to add book" });
    }
  });

  // Update book in library (status, rating, review, etc.)
  app.patch("/api/user/books/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.id as string);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      
      // Verify ownership
      const existing = await storage.getUserBook(bookId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      // Validate update fields
      const { status, rating, review, currentPage, dateStarted, dateFinished, isOwned, format, dnfReason, dnfStopPoint, isSpoiler, notes } = req.body;
      const updates: any = {};
      
      if (status !== undefined) {
        if (!BOOK_STATUSES.includes(status)) {
          return res.status(400).json({ message: "Invalid status value" });
        }
        updates.status = status;
        const todayStr = new Date().toISOString().split("T")[0];
        if (status === "finished" && !existing.dateFinished && dateFinished === undefined) {
          updates.dateFinished = todayStr;
        }
        if (status === "currently_reading" && !existing.dateStarted && dateStarted === undefined) {
          updates.dateStarted = todayStr;
        }
        if (status === "finished" && !existing.dateStarted && dateStarted === undefined) {
          updates.dateStarted = existing.dateStarted || todayStr;
        }
      }
      
      if (rating !== undefined) {
        if (rating !== null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
          return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        updates.rating = rating;
      }
      
      if (review !== undefined) updates.review = review;
      if (currentPage !== undefined) updates.currentPage = currentPage;
      if (dateStarted !== undefined) updates.dateStarted = dateStarted;
      if (dateFinished !== undefined) updates.dateFinished = dateFinished;
      if (isOwned !== undefined) updates.isOwned = Boolean(isOwned);
      if (format !== undefined) updates.format = format;
      if (dnfReason !== undefined) updates.dnfReason = dnfReason;
      if (dnfStopPoint !== undefined) updates.dnfStopPoint = dnfStopPoint;
      if (isSpoiler !== undefined) updates.isSpoiler = Boolean(isSpoiler);
      if (notes !== undefined) updates.notes = notes;
      
      const updated = await storage.updateUserBook(bookId, updates);
      
      if (status !== undefined) {
        try {
          const currentYear = new Date().getFullYear();
          const challenge = await storage.getUserChallenge(userId, currentYear);
          if (challenge) {
            const currentBooksRead = challenge.booksRead || [];
            const bookTitle = existing.bookTitle;
            const isInChallenge = currentBooksRead.includes(bookTitle);
            
            if (status === "finished" && !isInChallenge) {
              await storage.updateUserChallenge(challenge.id, {
                booksRead: [...currentBooksRead, bookTitle],
              });
            } else if (status !== "finished" && isInChallenge) {
              await storage.updateUserChallenge(challenge.id, {
                booksRead: currentBooksRead.filter((t: string) => t !== bookTitle),
              });
            }
          }
        } catch (challengeErr) {
          console.log("Challenge auto-update skipped:", challengeErr);
        }
      }
      
      res.json(updated);
    } catch (err) {
      console.error("Error updating book:", err);
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  // Delete book from library
  app.delete("/api/user/books/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.id as string);
      
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      
      // Verify ownership - SECURITY: ensure user can only delete their own books
      const existing = await storage.getUserBook(bookId);
      if (!existing) {
        return res.status(404).json({ message: "Book not found" });
      }
      if (existing.userId !== userId) {
        // Don't reveal that the book exists for other users
        return res.status(404).json({ message: "Book not found" });
      }
      
      await storage.deleteUserBook(bookId);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting book:", err);
      res.status(500).json({ message: "Failed to delete book" });
    }
  });

  // Sync library data: backfill missing dates on finished/reading books and sync challenge
  app.post("/api/user/library-sync", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const books = await storage.getUserBooks(userId);
      let fixedCount = 0;

      for (const book of books) {
        const updates: any = {};
        if (book.status === "finished" && !book.dateFinished) {
          const fallbackDate = book.dateAdded
            ? new Date(book.dateAdded).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          updates.dateFinished = fallbackDate;
          if (!book.dateStarted) updates.dateStarted = fallbackDate;
          fixedCount++;
        } else if (book.status === "currently_reading" && !book.dateStarted) {
          const fallbackDate = book.dateAdded
            ? new Date(book.dateAdded).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          updates.dateStarted = fallbackDate;
          fixedCount++;
        }
        if (Object.keys(updates).length > 0) {
          await storage.updateUserBook(book.id, updates);
        }
      }

      const currentYear = new Date().getFullYear();
      const challenge = await storage.getUserChallenge(userId, currentYear);
      if (challenge) {
        const updatedBooks = await storage.getUserBooks(userId);
        const finishedThisYear = updatedBooks.filter(b => {
          if (b.status !== "finished") return false;
          const finishDate = b.dateFinished || (b.dateAdded ? new Date(b.dateAdded).toISOString().split("T")[0] : null);
          return finishDate && finishDate.startsWith(currentYear.toString());
        });
        const finishedTitles = finishedThisYear.map(b => b.bookTitle);
        await storage.updateUserChallenge(challenge.id, { booksRead: finishedTitles });
      }

      res.json({ message: "Library synced", fixedCount });
    } catch (err) {
      console.error("Error syncing library:", err);
      res.status(500).json({ message: "Failed to sync library" });
    }
  });

  // ==================== USER CHALLENGE ENDPOINTS ====================
  
  // Get current year's challenge
  app.get("/api/user/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      const challenge = await storage.getUserChallenge(userId, year);
      res.json(challenge || null);
    } catch (err) {
      console.error("Error fetching challenge:", err);
      res.status(500).json({ message: "Failed to fetch challenge" });
    }
  });

  // Create or update challenge
  app.post("/api/user/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { goal, year } = req.body;
      const targetYear = year || new Date().getFullYear();
      
      if (!goal || typeof goal !== "number" || goal < 1 || goal > 500) {
        return res.status(400).json({ message: "Goal must be between 1 and 500" });
      }
      
      // Check if challenge exists for this year
      const existing = await storage.getUserChallenge(userId, targetYear);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateUserChallenge(existing.id, { goal });
        res.json(updated);
      } else {
        // Create new
        const challenge = await storage.createUserChallenge({
          userId,
          year: targetYear,
          goal,
          booksRead: [],
        });
        res.status(201).json(challenge);
      }
    } catch (err) {
      console.error("Error creating challenge:", err);
      res.status(500).json({ message: "Failed to create challenge" });
    }
  });

  // Update challenge (add/remove book, update goal)
  app.patch("/api/user/challenge/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = parseInt(req.params.id as string);
      
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      // Verify ownership by checking user's challenges
      const year = new Date().getFullYear();
      const existing = await storage.getUserChallenge(userId, year);
      
      if (!existing || existing.id !== challengeId) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const { goal, booksRead } = req.body;
      const updates: any = {};
      
      if (goal !== undefined) {
        if (typeof goal !== "number" || goal < 1 || goal > 500) {
          return res.status(400).json({ message: "Goal must be between 1 and 500" });
        }
        updates.goal = goal;
      }
      
      if (booksRead !== undefined) {
        if (!Array.isArray(booksRead)) {
          return res.status(400).json({ message: "booksRead must be an array" });
        }
        updates.booksRead = booksRead;
      }
      
      const updated = await storage.updateUserChallenge(challengeId, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating challenge:", err);
      res.status(500).json({ message: "Failed to update challenge" });
    }
  });

  // Delete challenge
  app.delete("/api/user/challenge/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const challengeId = parseInt(req.params.id as string);
      
      if (isNaN(challengeId)) {
        return res.status(400).json({ message: "Invalid challenge ID" });
      }
      
      // Verify ownership
      const year = new Date().getFullYear();
      const existing = await storage.getUserChallenge(userId, year);
      
      if (!existing || existing.id !== challengeId) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      await storage.deleteUserChallenge(challengeId);
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting challenge:", err);
      res.status(500).json({ message: "Failed to delete challenge" });
    }
  });

  app.get("/api/user/summer-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year as string) || 2026;
      const [challenge] = await db.select().from(summerChallenges)
        .where(and(eq(summerChallenges.userId, userId), eq(summerChallenges.year, year)));
      res.json(challenge || null);
    } catch (err) {
      console.error("Error fetching summer challenge:", err);
      res.status(500).json({ message: "Failed to fetch summer challenge" });
    }
  });

  app.post("/api/user/summer-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = 2026;
      const [existing] = await db.select().from(summerChallenges)
        .where(and(eq(summerChallenges.userId, userId), eq(summerChallenges.year, year)));
      if (existing) return res.status(400).json({ message: "Already joined" });
      const [challenge] = await db.insert(summerChallenges).values({ userId, year }).returning();
      res.status(201).json(challenge);
    } catch (err) {
      console.error("Error joining summer challenge:", err);
      res.status(500).json({ message: "Failed to join summer challenge" });
    }
  });

  app.patch("/api/user/summer-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updateSchema = z.object({
        completedSquares: z.array(z.string()).optional(),
        booksLogged: z.array(z.string()).optional(),
        tierReached: z.number().int().min(0).max(4).optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data" });

      const [existing] = await db.select().from(summerChallenges)
        .where(and(eq(summerChallenges.userId, userId), eq(summerChallenges.year, 2026)));
      if (!existing) return res.status(404).json({ message: "Not enrolled" });

      const updates: any = { updatedAt: new Date() };
      if (parsed.data.completedSquares) updates.completedSquares = parsed.data.completedSquares;
      if (parsed.data.booksLogged) updates.booksLogged = parsed.data.booksLogged;
      if (parsed.data.tierReached !== undefined) updates.tierReached = parsed.data.tierReached;

      const [updated] = await db.update(summerChallenges)
        .set(updates)
        .where(eq(summerChallenges.id, existing.id))
        .returning();
      res.json(updated);
    } catch (err) {
      console.error("Error updating summer challenge:", err);
      res.status(500).json({ message: "Failed to update summer challenge" });
    }
  });

  // Spring Reading Bloom Challenge
  app.get("/api/user/spring-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = parseInt(req.query.year as string) || 2026;
      const [challenge] = await db.select().from(springChallenges)
        .where(and(eq(springChallenges.userId, userId), eq(springChallenges.year, year)));
      res.json(challenge || null);
    } catch (err) {
      console.error("Error fetching spring challenge:", err);
      res.status(500).json({ message: "Failed to fetch spring challenge" });
    }
  });

  app.post("/api/user/spring-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = 2026;
      const [existing] = await db.select().from(springChallenges)
        .where(and(eq(springChallenges.userId, userId), eq(springChallenges.year, year)));
      if (existing) return res.status(400).json({ message: "Already joined" });
      const [challenge] = await db.insert(springChallenges).values({ userId, year }).returning();
      res.status(201).json(challenge);
    } catch (err) {
      console.error("Error joining spring challenge:", err);
      res.status(500).json({ message: "Failed to join spring challenge" });
    }
  });

  const CHALLENGE_WINDOWS = {
    spring2026: { from: new Date("2026-03-10T00:00:00Z"), to: new Date("2026-04-15T23:59:59Z") },
    summer2026: { from: new Date("2026-05-15T00:00:00Z"), to: new Date("2026-06-15T23:59:59Z") },
  };

  function isChallengeOpen(windowKey: keyof typeof CHALLENGE_WINDOWS): boolean {
    const now = new Date();
    const w = CHALLENGE_WINDOWS[windowKey];
    return now >= w.from && now <= w.to;
  }

  async function awardBadge(userId: string, opts: { badgeKey: string; badgeName: string; badgeDescription: string; badgeIcon: string; editionYear?: number; category: string; activeFrom?: Date; activeTo?: Date }) {
    const conditions = [eq(userBadges.userId, userId), eq(userBadges.badgeKey, opts.badgeKey)];
    if (opts.editionYear) conditions.push(eq(userBadges.editionYear, opts.editionYear));
    const [existing] = await db.select().from(userBadges).where(and(...conditions));
    if (existing) return existing;
    const [badge] = await db.insert(userBadges).values({
      userId,
      badgeName: opts.badgeName,
      badgeDescription: opts.badgeDescription,
      badgeIcon: opts.badgeIcon,
      badgeKey: opts.badgeKey,
      editionYear: opts.editionYear || null,
      category: opts.category,
      activeFrom: opts.activeFrom || null,
      activeTo: opts.activeTo || null,
      isShareable: true,
    }).returning();
    return badge;
  }

  app.patch("/api/user/spring-challenge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!isChallengeOpen("spring2026")) {
        return res.status(403).json({ message: "Challenge window closed (Mar 15 – Apr 15, 2026)" });
      }
      const updateSchema = z.object({
        completedPrompts: z.array(z.string()).optional(),
        booksLogged: z.array(z.string()).optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid data" });

      const [existing] = await db.select().from(springChallenges)
        .where(and(eq(springChallenges.userId, userId), eq(springChallenges.year, 2026)));
      if (!existing) return res.status(404).json({ message: "Not enrolled" });

      const updates: any = { updatedAt: new Date() };
      if (parsed.data.completedPrompts) updates.completedPrompts = parsed.data.completedPrompts;
      if (parsed.data.booksLogged) updates.booksLogged = parsed.data.booksLogged;

      const [updated] = await db.update(springChallenges)
        .set(updates)
        .where(eq(springChallenges.id, existing.id))
        .returning();

      if (updated.completedPrompts.length >= 12) {
        await awardBadge(userId, {
          badgeKey: "spring-bloom",
          badgeName: "Spring Bloom 2026",
          badgeDescription: "Completed the Spring Reading Bloom Challenge (Mar 15–Apr 15, 2026)",
          badgeIcon: "flower",
          editionYear: 2026,
          category: "challenge",
          activeFrom: CHALLENGE_WINDOWS.spring2026.from,
          activeTo: CHALLENGE_WINDOWS.spring2026.to,
        });
      }

      res.json(updated);
    } catch (err) {
      console.error("Error updating spring challenge:", err);
      res.status(500).json({ message: "Failed to update spring challenge" });
    }
  });

  // Summer challenge routes (reuses summerChallenges table)
  app.get("/api/user/summer-challenge-status", isAuthenticated, async (req: any, res) => {
    try {
      res.json({ isOpen: isChallengeOpen("summer2026"), window: CHALLENGE_WINDOWS.summer2026 });
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // Badge award on summer challenge completion (12 bingo squares)
  app.post("/api/user/summer-challenge/check-badge", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [summer] = await db.select().from(summerChallenges)
        .where(and(eq(summerChallenges.userId, userId), eq(summerChallenges.year, 2026)));
      if (!summer || (summer.completedSquares?.length || 0) < 12) {
        return res.json({ awarded: false });
      }
      const badge = await awardBadge(userId, {
        badgeKey: "summer-escape",
        badgeName: "Summer Escape 2026",
        badgeDescription: "Completed the Summer Reading Escape Challenge (May 15–Jun 15, 2026)",
        badgeIcon: "sun",
        editionYear: 2026,
        category: "challenge",
        activeFrom: CHALLENGE_WINDOWS.summer2026.from,
        activeTo: CHALLENGE_WINDOWS.summer2026.to,
      });
      res.json({ awarded: true, badge });
    } catch (err) {
      console.error("Error checking summer badge:", err);
      res.status(500).json({ message: "Failed" });
    }
  });

  // Milestone badge definitions
  const MILESTONE_BADGE_DEFS: Record<string, { name: string; description: string; icon: string }> = {
    "first-book": { name: "First Book!", description: "Finished your first book", icon: "book" },
    "5-books": { name: "5 Books", description: "Finished 5 books", icon: "book" },
    "10-books": { name: "10 Books", description: "Finished 10 books", icon: "trophy" },
    "25-books": { name: "25 Books", description: "Finished 25 books", icon: "trophy" },
    "50-books": { name: "50 Books", description: "Finished 50 books", icon: "star" },
    "100-books": { name: "100 Books", description: "Finished 100 books", icon: "sparkles" },
    "first-dnf": { name: "First DNF", description: "DNF'd your first book", icon: "book" },
    "7-day-streak": { name: "7-Day Streak", description: "7 consecutive days of reading activity", icon: "sparkles" },
    "30-day-streak": { name: "30-Day Streak", description: "30 consecutive days of reading activity", icon: "sparkles" },
    "first-review": { name: "First Review", description: "Wrote your first book review", icon: "book" },
    "bookworm": { name: "Bookworm", description: "A dedicated reader", icon: "book" },
  };

  // User Badges (unified: milestones + challenges)
  app.get("/api/user/badges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;

      // Sync milestone badges from readingStreaks
      const [streak] = await db.select().from(readingStreaks).where(eq(readingStreaks.userId, userId));
      if (streak?.earnedBadges) {
        for (const key of streak.earnedBadges) {
          const def = MILESTONE_BADGE_DEFS[key];
          if (def) {
            await awardBadge(userId, {
              badgeKey: key,
              badgeName: def.name,
              badgeDescription: def.description,
              badgeIcon: def.icon,
              category: "milestone",
            });
          }
        }
      }

      // Also compute milestone badges from stats
      const stats = streak || { totalBooksFinished: 0, currentStreak: 0, longestStreak: 0, totalDnf: 0 };
      const milestoneChecks: [boolean, string][] = [
        [(stats.totalBooksFinished || 0) >= 1, "first-book"],
        [(stats.totalBooksFinished || 0) >= 5, "5-books"],
        [(stats.totalBooksFinished || 0) >= 10, "10-books"],
        [(stats.totalBooksFinished || 0) >= 25, "25-books"],
        [(stats.totalBooksFinished || 0) >= 50, "50-books"],
        [(stats.totalBooksFinished || 0) >= 100, "100-books"],
        [(stats.totalDnf || 0) >= 1, "first-dnf"],
        [(stats.longestStreak || 0) >= 7, "7-day-streak"],
        [(stats.longestStreak || 0) >= 30, "30-day-streak"],
      ];
      for (const [met, key] of milestoneChecks) {
        if (met && MILESTONE_BADGE_DEFS[key]) {
          await awardBadge(userId, {
            badgeKey: key,
            badgeName: MILESTONE_BADGE_DEFS[key].name,
            badgeDescription: MILESTONE_BADGE_DEFS[key].description,
            badgeIcon: MILESTONE_BADGE_DEFS[key].icon,
            category: "milestone",
          });
        }
      }

      const badges = await db.select().from(userBadges)
        .where(eq(userBadges.userId, userId))
        .orderBy(userBadges.earnedAt);
      res.json(badges);
    } catch (err) {
      console.error("Error fetching badges:", err);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Public badge page by userId
  app.get("/api/badges/public/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const badges = await db.select().from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.isShareable, true)))
        .orderBy(userBadges.earnedAt);
      res.json({ badges });
    } catch (err) {
      console.error("Error fetching public badges:", err);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Simple in-memory cache for similar books results
  const similarBooksCache = new Map<string, { data: any; timestamp: number }>();
  const SIMILAR_CACHE_TTL = 60 * 60 * 1000; // 1 hour

  // "Books Like This" endpoint - find similar books using Google Books API
  app.get("/api/similar", cacheMiddleware(180), async (req, res) => {
    try {
      const { author, title, limit = "10" } = req.query;
      const resultLimit = Math.min(parseInt(limit as string) || 10, 15);
      
      if (!title && !author) {
        return res.json({ 
          message: "Please provide a title or author to search.",
          books: [] 
        });
      }
      
      // Check cache first
      const cacheKey = `${title || ''}-${author || ''}`.toLowerCase();
      const cached = similarBooksCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < SIMILAR_CACHE_TTL) {
        console.log("Returning cached similar books result");
        return res.json(cached.data);
      }
      
      // Step 1: Find the reference book from Google Books
      const searchQuery = title ? `intitle:${title}` : `inauthor:${author}`;
      const referenceResults = await searchGoogleBooks(searchQuery, 5);
      
      if (referenceResults.length === 0) {
        return res.json({ 
          message: "We're experiencing high demand. Please try again in a few minutes, or try a more specific title.",
          books: [] 
        });
      }
      
      const referenceBook = referenceResults[0];
      
      // Step 2: Build queries to find similar books
      const similarQueries: string[] = [];
      
      // Search by same author
      if (referenceBook.authors && referenceBook.authors.length > 0) {
        similarQueries.push(`inauthor:"${referenceBook.authors[0]}"`);
      }
      
      // Search by genre/category if available
      if ((referenceBook as any).primaryGenre) {
        similarQueries.push(`subject:${(referenceBook as any).primaryGenre}`);
      }
      
      // Search by subgenre for more specificity
      if ((referenceBook as any).subgenres && (referenceBook as any).subgenres.length > 0) {
        similarQueries.push(`subject:${(referenceBook as any).subgenres[0]}`);
      }
      
      // Step 3: Fetch similar books from multiple queries
      const seenIds = new Set<string>();
      seenIds.add(referenceBook.sourceId); // Exclude the reference book
      
      let similarBooks: any[] = [];
      
      for (const query of similarQueries) {
        if (similarBooks.length >= resultLimit * 2) break;
        
        try {
          const books = await searchGoogleBooks(query, 20);
          for (const book of books) {
            if (!seenIds.has(book.sourceId) && book.title !== referenceBook.title) {
              seenIds.add(book.sourceId);
              similarBooks.push(book);
            }
          }
        } catch (err) {
          console.log(`Similar query "${query}" failed:`, err);
        }
      }
      
      // Step 4: Score and rank by similarity to reference book
      const scoredBooks = similarBooks
        .map(book => ({
          book,
          score: calculateBookSimilarity(referenceBook as any, book as any)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, resultLimit);
      
      const result = {
        referenceBook: formatCatalogBook(referenceBook as any),
        books: scoredBooks.map(item => formatCatalogBook(item.book as any)),
      };
      
      // Cache the result
      similarBooksCache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      res.json(result);
    } catch (err) {
      console.error("Similar books error:", err);
      res.status(500).json({ message: "Error finding similar books. Please try again later." });
    }
  });

  // Updated recommendations - uses dynamic Google Books API first, then cached catalog, then legacy
  app.post(api.recommendations.create.path, async (req, res) => {
    try {
      const answers = api.recommendations.create.input.parse(req.body);
      // Default to 20 results for more variety (expanded catalog experience)
      const resultCount = answers.resultCount || 20;
      
      // ALWAYS MERGE from all sources for maximum variety
      // Philosophy: More books = better discovery. Deduplicate by title, not by source.
      let allRecommendations: any[] = [];
      const seenTitles = new Set<string>();
      
      // STEP 1: Primary source - Dynamic Google Books API
      try {
        const queries = buildSearchQueries(answers);
        console.log(`Recommendations: querying Google Books with ${queries.length} queries`);
        const dynamicBooks = await fetchBooksFromQueries(queries);
        
        if (dynamicBooks.length > 0) {
          // Score with lightweight function - trust API results
          const dynamicRecs = scoreDynamicBooks(dynamicBooks, answers);
          for (const book of dynamicRecs) {
            const titleKey = book.title.toLowerCase();
            if (!seenTitles.has(titleKey)) {
              seenTitles.add(titleKey);
              allRecommendations.push(book);
            }
          }
          console.log(`Dynamic API returned ${dynamicRecs.length} scored results`);
        }
      } catch (apiErr) {
        console.log("Google Books API error:", apiErr);
      }
      
      // STEP 2: ALWAYS add from cached catalog (merge, don't replace)
      const catalogBooks = await storage.getCatalogBooks();
      if (catalogBooks.length > 0) {
        const enrichedCatalog = catalogBooks.map(enrichCatalogBook);
        const catalogRecs = scoreCatalogBooks(enrichedCatalog, answers);
        for (const book of catalogRecs) {
          const titleKey = book.title.toLowerCase();
          if (!seenTitles.has(titleKey)) {
            seenTitles.add(titleKey);
            allRecommendations.push(book);
          }
        }
        console.log(`Added ${catalogBooks.length} cached books to mix`);
      }
      
      // STEP 3: ALWAYS add from legacy books (merge for variety)
      const legacyBooks = await storage.getAllBooks();
      if (legacyBooks.length > 0) {
        const enrichedLegacy = legacyBooks.map(enrichLegacyBook);
        const legacyRecs = scoreLegacyBooks(enrichedLegacy, answers);
        for (const book of legacyRecs) {
          const titleKey = book.title.toLowerCase();
          if (!seenTitles.has(titleKey)) {
            seenTitles.add(titleKey);
            allRecommendations.push(book);
          }
        }
      }
      
      if (allRecommendations.length === 0) {
        return res.status(200).json({ 
          message: "No recommendations found. Try adjusting your filters.",
          books: [] 
        });
      }
      
      // Sort by score (preserved as _score), with cover images as tiebreaker
      allRecommendations.sort((a: any, b: any) => {
        const scoreDiff = (b._score || 0) - (a._score || 0);
        if (scoreDiff !== 0) return scoreDiff;
        const aHasCover = a.coverUrl ? 1 : 0;
        const bHasCover = b.coverUrl ? 1 : 0;
        return bHasCover - aHasCover;
      });
      
      console.log(`Returning ${Math.min(allRecommendations.length, resultCount)} recommendations`);
      res.json(allRecommendations.slice(0, resultCount));
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      } else {
        console.error("Recommendations error:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  // Book Slump Rescue Mode recommendation endpoint
  const rescueRecommendSchema = z.object({
    rescueModeId: z.string(),
    quizAnswers: z.object({
      slumpLevel: z.string().optional(),
      readingTime: z.string().optional(),
      wantedMood: z.array(z.string()).optional(),
      genres: z.array(z.string()).optional(),
      seriesOk: z.string().optional(),
    }),
    modeDefaults: z.object({
      pace: z.string().optional(),
      mood: z.array(z.string()).optional(),
      length: z.string().optional(),
      genres: z.array(z.string()).optional(),
      standalone: z.boolean().optional(),
      maxDarkness: z.number().optional(),
      wantKindleUnlimited: z.boolean().optional(),
      recentlyPopular: z.boolean().optional(),
      diverseVoices: z.boolean().optional(),
    }).optional(),
    searchBoosts: z.array(z.string()).optional(),
  });

  app.post("/api/rescue/recommend", searchLimiter, async (req, res) => {
    try {
      const parsed = rescueRecommendSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid rescue request", errors: parsed.error.flatten() });
      }

      const { rescueModeId, quizAnswers, modeDefaults = {}, searchBoosts = [] } = parsed.data;

      // Cache rescue results for 5 minutes — same mode+answers produce identical results
      const rescueCacheKey = `rescue:${rescueModeId}:${JSON.stringify(quizAnswers)}`;
      const cached = apiCache.get(rescueCacheKey);
      if (cached && cached.expires > Date.now()) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached.data);
      }

      // Build QuizAnswers from rescue mode defaults + quiz responses
      const answers: QuizAnswers = {
        fictionType: "fiction",
        resultCount: 15,
      };

      // Apply mode defaults
      if (modeDefaults.pace) answers.pace = modeDefaults.pace as QuizAnswers["pace"];
      if (modeDefaults.mood) answers.mood = modeDefaults.mood as QuizAnswers["mood"];
      if (modeDefaults.length) answers.length = modeDefaults.length as QuizAnswers["length"];
      if (modeDefaults.genres) answers.genres = modeDefaults.genres;
      if (modeDefaults.standalone !== undefined) answers.standalone = modeDefaults.standalone;
      if (modeDefaults.maxDarkness !== undefined) answers.maxDarkness = modeDefaults.maxDarkness;
      if (modeDefaults.wantKindleUnlimited) answers.wantKindleUnlimited = true;
      if (modeDefaults.recentlyPopular !== undefined) answers.recentlyPopular = modeDefaults.recentlyPopular;
      if (modeDefaults.diverseVoices) answers.diverseVoices = true;

      // Override with quiz answers (user preferences take priority)
      if (quizAnswers.readingTime === "quick") { answers.length = "short"; answers.pace = "fast"; }
      else if (quizAnswers.readingTime === "weekend") { answers.length = "medium"; }
      else if (quizAnswers.readingTime === "immersive") { answers.length = "long"; }

      const moodMap: Record<string, string[]> = {
        comforting: ["happy"], excited: ["adventurous"], emotional: ["emotional"],
        amused: ["happy"], transported: ["adventurous"], "on-edge": ["scary"],
      };
      if (quizAnswers.wantedMood?.length) {
        const moods = new Set<string>();
        quizAnswers.wantedMood.forEach(m => { (moodMap[m] || []).forEach(v => moods.add(v)); });
        if (moods.size) answers.mood = Array.from(moods) as QuizAnswers["mood"];
      }

      if (quizAnswers.genres?.length) {
        if (!answers.genres?.length) answers.genres = quizAnswers.genres;
        else {
          const merged = new Set([...(answers.genres || []), ...quizAnswers.genres]);
          answers.genres = Array.from(merged);
        }
      }

      if (quizAnswers.seriesOk === "standalone") answers.standalone = true;
      else if (quizAnswers.seriesOk === "series") answers.standalone = false;

      // Fetch and score books
      const seenTitles = new Set<string>();
      let allBooks: any[] = [];

      // Use mode-specific search boosts plus standard queries
      try {
        const boostQueries = (searchBoosts || []).map(q => ({ query: q, weight: 2 }));
        const standardQueries = buildSearchQueries(answers);
        const allQueries = [...boostQueries, ...standardQueries.slice(0, 4)];
        const fetched = await fetchBooksFromQueries(allQueries);
        const scored = scoreDynamicBooks(fetched, answers);
        for (const book of scored) {
          const key = book.title.toLowerCase();
          if (!seenTitles.has(key)) { seenTitles.add(key); allBooks.push(book); }
        }
      } catch (apiErr) {
        console.log("Rescue API fetch error:", apiErr);
      }

      // Supplement from catalog if needed
      if (allBooks.length < 6) {
        try {
          const catalogBooksList = await storage.getCatalogBooks();
          const enriched = catalogBooksList.map(enrichCatalogBook);
          const scored = scoreCatalogBooks(enriched, answers);
          for (const book of scored) {
            const key = book.title.toLowerCase();
            if (!seenTitles.has(key)) { seenTitles.add(key); allBooks.push(book); }
          }
        } catch (dbErr) {
          console.log("Rescue catalog fallback error:", dbErr);
        }
      }

      // Add "whyItFits" explanation for each book
      const whyTemplates: Record<string, string[]> = {
        "hooked-fast": [
          "Fast-paced and gripping — you'll be hooked before the end of chapter one.",
          "High-octane storytelling that pulls you straight out of any slump.",
          "Can't-stop-reading energy from the very first page.",
          "The kind of book you pick up meaning to read one chapter and finish at 2am.",
          "Instant momentum — this one doesn't give you a chance to lose interest.",
          "Sharp, propulsive, and exactly what your reading streak needs right now.",
        ],
        "cozy-reset": [
          "The reading equivalent of a warm blanket — comforting and restorative.",
          "Gentle, feel-good storytelling that reminds you why you love books.",
          "Low stakes, high warmth. Exactly what a slump needs.",
          "A story that wraps around you — no stress, no pressure, just a good read.",
          "Unhurried and heartfelt. A true cozy reset for your reading life.",
          "The kind of book you finish with a quiet smile. Slump dissolved.",
        ],
        "easy-win": [
          "Short enough to finish in a few sittings — a perfect confidence-rebuilder.",
          "Compact, complete, and deeply satisfying. Easy win guaranteed.",
          "Under 250 pages of pure reading momentum.",
          "Start it today, finish it this weekend. You've got this.",
          "A quick, fulfilling read that proves your reading mojo is still very much there.",
          "Short, sharp, and satisfying — exactly the kind of win your reading list needs.",
        ],
        "one-sitting": [
          "Written to be devoured in one go. Perfect for a reading marathon day.",
          "Compact, propulsive, and made for reading without stopping.",
          "Short enough that you'll finish it before bedtime — slump over.",
          "Block out your afternoon. You won't want to put this one down.",
          "Reads in a single sitting and leaves you feeling like a champion.",
          "The perfect candidate for your next couch-and-no-plans afternoon.",
        ],
        "romantic-escape": [
          "A swoony, feel-good romance that makes reading feel like a treat again.",
          "Emotionally engaging love story — hard to put down, impossible to forget.",
          "The kind of book that makes your heart race in the best possible way.",
          "Charming, warm, and guaranteed to remind you what all the fuss about reading is.",
          "A love story built for slump-breaking — all the butterflies, none of the frustration.",
          "Romance done right. This one will have you grinning at your phone.",
        ],
        "fantasy-reboot": [
          "A rich fantasy world that makes you forget real life exists.",
          "Immersive, magical, and packed with the kind of wonder that reignites your love of reading.",
          "Transports you completely. The best kind of escape.",
          "The kind of world-building that makes you want to cancel all plans and just read.",
          "Epic, enchanting, and impossible to stay slumped through.",
          "Once you're in this world, real life can wait.",
        ],
        "thriller-fix": [
          "Taut, twisty, and impossible to pause. Slump-proof thriller energy.",
          "The kind of suspense that locks you in until the very last page.",
          "A mystery that keeps you guessing and keeps you reading.",
          "Grips you from the first chapter and doesn't let go until the final reveal.",
          "Perfectly calibrated tension — your heart rate will do the rest.",
          "The kind of thriller that makes you suspicious of everyone, including the narrator.",
        ],
        "indie-rescue": [
          "A literary gem that flies under the radar but sticks with you long after.",
          "The kind of book you press into everyone's hands. A real find.",
          "Quietly brilliant. Exactly what indie fiction does best.",
          "Under-the-radar doesn't mean under-quality — this one punches well above its weight.",
          "The sort of discovery that makes you feel like a dedicated reader all over again.",
          "Thoughtful, original, and exactly what the bestseller lists are missing.",
        ],
        "kindle-unlimited": [
          "Available on Kindle Unlimited — start reading in the next 30 seconds.",
          "KU gem that you can dive into right now, for free.",
          "Already in your subscription and absolutely worth your time.",
          "No extra charge, no waiting — just open your app and start reading.",
          "A KU title worth every minute of your subscription.",
          "Tap, download, read. Your slump doesn't stand a chance.",
        ],
      };
      const modeTemplates = whyTemplates[rescueModeId] || [
        "A great pick to get you back into reading.",
        "This one has the energy to break any slump.",
        "Chosen specifically to match your reading mood right now.",
        "Exactly the kind of book that turns 'maybe later' into 'just one more chapter.'",
        "A solid match for where you are right now as a reader.",
        "Let this one be the book that gets you back in the habit.",
      ];

      const results = allBooks.slice(0, 6).map((book, i) => ({
        ...book,
        whyItFits: modeTemplates[i % modeTemplates.length],
      }));

      // Store in cache
      if (apiCache.size >= MAX_CACHE_ENTRIES) evictExpiredCache();
      if (apiCache.size < MAX_CACHE_ENTRIES) {
        apiCache.set(rescueCacheKey, { data: results, expires: Date.now() + 5 * 60 * 1000 });
      }

      res.json(results);
    } catch (err) {
      console.error("Rescue recommend error:", err);
      res.status(500).json({ message: "Failed to get rescue recommendations" });
    }
  });

  // Newsletter subscription endpoint
  const emailSchema = z.object({
    email: z.string().email("Valid email address required"),
  });
  
  app.post("/api/newsletter/subscribe", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = emailSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Valid email address required" });
      }
      const { email } = parsed.data;
      
      const existing = await storage.getNewsletterSubscriberByEmail(email);
      if (existing) {
        return res.status(200).json({ message: "Already subscribed", subscriber: existing });
      }
      
      const subscriber = await storage.createNewsletterSubscriber({ email, isActive: true });
      res.status(201).json({ message: "Successfully subscribed!", subscriber });
    } catch (err) {
      console.error("Newsletter subscription error:", err);
      res.status(500).json({ message: "Failed to subscribe" });
    }
  });

  // Quiz history endpoints (authenticated)
  app.post("/api/user/quiz-history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const { fictionType, selectedGenres, mood, readingGoal, recommendedBooks } = req.body;
      
      const history = await storage.createQuizHistory({
        userId,
        fictionType,
        selectedGenres: selectedGenres || [],
        mood,
        readingGoal,
        recommendedBooks: recommendedBooks || [],
      });
      
      res.status(201).json(history);
    } catch (err) {
      console.error("Quiz history error:", err);
      res.status(500).json({ message: "Failed to save quiz history" });
    }
  });

  app.get("/api/user/quiz-history", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const history = await storage.getUserQuizHistory(userId);
      res.json(history);
    } catch (err) {
      console.error("Quiz history fetch error:", err);
      res.status(500).json({ message: "Failed to fetch quiz history" });
    }
  });

  // Reading streaks endpoints (authenticated)
  app.get("/api/user/streak", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const streak = await storage.getUserStreak(userId);
      res.json(streak || { currentStreak: 0, longestStreak: 0, totalBooksFinished: 0 });
    } catch (err) {
      console.error("Streak fetch error:", err);
      res.status(500).json({ message: "Failed to fetch streak" });
    }
  });

  app.post("/api/user/streak/activity", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const today = new Date().toISOString().split("T")[0];
      const existing = await storage.getUserStreak(userId);
      
      let currentStreak = 1;
      let longestStreak = 1;
      let totalBooksFinished = (req.body.bookFinished ? 1 : 0);
      
      if (existing) {
        const lastDate = existing.lastActivityDate;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        if (lastDate === today) {
          currentStreak = existing.currentStreak || 0;
        } else if (lastDate === yesterdayStr) {
          currentStreak = (existing.currentStreak || 0) + 1;
        }
        
        longestStreak = Math.max(currentStreak, existing.longestStreak || 0);
        totalBooksFinished = (existing.totalBooksFinished || 0) + (req.body.bookFinished ? 1 : 0);
      }
      
      const streak = await storage.upsertUserStreak(userId, {
        currentStreak,
        longestStreak,
        lastActivityDate: today,
        totalBooksFinished,
      });
      
      res.json(streak);
    } catch (err) {
      console.error("Streak activity error:", err);
      res.status(500).json({ message: "Failed to update streak" });
    }
  });

  app.post("/api/user/import/goodreads", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { books, dryRun = false } = req.body;
      if (!Array.isArray(books)) {
        return res.status(400).json({ message: "Books array required" });
      }

      const batchId = dryRun ? null : `gr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const book of books) {
        try {
          if (!book.title || !book.title.trim()) { errors++; errorDetails.push(`Empty title skipped`); continue; }

          const title = book.title.trim();
          const author = (book.author || "Unknown Author").trim();
          const shelf = (book.shelf || "to-read").toLowerCase();
          const status = shelf === "read" ? "finished"
            : shelf === "currently-reading" ? "currently_reading"
            : "want_to_read";

          const rawRating = book.rating ? parseInt(book.rating) : 0;
          const rating = rawRating >= 1 && rawRating <= 5 ? rawRating : null;
          const review = book.review && book.review.trim() ? book.review.trim() : null;
          const dateFinished = book.dateRead && book.dateRead.trim() ? book.dateRead.trim() : null;
          const pageCount = book.pageCount ? parseInt(book.pageCount) : null;
          const isbn13 = book.isbn13 && book.isbn13.trim() ? book.isbn13.trim().replace(/[="]/g, "") : null;

          const existing = await storage.getUserBookByTitle(userId, title);

          if (existing) {
            if (dryRun) { skipped++; continue; }
            const updates: any = {};
            if (!existing.rating && rating) updates.rating = rating;
            if (!existing.review && review) updates.review = review;
            if (!existing.dateFinished && dateFinished) updates.dateFinished = dateFinished;
            if (!existing.pageCount && pageCount) updates.pageCount = pageCount;
            if (existing.status === "want_to_read" && status !== "want_to_read") updates.status = status;

            if (Object.keys(updates).length > 0) {
              await storage.updateUserBook(existing.id, updates);
              updated++;
            } else {
              skipped++;
            }
            continue;
          }

          if (dryRun) { created++; continue; }

          await storage.createUserBook({
            userId,
            bookTitle: title,
            bookAuthor: author,
            bookCoverUrl: null,
            status,
            rating,
            review,
            dateFinished,
            pageCount: pageCount || undefined,
            importBatchId: batchId,
          });
          created++;
        } catch (rowErr: any) {
          errors++;
          errorDetails.push(`"${book.title}": ${rowErr.message}`);
        }
      }

      res.json({
        message: dryRun
          ? `Dry run: ${created} would be created, ${updated || 0} would be updated, ${skipped} duplicates`
          : `Imported ${created} books, updated ${updated}, skipped ${skipped} duplicates`,
        created,
        updated,
        skipped,
        errors,
        errorDetails: errorDetails.slice(0, 20),
        batchId: dryRun ? null : batchId,
        dryRun,
      });
    } catch (err) {
      console.error("Goodreads import error:", err);
      res.status(500).json({ message: "Failed to import books" });
    }
  });

  app.post("/api/user/import/goodreads/rollback", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { batchId } = req.body;
      if (!batchId) return res.status(400).json({ message: "batchId required" });

      const userBooksList = await storage.getUserBooks(userId);
      const toDelete = userBooksList.filter(b => b.importBatchId === batchId);

      let deleted = 0;
      for (const book of toDelete) {
        await storage.deleteUserBook(book.id);
        deleted++;
      }

      res.json({ message: `Rolled back ${deleted} books from batch ${batchId}`, deleted });
    } catch (err) {
      console.error("Goodreads rollback error:", err);
      res.status(500).json({ message: "Failed to rollback import" });
    }
  });

  // ========== READING LISTS ENDPOINTS ==========
  app.get("/api/user/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const lists = await storage.getUserReadingLists(userId);
      res.json(lists);
    } catch (err) {
      console.error("Get lists error:", err);
      res.status(500).json({ message: "Failed to get reading lists" });
    }
  });

  app.post("/api/user/lists", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const list = await storage.createReadingList({ ...req.body, userId });
      res.status(201).json(list);
    } catch (err) {
      console.error("Create list error:", err);
      res.status(500).json({ message: "Failed to create reading list" });
    }
  });

  app.patch("/api/user/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getReadingList(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      const updated = await storage.updateReadingList(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update list error:", err);
      res.status(500).json({ message: "Failed to update reading list" });
    }
  });

  app.delete("/api/user/lists/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getReadingList(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      await storage.deleteReadingList(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete list error:", err);
      res.status(500).json({ message: "Failed to delete reading list" });
    }
  });

  app.get("/api/user/lists/:id/items", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const list = await storage.getReadingList(id);
      if (!list || list.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      const items = await storage.getReadingListItems(id);
      res.json(items);
    } catch (err) {
      console.error("Get list items error:", err);
      res.status(500).json({ message: "Failed to get list items" });
    }
  });

  app.post("/api/user/lists/:id/items", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const listId = parseInt(req.params.id as string);
      const list = await storage.getReadingList(listId);
      if (!list || list.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      const item = await storage.addReadingListItem({ ...req.body, listId });
      res.status(201).json(item);
    } catch (err) {
      console.error("Add list item error:", err);
      res.status(500).json({ message: "Failed to add item to list" });
    }
  });

  app.delete("/api/user/lists/:listId/items/:itemId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const listId = parseInt(req.params.listId as string);
      const itemId = parseInt(req.params.itemId as string);
      const list = await storage.getReadingList(listId);
      if (!list || list.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      await storage.removeReadingListItem(itemId);
      res.json({ success: true });
    } catch (err) {
      console.error("Remove list item error:", err);
      res.status(500).json({ message: "Failed to remove item from list" });
    }
  });

  app.patch("/api/user/lists/:id/reorder", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const listId = parseInt(req.params.id as string);
      const list = await storage.getReadingList(listId);
      if (!list || list.userId !== userId) {
        return res.status(404).json({ message: "List not found" });
      }
      const { itemIds } = req.body;
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: "itemIds array required" });
      }
      const existingItems = await storage.getReadingListItems(listId);
      const existingIds = new Set(existingItems.map(i => i.id));
      const validIds = itemIds.filter((id: number) => existingIds.has(id));
      if (validIds.length !== existingIds.size) {
        return res.status(400).json({ message: "itemIds must match all items in the list" });
      }
      for (let i = 0; i < validIds.length; i++) {
        await db.update(readingListItems)
          .set({ sortOrder: i })
          .where(and(eq(readingListItems.id, validIds[i]), eq(readingListItems.listId, listId)));
      }
      const items = await storage.getReadingListItems(listId);
      res.json(items);
    } catch (err) {
      console.error("Reorder list items error:", err);
      res.status(500).json({ message: "Failed to reorder items" });
    }
  });

  app.get("/api/lists/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const list = await storage.getReadingList(id);
      if (!list || !list.isPublic) {
        return res.status(404).json({ message: "List not found" });
      }
      const items = await storage.getReadingListItems(id);
      res.json({ list, items });
    } catch (err) {
      console.error("Get public list error:", err);
      res.status(500).json({ message: "Failed to get list" });
    }
  });

  // ========== BOOK QUOTES ENDPOINTS ==========
  app.get("/api/user/quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const quotes = await storage.getUserQuotes(userId);
      res.json(quotes);
    } catch (err) {
      console.error("Get quotes error:", err);
      res.status(500).json({ message: "Failed to get quotes" });
    }
  });

  app.post("/api/user/quotes", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const quote = await storage.createQuote({ ...req.body, userId });
      res.status(201).json(quote);
    } catch (err) {
      console.error("Create quote error:", err);
      res.status(500).json({ message: "Failed to save quote" });
    }
  });

  app.patch("/api/user/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getQuote(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Quote not found" });
      }
      const updated = await storage.updateQuote(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update quote error:", err);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.delete("/api/user/quotes/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getQuote(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Quote not found" });
      }
      await storage.deleteQuote(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete quote error:", err);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // ========== BOOK SERIES ENDPOINTS ==========
  app.get("/api/user/series", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const series = await storage.getUserSeries(userId);
      const seriesWithBooks = await Promise.all(
        series.map(async (s) => {
          const books = await storage.getSeriesBooks(s.id);
          return { ...s, books };
        })
      );
      res.json(seriesWithBooks);
    } catch (err) {
      console.error("Get series error:", err);
      res.status(500).json({ message: "Failed to get series" });
    }
  });

  app.post("/api/user/series", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const series = await storage.createSeries({ ...req.body, userId });
      res.status(201).json(series);
    } catch (err) {
      console.error("Create series error:", err);
      res.status(500).json({ message: "Failed to create series" });
    }
  });

  app.patch("/api/user/series/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getSeries(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Series not found" });
      }
      const updated = await storage.updateSeries(id, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update series error:", err);
      res.status(500).json({ message: "Failed to update series" });
    }
  });

  app.delete("/api/user/series/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const id = parseInt(req.params.id as string);
      const existing = await storage.getSeries(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ message: "Series not found" });
      }
      await storage.deleteSeries(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Delete series error:", err);
      res.status(500).json({ message: "Failed to delete series" });
    }
  });

  app.post("/api/user/series/:id/books", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const seriesId = parseInt(req.params.id as string);
      const series = await storage.getSeries(seriesId);
      if (!series || series.userId !== userId) {
        return res.status(404).json({ message: "Series not found" });
      }
      const book = await storage.addSeriesBook({ ...req.body, seriesId });
      res.status(201).json(book);
    } catch (err) {
      console.error("Add series book error:", err);
      res.status(500).json({ message: "Failed to add book to series" });
    }
  });

  app.patch("/api/user/series/:seriesId/books/:bookId", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const seriesId = parseInt(req.params.seriesId as string);
      const bookId = parseInt(req.params.bookId as string);
      const series = await storage.getSeries(seriesId);
      if (!series || series.userId !== userId) {
        return res.status(404).json({ message: "Series not found" });
      }
      const updated = await storage.updateSeriesBook(bookId, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Update series book error:", err);
      res.status(500).json({ message: "Failed to update series book" });
    }
  });

  // ========== EXPORT ENDPOINTS ==========
  app.get("/api/user/export", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const format = req.query.format || "json";
      const books = await storage.getUserBooks(userId);
      
      if (format === "csv") {
        const headers = ["Title", "Author", "Status", "Rating", "Review", "Date Added", "Date Finished"];
        const rows = books.map(b => [
          `"${(b.bookTitle || "").replace(/"/g, '""')}"`,
          `"${(b.bookAuthor || "").replace(/"/g, '""')}"`,
          b.status,
          b.rating || "",
          `"${(b.review || "").replace(/"/g, '""')}"`,
          b.dateAdded ? new Date(b.dateAdded).toISOString().split("T")[0] : "",
          b.dateFinished || ""
        ]);
        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=my-library.csv");
        res.send(csv);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=my-library.json");
        res.json(books);
      }
    } catch (err) {
      console.error("Export error:", err);
      res.status(500).json({ message: "Failed to export library" });
    }
  });

  // ========== AUTHOR PROFILE ENDPOINTS (authenticated) ==========
  app.get("/api/user/author-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      res.json(profile || null);
    } catch (err) {
      console.error("Get author profile error:", err);
      res.status(500).json({ message: "Failed to get author profile" });
    }
  });

  app.post("/api/user/author-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const existing = await storage.getAuthorProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Profile already exists" });
      }
      
      const { penName, bio, website, twitterHandle, instagramHandle, goodreadsUrl, amazonAuthorUrl, bookbubUrl, tiktokHandle, genres } = req.body;
      if (!penName || penName.trim().length === 0) {
        return res.status(400).json({ message: "Pen name is required" });
      }

      let slug = penName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const existingSlug = await storage.getAuthorProfileBySlug(slug);
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      
      const profileData = {
        userId,
        slug,
        penName: penName.trim(),
        bio: bio || null,
        website: website || null,
        twitterHandle: twitterHandle || null,
        instagramHandle: instagramHandle || null,
        goodreadsUrl: goodreadsUrl || null,
        amazonAuthorUrl: amazonAuthorUrl || null,
        bookbubUrl: bookbubUrl || null,
        tiktokHandle: tiktokHandle || null,
        genres: Array.isArray(genres) ? genres : [],
      };
      
      const profile = await storage.createAuthorProfile(profileData);
      res.status(201).json(profile);
    } catch (err: any) {
      console.error("Create author profile error:", err?.message || err);
      res.status(500).json({ message: "Failed to create author profile" });
    }
  });

  app.patch("/api/user/author-profile", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const { penName, bio, website, twitterHandle, instagramHandle, goodreadsUrl, amazonAuthorUrl, bookbubUrl, tiktokHandle, genres } = req.body;
      
      const updates: Record<string, any> = {};
      if (penName !== undefined) updates.penName = penName.trim();
      if (bio !== undefined) updates.bio = bio || null;
      if (website !== undefined) updates.website = website || null;
      if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle || null;
      if (instagramHandle !== undefined) updates.instagramHandle = instagramHandle || null;
      if (goodreadsUrl !== undefined) updates.goodreadsUrl = goodreadsUrl || null;
      if (amazonAuthorUrl !== undefined) updates.amazonAuthorUrl = amazonAuthorUrl || null;
      if (bookbubUrl !== undefined) updates.bookbubUrl = bookbubUrl || null;
      if (tiktokHandle !== undefined) updates.tiktokHandle = tiktokHandle || null;
      if (genres !== undefined) updates.genres = Array.isArray(genres) ? genres : [];
      updates.updatedAt = new Date();
      
      const updated = await storage.updateAuthorProfile(userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(updated);
    } catch (err: any) {
      console.error("Update author profile error:", err?.message || err);
      res.status(500).json({ message: "Failed to update author profile" });
    }
  });

  // ========== AUTHOR BOOKS ENDPOINTS (authenticated) ==========
  app.get("/api/user/author-books", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const books = await storage.getAuthorBooks(profile.id);
      res.json(books);
    } catch (err) {
      console.error("Get author books error:", err);
      res.status(500).json({ message: "Failed to get author books" });
    }
  });

  app.post("/api/user/author-books", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) return res.status(404).json({ message: "Author profile not found. Create your author profile first." });
      
      const { title } = req.body;
      if (!title || title.trim().length === 0) {
        return res.status(400).json({ message: "Book title is required" });
      }
      
      const book = await storage.createAuthorBook({ ...req.body, authorProfileId: profile.id });
      res.status(201).json(book);
    } catch (err) {
      console.error("Create author book error:", err);
      res.status(500).json({ message: "Failed to create author book" });
    }
  });

  const FREE_ARC_MAX_DOWNLOADS = 50;
  const FREE_ARC_MAX_ACTIVE = 1;
  const PAID_ARC_MAX_ACTIVE = 5;

  async function hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const [sub] = await db.select().from(mediaKitSubscriptions)
        .where(eq(mediaKitSubscriptions.userId, userId))
        .orderBy(desc(mediaKitSubscriptions.createdAt))
        .limit(1);
      if (!sub) return false;
      return sub.status === "active" && !!sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
    } catch { return false; }
  }

  app.get("/api/user/arc-limits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) return res.json({ subscribed: false, maxActive: FREE_ARC_MAX_ACTIVE, maxDownloads: FREE_ARC_MAX_DOWNLOADS, activeArcCount: 0 });
      const subscribed = await hasActiveSubscription(userId);
      const books = await storage.getAuthorBooks(profile.id);
      const activeArcCount = books.filter(b => b.arcEnabled).length;
      res.json({
        subscribed,
        maxActive: subscribed ? PAID_ARC_MAX_ACTIVE : FREE_ARC_MAX_ACTIVE,
        maxDownloads: subscribed ? null : FREE_ARC_MAX_DOWNLOADS,
        activeArcCount,
      });
    } catch (err) {
      console.error("Arc limits check error:", err);
      res.status(500).json({ message: "Failed to check ARC limits" });
    }
  });

  app.patch("/api/user/author-books/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      
      const bookId = parseInt(req.params.id as string);
      const book = await storage.getAuthorBook(bookId);
      if (!book || book.authorProfileId !== profile.id) {
        return res.status(404).json({ message: "Book not found" });
      }

      const body = { ...req.body };
      const subscribed = await hasActiveSubscription(userId);

      if (body.arcEnabled && !book.arcEnabled) {
        const allBooks = await storage.getAuthorBooks(profile.id);
        const activeArcCount = allBooks.filter(b => b.arcEnabled && b.id !== bookId).length;
        const maxActive = subscribed ? PAID_ARC_MAX_ACTIVE : FREE_ARC_MAX_ACTIVE;
        if (activeArcCount >= maxActive) {
          return res.status(403).json({
            message: subscribed
              ? `Pro plan accounts are limited to ${PAID_ARC_MAX_ACTIVE} active ARCs at a time.`
              : `Free accounts are limited to ${FREE_ARC_MAX_ACTIVE} active ARC at a time. Subscribe for up to ${PAID_ARC_MAX_ACTIVE} active ARCs.`,
            limitType: "arc_active_limit",
          });
        }
      }

      if (!subscribed && body.arcEnabled !== false) {
        if (body.arcMaxClaims !== undefined) {
          const parsed = parseInt(body.arcMaxClaims);
          if (!parsed || parsed > FREE_ARC_MAX_DOWNLOADS) {
            body.arcMaxClaims = FREE_ARC_MAX_DOWNLOADS;
          }
        }
        if (body.arcEnabled && !book.arcEnabled && !body.arcMaxClaims) {
          body.arcMaxClaims = FREE_ARC_MAX_DOWNLOADS;
        }
      }
      
      const updated = await storage.updateAuthorBook(bookId, body);
      res.json(updated);
    } catch (err) {
      console.error("Update author book error:", err);
      res.status(500).json({ message: "Failed to update author book" });
    }
  });

  app.delete("/api/user/author-books/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      
      const bookId = parseInt(req.params.id as string);
      const book = await storage.getAuthorBook(bookId);
      if (!book || book.authorProfileId !== profile.id) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      await storage.deleteAuthorBook(bookId);
      res.json({ message: "Book deleted" });
    } catch (err) {
      console.error("Delete author book error:", err);
      res.status(500).json({ message: "Failed to delete author book" });
    }
  });

  // ========== COMMUNITY DISCUSSIONS ==========

  app.get("/api/discussions", async (_req, res) => {
    try {
      const allDiscussions = await storage.getDiscussions();
      res.json(allDiscussions);
    } catch (err) {
      console.error("Get discussions error:", err);
      res.status(500).json({ message: "Failed to get discussions" });
    }
  });

  app.get("/api/discussions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const discussion = await storage.getDiscussion(id);
      if (!discussion) return res.status(404).json({ message: "Discussion not found" });
      res.json(discussion);
    } catch (err) {
      console.error("Get discussion error:", err);
      res.status(500).json({ message: "Failed to get discussion" });
    }
  });

  app.get("/api/discussions/:id/comments", async (req, res) => {
    try {
      const discussionId = parseInt(req.params.id as string);
      const comments = await storage.getDiscussionComments(discussionId);
      res.json(comments);
    } catch (err) {
      console.error("Get comments error:", err);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });

  app.post("/api/discussions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const displayName = await getEffectiveDisplayName(req);
      
      const discussion = await storage.createDiscussion({
        ...req.body,
        userId,
        authorName: displayName,
        authorRole: "member",
      });
      res.status(201).json(discussion);
    } catch (err) {
      console.error("Create discussion error:", err);
      res.status(500).json({ message: "Failed to create discussion" });
    }
  });

  app.post("/api/discussions/:id/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const discussionId = parseInt(req.params.id as string);
      const displayName = await getEffectiveDisplayName(req);
      
      const comment = await storage.createDiscussionComment({
        ...req.body,
        discussionId,
        userId,
        authorName: displayName,
        authorRole: "member",
      });
      res.status(201).json(comment);
    } catch (err) {
      console.error("Create comment error:", err);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.post("/api/admin/discussions", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const discussion = await storage.createDiscussion({
        ...req.body,
        authorRole: req.body.authorRole || "staff",
      });
      res.status(201).json(discussion);
    } catch (err) {
      console.error("Admin create discussion error:", err);
      res.status(500).json({ message: "Failed to create discussion" });
    }
  });

  app.delete("/api/discussions/:id", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.deleteDiscussion(parseInt(req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      console.error("Delete discussion error:", err);
      res.status(500).json({ message: "Failed to delete discussion" });
    }
  });

  app.delete("/api/discussions/:id/comments/:commentId", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.deleteDiscussionComment(parseInt(req.params.commentId as string));
      res.json({ success: true });
    } catch (err) {
      console.error("Delete comment error:", err);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // ========== PUBLIC AUTHOR ENDPOINTS ==========
  app.get("/api/authors", cacheMiddleware(300), async (_req, res) => {
    try {
      const profiles = await storage.getAllAuthorProfiles();
      const publicProfiles = profiles.map(p => ({
        id: p.id,
        penName: p.penName,
        slug: p.slug,
        bio: p.bio,
        genres: p.genres,
        avatarUrl: p.avatarUrl,
        isVerified: p.isVerified,
      }));
      res.json(publicProfiles);
    } catch (err) {
      console.error("Get authors error:", err);
      res.status(500).json({ message: "Failed to get authors" });
    }
  });

  app.get("/api/authors/:slugOrId", async (req, res) => {
    try {
      const param = req.params.slugOrId;
      let profile: any;
      
      const numId = parseInt(param);
      if (!isNaN(numId)) {
        profile = await storage.getAuthorProfileById(numId);
      }
      if (!profile) {
        profile = await storage.getAuthorProfileBySlug(param);
      }
      
      if (!profile) {
        return res.status(404).json({ message: "Author not found" });
      }
      
      const books = await storage.getAuthorBooks(profile.id);
      
      const publicBooks = books.map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        coverUrl: b.coverUrl,
        genres: b.genres,
        amazonUrl: b.amazonUrl,
        bookshopUrl: b.bookshopUrl,
        seriesName: b.seriesName,
        seriesNumber: b.seriesNumber,
        publishedDate: b.publishedDate,
        isUpcoming: b.isUpcoming,
        arcEnabled: b.arcEnabled,
        arcDescription: b.arcDescription,
        arcAvailable: b.arcEnabled && (!b.arcMaxClaims || (b.arcClaimCount ?? 0) < b.arcMaxClaims),
      }));
      
      res.json({
        id: profile.id,
        penName: profile.penName,
        slug: profile.slug,
        bio: profile.bio,
        website: profile.website,
        twitterHandle: profile.twitterHandle,
        instagramHandle: profile.instagramHandle,
        goodreadsUrl: profile.goodreadsUrl,
        amazonAuthorUrl: profile.amazonAuthorUrl,
        bookbubUrl: profile.bookbubUrl,
        tiktokHandle: profile.tiktokHandle,
        genres: profile.genres,
        avatarUrl: profile.avatarUrl,
        isVerified: profile.isVerified,
        books: publicBooks,
      });
    } catch (err) {
      console.error("Get author error:", err);
      res.status(500).json({ message: "Failed to get author" });
    }
  });

  // ARC claim endpoint - requires login, blocks duplicates, enforces daily limit, checks expiry, account age, blocklist
  const ARC_DAILY_LIMIT = 5;
  const ARC_ACCOUNT_AGE_HOURS = 24;
  app.post("/api/authors/:authorId/books/:bookId/claim-arc", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userName = await getEffectiveDisplayName(req);
      const authorId = parseInt(req.params.authorId as string);
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      
      if (!book || !book.arcEnabled) {
        return res.status(404).json({ message: "ARC not available for this book" });
      }
      
      if (book.authorProfileId !== authorId) {
        return res.status(404).json({ message: "Book not found for this author" });
      }

      if (book.arcExpiresAt && new Date() > new Date(book.arcExpiresAt)) {
        return res.status(410).json({ message: "This ARC offer has expired" });
      }

      const accountCreated = req.user.claims.iat ? new Date(req.user.claims.iat * 1000) : null;
      if (accountCreated) {
        const ageMs = Date.now() - accountCreated.getTime();
        const ageHours = ageMs / (1000 * 60 * 60);
        if (ageHours < ARC_ACCOUNT_AGE_HOURS) {
          return res.status(403).json({ message: "Your account must be at least 24 hours old to claim ARCs" });
        }
      }

      const isBlocked = await storage.isUserBlocked(authorId, userId);
      if (isBlocked) {
        return res.status(403).json({ message: "You are unable to claim ARCs from this author" });
      }

      const maxReached = book.arcMaxClaims && (book.arcClaimCount ?? 0) >= book.arcMaxClaims;
      if (maxReached) {
        if (book.arcWaitlistEnabled) {
          const onWaitlist = await storage.isUserOnWaitlist(bookId, userId);
          if (onWaitlist) {
            return res.status(410).json({ message: "You're already on the waitlist for this ARC", waitlisted: true });
          }
          return res.status(410).json({ message: "All copies claimed. You can join the waitlist.", waitlistAvailable: true });
        }
        return res.status(410).json({ message: "All ARC copies have been claimed" });
      }
      
      const alreadyClaimed = await storage.hasUserClaimedArc(userId, bookId);
      if (alreadyClaimed) {
        return res.status(409).json({ message: "You have already claimed this ARC" });
      }
      
      const todayClaims = await storage.getUserArcClaimsToday(userId);
      if (todayClaims >= ARC_DAILY_LIMIT) {
        return res.status(429).json({ message: `Daily limit reached. You can claim up to ${ARC_DAILY_LIMIT} ARCs per day.` });
      }

      let downloadExpiresAt: Date | null = null;
      if (book.arcDownloadExpiryHours) {
        downloadExpiresAt = new Date(Date.now() + book.arcDownloadExpiryHours * 60 * 60 * 1000);
      }
      
      await storage.incrementArcClaimCount(bookId);
      await storage.createArcClaim({
        bookId,
        authorProfileId: book.authorProfileId,
        userId,
        userDisplayName: userName,
        downloadExpiresAt,
      });
      
      const response: any = { claimed: true };
      if (book.arcDownloadUrl) {
        response.downloadUrl = book.arcDownloadUrl;
      }
      if (book.arcCouponCode) {
        response.couponCode = book.arcCouponCode;
      }
      if (downloadExpiresAt) {
        response.downloadExpiresAt = downloadExpiresAt.toISOString();
      }
      
      res.json(response);
    } catch (err) {
      console.error("Claim ARC error:", err);
      res.status(500).json({ message: "Failed to claim ARC" });
    }
  });

  // Join ARC waitlist
  app.post("/api/authors/:authorId/books/:bookId/arc-waitlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userName = await getEffectiveDisplayName(req);
      const authorId = parseInt(req.params.authorId as string);
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);

      if (!book || !book.arcEnabled || book.authorProfileId !== authorId) {
        return res.status(404).json({ message: "ARC not found" });
      }
      if (!book.arcWaitlistEnabled) {
        return res.status(400).json({ message: "Waitlist is not enabled for this ARC" });
      }
      const already = await storage.isUserOnWaitlist(bookId, userId);
      if (already) {
        return res.status(409).json({ message: "You're already on the waitlist" });
      }
      await storage.joinWaitlist({ bookId, authorProfileId: authorId, userId, userDisplayName: userName });
      res.json({ waitlisted: true });
    } catch (err) {
      console.error("Join waitlist error:", err);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });

  // Check if current user already claimed a specific ARC
  app.get("/api/authors/:authorId/books/:bookId/arc-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authorId = parseInt(req.params.authorId as string);
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      
      if (!book || book.authorProfileId !== authorId) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      const claimed = await storage.hasUserClaimedArc(userId, bookId);
      const todayClaims = await storage.getUserArcClaimsToday(userId);
      const onWaitlist = await storage.isUserOnWaitlist(bookId, userId);
      const isExpired = book.arcExpiresAt ? new Date() > new Date(book.arcExpiresAt) : false;

      let reviewReminderDue = false;
      let readingProgress = 0;
      if (claimed) {
        const claims = await storage.getArcClaimsForBook(bookId);
        const userClaim = claims.find(c => c.userId === userId);
        if (userClaim) {
          readingProgress = userClaim.readingProgress ?? 0;
          if (userClaim.claimedAt && !userClaim.reviewReminded) {
            const daysSinceClaim = (Date.now() - new Date(userClaim.claimedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceClaim >= 7) {
              reviewReminderDue = true;
            }
          }
        }
      }

      res.json({
        claimed,
        todayClaims,
        dailyLimit: ARC_DAILY_LIMIT,
        onWaitlist,
        isExpired,
        reviewReminderDue,
        readingProgress,
        waitlistEnabled: book.arcWaitlistEnabled ?? false,
      });
    } catch (err) {
      console.error("ARC status check error:", err);
      res.status(500).json({ message: "Failed to check ARC status" });
    }
  });

  // Dismiss review reminder
  app.post("/api/authors/:authorId/books/:bookId/dismiss-review-reminder", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const claims = await storage.getArcClaimsForBook(bookId);
      const userClaim = claims.find(c => c.userId === userId);
      if (userClaim) {
        await storage.updateArcClaim(userClaim.id, { reviewReminded: true });
      }
      res.json({ dismissed: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to dismiss reminder" });
    }
  });

  // Reading progress update for ARC readers
  app.patch("/api/authors/:authorId/books/:bookId/reading-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const { progress } = req.body;
      if (typeof progress !== "number" || progress < 0 || progress > 100) {
        return res.status(400).json({ message: "Progress must be between 0 and 100" });
      }
      const claims = await storage.getArcClaimsForBook(bookId);
      const userClaim = claims.find(c => c.userId === userId);
      if (!userClaim) {
        return res.status(404).json({ message: "You haven't claimed an ARC for this book" });
      }
      const updated = await storage.updateArcReadingProgress(userClaim.id, progress);
      res.json(updated);
    } catch (err) {
      console.error("Update reading progress error:", err);
      res.status(500).json({ message: "Failed to update reading progress" });
    }
  });

  // Private feedback from ARC readers to authors
  app.post("/api/authors/:authorId/books/:bookId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const authorId = parseInt(req.params.authorId as string);
      const bookId = parseInt(req.params.bookId as string);
      const { feedbackText } = req.body;
      if (!feedbackText || typeof feedbackText !== "string" || !feedbackText.trim()) {
        return res.status(400).json({ message: "Feedback text is required" });
      }
      const claimed = await storage.hasUserClaimedArc(userId, bookId);
      if (!claimed) {
        return res.status(403).json({ message: "Only ARC readers can send private feedback" });
      }
      const book = await storage.getAuthorBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      const displayName = await getEffectiveDisplayName(req);
      const feedback = await storage.createArcFeedback({
        bookId,
        authorProfileId: book.authorProfileId,
        userId,
        userDisplayName: displayName,
        feedbackText: feedbackText.trim(),
      });
      res.status(201).json(feedback);
    } catch (err) {
      console.error("Create feedback error:", err);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Author dashboard: view claims for their books
  app.get("/api/user/author-books/:bookId/claims", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "You can only view claims for your own books" });
      }
      
      const claims = await storage.getArcClaimsForBook(bookId);
      const reviews = await storage.getAuthorBookReviews(bookId);
      const reviewerIds = new Set(reviews.filter(r => r.isVerifiedArc).map(r => r.userId));
      
      const enrichedClaims = claims.map(claim => ({
        ...claim,
        hasReviewed: reviewerIds.has(claim.userId),
        readingProgress: claim.readingProgress ?? 0,
      }));
      res.json(enrichedClaims);
    } catch (err) {
      console.error("Get ARC claims error:", err);
      res.status(500).json({ message: "Failed to get ARC claims" });
    }
  });

  // Export ARC claims as CSV
  app.get("/api/user/author-books/:bookId/claims/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "You can only export claims for your own books" });
      }
      const claims = await storage.getArcClaimsForBook(bookId);
      const reviews = await storage.getAuthorBookReviews(bookId);
      const reviewerIds = new Set(reviews.filter(r => r.isVerifiedArc).map(r => r.userId));

      const csvRows = [
        ["Name", "Claimed At", "Reading Progress", "Has Reviewed", "Flagged"].join(","),
        ...claims.map(c => [
          `"${(c.userDisplayName || "Anonymous").replace(/"/g, '""')}"`,
          c.claimedAt ? new Date(c.claimedAt).toISOString() : "",
          `${c.readingProgress ?? 0}%`,
          reviewerIds.has(c.userId) ? "Yes" : "No",
          c.isFlagged ? "Yes" : "No",
        ].join(",")),
      ];
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="arc-claims-${bookId}.csv"`);
      res.send(csvRows.join("\n"));
    } catch (err) {
      console.error("Export claims error:", err);
      res.status(500).json({ message: "Failed to export claims" });
    }
  });

  // ========== ARC BLOCKED USERS ENDPOINTS ==========
  app.get("/api/user/arc-blocked-users", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const blocked = await storage.getBlockedUsers(profile.id);
      res.json(blocked);
    } catch (err) {
      res.status(500).json({ message: "Failed to get blocked users" });
    }
  });

  app.post("/api/user/arc-blocked-users", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const { blockedUserId, blockedUserName, reason } = req.body;
      if (!blockedUserId) return res.status(400).json({ message: "User ID required" });
      const already = await storage.isUserBlocked(profile.id, blockedUserId);
      if (already) return res.status(409).json({ message: "User already blocked" });
      const entry = await storage.blockUser({
        authorProfileId: profile.id,
        blockedUserId,
        blockedUserName: blockedUserName || null,
        reason: reason || null,
      });
      res.json(entry);
    } catch (err) {
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.delete("/api/user/arc-blocked-users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      await storage.unblockUser(parseInt(req.params.id as string));
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  // ========== ARC CLAIM REPORTS ENDPOINTS ==========
  app.post("/api/user/arc-claim-reports", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const { claimId, reason, details } = req.body;
      if (!claimId || !reason) return res.status(400).json({ message: "Claim ID and reason required" });
      const claim = await storage.getArcClaim(claimId);
      if (!claim || claim.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Can only report claims for your own books" });
      }
      await storage.updateArcClaim(claimId, { isFlagged: true });
      const report = await storage.createClaimReport({
        authorProfileId: profile.id,
        claimId,
        userId: claim.userId,
        reason,
        details: details || null,
      });
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  app.get("/api/user/arc-claim-reports", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const reports = await storage.getReportsForAuthor(profile.id);
      res.json(reports);
    } catch (err) {
      res.status(500).json({ message: "Failed to get reports" });
    }
  });

  // ========== ARC WAITLIST ENDPOINTS (Author view) ==========
  app.get("/api/user/author-books/:bookId/waitlist", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const waitlist = await storage.getWaitlist(bookId);
      res.json(waitlist);
    } catch (err) {
      res.status(500).json({ message: "Failed to get waitlist" });
    }
  });

  // ========== ARC SECURITY STATS ENDPOINT ==========
  app.get("/api/user/arc-security-stats", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const [stats, conversionStats] = await Promise.all([
        storage.getArcSecurityStats(profile.id),
        storage.getArcConversionStats(profile.id),
      ]);
      const allClaims = await storage.getArcClaimsForAuthor(profile.id);
      const totalProgress = allClaims.reduce((sum, c) => sum + (c.readingProgress ?? 0), 0);
      const avgProgress = allClaims.length > 0 ? Math.round(totalProgress / allClaims.length) : 0;
      res.json({
        ...stats,
        totalReviews: conversionStats.totalReviews,
        reviewConversionRate: Math.round(conversionStats.conversionRate),
        averageReadingProgress: avgProgress,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to get security stats" });
    }
  });

  // ========== ARC PIPELINE: READER DASHBOARD ==========
  app.get("/api/user/my-arcs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const claims = await storage.getUserArcClaims(userId);
      res.json(claims);
    } catch (err) {
      res.status(500).json({ message: "Failed to get your ARCs" });
    }
  });

  // Reader updates their ARC claim status (downloaded / reading / finished / reviewed)
  app.patch("/api/arc-claims/:claimId/status", isAuthenticated, arcActionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const claimId = parseInt(req.params.claimId as string);
      if (isNaN(claimId)) return res.status(400).json({ message: "Invalid claim ID" });

      const { status } = req.body as { status: string };

      const VALID_TRANSITIONS: Record<string, string> = {
        approved: "downloaded",
        downloaded: "reading",
        reading: "finished",
        finished: "reviewed",
      };

      const claim = await storage.getArcClaim(claimId);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      if (claim.userId !== userId) return res.status(403).json({ message: "Not your claim" });

      const currentStatus = claim.status || "approved";
      const expectedNext = VALID_TRANSITIONS[currentStatus];
      if (!expectedNext || status !== expectedNext) {
        return res.status(400).json({ message: `Cannot transition from '${currentStatus}' to '${status}'` });
      }
      const updated = await storage.updateArcClaimStatus(claimId, status as import("@shared/schema").ArcClaimStatus);

      if (status === "reviewed") {
        try {
          const arcBook = await storage.getAuthorBook(claim.bookId);
          const authorProfile = await storage.getAuthorProfileById(claim.authorProfileId);
          if (authorProfile) {
            await storage.createNotification({
              userId: authorProfile.userId,
              type: "arc_reviewed",
              message: `A reader has posted their review of "${arcBook?.title || "your book"}" — check your ARC dashboard.`,
              linkUrl: "/author-dashboard",
              fromUserId: userId,
              isRead: false,
            });
          }
        } catch (_) {}
      }

      let newBadge = null;
      if (status === "reviewed") {
        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(arcClaims)
          .where(and(eq(arcClaims.userId, userId), eq(arcClaims.status, "reviewed")));

        const milestones = [
          { threshold: 100, key: "arc-reader-100", name: "ARC Legend", description: "Reviewed 100 ARCs through Book Slump Rescue — you're extraordinary", icon: "medal" },
          { threshold: 50, key: "arc-reader-50", name: "ARC Devotee", description: "Reviewed 50 ARCs through Book Slump Rescue — utterly dedicated", icon: "medal" },
          { threshold: 10, key: "arc-reader-10", name: "ARC Addict", description: "Reviewed 10 ARCs through Book Slump Rescue — you're on a roll!", icon: "medal" },
          { threshold: 1, key: "arc-first-review", name: "Ink & Impressions", description: "Submitted your first ARC review through Book Slump Rescue", icon: "pen" },
        ];

        for (const m of milestones) {
          if (count >= m.threshold) {
            const [alreadyHave] = await db.select().from(userBadges)
              .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeKey, m.key)));
            if (!alreadyHave) {
              const badge = await awardBadge(userId, {
                badgeKey: m.key,
                badgeName: m.name,
                badgeDescription: m.description,
                badgeIcon: m.icon,
                category: "arc",
              });
              newBadge = badge;
              break;
            }
          }
        }
      }

      res.json({ claim: updated, newBadge });
    } catch (err) {
      res.status(500).json({ message: "Failed to update claim status" });
    }
  });

  // ========== ARC PIPELINE: SHARE TOKEN & INVITES (AUTHOR) ==========
  app.post("/api/user/author-books/:bookId/generate-share-token", isAuthenticated, arcActionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not your book" });
      }
      const token = await storage.generateArcShareToken(bookId);
      res.json({ token, url: `${req.protocol}://${req.get("host")}/arc/${token}` });
    } catch (err) {
      res.status(500).json({ message: "Failed to generate share token" });
    }
  });

  app.post("/api/user/author-books/:bookId/invite", isAuthenticated, arcActionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not your book" });
      }
      const { email, invitedUserId } = req.body as { email?: string; invitedUserId?: string };

      if (email !== undefined) {
        const emailSchema = z.string().email();
        if (!emailSchema.safeParse(email).success) {
          return res.status(400).json({ message: "Invalid email address" });
        }
      }
      if (invitedUserId !== undefined && (typeof invitedUserId !== "string" || invitedUserId.length > 128)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const shareToken = book.arcShareToken || (await storage.generateArcShareToken(bookId));
      const { randomUUID } = await import("crypto");
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const invite = await storage.createArcInvite({
        bookId,
        authorProfileId: profile.id,
        token,
        email: email || null,
        invitedUserId: invitedUserId || null,
        acceptedByUserId: null,
        expiresAt,
        usedAt: null,
      });
      const inviteUrl = `${req.protocol}://${req.get("host")}/arc/${shareToken}?invite=${token}`;
      res.json({ invite: { id: invite.id, token, expiresAt }, url: inviteUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to create invite" });
    }
  });

  app.get("/api/user/author-books/:bookId/invites", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) return res.status(400).json({ message: "Invalid book ID" });
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not your book" });
      }
      const invites = await storage.getArcInvitesForBook(bookId);
      res.json(invites);
    } catch (err) {
      res.status(500).json({ message: "Failed to get invites" });
    }
  });

  // Approve a requested ARC claim (for invite-only books)
  app.post("/api/user/arc-claims/:claimId/approve", isAuthenticated, arcActionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const claimId = parseInt(req.params.claimId as string);
      if (isNaN(claimId)) return res.status(400).json({ message: "Invalid claim ID" });
      const claim = await storage.getArcClaim(claimId);
      if (!claim) return res.status(404).json({ message: "Claim not found" });
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || claim.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not your book" });
      }
      if (claim.status !== "requested") {
        return res.status(400).json({ message: "Only requested claims can be approved" });
      }
      const updated = await storage.updateArcClaimStatus(claimId, "approved");
      try {
        const arcBook = await storage.getAuthorBook(claim.bookId);
        await storage.createNotification({
          userId: claim.userId,
          type: "arc_approved",
          message: `Your ARC request for "${arcBook?.title || "a book"}" has been approved — head to My ARCs to download it!`,
          linkUrl: "/my-arcs",
          fromUserId: userId,
          isRead: false,
        });
      } catch (_) {}
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve claim" });
    }
  });

  // ========== ARC PIPELINE: PUBLIC LANDING PAGE ==========
  app.get("/api/arc-landing/:token", arcPublicLimiter, async (req, res) => {
    try {
      const token = req.params.token as string;
      if (!token || token.length > 128 || !/^[a-zA-Z0-9-]+$/.test(token)) {
        return res.status(400).json({ message: "Invalid token" });
      }
      const book = await storage.getAuthorBookByShareToken(token);
      if (!book || !book.arcEnabled) {
        return res.status(404).json({ message: "ARC not found or not active" });
      }
      const authorProfile = await storage.getAuthorProfileById(book.authorProfileId);
      const isPublic = !book.arcVisibility || book.arcVisibility === "discoverable";
      res.json({
        id: book.id,
        title: book.title,
        coverUrl: book.coverUrl,
        description: book.description,
        publishedDate: book.publishedDate,
        genres: book.genres,
        arcVisibility: book.arcVisibility,
        arcDescription: book.arcDescription,
        arcExpiresAt: book.arcExpiresAt,
        arcMaxClaims: isPublic ? book.arcMaxClaims : null,
        arcClaimCount: isPublic ? book.arcClaimCount : null,
        arcWaitlistEnabled: isPublic ? book.arcWaitlistEnabled : null,
        authorProfileId: book.authorProfileId,
        authorSlug: authorProfile?.slug,
        authorName: authorProfile?.penName,
        authorAvatarUrl: authorProfile?.avatarUrl,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to load ARC landing" });
    }
  });

  // Claim an ARC using a personal invite token (private or invite-only ARCs)
  app.post("/api/arc-invite/:token/claim", isAuthenticated, arcActionLimiter, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inviteToken = req.params.token as string;
      if (!inviteToken || inviteToken.length > 128 || !/^[a-zA-Z0-9-]+$/.test(inviteToken)) {
        return res.status(400).json({ message: "Invalid invite token" });
      }

      const invite = await storage.getArcInvite(inviteToken);
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This invite has expired" });
      }
      if (invite.usedAt) return res.status(410).json({ message: "This invite has already been used" });

      if (invite.invitedUserId && invite.invitedUserId !== userId) {
        return res.status(403).json({ message: "This invite is not for your account" });
      }

      const accountCreated = req.user.claims.iat ? new Date(req.user.claims.iat * 1000) : null;
      if (accountCreated) {
        const ageHours = (Date.now() - accountCreated.getTime()) / (1000 * 60 * 60);
        if (ageHours < ARC_ACCOUNT_AGE_HOURS) {
          return res.status(403).json({ message: "Your account must be at least 24 hours old to claim ARCs" });
        }
      }

      const book = await storage.getAuthorBook(invite.bookId);
      if (!book || !book.arcEnabled) {
        return res.status(404).json({ message: "ARC not available for this book" });
      }

      const isBlocked = await storage.isUserBlocked(invite.authorProfileId, userId);
      if (isBlocked) return res.status(403).json({ message: "You are unable to claim ARCs from this author" });

      const alreadyClaimed = await storage.hasUserClaimedArc(userId, invite.bookId);
      if (alreadyClaimed) return res.status(409).json({ message: "You have already claimed this ARC" });

      const todayClaims = await storage.getUserArcClaimsToday(userId);
      if (todayClaims >= ARC_DAILY_LIMIT) {
        return res.status(429).json({ message: `Daily limit reached. You can claim up to ${ARC_DAILY_LIMIT} ARCs per day.` });
      }

      const userName = await getEffectiveDisplayName(req);
      let downloadExpiresAt: Date | null = null;
      if (book.arcDownloadExpiryHours) {
        downloadExpiresAt = new Date(Date.now() + book.arcDownloadExpiryHours * 60 * 60 * 1000);
      }

      await storage.incrementArcClaimCount(invite.bookId);
      const claim = await storage.createArcClaim({
        bookId: invite.bookId,
        authorProfileId: invite.authorProfileId,
        userId,
        userDisplayName: userName,
        downloadExpiresAt,
      });
      await storage.markArcInviteUsed(inviteToken, userId);

      res.json({ claimed: true, claim });
    } catch (err) {
      console.error("Invite claim error:", err);
      res.status(500).json({ message: "Failed to claim ARC with invite" });
    }
  });

  app.get("/api/arc-invite/:token", arcPublicLimiter, async (req, res) => {
    try {
      const token = req.params.token as string;
      if (!token || token.length > 128 || !/^[a-zA-Z0-9-]+$/.test(token)) {
        return res.status(400).json({ message: "Invalid token" });
      }
      const invite = await storage.getArcInvite(token);
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Invite has expired" });
      }
      if (invite.usedAt) return res.status(410).json({ message: "Invite already used" });
      const book = await storage.getAuthorBook(invite.bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      const authorProfile = await storage.getAuthorProfileById(invite.authorProfileId);
      res.json({
        invite: {
          id: invite.id,
          token: invite.token,
          expiresAt: invite.expiresAt,
        },
        book: {
          id: book.id,
          title: book.title,
          coverUrl: book.coverUrl,
          description: book.description,
          arcShareToken: book.arcShareToken,
          authorName: authorProfile?.penName,
          authorSlug: authorProfile?.slug,
        },
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to validate invite" });
    }
  });

  // ========== AUTHOR BOOK ANALYTICS ENDPOINT ==========
  app.get("/api/user/author-analytics", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });

      const authorBooksList = await storage.getAuthorBooks(profile.id);
      if (authorBooksList.length === 0) {
        return res.json({ books: [], totals: { librarySaves: 0, communityMentions: 0, totalReviews: 0, avgRating: 0 } });
      }

      const bookTitles = authorBooksList.map(b => b.title.toLowerCase());

      const [librarySavesResult, communityMentionsResult] = await Promise.all([
        db.select({
          bookTitle: sql<string>`lower(${userBooks.bookTitle})`,
          cnt: sql<number>`count(*)::int`,
        }).from(userBooks)
          .where(inArray(sql`lower(${userBooks.bookTitle})`, bookTitles))
          .groupBy(sql`lower(${userBooks.bookTitle})`),
        db.select({
          bookTitle: sql<string>`lower(${activityEvents.bookTitle})`,
          cnt: sql<number>`count(*)::int`,
        }).from(activityEvents)
          .where(inArray(sql`lower(${activityEvents.bookTitle})`, bookTitles))
          .groupBy(sql`lower(${activityEvents.bookTitle})`),
      ]);

      const savesMap: Record<string, number> = {};
      librarySavesResult.forEach(r => { savesMap[r.bookTitle] = r.cnt; });
      const mentionsMap: Record<string, number> = {};
      communityMentionsResult.forEach(r => { mentionsMap[r.bookTitle] = r.cnt; });

      const books = authorBooksList.map(book => ({
        id: book.id,
        title: book.title,
        coverUrl: book.coverUrl,
        librarySaves: savesMap[book.title.toLowerCase()] || 0,
        communityMentions: mentionsMap[book.title.toLowerCase()] || 0,
        arcClaims: book.arcClaimCount || 0,
        arcMaxClaims: book.arcMaxClaims || 0,
      }));

      const totals = {
        librarySaves: books.reduce((sum, b) => sum + b.librarySaves, 0),
        communityMentions: books.reduce((sum, b) => sum + b.communityMentions, 0),
        totalBooks: books.length,
        totalArcClaims: books.reduce((sum, b) => sum + b.arcClaims, 0),
      };

      const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000);
      const [weeklysaves, weeklyMentions] = await Promise.all([
        db.select({
          week: sql<string>`to_char(date_trunc('week', ${userBooks.dateAdded}), 'YYYY-MM-DD')`,
          cnt: sql<number>`count(*)::int`,
        }).from(userBooks)
          .where(and(
            inArray(sql`lower(${userBooks.bookTitle})`, bookTitles),
            gte(userBooks.dateAdded, twelveWeeksAgo)
          ))
          .groupBy(sql`date_trunc('week', ${userBooks.dateAdded})`)
          .orderBy(sql`date_trunc('week', ${userBooks.dateAdded})`),
        db.select({
          week: sql<string>`to_char(date_trunc('week', ${activityEvents.createdAt}), 'YYYY-MM-DD')`,
          cnt: sql<number>`count(*)::int`,
        }).from(activityEvents)
          .where(and(
            inArray(sql`lower(${activityEvents.bookTitle})`, bookTitles),
            gte(activityEvents.createdAt, twelveWeeksAgo)
          ))
          .groupBy(sql`date_trunc('week', ${activityEvents.createdAt})`)
          .orderBy(sql`date_trunc('week', ${activityEvents.createdAt})`),
      ]);

      const weekSet = new Set<string>();
      weeklyMentions.forEach(w => weekSet.add(w.week));
      weeklysaves.forEach(w => weekSet.add(w.week));
      const now = new Date();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const monday = new Date(d);
        monday.setDate(d.getDate() - d.getDay() + 1);
        weekSet.add(monday.toISOString().split("T")[0]);
      }
      const savesWeekMap: Record<string, number> = {};
      weeklysaves.forEach(r => { savesWeekMap[r.week] = r.cnt; });
      const mentionsWeekMap: Record<string, number> = {};
      weeklyMentions.forEach(r => { mentionsWeekMap[r.week] = r.cnt; });

      const trends = Array.from(weekSet).sort().slice(-12).map(week => ({
        week,
        saves: savesWeekMap[week] || 0,
        mentions: mentionsWeekMap[week] || 0,
      }));

      res.json({ books, totals, trends });
    } catch (err) {
      console.error("Author analytics error:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // ========== ARC CONVERSION STATS ENDPOINT ==========
  app.get("/api/user/arc-conversion-stats", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const stats = await storage.getArcConversionStats(profile.id);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ message: "Failed to get conversion stats" });
    }
  });

  // ========== ARC CLAIM EXPORT ENDPOINT ==========
  app.get("/api/user/arc-claims-export", isAuthenticated, async (req: any, res) => {
    try {
      const profile = await storage.getAuthorProfile(req.user.claims.sub);
      if (!profile) return res.status(404).json({ message: "Author profile not found" });
      const data = await storage.getArcClaimExportData(profile.id);
      
      const csvHeader = "Book Title,Claimer Name,Claimed Date,Reading Progress %,Has Reviewed,Flagged\n";
      const csvRows = data.map(row => 
        `"${row.bookTitle.replace(/"/g, '""')}","${row.claimerName.replace(/"/g, '""')}",${row.claimedAt},${row.readingProgress},${row.hasReviewed ? "Yes" : "No"},${row.isFlagged ? "Yes" : "No"}`
      ).join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=arc-claims.csv");
      res.send(csvHeader + csvRows);
    } catch (err) {
      res.status(500).json({ message: "Failed to export claims" });
    }
  });

  // ========== ARC READING PROGRESS ENDPOINT ==========
  app.patch("/api/authors/:authorId/books/:bookId/arc-progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const { progress } = req.body;
      
      if (progress === undefined || progress < 0 || progress > 100) {
        return res.status(400).json({ message: "Progress must be between 0 and 100" });
      }
      
      const claims = await storage.getArcClaimsForBook(bookId);
      const userClaim = claims.find(c => c.userId === userId);
      if (!userClaim) {
        return res.status(404).json({ message: "You haven't claimed this ARC" });
      }
      
      const updated = await storage.updateArcReadingProgress(userClaim.id, progress);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update reading progress" });
    }
  });

  // ========== ARC PRIVATE FEEDBACK ENDPOINTS ==========
  app.post("/api/authors/:authorId/books/:bookId/arc-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userName = await getEffectiveDisplayName(req);
      const authorId = parseInt(req.params.authorId as string);
      const bookId = parseInt(req.params.bookId as string);
      const { feedbackText, feedbackType } = req.body;
      
      if (!feedbackText || !feedbackText.trim()) {
        return res.status(400).json({ message: "Feedback text is required" });
      }
      
      const claimed = await storage.hasUserClaimedArc(userId, bookId);
      if (!claimed) {
        return res.status(403).json({ message: "You must claim the ARC before sending feedback" });
      }
      
      const feedback = await storage.createArcFeedback({
        bookId,
        authorProfileId: authorId,
        userId,
        userDisplayName: userName,
        feedbackText: feedbackText.trim(),
        feedbackType: feedbackType || "general",
      });
      res.json(feedback);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  app.get("/api/user/author-books/:bookId/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      const book = await storage.getAuthorBook(bookId);
      if (!book) return res.status(404).json({ message: "Book not found" });
      
      const profile = await storage.getAuthorProfile(userId);
      if (!profile || book.authorProfileId !== profile.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const feedback = await storage.getArcFeedbackForBook(bookId);
      res.json(feedback);
    } catch (err) {
      res.status(500).json({ message: "Failed to get feedback" });
    }
  });

  // ========== INDIE BOOK OF THE DAY ==========
  app.get("/api/book-of-the-day", generalLimiter, async (_req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [existing] = await db.select().from(dailyIndieBooks).where(eq(dailyIndieBooks.date, today));
      if (existing) return res.json(existing);

      const candidates: Array<{
        bookTitle: string; authorName: string; coverUrl: string | null;
        description: string | null; genres: string[]; buyLink: string | null;
        authorSlug: string | null; spotlightId: number | null; authorBookId: number | null;
        sourceType: string;
      }> = [];

      const now = new Date();
      const activeSpotlights = await db.select().from(indieSpotlights)
        .where(and(
          eq(indieSpotlights.isActive, true),
          or(isNull(indieSpotlights.endDate), gte(indieSpotlights.endDate, now))
        ))
        .orderBy(desc(indieSpotlights.priority));

      for (const s of activeSpotlights) {
        let buyLink: string | null = null;
        if (s.buyLinks) {
          try { buyLink = JSON.parse(s.buyLinks)?.[0]?.url || null; } catch (_) {}
        }
        candidates.push({
          bookTitle: s.bookTitle,
          authorName: s.penName || s.authorName,
          coverUrl: s.coverImageUrl,
          description: s.shortBlurb,
          genres: s.genres || [],
          buyLink,
          authorSlug: null,
          spotlightId: s.id,
          authorBookId: null,
          sourceType: "spotlight",
        });
      }

      const authorBks = await db.select({
        id: authorBooks.id,
        title: authorBooks.title,
        description: authorBooks.description,
        coverUrl: authorBooks.coverUrl,
        genres: authorBooks.genres,
        amazonUrl: authorBooks.amazonUrl,
        bookshopUrl: authorBooks.bookshopUrl,
        penName: authorProfiles.penName,
        slug: authorProfiles.slug,
      })
        .from(authorBooks)
        .innerJoin(authorProfiles, eq(authorBooks.authorProfileId, authorProfiles.id))
        .where(and(
          eq(authorBooks.arcVisibility, "discoverable"),
          isNotNull(authorBooks.coverUrl),
          isNotNull(authorBooks.description),
        ))
        .limit(50);

      for (const b of authorBks) {
        candidates.push({
          bookTitle: b.title,
          authorName: b.penName || "Indie Author",
          coverUrl: b.coverUrl,
          description: b.description,
          genres: b.genres || [],
          buyLink: b.amazonUrl || b.bookshopUrl || null,
          authorSlug: b.slug,
          spotlightId: null,
          authorBookId: b.id,
          sourceType: "author_book",
        });
      }

      if (candidates.length === 0) {
        return res.status(404).json({ message: "No indie books available today" });
      }

      const dateParts = today.split("-").map(Number);
      const dateHash = dateParts[0] * 366 + dateParts[1] * 31 + dateParts[2];
      const picked = candidates[dateHash % candidates.length];

      const [saved] = await db.insert(dailyIndieBooks).values({
        date: today,
        bookTitle: picked.bookTitle,
        authorName: picked.authorName,
        coverUrl: picked.coverUrl,
        description: picked.description,
        genres: picked.genres,
        buyLink: picked.buyLink,
        authorSlug: picked.authorSlug,
        spotlightId: picked.spotlightId,
        authorBookId: picked.authorBookId,
        sourceType: picked.sourceType,
      }).returning();

      res.json(saved);
    } catch (err) {
      console.error("Book of the day error:", err);
      res.status(500).json({ message: "Failed to get book of the day" });
    }
  });

  // Admin override: manually set today's indie book of the day
  app.post("/api/admin/book-of-the-day", async (req: any, res) => {
    try {
      if (!await isAdminAuthorized(req)) return res.status(403).json({ message: "Forbidden" });
      const { bookTitle, authorName, coverUrl, description, genres, buyLink, authorSlug } = req.body;
      if (!bookTitle || !authorName) return res.status(400).json({ message: "bookTitle and authorName required" });
      const today = new Date().toISOString().split("T")[0];
      await db.delete(dailyIndieBooks).where(eq(dailyIndieBooks.date, today));
      const [saved] = await db.insert(dailyIndieBooks).values({
        date: today,
        bookTitle,
        authorName,
        coverUrl: coverUrl || null,
        description: description || null,
        genres: genres || [],
        buyLink: buyLink || null,
        authorSlug: authorSlug || null,
        spotlightId: null,
        authorBookId: null,
        sourceType: "manual",
      }).returning();
      res.json(saved);
    } catch (err) {
      console.error("Admin book of the day error:", err);
      res.status(500).json({ message: "Failed to set book of the day" });
    }
  });

  // ========== FEATURED PLACEMENTS ENDPOINTS ==========
  app.get("/api/featured/spotlight", cacheMiddleware(300), async (_req, res) => {
    try {
      const placements = await storage.getActiveFeaturedPlacements("spotlight");
      if (placements.length === 0) {
        return res.json([]);
      }
      
      const results = [];
      for (const placement of placements) {
        if (!placement.author) continue;
        
        const books = await storage.getAuthorBooks(placement.authorProfileId);
        
        results.push({
          id: placement.author.id,
          penName: placement.author.penName,
          slug: placement.author.slug,
          bio: placement.author.bio,
          genres: placement.author.genres,
          avatarUrl: placement.author.avatarUrl,
          books: books.map(b => ({
            id: b.id,
            title: b.title,
            coverUrl: b.coverUrl,
            amazonUrl: b.amazonUrl,
            arcEnabled: b.arcEnabled,
            arcAvailable: b.arcEnabled && (!b.arcMaxClaims || (b.arcClaimCount ?? 0) < b.arcMaxClaims),
          })),
        });
      }
      
      res.json(results);
    } catch (err) {
      console.error("Get spotlight error:", err);
      res.status(500).json({ message: "Failed to get spotlight" });
    }
  });

  app.get("/api/featured/frontpage", async (_req, res) => {
    try {
      const placements = await storage.getActiveFeaturedPlacements("frontpage");
      const results = [];
      
      for (const placement of placements) {
        if (!placement.author) continue;
        const books = await storage.getAuthorBooks(placement.authorProfileId);
        results.push({
          placement: {
            id: placement.id,
            isSponsored: placement.isSponsored,
            priority: placement.priority,
          },
          author: {
            id: placement.author.id,
            penName: placement.author.penName,
            slug: placement.author.slug,
            avatarUrl: placement.author.avatarUrl,
            genres: placement.author.genres,
          },
          books: books.slice(0, 3).map(b => ({
            id: b.id,
            title: b.title,
            coverUrl: b.coverUrl,
            amazonUrl: b.amazonUrl,
          })),
        });
      }
      
      res.json(results);
    } catch (err) {
      console.error("Get frontpage placements error:", err);
      res.status(500).json({ message: "Failed to get frontpage placements" });
    }
  });

  // ========== USER SEARCH ROUTES ==========

  app.get("/api/users/search", async (req: any, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string" || q.trim().length < 2) {
        return res.json([]);
      }
      const currentUserId = req.user?.claims?.sub || null;
      const results = await storage.searchUsers(q.trim(), 40);
      const safeResults = results
        .filter(u => u.isProfilePublic !== false || u.id === currentUserId)
        .slice(0, 20)
        .map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: u.displayName,
          profileImageUrl: u.profileImageUrl,
          bio: u.bio,
          isProfilePublic: u.isProfilePublic !== false,
        }));
      res.json(safeResults);
    } catch (err) {
      console.error("User search error:", err);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/users/:userId/profile", async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const currentUserId = req.user?.claims?.sub || null;
      const isSelf = currentUserId === userId;
      const isPrivate = user.isProfilePublic === false;
      
      if (isPrivate && !isSelf) {
        const counts = await storage.getFollowCounts(userId);
        return res.json({
          id: user.id,
          displayName: user.displayName || (user.firstName ? (user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.firstName) : "Reader"),
          profileImageUrl: user.profileImageUrl,
          isProfilePublic: false,
          followerCount: counts.followers,
          followingCount: counts.following,
        });
      }
      
      const counts = await storage.getFollowCounts(userId);
      const userBooks = await storage.getUserBooks(userId);
      const finishedCount = userBooks.filter((b: any) => b.status === "finished").length;
      const arcBadges = await db.select().from(userBadges)
        .where(and(eq(userBadges.userId, userId), eq(userBadges.category, "arc")))
        .orderBy(userBadges.earnedAt);
      const currentlyReadingBooks = userBooks.filter((b: any) => b.status === "currently_reading").slice(0, 5);
      const recentFinished = userBooks.filter((b: any) => b.status === "finished").sort((a: any, b: any) => {
        const dateA = a.dateFinished ? new Date(a.dateFinished).getTime() : 0;
        const dateB = b.dateFinished ? new Date(b.dateFinished).getTime() : 0;
        return dateB - dateA;
      }).slice(0, 6);
      
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        bio: user.bio,
        favoriteGenres: user.favoriteGenres || [],
        currentlyReading: user.currentlyReading,
        isProfilePublic: user.isProfilePublic !== false,
        createdAt: user.createdAt,
        followerCount: counts.followers,
        followingCount: counts.following,
        booksFinished: finishedCount,
        totalBooks: userBooks.length,
        currentlyReadingBooks: currentlyReadingBooks.map((b: any) => ({
          id: b.id,
          bookTitle: b.bookTitle,
          bookAuthor: b.bookAuthor,
          bookCoverUrl: b.bookCoverUrl,
        })),
        recentlyFinished: recentFinished.map((b: any) => ({
          id: b.id,
          bookTitle: b.bookTitle,
          bookAuthor: b.bookAuthor,
          bookCoverUrl: b.bookCoverUrl,
          rating: b.rating,
          dateFinished: b.dateFinished,
        })),
        arcBadges: arcBadges.map(b => ({
          badgeKey: b.badgeKey,
          badgeName: b.badgeName,
          badgeDescription: b.badgeDescription,
          badgeIcon: b.badgeIcon,
          earnedAt: b.earnedAt,
        })),
      });
    } catch (err) {
      console.error("Get user profile error:", err);
      res.status(500).json({ message: "Failed to get user profile" });
    }
  });

  // ========== SOCIAL FOLLOWING ROUTES ==========

  app.post("/api/user/follow", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { followingId } = req.body;
      if (!followingId || followingId === userId) {
        return res.status(400).json({ message: "Invalid followingId" });
      }
      const isBlocked = await storage.isUserBlockedBy(userId, followingId);
      if (isBlocked) {
        return res.status(403).json({ message: "Cannot follow this user" });
      }
      const already = await storage.isFollowing(userId, followingId);
      if (already) {
        return res.status(409).json({ message: "Already following this user" });
      }
      const targetUser = await storage.getUser(followingId);
      if (targetUser?.isPrivateAccount) {
        const existingRequest = await storage.getPendingFollowRequest(userId, followingId);
        if (existingRequest) {
          return res.status(409).json({ message: "Follow request already pending", requestPending: true });
        }
        const request = await storage.createFollowRequest(userId, followingId);
        const displayName = await getEffectiveDisplayName(req);
        await storage.createNotification({
          userId: followingId,
          type: "follow_request",
          message: `${displayName} requested to follow you`,
          fromUserId: userId,
          linkUrl: `/profile`,
        });
        return res.status(202).json({ message: "Follow request sent", requestPending: true, request });
      }
      const follow = await storage.followUser({ followerId: userId, followingId });
      const displayName = await getEffectiveDisplayName(req);
      await storage.createActivityEvent({
        userId,
        type: "follow",
        metadata: JSON.stringify({ followingId }),
      });
      await storage.createNotification({
        userId: followingId,
        type: "follow",
        message: `${displayName} started following you`,
        fromUserId: userId,
        linkUrl: `/profile/${userId}`,
      });
      res.status(201).json(follow);
    } catch (err) {
      console.error("Follow error:", err);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/user/follow/:followingId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { followingId } = req.params;
      await storage.unfollowUser(userId, followingId);
      res.status(204).send();
    } catch (err) {
      console.error("Unfollow error:", err);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  app.get("/api/user/followers", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const followers = await storage.getFollowers(userId);
      res.json(followers);
    } catch (err) {
      console.error("Get followers error:", err);
      res.status(500).json({ message: "Failed to get followers" });
    }
  });

  app.get("/api/user/following", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const following = await storage.getFollowing(userId);
      res.json(following);
    } catch (err) {
      console.error("Get following error:", err);
      res.status(500).json({ message: "Failed to get following" });
    }
  });

  app.get("/api/user/follow-status/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const targetUserId = req.params.userId;
      const isFollowingUser = await storage.isFollowing(currentUserId, targetUserId);
      const counts = await storage.getFollowCounts(targetUserId);
      const isBlocked = await storage.isUserBlockedBy(currentUserId, targetUserId);
      const pendingRequest = await storage.getPendingFollowRequest(currentUserId, targetUserId);
      const targetUser = await storage.getUser(targetUserId);
      res.json({
        isFollowing: isFollowingUser,
        followerCount: counts.followers,
        followingCount: counts.following,
        isBlocked,
        hasPendingRequest: !!pendingRequest,
        isPrivateAccount: targetUser?.isPrivateAccount ?? false,
      });
    } catch (err) {
      console.error("Follow status error:", err);
      res.status(500).json({ message: "Failed to get follow status" });
    }
  });

  app.delete("/api/user/follow-request/:targetUserId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { targetUserId } = req.params;
      await storage.cancelFollowRequest(userId, targetUserId);
      res.status(204).send();
    } catch (err) {
      console.error("Cancel follow request error:", err);
      res.status(500).json({ message: "Failed to cancel follow request" });
    }
  });

  // ========== BLOCK & REPORT ROUTES ==========

  app.post("/api/user/block", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { blockedUserId } = req.body;
      if (!blockedUserId || blockedUserId === userId) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      await storage.blockUser(userId, blockedUserId);
      res.status(201).json({ message: "User blocked" });
    } catch (err) {
      console.error("Block user error:", err);
      res.status(500).json({ message: "Failed to block user" });
    }
  });

  app.delete("/api/user/block/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const { userId } = req.params;
      await storage.unblockUser(currentUserId, userId);
      res.status(204).send();
    } catch (err) {
      console.error("Unblock user error:", err);
      res.status(500).json({ message: "Failed to unblock user" });
    }
  });

  app.get("/api/user/blocked", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const blocked = await storage.getBlockedUsers(userId);
      res.json(blocked);
    } catch (err) {
      console.error("Get blocked users error:", err);
      res.status(500).json({ message: "Failed to get blocked users" });
    }
  });

  app.post("/api/user/report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { reportedUserId, reportedContentId, reportedContentType, reason, details } = req.body;
      if (!reportedUserId || !reason) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      await storage.reportUser({
        reporterId: userId,
        reportedUserId,
        reportedContentId,
        reportedContentType,
        reason,
        details,
      });
      res.status(201).json({ message: "Report submitted" });
    } catch (err) {
      console.error("Report user error:", err);
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  // ========== FOLLOW REQUEST ROUTES ==========

  app.get("/api/user/follow-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getFollowRequests(userId);
      res.json(requests);
    } catch (err) {
      console.error("Get follow requests error:", err);
      res.status(500).json({ message: "Failed to get follow requests" });
    }
  });

  app.post("/api/user/follow-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestId = parseInt(req.params.id);
      const requests = await storage.getFollowRequests(userId);
      const request = requests.find((r: any) => r.id === requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      const isBlocked = await storage.isUserBlockedBy(userId, request.requesterId);
      if (isBlocked) {
        await storage.respondToFollowRequest(requestId, "rejected");
        return res.status(403).json({ message: "Cannot approve request from blocked user" });
      }
      await storage.respondToFollowRequest(requestId, "approved");
      await storage.createActivityEvent({
        userId: request.requesterId,
        type: "follow",
        metadata: JSON.stringify({ followingId: userId }),
      });
      await storage.createNotification({
        userId: request.requesterId,
        type: "follow_approved",
        message: `Your follow request was approved`,
        fromUserId: userId,
        linkUrl: `/readers/${userId}`,
      });
      res.json({ message: "Request approved" });
    } catch (err) {
      console.error("Approve follow request error:", err);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.post("/api/user/follow-requests/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requestId = parseInt(req.params.id);
      const requests = await storage.getFollowRequests(userId);
      const request = requests.find((r: any) => r.id === requestId);
      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }
      await storage.respondToFollowRequest(requestId, "rejected");
      res.json({ message: "Request rejected" });
    } catch (err) {
      console.error("Reject follow request error:", err);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // ========== PRIVACY ROUTES ==========

  app.get("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json({
        isPrivateAccount: user?.isPrivateAccount ?? false,
        isProfilePublic: user?.isProfilePublic ?? true,
      });
    } catch (err) {
      console.error("Get privacy error:", err);
      res.status(500).json({ message: "Failed to get privacy settings" });
    }
  });

  app.patch("/api/user/privacy", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { isPrivateAccount, isProfilePublic } = req.body;
      const updates: any = { id: userId };
      if (typeof isPrivateAccount === "boolean") updates.isPrivateAccount = isPrivateAccount;
      if (typeof isProfilePublic === "boolean") updates.isProfilePublic = isProfilePublic;
      await authStorage.upsertUser(updates);
      if (isPrivateAccount === false) {
        const pendingRequests = await storage.getFollowRequests(userId);
        for (const request of pendingRequests) {
          await storage.respondToFollowRequest(request.id, "approved");
        }
      }
      const user = await storage.getUser(userId);
      res.json({
        isPrivateAccount: user?.isPrivateAccount ?? false,
        isProfilePublic: user?.isProfilePublic ?? true,
      });
    } catch (err) {
      console.error("Update privacy error:", err);
      res.status(500).json({ message: "Failed to update privacy settings" });
    }
  });

  // ========== ACTIVITY FEED ROUTES ==========

  app.get("/api/user/feed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const following = await storage.getFollowing(userId);
      const followingIds = following.map(f => f.followingId);
      const feed = await storage.getUserFeed(userId, followingIds);
      res.json(feed.slice(0, 50));
    } catch (err) {
      console.error("Get feed error:", err);
      res.status(500).json({ message: "Failed to get feed" });
    }
  });

  app.get("/api/user/activity", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const events = await storage.getUserActivityEvents(userId);
      res.json(events);
    } catch (err) {
      console.error("Get activity error:", err);
      res.status(500).json({ message: "Failed to get activity" });
    }
  });

  // ========== COMMUNITY FEED ROUTES ==========

  app.post("/api/community/post", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type, bookTitle, bookAuthor, bookCoverUrl, text, progressPercent, moodTag, rating, spoilerText, socialLinks, referencedItemId, status } = req.body;
      const validTypes = ["status_update", "review", "author_post", "share", "finished_book", "started_book", "want_to_read", "currently_reading", "paused", "dnf"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid post type" });
      }
      if (type === "review" && !bookTitle) {
        return res.status(400).json({ message: "Book title required for reviews" });
      }
      if (type === "author_post") {
        const isAdmin = await isAdminAuthorized(req);
        let isAuthor = false;
        try {
          const profiles = await storage.getAllAuthorProfiles();
          isAuthor = profiles.some((p: any) => p.userId === userId);
        } catch {}
        if (!isAdmin && !isAuthor) {
          return res.status(403).json({ message: "Only authors and admins can create author posts" });
        }
      }
      if (!text && !bookTitle && type !== "share") {
        return res.status(400).json({ message: "Post must include text or a book reference" });
      }

      const metadata: Record<string, any> = {};
      if (text) metadata.text = String(text).slice(0, 2000);
      if (progressPercent !== undefined) metadata.progressPercent = Math.min(100, Math.max(0, Number(progressPercent) || 0));
      if (moodTag) metadata.moodTag = String(moodTag).slice(0, 50);
      if (rating) metadata.rating = Math.min(5, Math.max(1, Number(rating)));
      if (spoilerText) metadata.spoilerText = String(spoilerText).slice(0, 2000);
      if (socialLinks) metadata.socialLinks = socialLinks;
      if (referencedItemId) metadata.referencedItemId = Number(referencedItemId);
      if (status) metadata.status = String(status);

      const event = await storage.createActivityEvent({
        userId,
        type,
        bookTitle: bookTitle ? String(bookTitle).slice(0, 300) : null,
        bookAuthor: bookAuthor ? String(bookAuthor).slice(0, 200) : null,
        bookCoverUrl: bookCoverUrl ? String(bookCoverUrl).slice(0, 500) : null,
        metadata: Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null,
      });
      res.json(event);
    } catch (err) {
      console.error("Community post error:", err);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/community/feed", async (req: any, res) => {
    try {
      const cursor = req.query.cursor ? parseInt(req.query.cursor as string) : undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const filter = req.query.filter as string || "all";
      const mode = req.query.mode as string || "all";

      let typeFilters: string[] = [];
      if (filter === "reviews") typeFilters = ["review", "added_review"];
      else if (filter === "status") typeFilters = ["status_update", "want_to_read", "currently_reading", "finished_book", "started_book", "paused", "dnf"];
      else if (filter === "author") typeFilters = ["author_post"];

      const conditions: any[] = [];
      if (cursor) conditions.push(lt(activityEvents.id, cursor));
      if (typeFilters.length > 0) conditions.push(inArray(activityEvents.type, typeFilters));

      if (mode === "following" && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const following = await storage.getFollowing(userId);
        const followingIds = following.map(f => f.followingId);
        followingIds.push(userId);
        if (followingIds.length > 0) {
          conditions.push(inArray(activityEvents.userId, followingIds));
        }
      }

      if (mode === "for_you" && req.user?.claims?.sub) {
        const userId = req.user.claims.sub;
        const following = await storage.getFollowing(userId);
        const followingIds = following.map(f => f.followingId);
        const forYouUserIds = [...followingIds, userId, "book-slump-rescue"];
        const engagedTypes = ["review", "added_review", "finished_book", "status_update", "author_post", "started_book"];
        conditions.push(inArray(activityEvents.type, engagedTypes));

        const topicFollowsList = await storage.getUserTopicFollows(userId);
        const followedTopics = topicFollowsList.map(t => t.topic.toLowerCase());

        if (followedTopics.length > 0) {
          const topicConditions = followedTopics.map(t => ilike(activityEvents.metadata, `%${t}%`));
          conditions.push(or(
            inArray(activityEvents.userId, forYouUserIds),
            ...topicConditions
          )!);
        } else if (forYouUserIds.length > 0) {
          conditions.push(inArray(activityEvents.userId, forYouUserIds));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const items = await db.select().from(activityEvents)
        .where(whereClause)
        .orderBy(desc(activityEvents.id))
        .limit(limit + 1);

      const hasMore = items.length > limit;
      const feedItems = items.slice(0, limit);

      const itemIds = feedItems.map(i => i.id);
      let reactionCounts: Record<number, number> = {};
      let commentCounts: Record<number, number> = {};
      let userReactions: Set<number> = new Set();

      if (itemIds.length > 0) {
        const reactions = await db.select({
          feedItemId: feedReactions.feedItemId,
          cnt: sql<number>`count(*)::int`,
        }).from(feedReactions)
          .where(inArray(feedReactions.feedItemId, itemIds))
          .groupBy(feedReactions.feedItemId);
        reactions.forEach(r => { reactionCounts[r.feedItemId] = r.cnt; });

        const comments = await db.select({
          feedItemId: feedComments.feedItemId,
          cnt: sql<number>`count(*)::int`,
        }).from(feedComments)
          .where(inArray(feedComments.feedItemId, itemIds))
          .groupBy(feedComments.feedItemId);
        comments.forEach(c => { commentCounts[c.feedItemId] = c.cnt; });

        if (req.user?.claims?.sub) {
          const myReactions = await db.select({ feedItemId: feedReactions.feedItemId })
            .from(feedReactions)
            .where(and(
              inArray(feedReactions.feedItemId, itemIds),
              eq(feedReactions.userId, req.user.claims.sub)
            ));
          myReactions.forEach(r => userReactions.add(r.feedItemId));
        }
      }

      let userNames: Record<string, string> = {};
      let authorUserIds: Set<string> = new Set();
      const uniqueUserIds = [...new Set(feedItems.map(i => i.userId))];
      if (uniqueUserIds.length > 0) {
        const [, authorProfilesList] = await Promise.all([
          (async () => {
            try {
              for (const uid of uniqueUserIds) {
                const profile = await authStorage.getUser(uid);
                if (profile?.displayName) {
                  userNames[uid] = profile.displayName;
                } else if (profile?.firstName) {
                  userNames[uid] = profile.lastName
                    ? `${profile.firstName} ${profile.lastName}`.trim()
                    : profile.firstName;
                }
              }
            } catch {}
          })(),
          storage.getAuthorProfilesByUserIds(uniqueUserIds).catch(() => [] as any[]),
        ]);
        for (const ap of authorProfilesList) {
          if (ap.userId) {
            authorUserIds.add(ap.userId);
            if (ap.displayName && !userNames[ap.userId]) {
              userNames[ap.userId] = ap.displayName;
            }
          }
        }
      }

      const systemNames: Record<string, string> = {
        "book-slump-rescue": "Book Slump Rescue",
      };

      const enriched = feedItems.map(item => {
        let displayName = userNames[item.userId] || systemNames[item.userId] || "Reader";
        if (item.type === "author_post" && authorUserIds.has(item.userId)) {
          displayName = displayName + " — Author";
        }
        return {
          ...item,
          likeCount: reactionCounts[item.id] || 0,
          commentCount: commentCounts[item.id] || 0,
          liked: userReactions.has(item.id),
          displayName,
        };
      });

      res.json({
        items: enriched,
        nextCursor: hasMore ? feedItems[feedItems.length - 1].id : null,
      });
    } catch (err) {
      console.error("Community feed error:", err);
      res.status(500).json({ message: "Failed to load feed" });
    }
  });

  app.post("/api/admin/community/seed", async (req: any, res) => {
    if (!await isAdminAuthorized(req)) return res.status(403).json({ message: "Forbidden" });
    try {
      const { seedCommunityFeed } = await import("./seedCommunityFeed");
      await db.delete(activityEvents).where(sql`1=1`);
      await seedCommunityFeed();
      res.json({ message: "Seeded community feed with reading tips and indie picks" });
    } catch (err) {
      console.error("Community seed error:", err);
      res.status(500).json({ message: "Failed to seed" });
    }
  });

  app.post("/api/community/react/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedItemId = parseInt(req.params.itemId);
      const existing = await db.select().from(feedReactions)
        .where(and(eq(feedReactions.feedItemId, feedItemId), eq(feedReactions.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        await db.delete(feedReactions).where(eq(feedReactions.id, existing[0].id));
        res.json({ liked: false });
      } else {
        await db.insert(feedReactions).values({ feedItemId, userId, type: "like" });
        const [item] = await db.select().from(activityEvents).where(eq(activityEvents.id, feedItemId)).limit(1);
        if (item && item.userId !== userId) {
          await storage.createNotification({
            userId: item.userId,
            type: "like",
            message: "Someone liked your post",
            linkUrl: "/community",
            fromUserId: userId,
            isRead: false,
          });
        }
        res.json({ liked: true });
      }
    } catch (err) {
      console.error("React error:", err);
      res.status(500).json({ message: "Failed to react" });
    }
  });

  app.get("/api/community/comments/:itemId", async (req, res) => {
    try {
      const feedItemId = parseInt(req.params.itemId);
      const comments = await db.select().from(feedComments)
        .where(eq(feedComments.feedItemId, feedItemId))
        .orderBy(feedComments.createdAt);
      res.json(comments);
    } catch (err) {
      res.status(500).json({ message: "Failed to load comments" });
    }
  });

  app.post("/api/community/comments/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const feedItemId = parseInt(req.params.itemId);
      const { content, parentId } = req.body;
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment cannot be empty" });
      }
      let displayName = await getEffectiveDisplayName(req);

      const [comment] = await db.insert(feedComments).values({
        feedItemId,
        userId,
        userDisplayName: displayName,
        content: content.trim(),
        parentId: parentId || null,
      }).returning();

      const [item] = await db.select().from(activityEvents).where(eq(activityEvents.id, feedItemId)).limit(1);
      if (item && item.userId !== userId) {
        await storage.createNotification({
          userId: item.userId,
          type: "comment",
          message: `${displayName} commented on your post`,
          linkUrl: "/community",
          fromUserId: userId,
          isRead: false,
        });
      }
      res.json(comment);
    } catch (err) {
      console.error("Comment error:", err);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  app.post("/api/community/report/:itemId", isAuthenticated, async (req: any, res) => {
    try {
      const reporterId = req.user.claims.sub;
      const feedItemId = parseInt(req.params.itemId);
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ message: "Reason required" });

      const [report] = await db.insert(feedReports).values({
        feedItemId,
        reporterId,
        reason,
      }).returning();
      res.json(report);
    } catch (err) {
      res.status(500).json({ message: "Failed to submit report" });
    }
  });

  app.get("/api/community/trending", cacheMiddleware(600), async (_req, res) => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const results = await db.execute(sql`
        SELECT 
          ae.book_title as "bookTitle",
          ae.book_author as "bookAuthor",
          ae.book_cover_url as "bookCoverUrl",
          COUNT(DISTINCT ae.id) as "postCount",
          COALESCE(SUM(
            (SELECT COUNT(*) FROM feed_reactions fr WHERE fr.feed_item_id = ae.id)
          ), 0) as "likeCount"
        FROM activity_events ae
        WHERE ae.book_title IS NOT NULL 
          AND ae.book_title != ''
          AND ae.created_at >= ${sevenDaysAgo}
        GROUP BY ae.book_title, ae.book_author, ae.book_cover_url
        ORDER BY COUNT(DISTINCT ae.id) + COALESCE(SUM(
          (SELECT COUNT(*) FROM feed_reactions fr WHERE fr.feed_item_id = ae.id)
        ), 0) DESC
        LIMIT 5
      `);
      res.json(results.rows || []);
    } catch (err) {
      console.error("Trending error:", err);
      res.json([]);
    }
  });

  app.get("/api/user/topic-follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const topics = await storage.getUserTopicFollows(userId);
      res.json(topics);
    } catch (err) {
      res.status(500).json({ message: "Failed to load topic follows" });
    }
  });

  app.post("/api/user/topic-follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { topic, category } = req.body;
      if (!topic) return res.status(400).json({ message: "Topic required" });
      const result = await storage.followTopic(userId, topic, category || "genre");
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Failed to follow topic" });
    }
  });

  app.delete("/api/user/topic-follows/:topic", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const topic = decodeURIComponent(req.params.topic);
      await storage.unfollowTopic(userId, topic);
      res.json({ unfollowed: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to unfollow topic" });
    }
  });

  app.post("/api/community/affiliate-click", async (req: any, res) => {
    try {
      const { feedItemId, bookTitle, source, affiliateUrl } = req.body;
      const userId = req.user?.claims?.sub || null;
      await db.insert(affiliateClicks).values({
        feedItemId: feedItemId || null,
        bookTitle: bookTitle || "unknown",
        source: source || "contextual",
        affiliateUrl: affiliateUrl || "",
        userId,
      });
      res.json({ tracked: true });
    } catch (err) {
      res.json({ tracked: false });
    }
  });

  app.get("/api/admin/community/reports", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const reports = await db.select().from(feedReports).orderBy(desc(feedReports.createdAt));
      res.json(reports);
    } catch (err) {
      res.status(500).json({ message: "Failed to load reports" });
    }
  });

  app.patch("/api/admin/community/reports/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const [updated] = await db.update(feedReports).set({ status }).where(eq(feedReports.id, id)).returning();
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update report" });
    }
  });

  app.delete("/api/admin/community/items/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(feedReactions).where(eq(feedReactions.feedItemId, id));
      await db.delete(feedComments).where(eq(feedComments.feedItemId, id));
      await db.delete(activityEvents).where(eq(activityEvents.id, id));
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  app.get("/api/admin/community/analytics", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [totalItems] = await db.select({ cnt: sql<number>`count(*)::int` }).from(activityEvents).where(gte(activityEvents.createdAt, sevenDaysAgo));
      const [totalLikes] = await db.select({ cnt: sql<number>`count(*)::int` }).from(feedReactions).where(gte(feedReactions.createdAt, sevenDaysAgo));
      const [totalComments] = await db.select({ cnt: sql<number>`count(*)::int` }).from(feedComments).where(gte(feedComments.createdAt, sevenDaysAgo));
      const [totalClicks] = await db.select({ cnt: sql<number>`count(*)::int` }).from(affiliateClicks).where(gte(affiliateClicks.createdAt, sevenDaysAgo));

      const activeUsers = await db.execute(sql`
        SELECT COUNT(DISTINCT user_id)::int as cnt FROM activity_events WHERE created_at >= ${sevenDaysAgo}
      `);

      const topBooks = await db.execute(sql`
        SELECT book_title as "bookTitle", book_author as "bookAuthor", COUNT(*)::int as mentions
        FROM activity_events
        WHERE book_title IS NOT NULL AND book_title != '' AND created_at >= ${sevenDaysAgo}
        GROUP BY book_title, book_author
        ORDER BY mentions DESC LIMIT 10
      `);

      const clicksBySource = await db.execute(sql`
        SELECT source, COUNT(*)::int as clicks
        FROM affiliate_clicks
        WHERE created_at >= ${sevenDaysAgo}
        GROUP BY source
      `);

      res.json({
        period: "7d",
        itemsCreated: totalItems?.cnt || 0,
        likes: totalLikes?.cnt || 0,
        comments: totalComments?.cnt || 0,
        affiliateClicks: totalClicks?.cnt || 0,
        activeUsers: (activeUsers.rows?.[0] as any)?.cnt || 0,
        topBooks: topBooks.rows || [],
        clicksBySource: clicksBySource.rows || [],
      });
    } catch (err) {
      console.error("Analytics error:", err);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // ========== ADMIN INDIE SPOTLIGHT ROUTES ==========

  app.get("/api/admin/spotlights", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const spotlights = await storage.getIndieSpotlights();
      res.json(spotlights);
    } catch (err) {
      res.status(500).json({ message: "Failed to load spotlights" });
    }
  });

  app.post("/api/admin/spotlights", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const body = { ...req.body };
      if (body.durationDays && body.startDate) {
        body.endDate = computePlacementEndDate(body.startDate, body.durationDays);
      }
      if (body.durationDays && !body.pricePaid) {
        const price = getPlacementPrice(body.durationDays);
        if (price) body.pricePaid = price;
      }
      const parsed = insertIndieSpotlightSchema.parse(body);
      const spotlight = await storage.createIndieSpotlight(parsed);
      invalidateCachePrefix("/api/spotlights");
      invalidateCachePrefix("/api/featured");
      res.json(spotlight);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: err.errors });
      console.error("Create spotlight error:", err);
      res.status(500).json({ message: "Failed to create spotlight" });
    }
  });

  app.patch("/api/admin/spotlights/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const body = { ...req.body };
      if (body.durationDays && body.startDate) {
        body.endDate = computePlacementEndDate(body.startDate, body.durationDays);
      }
      const parsed = insertIndieSpotlightSchema.partial().parse(body);
      const updated = await storage.updateIndieSpotlight(id, parsed);
      if (!updated) return res.status(404).json({ message: "Spotlight not found" });
      res.json(updated);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: err.errors });
      res.status(500).json({ message: "Failed to update spotlight" });
    }
  });

  app.post("/api/admin/spotlights/:id/extend", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const { additionalDays } = req.body;
      if (!additionalDays || additionalDays < 1) {
        return res.status(400).json({ message: "additionalDays required (positive integer)" });
      }
      const spotlight = await storage.getIndieSpotlight(id);
      if (!spotlight) return res.status(404).json({ message: "Spotlight not found" });

      const extended = computeExtendedEndDate(spotlight.endDate, spotlight.durationDays || 0, additionalDays);
      const updated = await storage.updateIndieSpotlight(id, {
        ...extended,
        isActive: true,
      });
      res.json(updated);
    } catch (err) {
      console.error("Extend spotlight error:", err);
      res.status(500).json({ message: "Failed to extend spotlight" });
    }
  });

  app.post("/api/admin/spotlights/:id/cancel", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateIndieSpotlight(id, {
        isActive: false,
        endDate: new Date(),
      });
      if (!updated) return res.status(404).json({ message: "Spotlight not found" });
      res.json(updated);
    } catch (err) {
      console.error("Cancel spotlight error:", err);
      res.status(500).json({ message: "Failed to cancel spotlight" });
    }
  });

  app.delete("/api/admin/spotlights/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIndieSpotlight(id);
      res.json({ deleted: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete spotlight" });
    }
  });

  app.get("/api/spotlights/active", cacheMiddleware(300), async (_req, res) => {
    try {
      const spotlights = await storage.getActiveIndieSpotlights();
      res.json(spotlights);
    } catch (err) {
      res.status(500).json({ message: "Failed to load spotlights" });
    }
  });

  app.post("/api/spotlight-requests", async (req: any, res) => {
    try {
      const parsed = insertIndieSpotlightRequestSchema.parse(req.body);
      if (!parsed.ownershipConfirmed || !parsed.consentConfirmed) {
        return res.status(400).json({ message: "You must confirm rights ownership and consent to be featured." });
      }
      const request = await storage.createSpotlightRequest(parsed);
      res.json(request);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: err.errors });
      console.error("Spotlight request error:", err);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  app.get("/api/admin/spotlight-requests", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const requests = await storage.getSpotlightRequests();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to load requests" });
    }
  });

  app.patch("/api/admin/spotlight-requests/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateSpotlightRequest(id, req.body);
      if (!updated) return res.status(404).json({ message: "Request not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update request" });
    }
  });

  // ========== INTERVIEW REQUEST ROUTES ==========

  app.post("/api/interview-requests", async (req: any, res) => {
    try {
      const parsed = insertInterviewRequestSchema.parse(req.body);
      if (!parsed.ownershipConfirmed || !parsed.consentConfirmed || !parsed.contactConsent) {
        return res.status(400).json({ message: "Required consent checkboxes must be checked." });
      }
      const request = await storage.createInterviewRequest(parsed);
      res.json(request);
    } catch (err: any) {
      if (err?.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: err.errors });
      console.error("Interview request error:", err);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  app.get("/api/admin/interview-requests", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const status = req.query.status as string | undefined;
      const requests = await storage.getInterviewRequests(status || undefined);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "Failed to load interview requests" });
    }
  });

  app.get("/api/admin/interview-requests/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getInterviewRequest(id);
      if (!request) return res.status(404).json({ message: "Request not found" });
      res.json(request);
    } catch (err) {
      res.status(500).json({ message: "Failed to load interview request" });
    }
  });

  app.patch("/api/admin/interview-requests/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Not authorized" });
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateInterviewRequest(id, req.body);
      if (!updated) return res.status(404).json({ message: "Request not found" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update interview request" });
    }
  });

  // ========== NOTIFICATION ROUTES ==========

  app.get("/api/user/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (err) {
      console.error("Get notifications error:", err);
      res.status(500).json({ message: "Failed to get notifications" });
    }
  });

  app.get("/api/user/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (err) {
      console.error("Get unread count error:", err);
      res.status(500).json({ message: "Failed to get unread count" });
    }
  });

  app.post("/api/user/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Mark notification read error:", err);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post("/api/user/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (err) {
      console.error("Mark all read error:", err);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // ========== AUTHOR BOOK REVIEWS ROUTES ==========

  app.post("/api/author-books/:bookId/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      const { rating, reviewText, pacingRating, charactersRating, writingRating, wouldRecommend } = req.body;
      if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }
      const existing = await storage.getUserReviewForBook(userId, bookId);
      if (existing) {
        return res.status(409).json({ message: "You have already reviewed this book" });
      }
      const book = await storage.getAuthorBook(bookId);
      if (!book) {
        return res.status(404).json({ message: "Book not found" });
      }
      const isVerifiedArc = await storage.hasUserClaimedArc(userId, bookId);
      const displayName = await getEffectiveDisplayName(req);
      const review = await storage.createAuthorBookReview({
        authorBookId: bookId,
        userId,
        userDisplayName: displayName,
        rating,
        reviewText: reviewText || null,
        pacingRating: pacingRating || null,
        charactersRating: charactersRating || null,
        writingRating: writingRating || null,
        wouldRecommend: wouldRecommend ?? null,
        isVerifiedArc,
      });
      await storage.createActivityEvent({
        userId,
        type: "review",
        bookTitle: book.title,
        bookAuthor: null,
        bookCoverUrl: book.coverUrl,
        metadata: JSON.stringify({ authorBookId: bookId, rating }),
      });
      res.status(201).json(review);
    } catch (err) {
      console.error("Create review error:", err);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/author-books/:bookId/reviews", async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      const reviews = await storage.getAuthorBookReviews(bookId);
      res.json(reviews);
    } catch (err) {
      console.error("Get reviews error:", err);
      res.status(500).json({ message: "Failed to get reviews" });
    }
  });

  app.get("/api/author-books/:bookId/reviews/mine", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid book ID" });
      }
      const review = await storage.getUserReviewForBook(userId, bookId);
      res.json(review || null);
    } catch (err) {
      console.error("Get my review error:", err);
      res.status(500).json({ message: "Failed to get review" });
    }
  });

  app.delete("/api/user/reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid review ID" });
      }
      await storage.deleteAuthorBookReview(id);
      res.status(204).send();
    } catch (err) {
      console.error("Delete review error:", err);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // ========== BOOK CLUB ROUTES ==========

  app.post("/api/clubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, description, isPublic, maxMembers, coverImageUrl } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Club name is required" });
      }
      const club = await storage.createBookClub({
        name: name.trim(),
        description: description || null,
        createdBy: userId,
        coverImageUrl: coverImageUrl?.trim() || null,
        isPublic: isPublic !== false,
        maxMembers: maxMembers || 50,
      });
      await storage.joinClub({ clubId: club.id, userId, role: "admin" });
      await storage.createActivityEvent({
        userId,
        type: "club_created",
        metadata: JSON.stringify({ clubId: club.id, clubName: club.name }),
      });
      res.status(201).json(club);
    } catch (err) {
      console.error("Create club error:", err);
      res.status(500).json({ message: "Failed to create club" });
    }
  });

  app.get("/api/clubs", async (_req, res) => {
    try {
      const clubs = await storage.getPublicBookClubs();
      res.json(clubs);
    } catch (err) {
      console.error("Get public clubs error:", err);
      res.status(500).json({ message: "Failed to get clubs" });
    }
  });

  app.get("/api/user/clubs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubs = await storage.getUserBookClubs(userId);
      res.json(clubs);
    } catch (err) {
      console.error("Get user clubs error:", err);
      res.status(500).json({ message: "Failed to get your clubs" });
    }
  });

  app.get("/api/clubs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const club = await storage.getBookClub(id);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      const members = await storage.getClubMembers(id);
      res.json({ ...club, memberCount: members.length });
    } catch (err) {
      console.error("Get club error:", err);
      res.status(500).json({ message: "Failed to get club" });
    }
  });

  app.patch("/api/clubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const role = await storage.getClubMemberRole(id, userId);
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can update club settings" });
      }
      const updated = await storage.updateBookClub(id, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Club not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Update club error:", err);
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  app.delete("/api/clubs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const role = await storage.getClubMemberRole(id, userId);
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete a club" });
      }
      await storage.deleteBookClub(id);
      res.status(204).send();
    } catch (err) {
      console.error("Delete club error:", err);
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  app.delete("/api/admin/clubs/all", async (req: any, res) => {
    try {
      if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteAllClubs();
      res.json({ message: "All clubs deleted" });
    } catch (err) {
      console.error("Admin delete all clubs error:", err);
      res.status(500).json({ message: "Failed to delete all clubs" });
    }
  });

  app.delete("/api/admin/clubs/:id", async (req: any, res) => {
    try {
      if (!(await isAdminAuthorized(req))) return res.status(403).json({ message: "Forbidden" });
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid club ID" });
      await storage.deleteBookClub(id);
      res.status(204).send();
    } catch (err) {
      console.error("Admin delete club error:", err);
      res.status(500).json({ message: "Failed to delete club" });
    }
  });

  app.get("/api/clubs/:id/schedule", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid club ID" });
      const schedule = await storage.getClubReadingSchedule(id);
      res.json(schedule);
    } catch (err) {
      console.error("Get schedule error:", err);
      res.status(500).json({ message: "Failed to get reading schedule" });
    }
  });

  app.put("/api/clubs/:id/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid club ID" });
      const role = await storage.getClubMemberRole(id, userId);
      if (role !== "admin" && role !== "moderator") {
        return res.status(403).json({ message: "Only admins/moderators can edit the schedule" });
      }
      const { weeks } = req.body;
      if (!Array.isArray(weeks)) return res.status(400).json({ message: "Invalid schedule data" });
      await storage.upsertClubReadingSchedule(id, weeks);
      const schedule = await storage.getClubReadingSchedule(id);
      res.json(schedule);
    } catch (err) {
      console.error("Update schedule error:", err);
      res.status(500).json({ message: "Failed to update reading schedule" });
    }
  });

  app.post("/api/clubs/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const club = await storage.getBookClub(id);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      const alreadyMember = await storage.isClubMember(id, userId);
      if (alreadyMember) {
        return res.status(409).json({ message: "Already a member of this club" });
      }
      const members = await storage.getClubMembers(id);
      if (club.maxMembers && members.length >= club.maxMembers) {
        return res.status(400).json({ message: "Club is full" });
      }
      const member = await storage.joinClub({ clubId: id, userId, role: "member" });
      const displayName = await getEffectiveDisplayName(req);
      await storage.createNotification({
        userId: club.createdBy,
        type: "club_join",
        message: `${displayName} joined your club "${club.name}"`,
        fromUserId: userId,
        linkUrl: `/clubs/${id}`,
      });
      res.status(201).json(member);
    } catch (err) {
      console.error("Join club error:", err);
      res.status(500).json({ message: "Failed to join club" });
    }
  });

  app.delete("/api/clubs/:id/leave", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      await storage.leaveClub(id, userId);
      res.status(204).send();
    } catch (err) {
      console.error("Leave club error:", err);
      res.status(500).json({ message: "Failed to leave club" });
    }
  });

  app.get("/api/clubs/:id/members", async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const members = await storage.getClubMembers(id);
      const membersWithInfo = await Promise.all(
        members.map(async (m) => {
          const user = await authStorage.getUser(m.userId);
          return {
            ...m,
            firstName: user?.firstName || null,
            lastName: user?.lastName || null,
            profileImageUrl: user?.profileImageUrl || null,
          };
        })
      );
      res.json(membersWithInfo);
    } catch (err) {
      console.error("Get club members error:", err);
      res.status(500).json({ message: "Failed to get club members" });
    }
  });

  // ========== CLUB DISCUSSION ROUTES ==========

  app.post("/api/clubs/:id/discussions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You must be a club member to post" });
      }
      const { title, content, parentId, chapterStart, chapterEnd, hasSpoilers } = req.body;
      if (!content || typeof content !== "string" || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      const displayName = await getEffectiveDisplayName(req);
      const post = await storage.createClubDiscussion({
        clubId,
        userId,
        userDisplayName: displayName,
        title: title || null,
        content: content.trim(),
        parentId: parentId || null,
        chapterStart: chapterStart ? parseInt(chapterStart) : null,
        chapterEnd: chapterEnd ? parseInt(chapterEnd) : null,
        hasSpoilers: hasSpoilers || false,
      });
      res.status(201).json(post);
    } catch (err) {
      console.error("Create discussion error:", err);
      res.status(500).json({ message: "Failed to create discussion post" });
    }
  });

  app.get("/api/clubs/:id/discussions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You must be a club member to view discussions" });
      }
      const discussions = await storage.getClubDiscussions(clubId);
      res.json(discussions);
    } catch (err) {
      console.error("Get discussions error:", err);
      res.status(500).json({ message: "Failed to get discussions" });
    }
  });

  app.delete("/api/clubs/:id/discussions/:postId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const postId = parseInt(req.params.postId);
      if (isNaN(clubId) || isNaN(postId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const role = await storage.getClubMemberRole(clubId, userId);
      const discussions = await storage.getClubDiscussions(clubId);
      const post = discussions.find(d => d.id === postId);
      if (!post) {
        return res.status(404).json({ message: "Discussion post not found" });
      }
      if (post.userId !== userId && role !== "admin") {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }
      await storage.deleteClubDiscussion(postId);
      res.status(204).send();
    } catch (err) {
      console.error("Delete discussion error:", err);
      res.status(500).json({ message: "Failed to delete discussion post" });
    }
  });

  // ========== CLUB READING BOOKS ROUTES ==========

  app.post("/api/clubs/:id/books", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You must be a club member to nominate books" });
      }
      const { bookTitle, bookAuthor, bookCoverUrl, googleBooksId, status } = req.body;
      if (!bookTitle || typeof bookTitle !== "string") {
        return res.status(400).json({ message: "Book title is required" });
      }
      const book = await storage.addClubReadingBook({
        clubId,
        bookTitle,
        bookAuthor: bookAuthor || "Unknown Author",
        bookCoverUrl: bookCoverUrl || null,
        googleBooksId: googleBooksId || null,
        status: status || "nominated",
        addedBy: userId,
        voteCount: 0,
      });
      res.status(201).json(book);
    } catch (err) {
      console.error("Add club book error:", err);
      res.status(500).json({ message: "Failed to nominate book" });
    }
  });

  app.get("/api/clubs/:id/books", async (req, res) => {
    try {
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) {
        return res.status(400).json({ message: "Invalid club ID" });
      }
      const books = await storage.getClubReadingBooks(clubId);
      res.json(books);
    } catch (err) {
      console.error("Get club books error:", err);
      res.status(500).json({ message: "Failed to get club books" });
    }
  });

  app.patch("/api/clubs/:id/books/:bookId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(clubId) || isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const role = await storage.getClubMemberRole(clubId, userId);
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can update book status" });
      }
      const updated = await storage.updateClubReadingBook(bookId, req.body);
      if (!updated) {
        return res.status(404).json({ message: "Book not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Update club book error:", err);
      res.status(500).json({ message: "Failed to update club book" });
    }
  });

  app.delete("/api/clubs/:id/books/:bookId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(clubId) || isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const role = await storage.getClubMemberRole(clubId, userId);
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can remove books" });
      }
      await storage.deleteClubReadingBook(bookId);
      res.status(204).send();
    } catch (err) {
      console.error("Delete club book error:", err);
      res.status(500).json({ message: "Failed to remove book" });
    }
  });

  app.post("/api/clubs/:id/books/:bookId/vote", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const bookId = parseInt(req.params.bookId as string);
      if (isNaN(clubId) || isNaN(bookId)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) {
        return res.status(403).json({ message: "You must be a club member to vote" });
      }
      const hasVoted = await storage.hasUserVoted(clubId, bookId, userId);
      if (hasVoted) {
        return res.status(409).json({ message: "You have already voted for this book" });
      }
      await storage.addClubVote({ clubId, bookId, userId });
      const books = await storage.getClubReadingBooks(clubId);
      const book = books.find(b => b.id === bookId);
      if (book) {
        await storage.updateClubReadingBook(bookId, { voteCount: (book.voteCount || 0) + 1 });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Vote error:", err);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // ========== CLUB MEETINGS ROUTES ==========

  app.post("/api/clubs/:id/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) return res.status(400).json({ message: "Invalid club ID" });
      const role = await storage.getClubMemberRole(clubId, userId);
      if (!role || role === "member") {
        return res.status(403).json({ message: "Only organizers and moderators can create meetings" });
      }
      const { title, description, meetingDate, location, meetingLink, agenda } = req.body;
      if (!title || !meetingDate) {
        return res.status(400).json({ message: "Title and meeting date are required" });
      }
      const meeting = await storage.createClubMeeting({
        clubId, title, description: description || null,
        meetingDate: new Date(meetingDate),
        location: location || null, meetingLink: meetingLink || null,
        agenda: agenda || null, createdBy: userId,
      });
      res.status(201).json(meeting);
    } catch (err) {
      console.error("Create meeting error:", err);
      res.status(500).json({ message: "Failed to create meeting" });
    }
  });

  app.get("/api/clubs/:id/meetings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) return res.status(400).json({ message: "Invalid club ID" });
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) return res.status(403).json({ message: "You must be a club member" });
      const meetings = await storage.getClubMeetings(clubId);
      const meetingsWithRsvps = await Promise.all(meetings.map(async (m) => {
        const rsvps = await storage.getMeetingRsvps(m.id);
        const userRsvp = rsvps.find(r => r.userId === userId);
        return { ...m, rsvps, rsvpCount: rsvps.filter(r => r.status === "going").length, userRsvpStatus: userRsvp?.status || null };
      }));
      res.json(meetingsWithRsvps);
    } catch (err) {
      console.error("Get meetings error:", err);
      res.status(500).json({ message: "Failed to get meetings" });
    }
  });

  app.delete("/api/clubs/:id/meetings/:meetingId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const meetingId = parseInt(req.params.meetingId as string);
      if (isNaN(clubId) || isNaN(meetingId)) return res.status(400).json({ message: "Invalid ID" });
      const role = await storage.getClubMemberRole(clubId, userId);
      if (!role || role === "member") {
        return res.status(403).json({ message: "Only organizers and moderators can delete meetings" });
      }
      const meetings = await storage.getClubMeetings(clubId);
      if (!meetings.some(m => m.id === meetingId)) {
        return res.status(404).json({ message: "Meeting not found in this club" });
      }
      await storage.deleteClubMeeting(meetingId);
      res.status(204).send();
    } catch (err) {
      console.error("Delete meeting error:", err);
      res.status(500).json({ message: "Failed to delete meeting" });
    }
  });

  app.post("/api/clubs/:id/meetings/:meetingId/rsvp", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      const meetingId = parseInt(req.params.meetingId as string);
      if (isNaN(clubId) || isNaN(meetingId)) return res.status(400).json({ message: "Invalid ID" });
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) return res.status(403).json({ message: "You must be a club member" });
      const meetings = await storage.getClubMeetings(clubId);
      if (!meetings.some(m => m.id === meetingId)) {
        return res.status(404).json({ message: "Meeting not found in this club" });
      }
      const { status } = req.body;
      if (!status || !["going", "maybe", "not_going"].includes(status)) {
        return res.status(400).json({ message: "Status must be going, maybe, or not_going" });
      }
      const rsvp = await storage.upsertMeetingRsvp({ meetingId, userId, status });
      res.json(rsvp);
    } catch (err) {
      console.error("RSVP error:", err);
      res.status(500).json({ message: "Failed to RSVP" });
    }
  });

  // ========== MEMBER PROGRESS ==========

  app.patch("/api/clubs/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const clubId = parseInt(req.params.id as string);
      if (isNaN(clubId)) return res.status(400).json({ message: "Invalid club ID" });
      const isMember = await storage.isClubMember(clubId, userId);
      if (!isMember) return res.status(403).json({ message: "You must be a club member" });
      const { currentChapter, currentPage } = req.body;
      const parsedChapter = currentChapter != null ? parseInt(currentChapter) : undefined;
      const parsedPage = currentPage != null ? parseInt(currentPage) : undefined;
      if ((parsedChapter !== undefined && isNaN(parsedChapter)) || (parsedPage !== undefined && isNaN(parsedPage))) {
        return res.status(400).json({ message: "Invalid chapter or page number" });
      }
      await storage.updateMemberProgress(clubId, userId, {
        currentChapter: parsedChapter,
        currentPage: parsedPage,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Update progress error:", err);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // ========== ANALYTICS ROUTES ==========

  app.post("/api/analytics/event", async (req: any, res) => {
    try {
      const { eventType, authorProfileId, authorBookId, linkType } = req.body;
      if (!eventType) {
        return res.status(400).json({ message: "eventType is required" });
      }
      let visitorId: string | null = null;
      if (req.user && req.user.claims) {
        visitorId = req.user.claims.sub;
      }
      await storage.createAnalyticsEvent({
        eventType,
        authorProfileId: authorProfileId || null,
        authorBookId: authorBookId || null,
        linkType: linkType || null,
        visitorId,
      });
      res.json({ success: true });
    } catch (err) {
      console.error("Analytics event error:", err);
      res.status(500).json({ message: "Failed to log analytics event" });
    }
  });

  app.get("/api/user/author-analytics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getAuthorProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Author profile not found" });
      }
      const analytics = await storage.getAuthorAnalytics(profile.id);
      res.json(analytics);
    } catch (err) {
      console.error("Get author analytics error:", err);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // ========== TBR QUICK-PICK ROUTE ==========

  app.get("/api/user/tbr-pick", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const genre = req.query.genre as string | undefined;
      const maxPages = req.query.maxPages ? parseInt(req.query.maxPages as string) : undefined;
      const mood = req.query.mood as string | undefined;
      const books = await storage.getUserBooks(userId);
      let tbrBooks = books.filter(b => b.status === "want_to_read");
      if (maxPages && !isNaN(maxPages)) {
        tbrBooks = tbrBooks.filter(b => !b.pageCount || b.pageCount <= maxPages);
      }
      if (tbrBooks.length === 0) {
        return res.json(null);
      }
      const randomIndex = Math.floor(Math.random() * tbrBooks.length);
      res.json(tbrBooks[randomIndex]);
    } catch (err) {
      console.error("TBR pick error:", err);
      res.status(500).json({ message: "Failed to get TBR pick" });
    }
  });

  // ========== READING INSIGHTS ROUTE ==========

  app.get("/api/user/reading-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const books = await storage.getUserBooks(userId);
      const finishedBooks = books.filter(b => b.status === "finished");

      const now = new Date();
      const booksPerMonth: { month: string; count: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const count = finishedBooks.filter(b => {
          const finishDateStr = b.dateFinished || (b.dateAdded ? new Date(b.dateAdded).toISOString().split("T")[0] : null);
          if (!finishDateStr) return false;
          const df = new Date(finishDateStr);
          return df.getFullYear() === d.getFullYear() && df.getMonth() === d.getMonth();
        }).length;
        booksPerMonth.push({ month: monthKey, count });
      }

      const genreCounts: Record<string, number> = {};
      for (const book of finishedBooks) {
        if (book.catalogBookId) {
          const catalogBook = await storage.getCatalogBook(book.catalogBookId);
          if (catalogBook) {
            const categories = catalogBook.categories || [];
            const tags = catalogBook.tags || [];
            const primary = derivePrimaryGenre(categories, tags);
            genreCounts[primary] = (genreCounts[primary] || 0) + 1;
          }
        }
      }
      const genreBreakdown = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count);

      let averagePagesPerDay = 0;
      const booksWithDates = finishedBooks.filter(b => b.dateStarted && b.dateFinished && b.pageCount);
      if (booksWithDates.length > 0) {
        let totalPages = 0;
        let totalDays = 0;
        for (const b of booksWithDates) {
          const start = new Date(b.dateStarted!);
          const end = new Date(b.dateFinished!);
          const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
          totalPages += b.pageCount!;
          totalDays += days;
        }
        averagePagesPerDay = totalDays > 0 ? Math.round(totalPages / totalDays) : 0;
      }

      const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
      const topGenres = sortedGenres.map(([g]) => g);
      const uniqueGenreCount = topGenres.length;
      const totalFinished = finishedBooks.length;

      let primaryTrait = "";
      if (topGenres.length > 0) {
        const top = topGenres[0];
        if (top === "Romance") primaryTrait = "Hopeless Romantic";
        else if (top === "Fantasy") primaryTrait = "World Builder";
        else if (top === "Thriller" || top === "Mystery") primaryTrait = "Mystery Seeker";
        else if (top === "Sci-Fi") primaryTrait = "Future Explorer";
        else if (top === "Horror") primaryTrait = "Thrill Seeker";
        else if (top === "Literary Fiction") primaryTrait = "Literary Connoisseur";
        else if (top === "Nonfiction" || top === "Self-Help" || top === "Biography") primaryTrait = "Knowledge Hunter";
        else if (top === "Historical" || top === "Historical Fiction") primaryTrait = "Time Traveler";
        else if (top === "Young Adult") primaryTrait = "Forever Young";
        else if (top === "Poetry") primaryTrait = "Word Weaver";
        else if (top === "Memoir") primaryTrait = "Life Story Lover";
        else if (top === "True Crime") primaryTrait = "Case Cracker";
        else if (top === "Graphic Novel") primaryTrait = "Visual Storyteller";
        else if (top === "Dystopian") primaryTrait = "Rebel Thinker";
        else if (top === "Comedy" || top === "Humor") primaryTrait = "Joy Seeker";
        else if (top === "Contemporary") primaryTrait = "Modern Muser";
        else if (top === "Paranormal") primaryTrait = "Supernatural Scout";
        else primaryTrait = "Eclectic Reader";
      }

      const recentMonths = booksPerMonth.slice(-3);
      const recentTotal = recentMonths.reduce((s, m) => s + m.count, 0);

      let readingPersonality = "Getting Started";
      let personalityTraits: string[] = [];

      if (totalFinished === 0) {
        readingPersonality = "Getting Started";
        personalityTraits = ["Curious Newcomer"];
      } else if (totalFinished <= 3) {
        readingPersonality = primaryTrait || "Casual Reader";
        personalityTraits = [primaryTrait || "Curious Explorer"];
      } else {
        if (uniqueGenreCount >= 5) {
          readingPersonality = "Genre Explorer";
          personalityTraits.push("Genre Adventurer");
        } else if (uniqueGenreCount >= 3) {
          readingPersonality = primaryTrait || "Eclectic Reader";
          personalityTraits.push("Curious Sampler");
        } else {
          readingPersonality = primaryTrait || "Deep Diver";
          personalityTraits.push("Genre Loyalist");
        }

        if (recentTotal >= 6) personalityTraits.push("Speed Demon");
        else if (recentTotal >= 3) personalityTraits.push("Steady Pacer");
        else if (recentTotal >= 1) personalityTraits.push("Mindful Reader");

        if (totalFinished >= 50) personalityTraits.push("Century Challenger");
        else if (totalFinished >= 25) personalityTraits.push("Bookworm");
        else if (totalFinished >= 10) personalityTraits.push("Page Turner");

        if (averagePagesPerDay >= 100) personalityTraits.push("Marathon Reader");
        else if (averagePagesPerDay >= 50) personalityTraits.push("Dedicated Reader");

        if (totalFinished >= 10 && uniqueGenreCount >= 4 && recentTotal >= 3) {
          readingPersonality = "Voracious Reader";
        }
      }

      const topGenreDisplay = topGenres.length > 0 ? topGenres[0] : null;
      const topGenrePercent = sortedGenres.length > 0 && totalFinished > 0
        ? Math.round((sortedGenres[0][1] / totalFinished) * 100)
        : 0;

      res.json({
        booksPerMonth,
        genreBreakdown,
        averagePagesPerDay,
        readingPersonality,
        personalityTraits,
        primaryTrait: primaryTrait || null,
        topGenre: topGenreDisplay,
        topGenrePercent,
        uniqueGenreCount,
        totalFinished,
        recentPace: recentTotal,
      });
    } catch (err) {
      console.error("Reading insights error:", err);
      res.status(500).json({ message: "Failed to get reading insights" });
    }
  });

  // ========== ADMIN FEATURED MANAGEMENT ROUTES ==========

  app.get("/api/admin/featured", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const placements = await storage.getActiveFeaturedPlacements();
      res.json(placements);
    } catch (err) {
      console.error("Get featured error:", err);
      res.status(500).json({ message: "Failed to get featured placements" });
    }
  });

  app.get("/api/placement-pricing", cacheMiddleware(3600), (_req, res) => {
    res.json({
      tiers: PLACEMENT_PRICING_TIERS.map(t => ({
        durationDays: t.durationDays,
        priceInCents: t.price,
        priceFormatted: `$${(t.price / 100).toFixed(0)}`,
      })),
      placementTypes: PLACEMENT_TYPES,
    });
  });

  const placementCheckoutSchema = z.object({
    placementType: z.enum(["spotlight", "frontpage", "search_boost"]),
    durationDays: z.enum(["7", "14", "30"]).transform(Number),
    authorName: z.string().min(1),
    bookTitle: z.string().min(1),
    email: z.string().email(),
    shortBlurb: z.string().min(1),
    coverImageUrl: z.string().optional().default(""),
    buyLinks: z.string().optional().default(""),
    genres: z.string().optional().default(""),
    penName: z.string().optional().default(""),
  });

  app.post("/api/placements/checkout", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = placementCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten().fieldErrors });
      }
      const data = parsed.data;
      const price = getPlacementPrice(data.durationDays);
      if (!price) {
        return res.status(400).json({ message: "Invalid duration selected" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: price,
            product_data: {
              name: `Sponsored ${data.placementType === "frontpage" ? "Frontpage" : data.placementType === "search_boost" ? "Search Boost" : "Spotlight"} Placement — ${data.durationDays} days`,
              description: `${data.bookTitle} by ${data.authorName}`,
            },
          },
          quantity: 1,
        }],
        metadata: {
          itemType: "placement",
          placementType: data.placementType,
          durationDays: String(data.durationDays),
          authorName: data.authorName,
          bookTitle: data.bookTitle,
          email: data.email,
          shortBlurb: data.shortBlurb.slice(0, 500),
          coverImageUrl: data.coverImageUrl,
          buyLinks: data.buyLinks,
          genres: data.genres,
          penName: data.penName,
        },
        customer_email: data.email,
        success_url: `${baseUrl}/placement/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/placement/cancel`,
      });

      res.json({ sessionUrl: session.url });
    } catch (err: any) {
      console.error("Placement checkout error:", err.message || err);
      res.status(500).json({ message: "Failed to create checkout session. Please try again." });
    }
  });

  app.get("/api/user/media-kit-subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const [sub] = await db.select().from(mediaKitSubscriptions)
        .where(eq(mediaKitSubscriptions.userId, userId))
        .orderBy(desc(mediaKitSubscriptions.createdAt))
        .limit(1);
      if (!sub) return res.json({ active: false });
      const isActive = sub.status === "active" && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date();
      res.json({
        active: isActive,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        canceledAt: sub.canceledAt,
        stripeSubscriptionId: sub.stripeSubscriptionId,
      });
    } catch (err) {
      console.error("Media kit subscription check error:", err);
      res.status(500).json({ message: "Failed to check subscription" });
    }
  });

  app.post("/api/media-kit/checkout", isAuthenticated, formSubmitLimiter, rejectBots, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [existing] = await db.select().from(mediaKitSubscriptions)
        .where(and(eq(mediaKitSubscriptions.userId, userId), eq(mediaKitSubscriptions.status, "active")))
        .limit(1);
      if (existing && existing.currentPeriodEnd && new Date(existing.currentPeriodEnd) > new Date()) {
        return res.status(400).json({ message: "You already have an active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0] || req.get("host")}`;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: 999,
            recurring: { interval: "month" },
            product_data: {
              name: "Author Pro — Monthly",
              description: "Up to 5 active ARCs with unlimited downloads, plus the full Media Kit Generator (bios, press releases, social posts, and more).",
            },
          },
          quantity: 1,
        }],
        metadata: {
          itemType: "media_kit_subscription",
          userId,
        },
        success_url: `${baseUrl}/author-dashboard?media_kit=subscribed`,
        cancel_url: `${baseUrl}/author-dashboard?media_kit=cancelled`,
      });

      res.json({ sessionUrl: session.url });
    } catch (err: any) {
      console.error("Media kit checkout error:", err.message || err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/media-kit/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const [sub] = await db.select().from(mediaKitSubscriptions)
        .where(and(eq(mediaKitSubscriptions.userId, userId), eq(mediaKitSubscriptions.status, "active")))
        .limit(1);
      if (!sub) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      const isCouponSub = sub.stripeSubscriptionId?.startsWith("coupon:");
      if (isCouponSub) {
        await db.update(mediaKitSubscriptions)
          .set({ canceledAt: new Date() })
          .where(eq(mediaKitSubscriptions.id, sub.id));
        return res.json({ message: "Subscription will expire at the end of the trial period" });
      }

      if (!sub.stripeSubscriptionId) {
        return res.status(404).json({ message: "No active subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db.update(mediaKitSubscriptions)
        .set({ canceledAt: new Date() })
        .where(eq(mediaKitSubscriptions.id, sub.id));

      res.json({ message: "Subscription will cancel at the end of the billing period" });
    } catch (err: any) {
      console.error("Media kit cancel error:", err.message || err);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/media-kit/redeem-coupon", isAuthenticated, strictLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { code } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ message: "Coupon code required" });
      }

      const VALID_COUPONS: Record<string, { days: number; label: string }> = {
        [process.env.BETA_COUPON_CODE || "betatest26"]: { days: 90, label: "90-day beta trial" },
      };

      const coupon = VALID_COUPONS[code.trim().toLowerCase()];
      if (!coupon) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }

      const [existing] = await db.select().from(mediaKitSubscriptions)
        .where(and(eq(mediaKitSubscriptions.userId, userId), eq(mediaKitSubscriptions.status, "active")))
        .limit(1);
      if (existing && existing.currentPeriodEnd && new Date(existing.currentPeriodEnd) > new Date()) {
        return res.status(400).json({ message: "You already have an active subscription" });
      }

      const alreadyUsed = await db.select().from(mediaKitSubscriptions)
        .where(and(
          eq(mediaKitSubscriptions.userId, userId),
          ilike(mediaKitSubscriptions.stripeSubscriptionId, `coupon:${code.trim().toLowerCase()}%`)
        ))
        .limit(1);
      if (alreadyUsed.length > 0) {
        return res.status(400).json({ message: "This coupon code has already been used on your account" });
      }

      const now = new Date();
      const periodEnd = new Date(now.getTime() + coupon.days * 24 * 60 * 60 * 1000);

      await db.insert(mediaKitSubscriptions).values({
        userId,
        stripeSubscriptionId: `coupon:${code.trim().toLowerCase()}:${userId}`,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      res.json({
        message: `Coupon applied! You have ${coupon.days} days of free access.`,
        expiresAt: periodEnd.toISOString(),
        label: coupon.label,
      });
    } catch (err: any) {
      console.error("Coupon redeem error:", err.message || err);
      res.status(500).json({ message: "Failed to redeem coupon" });
    }
  });

  app.post("/api/admin/featured", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const body = { ...req.body };
      if (body.durationDays && body.startDate) {
        body.endDate = computePlacementEndDate(body.startDate, body.durationDays);
      }
      if (body.durationDays && !body.pricePaid) {
        const price = getPlacementPrice(body.durationDays);
        if (price) body.pricePaid = price;
      }
      const placement = await storage.createFeaturedPlacement(body);
      res.status(201).json(placement);
    } catch (err) {
      console.error("Create featured error:", err);
      res.status(500).json({ message: "Failed to create featured placement" });
    }
  });

  app.patch("/api/admin/featured/:id", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const body = { ...req.body };
      if (body.durationDays && body.startDate) {
        body.endDate = computePlacementEndDate(body.startDate, body.durationDays);
      }
      const updated = await storage.updateFeaturedPlacement(id, body);
      if (!updated) {
        return res.status(404).json({ message: "Featured placement not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Update featured error:", err);
      res.status(500).json({ message: "Failed to update featured placement" });
    }
  });

  app.post("/api/admin/featured/:id/extend", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const { additionalDays } = req.body;
      if (!additionalDays || additionalDays < 1) {
        return res.status(400).json({ message: "additionalDays required (positive integer)" });
      }

      const existing = await storage.updateFeaturedPlacement(id, {});
      if (!existing) return res.status(404).json({ message: "Placement not found" });

      const extended = computeExtendedEndDate(existing.endDate, existing.durationDays || 0, additionalDays);
      const updated = await storage.updateFeaturedPlacement(id, {
        ...extended,
        isActive: true,
      });
      res.json(updated);
    } catch (err) {
      console.error("Extend featured error:", err);
      res.status(500).json({ message: "Failed to extend placement" });
    }
  });

  app.post("/api/admin/featured/:id/cancel", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

      const updated = await storage.updateFeaturedPlacement(id, {
        isActive: false,
        endDate: new Date(),
      });
      if (!updated) return res.status(404).json({ message: "Placement not found" });
      res.json(updated);
    } catch (err) {
      console.error("Cancel featured error:", err);
      res.status(500).json({ message: "Failed to cancel placement" });
    }
  });

  app.delete("/api/admin/featured/:id", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      await storage.deleteFeaturedPlacement(id);
      res.status(204).send();
    } catch (err) {
      console.error("Delete featured error:", err);
      res.status(500).json({ message: "Failed to delete featured placement" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      if (!(await isAdminAuthorized(req))) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const totalCatalogBooks = await storage.getCatalogBookCount();
      const allClubs = await storage.getPublicBookClubs();
      res.json({
        totalCatalogBooks,
        totalClubs: allClubs.length,
      });
    } catch (err) {
      console.error("Get admin stats error:", err);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // ========== SEO ROUTES ==========

  app.get("/sitemap.xml", cacheMiddleware(3600), async (req, res) => {
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = `${proto}://${req.headers.host}`;
    const today = new Date().toISOString().split("T")[0];
    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily", lastmod: today },
      { loc: "/quiz", priority: "0.9", changefreq: "weekly", lastmod: today },
      { loc: "/discover", priority: "0.85", changefreq: "daily", lastmod: today },
      { loc: "/featured", priority: "0.8", changefreq: "daily", lastmod: today },
      { loc: "/similar", priority: "0.7", changefreq: "weekly", lastmod: today },
      { loc: "/clubs", priority: "0.7", changefreq: "daily", lastmod: today },
      { loc: "/feed", priority: "0.6", changefreq: "daily", lastmod: today },
      { loc: "/book-reviews", priority: "0.6", changefreq: "daily", lastmod: today },
      { loc: "/interviews", priority: "0.6", changefreq: "weekly", lastmod: today },
      { loc: "/shop", priority: "0.5", changefreq: "weekly", lastmod: today },
      { loc: "/kids", priority: "0.5", changefreq: "monthly", lastmod: today },
      { loc: "/privacy", priority: "0.3", changefreq: "monthly", lastmod: today },
      { loc: "/updates", priority: "0.4", changefreq: "monthly", lastmod: today },
    ];

    let authorPages: { loc: string; priority: string; changefreq: string; lastmod: string }[] = [];
    try {
      const authors = await storage.getAllAuthorProfiles();
      authorPages = authors
        .filter((a: any) => a.slug)
        .map((a: any) => ({
          loc: `/authors/${a.slug}`,
          priority: "0.6",
          changefreq: "weekly",
          lastmod: a.updatedAt ? new Date(a.updatedAt).toISOString().split("T")[0] : today,
        }));
    } catch {}

    const allPages = [...staticPages, ...authorPages];
    const urls = allPages
      .map(
        (p) =>
          `  <url>\n    <loc>${host}${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
      )
      .join("\n");

    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  });

  app.get("/api/stripe/config", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error: any) {
      console.error("Error getting Stripe config:", error.message);
      res.status(500).json({ message: "Payment system unavailable" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.name
      `);
      res.json({ products: result.rows });
    } catch (error: any) {
      console.error("Error listing Stripe products:", error.message);
      res.status(500).json({ message: "Could not load products" });
    }
  });


  // ========== AD REQUEST SUBMISSION ENDPOINT ==========
  const adRequestSchema = z.object({
    authorName: z.string().min(1),
    bookTitle: z.string().min(1),
    genre: z.string().min(1),
    adType: z.enum(["homepage", "spotlight", "featured"]),
    featuredPlacement: z.boolean().optional().default(false),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    notes: z.string().optional().default(""),
    contactEmail: z.string().email(),
  });

  app.post("/api/submit-ad-request", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = adRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        return res.status(400).json({ message: "Please fill in all required fields.", errors });
      }
      const data = parsed.data;
      const id = crypto.randomUUID();
      const [adRequest] = await db.insert(adRequests).values({
        id,
        authorName: data.authorName,
        bookTitle: data.bookTitle,
        genre: data.genre,
        adType: data.adType,
        featuredPlacement: data.featuredPlacement,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
        contactEmail: data.contactEmail,
        status: "new",
      }).returning();
      console.log("New ad request submitted");
      res.status(201).json({ message: "Your advertising request has been submitted!", adRequest });
    } catch (err) {
      console.error("Ad request submission error:", err);
      res.status(500).json({ message: "Failed to submit ad request. Please try again." });
    }
  });

  // ========== ADMIN AD REQUEST ENDPOINTS ==========
  app.get("/api/admin/ad-requests", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const statusFilter = req.query.status as string | undefined;
      let results;
      if (statusFilter && AD_REQUEST_STATUSES.includes(statusFilter as any)) {
        results = await db.select().from(adRequests).where(eq(adRequests.status, statusFilter)).orderBy(desc(adRequests.createdAt));
      } else {
        results = await db.select().from(adRequests).orderBy(desc(adRequests.createdAt));
      }
      res.json(results);
    } catch (err) {
      console.error("Get ad requests error:", err);
      res.status(500).json({ message: "Failed to load ad requests" });
    }
  });

  app.post("/api/admin/ad-requests/:id/status", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !AD_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${AD_REQUEST_STATUSES.join(", ")}` });
    }
    try {
      const [updated] = await db.update(adRequests).set({ status }).where(eq(adRequests.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Ad request not found." });
      res.json({ message: `Status updated to "${status}".`, adRequest: updated });
    } catch (err) {
      console.error("Update ad status error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.post("/api/approve-ad-request/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    try {
      const [existing] = await db.select().from(adRequests).where(eq(adRequests.id, id));
      if (!existing) return res.status(404).json({ message: "Ad request not found." });

      const amount = getAmountForItem("ad", existing.adType);
      const stripeLink = await createStripeLink("ad", id, amount);

      const [updated] = await db.update(adRequests).set({
        status: "approved-pending-payment",
        stripeLink,
        paymentAmount: amount,
      }).where(eq(adRequests.id, id)).returning();

      const payments = readPayments();
      payments.push({
        id: crypto.randomUUID(),
        itemType: "ad",
        itemId: id,
        amount,
        status: "pending",
        url: stripeLink,
        createdAt: new Date().toISOString(),
      });
      writePayments(payments);

      console.log(`Ad request ID [${id}] approved—Stripe link generated`);
      res.json({ message: "Ad request approved.", stripeLink, adRequest: updated });
    } catch (err: any) {
      console.error("Failed to create Stripe link for ad:", err.message);
      res.status(500).json({ message: "Failed to create payment link. Please try again." });
    }
  });

  app.post("/api/decline-ad-request/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    try {
      const [updated] = await db.update(adRequests).set({ status: "declined" }).where(eq(adRequests.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Ad request not found." });
      res.json({ message: "Ad request declined.", adRequest: updated });
    } catch (err) {
      console.error("Decline ad request error:", err);
      res.status(500).json({ message: "Failed to decline ad request" });
    }
  });

  const adUpdateSchema = z.object({
    amazonAffiliateUrl: z.string().nullable().optional(),
    adminNotes: z.string().nullable().optional(),
    scheduledStartDate: z.string().nullable().optional(),
    scheduledEndDate: z.string().nullable().optional(),
  });

  app.patch("/api/admin/ad-requests/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const parsed = adUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid data.", errors: parsed.error.flatten().fieldErrors });
    }
    try {
      const updates: any = {};
      if (parsed.data.amazonAffiliateUrl !== undefined) updates.amazonAffiliateUrl = parsed.data.amazonAffiliateUrl;
      if (parsed.data.adminNotes !== undefined) updates.adminNotes = parsed.data.adminNotes;
      if (parsed.data.scheduledStartDate !== undefined) updates.scheduledStartDate = parsed.data.scheduledStartDate;
      if (parsed.data.scheduledEndDate !== undefined) updates.scheduledEndDate = parsed.data.scheduledEndDate;

      const [updated] = await db.update(adRequests).set(updates).where(eq(adRequests.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Ad request not found." });
      res.json({ message: "Ad request updated.", adRequest: updated });
    } catch (err) {
      console.error("Update ad request error:", err);
      res.status(500).json({ message: "Failed to update ad request" });
    }
  });

  // ========== AUTHOR BOOK SUBMISSION ENDPOINT ==========
  app.post("/api/submit-book", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = insertBookSubmissionSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        const missing = Object.entries(errors)
          .filter(([_, msgs]) => msgs && msgs.length > 0)
          .map(([field]) => field);
        return res.status(400).json({
          message: `Please fill in all required fields: ${missing.join(", ")}`,
          errors,
        });
      }

      const data = parsed.data;
      if (!data.authorName?.trim() || !data.bookTitle?.trim() || !data.genre?.trim() || !data.blurb?.trim() || !data.contactEmail?.trim()) {
        return res.status(400).json({ message: "Author name, book title, genre, blurb, and contact email are required." });
      }

      const submission = await storage.createBookSubmission({
        authorName: data.authorName.trim(),
        penName: data.penName?.trim() || null,
        bookTitle: data.bookTitle.trim(),
        genre: data.genre.trim(),
        blurb: data.blurb.trim(),
        tropes: data.tropes?.trim() || null,
        releaseDate: data.releaseDate?.trim() || null,
        amazonLink: data.amazonLink?.trim() || null,
        goodreadsLink: data.goodreadsLink?.trim() || null,
        contactEmail: data.contactEmail.trim(),
      });

      console.log("New author submission saved");
      res.status(201).json({ message: "Thank you, your book has been submitted!", submission });
    } catch (err) {
      console.error("Book submission error:", err);
      res.status(500).json({ message: "Failed to submit book. Please try again." });
    }
  });

  // ========== NEWSLETTER FEATURE REQUEST FILE STORAGE ==========
  const NEWSLETTER_REQUESTS_PATH = path.join(process.cwd(), "data", "newsletterRequests.json");

  function readNewsletterRequests(): any[] {
    try {
      if (!fs.existsSync(NEWSLETTER_REQUESTS_PATH)) {
        fs.mkdirSync(path.dirname(NEWSLETTER_REQUESTS_PATH), { recursive: true });
        fs.writeFileSync(NEWSLETTER_REQUESTS_PATH, "[]", "utf-8");
        return [];
      }
      const raw = fs.readFileSync(NEWSLETTER_REQUESTS_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function writeNewsletterRequests(data: any[]) {
    fs.mkdirSync(path.dirname(NEWSLETTER_REQUESTS_PATH), { recursive: true });
    fs.writeFileSync(NEWSLETTER_REQUESTS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  // ========== NEWSLETTER FEATURE REQUEST SUBMISSION ==========
  const newsletterRequestSchema = z.object({
    bookTitle: z.string().min(1),
    authorName: z.string().min(1),
    firstChapter: z.string().min(1),
    contactEmail: z.string().email(),
  });

  app.post("/api/submit-newsletter-request", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = newsletterRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        return res.status(400).json({ message: "Please fill in all required fields.", errors });
      }
      const data = parsed.data;
      const nlRequest = {
        id: crypto.randomUUID(),
        ...data,
        status: "pending",
        timestamp: new Date().toISOString(),
      };
      const requests = readNewsletterRequests();
      requests.push(nlRequest);
      writeNewsletterRequests(requests);
      console.log("New newsletter request submitted");
      res.status(201).json({ message: "Your newsletter feature request has been submitted!", newsletterRequest: nlRequest });
    } catch (err) {
      console.error("Newsletter request submission error:", err);
      res.status(500).json({ message: "Failed to submit newsletter request. Please try again." });
    }
  });

  // ========== ADMIN NEWSLETTER REQUEST ENDPOINTS ==========
  app.get("/api/admin/newsletter-requests", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const requests = readNewsletterRequests();
    res.json(requests);
  });

  app.post("/api/approve-newsletter-request/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const requests = readNewsletterRequests();
    const idx = requests.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Newsletter request not found." });
    }
    try {
      const amount = getAmountForItem("newsletter", null);
      const stripeLink = await createStripeLink("newsletter", id, amount);
      requests[idx].status = "approved-pending-payment";
      requests[idx].stripeLink = stripeLink;
      requests[idx].paymentAmount = amount;
      writeNewsletterRequests(requests);

      const payments = readPayments();
      payments.push({
        id: crypto.randomUUID(),
        itemType: "newsletter",
        itemId: id,
        amount,
        status: "pending",
        url: stripeLink,
        createdAt: new Date().toISOString(),
      });
      writePayments(payments);

      console.log(`Newsletter request [${id}] approved — Stripe link created`);
      res.json({ message: "Newsletter request approved.", stripeLink, newsletterRequest: requests[idx] });
    } catch (err: any) {
      console.error("Failed to create Stripe link for newsletter:", err.message);
      res.status(500).json({ message: "Failed to create payment link. Please try again." });
    }
  });

  app.post("/api/decline-newsletter-request/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const requests = readNewsletterRequests();
    const idx = requests.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Newsletter request not found." });
    }
    requests[idx].status = "declined";
    writeNewsletterRequests(requests);
    res.json({ message: "Newsletter request declined.", newsletterRequest: requests[idx] });
  });

  // ========== PAYMENT FILE STORAGE HELPERS ==========
  const PAYMENTS_PATH = path.join(process.cwd(), "data", "payments.json");

  function readPayments(): any[] {
    try {
      if (!fs.existsSync(PAYMENTS_PATH)) {
        fs.mkdirSync(path.dirname(PAYMENTS_PATH), { recursive: true });
        fs.writeFileSync(PAYMENTS_PATH, "[]", "utf-8");
        return [];
      }
      const raw = fs.readFileSync(PAYMENTS_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function writePayments(data: any[]) {
    fs.mkdirSync(path.dirname(PAYMENTS_PATH), { recursive: true });
    fs.writeFileSync(PAYMENTS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  // ========== PAYMENT ENDPOINTS ==========
  app.get("/api/admin/payments", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const payments = readPayments();
    res.json(payments);
  });

  app.get("/api/payment-status/:id", async (req, res) => {
    const { id } = req.params;
    const payments = readPayments();
    const payment = payments.find((p: any) => p.id === id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found." });
    }
    res.json(payment);
  });

  // ========== ADMIN DASHBOARD STATS ENDPOINT ==========
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      console.log("Unauthorized admin access blocked");
      return res.status(403).json({ message: "Access Denied" });
    }
    console.log("Admin dashboard accessed by Aremi9110");
    try {
      const submissions = await (async () => {
        try {
          const result = await db.execute(sql`SELECT COUNT(*) as count FROM book_submissions`);
          return Number(result.rows?.[0]?.count || 0);
        } catch { return 0; }
      })();

      const allAdRequests = await db.select().from(adRequests);
      const newsletterRequests = readNewsletterRequests();
      const payments = readPayments();
      const subs = readSubscribers();

      res.json({
        bookSubmissions: submissions,
        adRequests: {
          total: allAdRequests.length,
          new: allAdRequests.filter(r => r.status === "new").length,
          reviewing: allAdRequests.filter(r => r.status === "reviewing").length,
          needsInfo: allAdRequests.filter(r => r.status === "needs-info").length,
          approved: allAdRequests.filter(r => r.status === "approved").length,
          scheduled: allAdRequests.filter(r => r.status === "scheduled").length,
          live: allAdRequests.filter(r => r.status === "live").length,
          ended: allAdRequests.filter(r => r.status === "ended").length,
          declined: allAdRequests.filter(r => r.status === "declined").length,
          pending: allAdRequests.filter(r => ["new", "reviewing", "needs-info"].includes(r.status)).length,
        },
        newsletterRequests: {
          total: newsletterRequests.length,
          pending: newsletterRequests.filter((r: any) => r.status === "pending").length,
          approved: newsletterRequests.filter((r: any) => r.status === "approved-pending-payment").length,
          paid: newsletterRequests.filter((r: any) => r.status === "paid").length,
          declined: newsletterRequests.filter((r: any) => r.status === "declined").length,
        },
        subscribers: {
          total: subs.length,
          communityCorner: subs.filter((s: any) => s.subscriptions?.includes("Community Corner")).length,
          firstChapterFriday: subs.filter((s: any) => s.subscriptions?.includes("First Chapter Friday")).length,
        },
        payments: {
          total: payments.length,
          pending: payments.filter((p: any) => p.status === "pending").length,
          completed: payments.filter((p: any) => p.status === "paid").length,
        },
      });
    } catch (err) {
      console.error("Dashboard stats error:", err);
      res.status(500).json({ message: "Failed to load dashboard stats." });
    }
  });

  // ========== SUBSCRIBER FILE STORAGE HELPERS ==========
  const SUBSCRIBERS_PATH = path.join(process.cwd(), "data", "subscribers.json");

  function readSubscribers(): any[] {
    try {
      if (!fs.existsSync(SUBSCRIBERS_PATH)) {
        fs.mkdirSync(path.dirname(SUBSCRIBERS_PATH), { recursive: true });
        fs.writeFileSync(SUBSCRIBERS_PATH, "[]", "utf-8");
        return [];
      }
      const raw = fs.readFileSync(SUBSCRIBERS_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function writeSubscribers(data: any[]) {
    fs.mkdirSync(path.dirname(SUBSCRIBERS_PATH), { recursive: true });
    fs.writeFileSync(SUBSCRIBERS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  // ========== NEWSLETTER SUBSCRIPTION ENDPOINT ==========
  const VALID_NEWSLETTERS = ["Community Corner", "First Chapter Friday"] as const;

  const subscribeSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    subscriptions: z.array(z.enum(VALID_NEWSLETTERS)).min(1, "Please select at least one newsletter."),
  });

  app.post("/api/subscribe", formSubmitLimiter, rejectBots, async (req, res) => {
    try {
      const parsed = subscribeSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        return res.status(400).json({ message: "Please fill in all required fields.", errors });
      }
      const data = parsed.data;
      const subscribers = readSubscribers();
      const existingIdx = subscribers.findIndex((s: any) => s.email.toLowerCase() === data.email.toLowerCase());
      if (existingIdx !== -1) {
        return res.status(409).json({ message: "This email is already subscribed to our newsletters." });
      }
      const subscriber = {
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email,
        subscriptions: data.subscriptions,
        joinedAt: new Date().toISOString(),
      };
      subscribers.push(subscriber);
      writeSubscribers(subscribers);
      console.log("New subscriber added");
      res.status(201).json({ message: "You've been added to our newsletter!", subscriber });
    } catch (err) {
      console.error("Subscription error:", err);
      res.status(500).json({ message: "Failed to subscribe. Please try again." });
    }
  });

  // ========== ADMIN SUBSCRIBER / SEND NEWSLETTER ENDPOINTS ==========
  app.get("/api/admin/subscribers", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const subscribers = readSubscribers();
    res.json(subscribers);
  });

  const sendNewsletterSchema = z.object({
    newsletterType: z.enum(VALID_NEWSLETTERS),
    subject: z.string().min(1),
    content: z.string().min(1),
  });

  app.post("/api/admin/send-newsletter", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const parsed = sendNewsletterSchema.safeParse(req.body);
      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        return res.status(400).json({ message: "Please fill in all required fields.", errors });
      }
      const { newsletterType, subject, content } = parsed.data;
      const subscribers = readSubscribers();
      const recipients = subscribers.filter((s: any) => s.subscriptions.includes(newsletterType));
      if (recipients.length === 0) {
        return res.status(404).json({ message: `No subscribers found for "${newsletterType}".` });
      }
      const sentCount = sendNewsletter(recipients, subject, content, newsletterType);
      res.json({ message: `Newsletter sent to ${sentCount} subscribers.`, sentCount });
    } catch (err) {
      console.error("Send newsletter error:", err);
      res.status(500).json({ message: "Failed to send newsletter. Please try again." });
    }
  });

  // ========== ARC FILE UPLOAD SYSTEM ==========
  const ARC_FILES_PATH = path.join(process.cwd(), "data", "arcFiles.json");
  const ARC_ORIGINALS_DIR = path.join(process.cwd(), "uploads", "arcs", "original");
  const ARC_WATERMARKED_DIR = path.join(process.cwd(), "uploads", "arcs", "watermarked");

  function readArcFiles(): any[] {
    try {
      if (!fs.existsSync(ARC_FILES_PATH)) {
        fs.mkdirSync(path.dirname(ARC_FILES_PATH), { recursive: true });
        fs.writeFileSync(ARC_FILES_PATH, "[]", "utf-8");
        return [];
      }
      const raw = fs.readFileSync(ARC_FILES_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function writeArcFiles(data: any[]) {
    fs.mkdirSync(path.dirname(ARC_FILES_PATH), { recursive: true });
    fs.writeFileSync(ARC_FILES_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  fs.mkdirSync(ARC_ORIGINALS_DIR, { recursive: true });
  fs.mkdirSync(ARC_WATERMARKED_DIR, { recursive: true });

  function sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_\- ]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 80);
  }

  const arcUpload = multer({
    dest: ARC_ORIGINALS_DIR,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF files are allowed."));
      }
    },
  });

  async function watermarkPdf(
    inputPath: string,
    outputPath: string,
    watermarkText: string
  ): Promise<void> {
    const existingPdfBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const fontSize = Math.min(width, height) * 0.04;
      const textWidth = helveticaFont.widthOfTextAtSize(watermarkText, fontSize);

      page.drawText(watermarkText, {
        x: width / 2 - textWidth / 2,
        y: height / 2,
        size: fontSize,
        font: helveticaFont,
        color: rgb(0.75, 0.75, 0.75),
        rotate: degrees(45),
        opacity: 0.3,
      });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
  }

  app.post("/api/arc-upload", arcUpload.single("arcFile"), async (req: any, res) => {
    try {
      const { authorName, bookTitle } = req.body;

      if (!authorName?.trim() || !bookTitle?.trim()) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Author name and book title are required." });
      }

      if (!req.file) {
        return res.status(400).json({ message: "A PDF file is required." });
      }

      const safeName = sanitizeFilename(bookTitle);
      const uniqueName = `${safeName}-${Date.now()}.pdf`;
      const originalPath = path.join(ARC_ORIGINALS_DIR, uniqueName);
      fs.renameSync(req.file.path, originalPath);

      const watermarkedPath = path.join(ARC_WATERMARKED_DIR, uniqueName);
      const watermarkText = `ARC - ${authorName.trim()}`;
      await watermarkPdf(originalPath, watermarkedPath, watermarkText);
      console.log(`Watermarked ARC generated for ${bookTitle}`);

      const arcEntry = {
        id: crypto.randomUUID(),
        authorName: authorName.trim(),
        bookTitle: bookTitle.trim(),
        originalPath: `uploads/arcs/original/${uniqueName}`,
        watermarkedPath: `uploads/arcs/watermarked/${uniqueName}`,
        uploadedAt: new Date().toISOString(),
      };

      const arcFiles = readArcFiles();
      arcFiles.push(arcEntry);
      writeArcFiles(arcFiles);
      console.log(`ARC uploaded for ${bookTitle}`);

      res.json({
        message: "ARC uploaded and watermarked successfully.",
        id: arcEntry.id,
        downloadUrl: `/arc-download/${arcEntry.id}`,
      });
    } catch (err: any) {
      console.error("ARC upload error:", err);
      if (err.message === "Only PDF files are allowed.") {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: "Failed to process ARC upload." });
    }
  });

  app.get("/api/admin/arcs", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const arcFiles = readArcFiles();
    res.json(arcFiles);
  });

  app.get("/arc-download/:id", async (req, res) => {
    const { id } = req.params;
    const arcFiles = readArcFiles();
    const arc = arcFiles.find((a: any) => a.id === id);

    if (!arc) {
      return res.status(404).json({ message: "ARC not found." });
    }

    const filePath = path.join(process.cwd(), arc.watermarkedPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "ARC file not found on server." });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${sanitizeFilename(arc.bookTitle)}-ARC.pdf"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });

  app.delete("/api/admin/arcs/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const arcFiles = readArcFiles();
    const idx = arcFiles.findIndex((a: any) => a.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "ARC not found." });
    }
    const arc = arcFiles[idx];
    try {
      const origPath = path.join(process.cwd(), arc.originalPath);
      const waterPath = path.join(process.cwd(), arc.watermarkedPath);
      if (fs.existsSync(origPath)) fs.unlinkSync(origPath);
      if (fs.existsSync(waterPath)) fs.unlinkSync(waterPath);
    } catch {}
    arcFiles.splice(idx, 1);
    writeArcFiles(arcFiles);
    res.json({ message: "ARC deleted." });
  });

  // ========== AFFILIATE RESOURCES SYSTEM ==========
  const RESOURCES_PATH = path.join(process.cwd(), "data", "resources.json");

  function readResources(): any[] {
    try {
      if (!fs.existsSync(RESOURCES_PATH)) {
        fs.mkdirSync(path.dirname(RESOURCES_PATH), { recursive: true });
        fs.writeFileSync(RESOURCES_PATH, "[]", "utf-8");
        return [];
      }
      const raw = fs.readFileSync(RESOURCES_PATH, "utf-8");
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  function writeResources(data: any[]) {
    fs.mkdirSync(path.dirname(RESOURCES_PATH), { recursive: true });
    fs.writeFileSync(RESOURCES_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  function isValidUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }

  app.get("/api/resources", (_req, res) => {
    const resources = readResources();
    res.json(resources);
  });

  app.get("/api/admin/resources", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const resources = readResources();
    res.json(resources);
  });

  app.post("/api/admin/resources", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { title, category, description, affiliateLink, isAffiliate, image } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    if (!category?.trim()) {
      return res.status(400).json({ message: "Category is required." });
    }
    if (affiliateLink && !isValidUrl(affiliateLink)) {
      return res.status(400).json({ message: "Invalid URL for affiliate link." });
    }
    if (image && !isValidUrl(image)) {
      return res.status(400).json({ message: "Invalid URL for image." });
    }

    const entry = {
      id: crypto.randomUUID(),
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      affiliateLink: affiliateLink?.trim() || "",
      isAffiliate: !!isAffiliate,
      image: image?.trim() || "",
      createdAt: new Date().toISOString(),
    };

    const resources = readResources();
    resources.push(entry);
    writeResources(resources);
    console.log(`Resource added – ${entry.title}`);
    res.json(entry);
  });

  app.put("/api/admin/resources/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const { title, category, description, affiliateLink, isAffiliate, image } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ message: "Title and description are required." });
    }
    if (!category?.trim()) {
      return res.status(400).json({ message: "Category is required." });
    }
    if (affiliateLink && !isValidUrl(affiliateLink)) {
      return res.status(400).json({ message: "Invalid URL for affiliate link." });
    }
    if (image && !isValidUrl(image)) {
      return res.status(400).json({ message: "Invalid URL for image." });
    }

    const resources = readResources();
    const idx = resources.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Resource not found." });
    }

    resources[idx] = {
      ...resources[idx],
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      affiliateLink: affiliateLink?.trim() || "",
      isAffiliate: !!isAffiliate,
      image: image?.trim() || "",
    };

    writeResources(resources);
    console.log(`Resource updated – ${title.trim()}`);
    res.json(resources[idx]);
  });

  app.delete("/api/admin/resources/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const resources = readResources();
    const idx = resources.findIndex((r: any) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Resource not found." });
    }
    const deleted = resources.splice(idx, 1)[0];
    writeResources(resources);
    console.log(`Resource deleted – ${deleted.title}`);
    res.json({ message: "Resource deleted." });
  });

  // Disclosure config endpoint (public, no login required)
  const DISCLOSURE_CONFIG_PATH = path.join(process.cwd(), "data", "disclosureConfig.json");

  app.get("/api/disclosure-config", (_req, res) => {
    try {
      if (fs.existsSync(DISCLOSURE_CONFIG_PATH)) {
        const raw = fs.readFileSync(DISCLOSURE_CONFIG_PATH, "utf-8");
        res.json(JSON.parse(raw));
      } else {
        res.json({});
      }
    } catch {
      res.json({});
    }
  });

  // Transparency metrics for admin dashboard
  app.get("/api/admin/transparency-stats", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const paidAdResults = await db.select().from(adRequests).where(eq(adRequests.status, "paid"));
      const paidAds = paidAdResults.length;

      // Count paid newsletter requests
      const nlPath = path.join(process.cwd(), "data", "newsletterRequests.json");
      let paidNewsletters = 0;
      if (fs.existsSync(nlPath)) {
        const nls = JSON.parse(fs.readFileSync(nlPath, "utf-8"));
        paidNewsletters = nls.filter((n: any) => n.status === "paid").length;
      }

      // Count affiliate resources
      const resources = readResources();
      const affiliateCount = resources.filter((r: any) => r.isAffiliate).length;

      console.log("Transparency metrics updated");
      res.json({
        paidItems: paidAds + paidNewsletters,
        paidAds,
        paidNewsletters,
        affiliateResources: affiliateCount,
        totalResources: resources.length,
      });
    } catch {
      res.json({ paidItems: 0, paidAds: 0, paidNewsletters: 0, affiliateResources: 0, totalResources: 0 });
    }
  });

  app.post("/api/resources/:id/click", (req, res) => {
    const { id } = req.params;
    const resources = readResources();
    const resource = resources.find((r: any) => r.id === id);
    if (resource) {
      console.log(`Affiliate link clicked for resource ${resource.id}`);
    }
    res.json({ ok: true });
  });

  // ========== INDIE AUTHOR INTERVIEWS SYSTEM ==========
  const INTERVIEWS_PATH = path.join(process.cwd(), "data", "interviews.json");
  const INTERVIEW_COMMENTS_PATH = path.join(process.cwd(), "data", "interviewComments.json");
  const INTERVIEW_UPLOADS_DIR = path.join(process.cwd(), "uploads", "interviews");

  fs.mkdirSync(INTERVIEW_UPLOADS_DIR, { recursive: true });

  function readInterviews(): any[] {
    try {
      if (!fs.existsSync(INTERVIEWS_PATH)) {
        fs.writeFileSync(INTERVIEWS_PATH, "[]", "utf-8");
        return [];
      }
      return JSON.parse(fs.readFileSync(INTERVIEWS_PATH, "utf-8"));
    } catch { return []; }
  }

  function writeInterviews(data: any[]) {
    fs.writeFileSync(INTERVIEWS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  function readInterviewComments(): any[] {
    try {
      if (!fs.existsSync(INTERVIEW_COMMENTS_PATH)) {
        fs.writeFileSync(INTERVIEW_COMMENTS_PATH, "[]", "utf-8");
        return [];
      }
      return JSON.parse(fs.readFileSync(INTERVIEW_COMMENTS_PATH, "utf-8"));
    } catch { return []; }
  }

  function writeInterviewComments(data: any[]) {
    fs.writeFileSync(INTERVIEW_COMMENTS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  const interviewImageUpload = multer({
    dest: INTERVIEW_UPLOADS_DIR,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/jpg"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG and PNG images are allowed."));
      }
    },
  });

  app.get("/api/interviews", (_req, res) => {
    const interviews = readInterviews().filter((i: any) => i.status === "published");
    res.json(interviews);
  });

  app.get("/api/interviews/:id", (req, res) => {
    const { id } = req.params;
    const interviews = readInterviews();
    const interview = interviews.find((i: any) => i.id === id);
    if (!interview) {
      return res.status(404).json({ message: "Interview not found." });
    }
    if (interview.status !== "published") {
      return res.status(404).json({ message: "Interview not found." });
    }
    res.json(interview);
  });

  app.get("/api/interviews/:id/comments", (req, res) => {
    const { id } = req.params;
    const comments = readInterviewComments().filter((c: any) => c.interviewId === id);
    comments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(comments);
  });

  app.post("/api/interview-comment/:interviewId", strictLimiter, (req, res) => {
    const { interviewId } = req.params;
    const { username, comment } = req.body;

    if (!comment?.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty." });
    }
    if (!username?.trim()) {
      return res.status(400).json({ message: "Username is required." });
    }
    if (comment.trim().length > 2000) {
      return res.status(400).json({ message: "Comment is too long (max 2000 characters)." });
    }
    if (username.trim().length > 50) {
      return res.status(400).json({ message: "Username is too long (max 50 characters)." });
    }

    const interviews = readInterviews();
    if (!interviews.find((i: any) => i.id === interviewId)) {
      return res.status(404).json({ message: "Interview not found." });
    }

    const entry = {
      id: crypto.randomUUID(),
      interviewId,
      username: escapeHtml(username.trim()),
      comment: escapeHtml(comment.trim()),
      createdAt: new Date().toISOString(),
    };

    const comments = readInterviewComments();
    comments.push(entry);
    writeInterviewComments(comments);
    console.log(`New comment added to ${interviewId}`);
    res.json(entry);
  });

  app.get("/api/admin/interviews", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    res.json(readInterviews());
  });

  app.post("/api/admin/interviews", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { authorName, bookTitle, questionsAnswers, highlightQuote, authorImage, socialLinks, sponsored, status } = req.body;
    if (!authorName?.trim()) {
      return res.status(400).json({ message: "Author name is required." });
    }
    if (!bookTitle?.trim()) {
      return res.status(400).json({ message: "Book title is required." });
    }
    if (!questionsAnswers || !Array.isArray(questionsAnswers) || questionsAnswers.length === 0) {
      return res.status(400).json({ message: "At least one question and answer is required." });
    }

    const entry = {
      id: crypto.randomUUID(),
      authorName: authorName.trim(),
      bookTitle: bookTitle.trim(),
      highlightQuote: highlightQuote?.trim() || "",
      questionsAnswers,
      authorImage: authorImage?.trim() || "",
      socialLinks: socialLinks || {},
      sponsored: !!sponsored,
      status: status === "published" ? "published" : "draft",
      createdAt: new Date().toISOString(),
    };

    const interviews = readInterviews();
    interviews.push(entry);
    writeInterviews(interviews);
    console.log(`Interview created: ${entry.authorName}`);
    if (entry.status === "published") {
      console.log(`Interview published: ${entry.bookTitle}`);
    }
    console.log(`Interview [${entry.bookTitle}] saved as [${entry.status}]`);
    res.json(entry);
  });

  app.put("/api/admin/interviews/:id", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const { authorName, bookTitle, questionsAnswers, highlightQuote, authorImage, socialLinks, sponsored, status } = req.body;
    if (!authorName?.trim()) {
      return res.status(400).json({ message: "Author name is required." });
    }
    if (!bookTitle?.trim()) {
      return res.status(400).json({ message: "Book title is required." });
    }

    const interviews = readInterviews();
    const idx = interviews.findIndex((i: any) => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Interview not found." });
    }

    const wasPublished = interviews[idx].status;
    interviews[idx] = {
      ...interviews[idx],
      authorName: authorName.trim(),
      bookTitle: bookTitle.trim(),
      highlightQuote: highlightQuote?.trim() || "",
      questionsAnswers: questionsAnswers || interviews[idx].questionsAnswers,
      authorImage: authorImage?.trim() || interviews[idx].authorImage || "",
      socialLinks: socialLinks || interviews[idx].socialLinks || {},
      sponsored: !!sponsored,
      status: status === "published" ? "published" : "draft",
    };

    writeInterviews(interviews);
    if (wasPublished !== "published" && interviews[idx].status === "published") {
      console.log(`Interview published: ${interviews[idx].bookTitle}`);
    }
    console.log(`Interview [${interviews[idx].bookTitle}] saved as [${interviews[idx].status}]`);
    res.json(interviews[idx]);
  });

  app.delete("/api/admin/interviews/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const interviews = readInterviews();
    const idx = interviews.findIndex((i: any) => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ message: "Interview not found." });
    }
    const removed = interviews.splice(idx, 1)[0];
    writeInterviews(interviews);
    console.log(`Interview deleted: ${removed.authorName} - ${removed.bookTitle}`);
    res.json({ message: "Interview deleted." });
  });

  app.post("/api/admin/interviews/upload-image", async (req: any, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    interviewImageUpload.single("image")(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ message: err.message || "Image upload failed." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided." });
      }
      const ext = path.extname(req.file.originalname).toLowerCase() || ".jpg";
      const newName = `${crypto.randomUUID()}${ext}`;
      const newPath = path.join(INTERVIEW_UPLOADS_DIR, newName);
      fs.renameSync(req.file.path, newPath);
      res.json({ path: `/uploads/interviews/${newName}` });
    });
  });

  // ========== BOOKTOK / BOOKSTAGRAM / YOUTUBE REVIEW SYSTEM ==========
  const REVIEWS_PATH = path.join(process.cwd(), "data", "reviews.json");

  function readReviews(): any[] {
    try {
      if (!fs.existsSync(REVIEWS_PATH)) {
        fs.mkdirSync(path.dirname(REVIEWS_PATH), { recursive: true });
        fs.writeFileSync(REVIEWS_PATH, "[]", "utf-8");
        return [];
      }
      return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf-8"));
    } catch { return []; }
  }

  function writeReviews(data: any[]) {
    fs.writeFileSync(REVIEWS_PATH, JSON.stringify(data, null, 2), "utf-8");
  }

  const VALID_PLATFORMS = ["BookTok", "Bookstagram", "YouTube"] as const;

  function isValidEmbedUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return (
        host.includes("youtube.com") ||
        host.includes("youtu.be") ||
        host.includes("tiktok.com") ||
        host.includes("instagram.com")
      );
    } catch { return false; }
  }

  const reviewSubmitLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1,
    message: { message: "Please wait a minute before submitting another review." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.get("/api/reviews", (_req, res) => {
    const reviews = readReviews().filter((r: any) => r.approved === true);
    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reviews);
  });

  app.post("/api/submit-review", reviewSubmitLimiter, rejectBots, (req, res) => {
    const { reviewerName, platform, bookTitle, genre, caption, embedUrl, contactEmail } = req.body;

    if (!reviewerName?.trim()) return res.status(400).json({ message: "Reviewer name is required." });
    if (!platform || !VALID_PLATFORMS.includes(platform)) return res.status(400).json({ message: "Valid platform is required (BookTok, Bookstagram, or YouTube)." });
    if (!bookTitle?.trim()) return res.status(400).json({ message: "Book title is required." });
    if (!genre?.trim()) return res.status(400).json({ message: "Genre is required." });
    if (!caption?.trim()) return res.status(400).json({ message: "Caption is required." });
    if (!embedUrl?.trim()) return res.status(400).json({ message: "Embed URL is required." });
    if (caption.trim().length > 500) return res.status(400).json({ message: "Caption is too long (max 500 characters)." });
    if (!isValidEmbedUrl(embedUrl.trim())) return res.status(400).json({ message: "Only YouTube, TikTok, and Instagram embed URLs are allowed." });

    const entry = {
      id: crypto.randomUUID(),
      reviewerName: escapeHtml(reviewerName.trim()),
      platform,
      bookTitle: escapeHtml(bookTitle.trim()),
      genre: escapeHtml(genre.trim()),
      caption: escapeHtml(caption.trim()),
      embedUrl: embedUrl.trim(),
      contactEmail: contactEmail?.trim() || "",
      thumbnail: "",
      approved: false,
      createdAt: new Date().toISOString(),
    };

    const reviews = readReviews();
    reviews.push(entry);
    writeReviews(reviews);
    console.log(`Review submitted for approval [${entry.bookTitle}] by [${entry.reviewerName}]`);
    res.json({ message: "Your review has been submitted for review.", id: entry.id });
  });

  app.get("/api/admin/reviews", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const reviews = readReviews();
    reviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(reviews);
  });

  app.patch("/api/admin/reviews/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const { action } = req.body;

    if (!action || !["approve", "decline"].includes(action)) {
      return res.status(400).json({ message: "Action must be 'approve' or 'decline'." });
    }

    const reviews = readReviews();
    const idx = reviews.findIndex((r: any) => r.id === id);
    if (idx === -1) return res.status(404).json({ message: "Review not found." });

    if (action === "approve") {
      reviews[idx].approved = true;
      console.log(`Review approved [${reviews[idx].bookTitle}]`);
    } else {
      reviews[idx].approved = false;
      console.log(`Review declined [${reviews[idx].bookTitle}]`);
    }

    writeReviews(reviews);
    res.json(reviews[idx]);
  });

  app.delete("/api/admin/reviews/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const { id } = req.params;
    const reviews = readReviews();
    const idx = reviews.findIndex((r: any) => r.id === id);
    if (idx === -1) return res.status(404).json({ message: "Review not found." });
    const removed = reviews.splice(idx, 1)[0];
    writeReviews(reviews);
    console.log(`Review deleted [${removed.bookTitle}] by [${removed.reviewerName}]`);
    res.json({ message: "Review deleted." });
  });

  app.get("/api/admin/author-books", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const profiles = await storage.getAllAuthorProfiles();
      const allBooks: any[] = [];
      for (const profile of profiles) {
        const books = await storage.getAuthorBooks(profile.id);
        for (const book of books) {
          allBooks.push({
            ...book,
            authorPenName: profile.penName,
            authorSlug: profile.slug,
          });
        }
      }
      res.json(allBooks);
    } catch (err) {
      console.error("Admin get author books error:", err);
      res.status(500).json({ message: "Failed to get books" });
    }
  });

  app.patch("/api/admin/author-books/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { title, description, coverUrl, genres, amazonUrl, bookshopUrl, googleBooksId,
              seriesName, seriesNumber, publishedDate, isUpcoming, arcEnabled, arcDescription,
              arcDownloadUrl, arcCouponCode, arcMaxClaims, arcExpiresAt, arcWaitlistEnabled, sortOrder } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description || null;
      if (coverUrl !== undefined) updates.coverUrl = coverUrl || null;
      if (genres !== undefined) updates.genres = genres;
      if (amazonUrl !== undefined) updates.amazonUrl = amazonUrl || null;
      if (bookshopUrl !== undefined) updates.bookshopUrl = bookshopUrl || null;
      if (googleBooksId !== undefined) updates.googleBooksId = googleBooksId || null;
      if (seriesName !== undefined) updates.seriesName = seriesName || null;
      if (seriesNumber !== undefined) updates.seriesNumber = seriesNumber ? parseInt(seriesNumber) : null;
      if (publishedDate !== undefined) updates.publishedDate = publishedDate || null;
      if (isUpcoming !== undefined) updates.isUpcoming = Boolean(isUpcoming);
      if (arcEnabled !== undefined) updates.arcEnabled = Boolean(arcEnabled);
      if (arcDescription !== undefined) updates.arcDescription = arcDescription || null;
      if (arcDownloadUrl !== undefined) updates.arcDownloadUrl = arcDownloadUrl || null;
      if (arcCouponCode !== undefined) updates.arcCouponCode = arcCouponCode || null;
      if (arcMaxClaims !== undefined) updates.arcMaxClaims = arcMaxClaims ? parseInt(arcMaxClaims) : null;
      if (arcExpiresAt !== undefined) updates.arcExpiresAt = arcExpiresAt ? new Date(arcExpiresAt) : null;
      if (arcWaitlistEnabled !== undefined) updates.arcWaitlistEnabled = Boolean(arcWaitlistEnabled);
      if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder);
      const updated = await storage.updateAuthorBook(id, updates);
      if (!updated) return res.status(404).json({ message: "Book not found" });
      res.json(updated);
    } catch (err) {
      console.error("Admin update author book error:", err);
      res.status(500).json({ message: "Failed to update book" });
    }
  });

  // Admin: Get all author profiles
  app.get("/api/admin/author-profiles", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const profiles = await storage.getAllAuthorProfiles();
      const enriched = [];
      for (const profile of profiles) {
        const books = await storage.getAuthorBooks(profile.id);
        enriched.push({ ...profile, bookCount: books.length });
      }
      res.json(enriched);
    } catch (err) {
      console.error("Admin get author profiles error:", err);
      res.status(500).json({ message: "Failed to get author profiles" });
    }
  });

  // Admin: Update author profile by ID
  app.patch("/api/admin/author-profiles/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { penName, bio, website, twitterHandle, instagramHandle, goodreadsUrl,
              amazonAuthorUrl, bookbubUrl, tiktokHandle, genres, isVerified } = req.body;
      const updates: any = {};
      if (penName !== undefined) updates.penName = penName;
      if (bio !== undefined) updates.bio = bio || null;
      if (website !== undefined) updates.website = website || null;
      if (twitterHandle !== undefined) updates.twitterHandle = twitterHandle || null;
      if (instagramHandle !== undefined) updates.instagramHandle = instagramHandle || null;
      if (goodreadsUrl !== undefined) updates.goodreadsUrl = goodreadsUrl || null;
      if (amazonAuthorUrl !== undefined) updates.amazonAuthorUrl = amazonAuthorUrl || null;
      if (bookbubUrl !== undefined) updates.bookbubUrl = bookbubUrl || null;
      if (tiktokHandle !== undefined) updates.tiktokHandle = tiktokHandle || null;
      if (genres !== undefined) updates.genres = genres;
      if (isVerified !== undefined) updates.isVerified = Boolean(isVerified);
      const updated = await storage.updateAuthorProfileById(id, updates);
      if (!updated) return res.status(404).json({ message: "Author profile not found" });
      res.json(updated);
    } catch (err) {
      console.error("Admin update author profile error:", err);
      res.status(500).json({ message: "Failed to update author profile" });
    }
  });

  // Admin: Search Google Books API
  app.get("/api/admin/google-books-search", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.status(400).json({ message: "Search query required (min 2 chars)" });
      }
      const results = await searchGoogleBooks(query, 10);
      res.json(results);
    } catch (err) {
      console.error("Admin Google Books search error:", err);
      res.status(500).json({ message: "Failed to search Google Books" });
    }
  });

  // Admin: Enrich author book from Google Books data
  app.post("/api/admin/author-books/:id/enrich", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { title, description, coverUrl, publishedDate, genres, googleBooksId } = req.body;
      const updates: any = {};
      if (title) updates.title = title;
      if (description) updates.description = description;
      if (coverUrl) updates.coverUrl = coverUrl;
      if (publishedDate) updates.publishedDate = publishedDate;
      if (genres && Array.isArray(genres)) updates.genres = genres;
      if (googleBooksId) updates.googleBooksId = googleBooksId;
      const updated = await storage.updateAuthorBook(id, updates);
      if (!updated) return res.status(404).json({ message: "Book not found" });
      res.json(updated);
    } catch (err) {
      console.error("Admin enrich author book error:", err);
      res.status(500).json({ message: "Failed to enrich book" });
    }
  });

  app.get("/api/shop/products", cacheMiddleware(300), async (_req, res) => {
    try {
      const products = await storage.getActiveShopProducts();
      const categories = await storage.getShopCategories();
      res.json({ products, categories: ["All", ...categories] });
    } catch (err) {
      console.error("Shop products fetch error:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/admin/shop-products", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const products = await storage.getShopProducts();
      res.json(products);
    } catch (err) {
      console.error("Admin shop products fetch error:", err);
      res.status(500).json({ message: "Failed to fetch shop products" });
    }
  });

  app.post("/api/admin/shop-products", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const parsed = insertShopProductSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data", errors: parsed.error.flatten().fieldErrors });
      }
      const product = await storage.createShopProduct(parsed.data);
      res.json(product);
    } catch (err) {
      console.error("Admin create shop product error:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/shop-products/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const parsed = insertShopProductSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid product data", errors: parsed.error.flatten().fieldErrors });
      }
      const updated = await storage.updateShopProduct(id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Product not found" });
      res.json(updated);
    } catch (err) {
      console.error("Admin update shop product error:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/shop-products/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      await storage.deleteShopProduct(id);
      res.json({ message: "Product deleted" });
    } catch (err) {
      console.error("Admin delete shop product error:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.post("/api/admin/shop-products/seed", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const existing = await storage.getShopProducts();
      if (existing.length > 0) {
        return res.status(400).json({ message: "Products already exist. Delete them first to re-seed." });
      }
      const { products } = req.body;
      if (!Array.isArray(products)) {
        return res.status(400).json({ message: "products array required" });
      }
      const created = [];
      for (let i = 0; i < products.length; i++) {
        const p = products[i];
        const parsed = insertShopProductSchema.safeParse({
          title: p.title,
          description: p.description,
          affiliateUrl: p.affiliateUrl,
          price: p.price,
          imageUrl: p.imageUrl || null,
          category: p.category || "Books",
          sortOrder: i,
          isActive: true,
        });
        if (!parsed.success) continue;
        const product = await storage.createShopProduct(parsed.data);
        created.push(product);
      }
      res.json({ message: `Seeded ${created.length} products`, count: created.length });
    } catch (err) {
      console.error("Admin seed shop products error:", err);
      res.status(500).json({ message: "Failed to seed products" });
    }
  });

  // ========== FEATURED PICKS ADMIN ==========
  app.get("/api/featured-picks", cacheMiddleware(300), async (req, res) => {
    try {
      const picks = await db.select().from(featuredPicks).orderBy(featuredPicks.sortOrder);
      const active = picks.filter(p => p.isActive);
      res.json(active.length > 0 ? active : []);
    } catch (err) {
      console.error("Featured picks error:", err);
      res.json([]);
    }
  });

  app.get("/api/admin/featured-picks", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const picks = await db.select().from(featuredPicks).orderBy(featuredPicks.sortOrder);
      res.json(picks);
    } catch (err) {
      console.error("Admin featured picks error:", err);
      res.status(500).json({ message: "Failed to fetch featured picks" });
    }
  });

  app.post("/api/admin/featured-picks", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const parsed = insertFeaturedPickSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten().fieldErrors });
      }
      const [pick] = await db.insert(featuredPicks).values(parsed.data).returning();
      res.json(pick);
    } catch (err) {
      console.error("Admin create featured pick error:", err);
      res.status(500).json({ message: "Failed to create featured pick" });
    }
  });

  app.patch("/api/admin/featured-picks/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { genre, genreLabel, bookTitle, authorName, coverImageUrl, shortBlurb, amazonUrl, isIndie, isSponsored, sortOrder, isActive } = req.body;
      const updates: any = {};
      if (genre !== undefined) updates.genre = genre;
      if (genreLabel !== undefined) updates.genreLabel = genreLabel;
      if (bookTitle !== undefined) updates.bookTitle = bookTitle;
      if (authorName !== undefined) updates.authorName = authorName;
      if (coverImageUrl !== undefined) updates.coverImageUrl = coverImageUrl;
      if (shortBlurb !== undefined) updates.shortBlurb = shortBlurb;
      if (amazonUrl !== undefined) updates.amazonUrl = amazonUrl;
      if (isIndie !== undefined) updates.isIndie = isIndie;
      if (isSponsored !== undefined) updates.isSponsored = isSponsored;
      if (sortOrder !== undefined) updates.sortOrder = sortOrder;
      if (isActive !== undefined) updates.isActive = isActive;

      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(featuredPicks).set(updates).where(eq(featuredPicks.id, id)).returning();
      res.json(updated);
    } catch (err) {
      console.error("Admin update featured pick error:", err);
      res.status(500).json({ message: "Failed to update featured pick" });
    }
  });

  app.delete("/api/admin/featured-picks/:id", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const id = parseInt(req.params.id);
      const { eq } = await import("drizzle-orm");
      await db.delete(featuredPicks).where(eq(featuredPicks.id, id));
      res.json({ message: "Deleted" });
    } catch (err) {
      console.error("Admin delete featured pick error:", err);
      res.status(500).json({ message: "Failed to delete featured pick" });
    }
  });

  app.post("/api/admin/featured-picks/seed", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    try {
      const existing = await db.select().from(featuredPicks);
      if (existing.length > 0) {
        return res.status(400).json({ message: "Featured picks already exist. Delete them first to re-seed." });
      }
      const defaults = [
        { genre: "romance", genreLabel: "Romance", bookTitle: "Icebreaker", authorName: "Hannah Grace", shortBlurb: "A figure skater and a hockey captain are forced to share a rink. What starts as a rivalry turns into something neither of them expected.", amazonUrl: "https://amzn.to/3OtLHWg", sortOrder: 0 },
        { genre: "fantasy", genreLabel: "Fantasy", bookTitle: "The Bridge Kingdom", authorName: "Danielle L. Jensen", shortBlurb: "A princess trained as a spy is sent to marry the enemy king and destroy his kingdom from within.", amazonUrl: "https://amzn.to/4ajUuBz", sortOrder: 1 },
        { genre: "mystery_thriller", genreLabel: "Mystery & Thriller", bookTitle: "The Maid", authorName: "Nita Prose", shortBlurb: "A hotel maid discovers a dead body in a guest's room and becomes the prime suspect.", amazonUrl: "https://amzn.to/4qkJbip", sortOrder: 2 },
        { genre: "sci_fi", genreLabel: "Sci-Fi", bookTitle: "Starter Villain", authorName: "John Scalzi", shortBlurb: "A substitute teacher inherits his uncle's supervillain empire, complete with volcano lairs and genetically enhanced cats.", amazonUrl: "https://amzn.to/4aB39Rk", sortOrder: 3 },
        { genre: "horror", genreLabel: "Horror", bookTitle: "The Haunting of Hill House", authorName: "Shirley Jackson", shortBlurb: "Four strangers arrive at a notoriously haunted mansion to investigate its dark history.", amazonUrl: "https://amzn.to/4rBLtL5", sortOrder: 4 },
        { genre: "nonfiction", genreLabel: "Non-Fiction", bookTitle: "Hidden Valley Road", authorName: "Robert Kolker", shortBlurb: "The true story of an American family with twelve children, six of whom were diagnosed with schizophrenia.", amazonUrl: "https://amzn.to/4an5uy6", sortOrder: 5 },
        { genre: "ya", genreLabel: "Young Adult", bookTitle: "Legendborn", authorName: "Tracy Deonn", shortBlurb: "A young woman at UNC Chapel Hill uncovers a secret society of Arthurian descendants.", amazonUrl: "https://amzn.to/4tumBXC", sortOrder: 6 },
      ];
      const created = await db.insert(featuredPicks).values(defaults).returning();
      res.json({ message: `Seeded ${created.length} featured picks`, count: created.length });
    } catch (err) {
      console.error("Admin seed featured picks error:", err);
      res.status(500).json({ message: "Failed to seed featured picks" });
    }
  });

  app.get("/api/admin/review-stats", async (req, res) => {
    if (!(await isAdminAuthorized(req))) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const reviews = readReviews();
    console.log("Admin Reviews metrics updated");
    res.json({
      total: reviews.length,
      pending: reviews.filter((r: any) => !r.approved).length,
      published: reviews.filter((r: any) => r.approved).length,
    });
  });

  // ==================== Children's Reading Section ====================

  // Helper to verify parent owns child profile
  async function verifyChildOwnership(req: any, res: any): Promise<any | null> {
    const childId = parseInt(req.params.id);
    if (isNaN(childId)) { res.status(400).json({ message: "Invalid child ID" }); return null; }
    const profile = await storage.getChildProfile(childId);
    if (!profile) { res.status(404).json({ message: "Child profile not found" }); return null; }
    if (profile.parentUserId !== (req as any).user?.claims?.sub) { res.status(403).json({ message: "Not authorized" }); return null; }
    return profile;
  }

  // Get all child profiles for authenticated parent
  app.get("/api/children", isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const profiles = await storage.getChildProfiles(userId);
    res.json(profiles);
  });

  // Create child profile
  app.post("/api/children", isAuthenticated, strictLimiter, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const parsed = insertChildProfileSchema.safeParse({ ...req.body, parentUserId: userId });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const profile = await storage.createChildProfile(parsed.data);
    res.status(201).json(profile);
  });

  // Update child profile (only allow safe fields)
  app.patch("/api/children/:id", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const { name, age, avatarEmoji } = req.body;
    const safeUpdates: any = {};
    if (name !== undefined) safeUpdates.name = name;
    if (age !== undefined) safeUpdates.age = parseInt(age);
    if (avatarEmoji !== undefined) safeUpdates.avatarEmoji = avatarEmoji;
    const updated = await storage.updateChildProfile(profile.id, safeUpdates);
    res.json(updated);
  });

  // Delete child profile
  app.delete("/api/children/:id", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    await storage.deleteChildProfile(profile.id);
    res.json({ success: true });
  });

  // Get reading logs for a child
  app.get("/api/children/:id/reading-log", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const logs = await storage.getChildReadingLogs(profile.id);
    res.json(logs);
  });

  // Add reading log entry and update stats
  app.post("/api/children/:id/reading-log", isAuthenticated, strictLimiter, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const parsed = insertChildReadingLogSchema.safeParse({ ...req.body, childProfileId: profile.id });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const log = await storage.createChildReadingLog(parsed.data);

    // Update profile stats
    const updates: any = {
      totalPagesRead: (profile.totalPagesRead || 0) + (log.pagesRead || 0),
      totalMinutesRead: (profile.totalMinutesRead || 0) + (log.minutesRead || 0),
      lastActivityDate: new Date(),
    };

    if (log.completed) {
      updates.totalBooksRead = (profile.totalBooksRead || 0) + 1;
    }

    // Update streak
    const now = new Date();
    const lastActivity = profile.lastActivityDate ? new Date(profile.lastActivityDate) : null;

    if (!lastActivity) {
      updates.currentStreak = 1;
    } else {
      const daysSinceLastActivity = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastActivity === 0) {
        updates.currentStreak = profile.currentStreak || 1;
      } else if (daysSinceLastActivity === 1) {
        updates.currentStreak = (profile.currentStreak || 0) + 1;
      } else {
        updates.currentStreak = 1;
      }
    }
    if ((updates.currentStreak || 0) > (profile.longestStreak || 0)) {
      updates.longestStreak = updates.currentStreak;
    }

    // Check for new badges
    const badges = [...(profile.earnedBadges || [])];
    const totalBooks = updates.totalBooksRead || profile.totalBooksRead || 0;
    const streak = updates.currentStreak || 0;

    if (totalBooks >= 1 && !badges.includes("first_book")) badges.push("first_book");
    if (totalBooks >= 5 && !badges.includes("bookworm_5")) badges.push("bookworm_5");
    if (totalBooks >= 10 && !badges.includes("super_reader_10")) badges.push("super_reader_10");
    if (totalBooks >= 25 && !badges.includes("reading_champion_25")) badges.push("reading_champion_25");
    if (totalBooks >= 50 && !badges.includes("library_legend_50")) badges.push("library_legend_50");
    if (streak >= 3 && !badges.includes("streak_3")) badges.push("streak_3");
    if (streak >= 7 && !badges.includes("streak_7")) badges.push("streak_7");
    if (streak >= 14 && !badges.includes("streak_14")) badges.push("streak_14");
    if (streak >= 30 && !badges.includes("streak_30")) badges.push("streak_30");
    if (log.note && log.note.length > 20 && !badges.includes("book_reporter")) badges.push("book_reporter");
    if (log.rating && !badges.includes("first_review")) badges.push("first_review");

    updates.earnedBadges = badges;

    // Determine reading level
    if (totalBooks >= 50) updates.readingLevel = "Reading Champion";
    else if (totalBooks >= 25) updates.readingLevel = "Story Master";
    else if (totalBooks >= 10) updates.readingLevel = "Page Turner";
    else if (totalBooks >= 5) updates.readingLevel = "Bookworm";
    else updates.readingLevel = "Reading Sprout";

    await storage.updateChildProfile(profile.id, updates);

    // Update reading goals
    const goals = await storage.getChildReadingGoals(profile.id);
    for (const goal of goals) {
      if (goal.isCompleted) continue;
      let increment = 0;
      if (goal.goalType === "books" && log.completed) increment = 1;
      else if (goal.goalType === "pages") increment = log.pagesRead || 0;
      else if (goal.goalType === "minutes") increment = log.minutesRead || 0;
      if (increment > 0) {
        const newAmount = (goal.currentAmount || 0) + increment;
        await storage.updateChildReadingGoal(goal.id, {
          currentAmount: newAmount,
          isCompleted: newAmount >= goal.targetAmount,
        });
      }
    }

    res.status(201).json(log);
  });

  // Get reading goals
  app.get("/api/children/:id/goals", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const goals = await storage.getChildReadingGoals(profile.id);
    res.json(goals);
  });

  // Create reading goal
  app.post("/api/children/:id/goals", isAuthenticated, strictLimiter, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const parsed = insertChildReadingGoalSchema.safeParse({ ...req.body, childProfileId: profile.id });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const goal = await storage.createChildReadingGoal(parsed.data);
    res.status(201).json(goal);
  });

  // Update reading goal (verify goal belongs to child)
  app.patch("/api/children/:id/goals/:goalId", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const goalId = parseInt(req.params.goalId);
    if (isNaN(goalId)) return res.status(400).json({ message: "Invalid goal ID" });
    const goals = await storage.getChildReadingGoals(profile.id);
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return res.status(404).json({ message: "Goal not found" });
    const { currentAmount, isCompleted } = req.body;
    const safeUpdates: any = {};
    if (currentAmount !== undefined) safeUpdates.currentAmount = parseInt(currentAmount);
    if (isCompleted !== undefined) safeUpdates.isCompleted = Boolean(isCompleted);
    const updated = await storage.updateChildReadingGoal(goalId, safeUpdates);
    res.json(updated);
  });

  // Get gamification stats for a child
  app.get("/api/children/:id/stats", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const goals = await storage.getChildReadingGoals(profile.id);
    const logs = await storage.getChildReadingLogs(profile.id);
    res.json({
      profile,
      activeGoals: goals.filter(g => !g.isCompleted),
      completedGoals: goals.filter(g => g.isCompleted),
      recentLogs: logs.slice(0, 10),
      totalLogs: logs.length,
    });
  });

  // Child challenge routes
  app.get("/api/children/:id/challenges", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const challenges = await storage.getChildChallenges(profile.id);
    res.json(challenges);
  });

  app.post("/api/children/:id/challenges", isAuthenticated, strictLimiter, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const parsed = insertChildChallengeSchema.safeParse({ ...req.body, childProfileId: profile.id });
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const challenge = await storage.createChildChallenge(parsed.data);
    res.status(201).json(challenge);
  });

  app.patch("/api/children/:id/challenges/:challengeId", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const challengeId = parseInt(req.params.challengeId);
    if (isNaN(challengeId)) return res.status(400).json({ message: "Invalid challenge ID" });
    const challenges = await storage.getChildChallenges(profile.id);
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });
    const updateSchema = z.object({
      progress: z.number().int().min(0).optional(),
      status: z.enum(["active", "completed"]).optional(),
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
    const safeUpdates: any = { ...parsed.data };
    if (parsed.data.status === "completed") safeUpdates.completedAt = new Date();
    const updated = await storage.updateChildChallenge(challengeId, safeUpdates);
    res.json(updated);
  });

  app.delete("/api/children/:id/challenges/:challengeId", isAuthenticated, async (req: any, res) => {
    const profile = await verifyChildOwnership(req, res);
    if (!profile) return;
    const challengeId = parseInt(req.params.challengeId);
    if (isNaN(challengeId)) return res.status(400).json({ message: "Invalid challenge ID" });
    const challenges = await storage.getChildChallenges(profile.id);
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return res.status(404).json({ message: "Challenge not found" });
    await storage.deleteChildChallenge(challengeId);
    res.json({ success: true });
  });

  // ─── Community Events ────────────────────────────────────────────────────────

  app.get("/api/events", cacheMiddleware(60), async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const upcoming = req.query.upcoming !== "false";
      const events = await storage.getCommunityEvents({ upcoming, category });
      res.json(events);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getCommunityEvent(Number(req.params.id));
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", isAuthenticated, searchLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const parsed = insertCommunityEventSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      const event = await storage.createCommunityEvent(parsed.data);
      for (const key of apiCache.keys()) {
        if (key.startsWith("/api/events")) apiCache.delete(key);
      }
      res.status(201).json(event);
    } catch (err) {
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const event = await storage.getCommunityEvent(Number(req.params.id));
      if (!event) return res.status(404).json({ message: "Event not found" });
      const isAdmin = await isAdminAuthorized(req);
      if (event.userId !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
      const updated = await storage.updateCommunityEvent(Number(req.params.id), req.body);
      for (const key of apiCache.keys()) {
        if (key.startsWith("/api/events")) apiCache.delete(key);
      }
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const event = await storage.getCommunityEvent(Number(req.params.id));
      if (!event) return res.status(404).json({ message: "Event not found" });
      const isAdmin = await isAdminAuthorized(req);
      if (event.userId !== userId && !isAdmin) return res.status(403).json({ message: "Forbidden" });
      await storage.deleteCommunityEvent(Number(req.params.id), userId);
      for (const key of apiCache.keys()) {
        if (key.startsWith("/api/events")) apiCache.delete(key);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  return httpServer;
}

// Derive romanceLevel, tone, contentWarnings, and moodTags from legacy book data
function enrichLegacyBook(book: any): any {
  const tags: string[] = book.tags || [];
  const spice = book.spiceLevel || 1;
  const darkness = book.darknessLevel || 2;
  const hasRomanceTag = tags.includes("romance");
  const tropes: string[] = book.tropes || [];
  const romanceTropes = ["enemies-to-lovers", "fake-dating", "friends-to-lovers", "second-chance", "grumpy-sunshine", "forbidden-love", "slow-burn", "love-triangle", "romantic-suspense"];
  const hasRomanceTrope = tropes.some(t => romanceTropes.includes(t));

  let romanceLevel: "none" | "subplot" | "central" = "none";
  if (hasRomanceTag && (spice >= 3 || hasRomanceTrope)) {
    romanceLevel = "central";
  } else if (hasRomanceTag || hasRomanceTrope || spice >= 3) {
    romanceLevel = "subplot";
  }

  let tone: "light" | "medium" | "dark" = "medium";
  if (darkness <= 2) tone = "light";
  else if (darkness >= 4) tone = "dark";

  const contentWarnings: string[] = [];
  const desc = (book.description || "").toLowerCase();
  const title = (book.title || "").toLowerCase();

  const warningRules: Record<string, { tags?: string[]; tropes?: string[]; keywords?: string[]; minDarkness?: number }> = {
    "violence": { tags: ["murder", "thriller", "true-crime"], keywords: ["murder", "killed", "savagely", "brutal", "shoots", "shot"], minDarkness: 4 },
    "death": { tags: ["murder", "true-crime"], keywords: ["murder", "killed", "death", "dying", "murdered"] },
    "abuse": { keywords: ["abuse", "assault", "survivalist family"], minDarkness: 4 },
    "mental-health": { tags: ["psychological"], keywords: ["trauma", "mental", "score", "ptsd", "anxiety", "depression"] },
    "war": { keywords: ["war college", "war ", "warfare", "battle"] },
  };
  for (const [warning, rules] of Object.entries(warningRules)) {
    let matched = false;
    if (rules.tags && rules.tags.some(t => tags.includes(t))) matched = true;
    if (rules.tropes && rules.tropes.some(t => tropes.includes(t))) matched = true;
    if (rules.keywords && rules.keywords.some(kw => desc.includes(kw) || title.includes(kw))) matched = true;
    if (rules.minDarkness && darkness >= rules.minDarkness && matched) {
      contentWarnings.push(warning);
    } else if (!rules.minDarkness && matched) {
      contentWarnings.push(warning);
    }
  }

  const moodTags: string[] = [];
  if (tags.includes("cozy") || (darkness <= 1 && book.mood === "happy")) moodTags.push("cozy");
  if (darkness >= 4) moodTags.push("dark");
  if (book.pace === "fast") moodTags.push("fast-paced");
  if (tags.includes("funny")) moodTags.push("funny");
  if (book.mood === "emotional") moodTags.push("emotional");
  if (book.mood === "thoughtful") moodTags.push("thought-provoking");
  if (tags.includes("wholesome")) moodTags.push("heartwarming");
  if (book.mood === "adventurous") moodTags.push("adventurous");
  if (book.mood === "scary") moodTags.push("suspenseful");

  return { ...book, romanceLevel, tone, contentWarnings, moodTags };
}

function enrichCatalogBook(book: any): any {
  const categories = book.categories || [];
  const description = book.description || "";
  
  const tags = deriveTags(categories, description);
  const moodTags = deriveMoodTags(categories, description);
  const tropes = deriveTropes(categories, description);
  const romanceLevel = deriveRomanceLevel(categories, description, tags);
  const tone = deriveTone(categories, description, moodTags);
  const contentWarnings = deriveContentWarnings(categories, description);
  const spiceLevel = deriveSpiceLevel(categories, description, romanceLevel, tags);
  const darknessLevel = deriveDarknessLevel(categories, description, tone, contentWarnings, tags);
  
  return {
    ...book,
    tags: tags.length > 0 ? tags : book.tags || [],
    moodTags: moodTags.length > 0 ? moodTags : book.moodTags || [],
    tropes: tropes.length > 0 ? tropes : book.tropes || [],
    romanceLevel,
    tone,
    contentWarnings: contentWarnings.length > 0 ? contentWarnings : book.contentWarnings || [],
    spiceLevel: Math.max(spiceLevel, book.spiceLevel || 1),
    darknessLevel,
  };
}

// Legacy book scoring - now includes fiction type and genre filtering
function isChildrensAgeGroup(ageGroup?: string): boolean {
  return ageGroup === "children" || ageGroup === "middle-grade";
}

function scoreLegacyBooks(books: any[], answers: QuizAnswers) {
  const hasRomanceSelected = answers.genres?.includes("romance") || false;
  const isNonfictionOnly = answers.fictionType === "nonfiction";
  const isFictionOnly = answers.fictionType === "fiction";
  
  if (isChildrensAgeGroup(answers.ageGroup)) {
    return [];
  }
  
  const nonfictionTags = ["non-fiction", "nonfiction", "biography", "self-help", "memoir", "true-crime", "history"];
  const fictionTags = ["fiction", "fantasy", "romance", "thriller", "mystery", "horror", "sci-fi", "contemporary"];
  
  const scoredBooks = books.map(book => {
    let score = 1;
    const bookTags = book.tags || [];
    const bookTropes = book.tropes || [];

    // === FICTION TYPE FILTER ===
    const isNonfictionBook = bookTags.some((t: string) => nonfictionTags.includes(t));
    const isFictionBook = bookTags.some((t: string) => fictionTags.includes(t)) || !isNonfictionBook;
    
    if (isNonfictionOnly && !isNonfictionBook) {
      return { book, score: -1 }; // Only want nonfiction
    }
    if (isFictionOnly && isNonfictionBook) {
      return { book, score: -1 }; // Only want fiction
    }

    // Hard-exclude juvenile/children's books from adult searches
    if (answers.ageGroup === "adult" || answers.ageGroup === "new-adult") {
      const juvenileTags = ["children", "juvenile", "kids", "middle-grade", "picture-book", "early-reader"];
      const isJuvenileBook = bookTags.some((t: string) => juvenileTags.includes(t));
      if (isJuvenileBook) return { book, score: -1 };
    }

    // === GENRE FILTER ===
    if (answers.genres && answers.genres.length > 0) {
      const hasMatchingGenre = answers.genres.some((genre: string) => 
        bookTags.includes(genre) || bookTags.includes(genre.toLowerCase())
      );
      if (!hasMatchingGenre) {
        score -= 15; // Penalty for non-matching genre
      }
    }
    
    // === ROMANCE EXCLUSION ===
    if (!hasRomanceSelected) {
      const isRomanceBook = bookTags.includes("romance") || book.spiceLevel >= 3;
      if (isRomanceBook) {
        return { book, score: -1 }; // Exclude romance-heavy when not selected
      }
    }

    if (answers.maxSpice !== undefined && book.spiceLevel > answers.maxSpice) return { book, score: -1 };
    if (answers.maxDarkness !== undefined && book.darknessLevel > answers.maxDarkness) return { book, score: -1 };
    
    if (answers.mood && answers.mood.length > 0 && answers.mood.includes(book.mood as any)) score += 10;
    if (answers.pace && book.pace === answers.pace) score += 5;
    if (answers.length && book.length === answers.length) score += 5;
    
    if (answers.tropes && answers.tropes.length > 0) {
      const matchingTropes = bookTropes.filter((t: string) => answers.tropes!.includes(t));
      score += matchingTropes.length * 3;
    }

    if (answers.avoidTropes && answers.avoidTropes.length > 0) {
      const hasAvoidedTrope = bookTropes.some((t: string) => answers.avoidTropes!.includes(t));
      if (hasAvoidedTrope) return { book, score: -1 };
    }

    if (answers.avoidTopics && answers.avoidTopics.length > 0) {
      const hasAvoided = bookTags.some((tag: string) => answers.avoidTopics!.includes(tag));
      if (hasAvoided) return { book, score: -1 };
    }

    if (answers.triggerSensitive === true && book.darknessLevel >= 4) {
      return { book, score: -1 };
    }

    if (answers.settings && answers.settings.length > 0) {
      if (answers.settings.includes("contemporary") && bookTags.includes("contemporary")) score += 3;
      if (answers.settings.includes("historical") && bookTags.includes("historical-fiction")) score += 3;
      if (answers.settings.includes("fantasy-world") && bookTags.includes("fantasy")) score += 3;
      if (answers.settings.includes("space") && bookTags.includes("sci-fi")) score += 3;
      if (answers.settings.includes("small-town") && bookTropes.includes("small-town")) score += 3;
    }

    if (answers.readingGoal && answers.readingGoal.length > 0) {
      if (answers.readingGoal.includes("escape") && (book.mood === "happy" || book.mood === "adventurous")) score += 3;
      if (answers.readingGoal.includes("learn") && bookTags.includes("non-fiction")) score += 5;
      if (answers.readingGoal.includes("cry") && book.mood === "emotional") score += 5;
      if (answers.readingGoal.includes("laugh") && bookTags.includes("funny")) score += 5;
      if (answers.readingGoal.includes("think") && book.mood === "thoughtful") score += 5;
    }

    if (answers.endingPreferences && answers.endingPreferences.length > 0) {
      if (answers.endingPreferences.includes("happy") && book.darknessLevel <= 2) score += 2;
      if (answers.endingPreferences.includes("bittersweet") && book.mood === "emotional") score += 2;
      if (answers.endingPreferences.includes("twist") && bookTropes.includes("unreliable-narrator")) score += 3;
    }

    if (answers.diverseVoices === true && book.tags.includes("lgbtq")) score += 3;

    return { book, score };
  });

  return scoredBooks
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => ({ ...item.book, _score: item.score }))
    .slice(0, 10);
}

// Catalog book scoring with enhanced filters
function scoreCatalogBooks(books: any[], answers: QuizAnswers) {
  const resultCount = answers.resultCount || 10;
  
  if (isChildrensAgeGroup(answers.ageGroup)) {
    return [];
  }
  
  const hasRomanceSelected = answers.genres?.includes("romance") || false;
  const isNonfictionOnly = answers.fictionType === "nonfiction";
  const isFictionOnly = answers.fictionType === "fiction";
  
  // Expanded nonfiction genre identifiers - more comprehensive detection
  const nonfictionKeywords = [
    "nonfiction", "non-fiction", "biography", "autobiography", "self-help", 
    "memoir", "true crime", "history", "science", "psychology", "philosophy",
    "business", "economics", "politics", "health", "cooking", "travel",
    "essay", "journalism", "reference", "education", "religion", "spirituality",
    "true story", "motivational", "personal development", "how-to", "guide"
  ];
  
  // Fiction genre identifiers - to confirm something is fiction
  const fictionKeywords = [
    "fiction", "novel", "fantasy", "science fiction", "mystery", "thriller",
    "romance", "horror", "adventure", "literary fiction", "young adult fiction",
    "historical fiction", "dystopian", "paranormal", "urban fantasy"
  ];
  
  const scoredBooks = books.map(book => {
    let score = 1;
    const bookTropes = book.tropes || [];
    const bookTags = book.tags || [];
    const bookMoodTags = book.moodTags || [];
    const bookContentWarnings = book.contentWarnings || [];
    const categories = (book.categories || []).join(" ").toLowerCase();
    const description = (book.description || "").toLowerCase();
    const bookAuthors = (book.authors || []).map((a: string) => a.toLowerCase());
    const romanceLevel = book.romanceLevel || "none";
    const tagsStr = bookTags.join(" ").toLowerCase();

    // === FICTION TYPE FILTER (stricter detection) ===
    const hasNonfictionMarker = nonfictionKeywords.some(kw => 
      categories.includes(kw) || tagsStr.includes(kw)
    );
    const hasFictionMarker = fictionKeywords.some(kw => 
      categories.includes(kw) || tagsStr.includes(kw)
    );
    
    // A book is nonfiction if it has nonfiction markers and NO fiction markers
    const isNonfictionBook = hasNonfictionMarker && !hasFictionMarker;
    // A book is fiction if it has fiction markers OR lacks nonfiction markers
    const isFictionBook = hasFictionMarker || !hasNonfictionMarker;
    
    if (isNonfictionOnly && !isNonfictionBook) {
      return { book, score: -1 }; // Only want nonfiction, this is fiction
    }
    if (isFictionOnly && isNonfictionBook) {
      return { book, score: -1 }; // Only want fiction, this is nonfiction
    }

    // Hard-exclude juvenile/children's books from adult searches
    if (answers.ageGroup === "adult" || answers.ageGroup === "new-adult") {
      const juvenileMarkers = ["juvenile fiction", "juvenile nonfiction", "children", "kids", "picture book", "early reader", "middle grade"];
      const isJuvenileBook = juvenileMarkers.some(k => categories.includes(k));
      if (isJuvenileBook) return { book, score: -1 };
    }

    // === GENRE MATCHING (soft preference, not hard filter) ===
    const bookPrimaryGenre = (book.primaryGenre || "").toLowerCase();
    const genreAliases: Record<string, string[]> = {
      "romance": ["romance", "romantic", "love story", "romantasy"],
      "fantasy": ["fantasy", "magical", "magic", "romantasy", "urban-fantasy", "dark-fantasy"],
      "mystery": ["mystery", "detective", "whodunit", "cozy-mystery"],
      "thriller": ["thriller", "suspense", "crime", "psychological thriller"],
      "sci-fi": ["science fiction", "sci-fi", "dystopian", "space", "cyberpunk"],
      "horror": ["horror", "gothic", "dark", "supernatural horror"],
      "historical-fiction": ["historical fiction", "historical", "regency", "medieval"],
      "contemporary": ["contemporary", "realistic fiction", "modern"],
      "literary-fiction": ["literary fiction", "literary"],
      "young-adult": ["young adult", "young-adult", "ya", "juvenile fiction"],
    };
    if (answers.genres && answers.genres.length > 0) {
      let genreMatchCount = 0;
      for (const genre of answers.genres) {
        const aliases = genreAliases[genre] || [genre.toLowerCase()];
        const matchesCategory = aliases.some(a => categories.includes(a));
        const matchesTag = aliases.some(a => bookTags.includes(a));
        const matchesPrimaryGenre = aliases.some(a => bookPrimaryGenre.includes(a));
        const matchesDescription = aliases.some(a => description.includes(a));
        if (matchesCategory || matchesTag || matchesPrimaryGenre || matchesDescription) {
          genreMatchCount++;
        }
      }
      if (genreMatchCount > 0) {
        score += genreMatchCount * 12;
      } else {
        score -= 3;
      }
    }

    // === ROMANCE EXCLUSION (if Romance NOT selected) ===
    if (!hasRomanceSelected && romanceLevel === "central") {
      return { book, score: -1 }; // Exclude romance-heavy books
    }
    if (!hasRomanceSelected && romanceLevel === "subplot") {
      score -= 5; // Penalize but don't exclude
    }

    // === HARD FILTERS (return -1 to exclude) ===
    
    // Spice level filters (only apply if romance selected)
    if (hasRomanceSelected) {
      if (answers.maxSpice !== undefined && (book.spiceLevel || 1) > answers.maxSpice) {
        return { book, score: -1 };
      }
      if (answers.minSpice !== undefined && (book.spiceLevel || 1) < answers.minSpice) {
        return { book, score: -1 };
      }
    }
    
    // Darkness filter
    if (answers.maxDarkness !== undefined && (book.darknessLevel || 2) > answers.maxDarkness) {
      return { book, score: -1 };
    }
    
    // Avoid tropes filter (skip for nonfiction)
    if (!isNonfictionBook && answers.avoidTropes && answers.avoidTropes.length > 0) {
      const hasAvoidedTrope = bookTropes.some((t: string) => answers.avoidTropes!.includes(t));
      if (hasAvoidedTrope) return { book, score: -1 };
    }

    // Avoid topics/content warnings filter
    if (answers.avoidTopics && answers.avoidTopics.length > 0) {
      const hasAvoided = [...bookTags, ...bookContentWarnings].some(
        (item: string) => answers.avoidTopics!.includes(item)
      );
      if (hasAvoided) return { book, score: -1 };
    }
    
    // Avoid genres filter
    if (answers.avoidGenres && answers.avoidGenres.length > 0) {
      const hasAvoidedGenre = answers.avoidGenres.some(
        (genre: string) => categories.includes(genre.toLowerCase()) || bookTags.includes(genre)
      );
      if (hasAvoidedGenre) return { book, score: -1 };
    }
    
    // Avoid authors filter
    if (answers.avoidAuthors && answers.avoidAuthors.length > 0) {
      const hasAvoidedAuthor = answers.avoidAuthors.some(
        (author: string) => bookAuthors.some((a: string) => a.includes(author.toLowerCase()))
      );
      if (hasAvoidedAuthor) return { book, score: -1 };
    }

    // Trigger sensitive filter (skip for nonfiction unless has warnings)
    if (answers.triggerSensitive === true && !isNonfictionBook) {
      if ((book.darknessLevel || 2) >= 4) return { book, score: -1 };
      if (bookContentWarnings.length > 2) return { book, score: -1 };
    }
    
    // === SCORING (weighted matching) ===
    
    // Mood matching (high weight - multi-select)
    if (answers.mood && answers.mood.length > 0 && answers.mood.includes(book.mood as any)) score += 10;
    
    // Mood tags matching
    if (answers.mood && answers.mood.length > 0) {
      const moodToTags: Record<string, string[]> = {
        "happy": ["cozy", "funny", "romantic"],
        "emotional": ["emotional", "romantic"],
        "adventurous": ["adventurous", "fast-paced"],
        "scary": ["dark", "suspenseful"],
        "thoughtful": ["thought-provoking", "atmospheric"],
      };
      for (const m of answers.mood) {
        const relevantMoodTags = moodToTags[m] || [];
        const moodTagMatches = bookMoodTags.filter((t: string) => relevantMoodTags.includes(t)).length;
        score += moodTagMatches * 2;
      }
    }
    
    // Pace matching (medium weight) - skip for nonfiction
    if (!isNonfictionBook && answers.pace && book.pace === answers.pace) score += 5;
    
    // Length matching (medium weight)
    if (answers.length && book.length === answers.length) score += 5;
    
    // Romance level bonus (if romance selected, boost books with romance)
    if (hasRomanceSelected) {
      if (romanceLevel === "central") score += 15;
      else if (romanceLevel === "subplot") score += 5;
    }
    
    // General trope matching (skip for nonfiction)
    if (!isNonfictionBook && answers.tropes && answers.tropes.length > 0) {
      const matchingTropes = bookTropes.filter((t: string) => answers.tropes!.includes(t));
      score += matchingTropes.length * 4;
    }
    
    // Romance trope matching (only if romance selected)
    if (hasRomanceSelected && answers.romanceTropes && answers.romanceTropes.length > 0) {
      const matchingRomanceTropes = bookTropes.filter((t: string) => answers.romanceTropes!.includes(t));
      score += matchingRomanceTropes.length * 5;
    }

    // Setting preferences
    if (answers.settings && answers.settings.length > 0) {
      if (answers.settings.includes("contemporary") && categories.includes("contemporary")) score += 3;
      if (answers.settings.includes("historical") && categories.includes("historical")) score += 3;
      if (answers.settings.includes("fantasy-world") && categories.includes("fantasy")) score += 3;
      if (answers.settings.includes("space") && (categories.includes("science fiction") || categories.includes("sci-fi"))) score += 3;
      if (answers.settings.includes("small-town") && (categories.includes("small town") || bookTropes.includes("small-town"))) score += 3;
    }

    // Reading goal (multi-select)
    if (answers.readingGoal && answers.readingGoal.length > 0) {
      if (answers.readingGoal.includes("escape") && (book.mood === "happy" || book.mood === "adventurous")) score += 3;
      if (answers.readingGoal.includes("learn") && categories.includes("nonfiction")) score += 5;
      if (answers.readingGoal.includes("cry") && book.mood === "emotional") score += 5;
      if (answers.readingGoal.includes("laugh") && (categories.includes("humor") || bookTags.includes("funny"))) score += 5;
      if (answers.readingGoal.includes("think") && book.mood === "thoughtful") score += 5;
    }

    // Ending preference
    if (answers.endingPreferences && answers.endingPreferences.length > 0) {
      if (answers.endingPreferences.includes("happy") && (book.darknessLevel || 2) <= 2) score += 2;
      if (answers.endingPreferences.includes("bittersweet") && book.mood === "emotional") score += 2;
      if (answers.endingPreferences.includes("twist") && bookTropes.includes("unreliable-narrator")) score += 3;
    }

    // Diverse voices
    if (answers.diverseVoices === true && (categories.includes("lgbtq") || bookTags.includes("lgbtq"))) score += 3;

    // Format preferences
    if (answers.wantAudiobook === true && book.hasAudiobook) score += 3;
    if (answers.wantKindleUnlimited === true && book.kindleUnlimited) score += 3;
    if (answers.audioFriendly === true && book.hasAudiobook) score += 2;

    // Boost books with covers (better presentation)
    if (book.coverUrl) score += 1;
    
    // Boost books with descriptions
    if (book.description && book.description.length > 50) score += 1;

    return { book, score };
  });

  // Include books with score >= 0 for variety (only hard filters return -1)
  return scoredBooks
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(item => ({ ...formatCatalogBook(item.book), _score: item.score }))
    .slice(0, resultCount);
}

// Format catalog book for frontend
function formatCatalogBook(catalogBook: any) {
  // Derive primary genre from categories/tags
  const categories = catalogBook.categories || [];
  const tags = catalogBook.tags || [];
  const primaryGenre = derivePrimaryGenre(categories, tags);
  
  return {
    id: catalogBook.id,
    title: catalogBook.title,
    author: catalogBook.authors?.join(", ") || "Unknown",
    description: catalogBook.description || "No description available.",
    coverUrl: catalogBook.coverUrl || "",
    mood: catalogBook.mood || "thoughtful",
    pace: catalogBook.pace || "medium",
    length: catalogBook.length || "medium",
    spiceLevel: catalogBook.spiceLevel || 1,
    darknessLevel: catalogBook.darknessLevel || 2,
    tropes: catalogBook.tropes || [],
    tags: catalogBook.tags || [],
    moodTags: catalogBook.moodTags || [],
    contentWarnings: catalogBook.contentWarnings || [],
    categories: catalogBook.categories,
    pageCount: catalogBook.pageCount,
    publishedDate: catalogBook.publishedDate,
    isbn13: catalogBook.isbn13,
    hasEbook: catalogBook.hasEbook,
    hasAudiobook: catalogBook.hasAudiobook,
    kindleUnlimited: catalogBook.kindleUnlimited,
    libbyAvailable: catalogBook.libbyAvailable,
    // New fields for UI labels
    romanceLevel: catalogBook.romanceLevel || "none",
    tone: catalogBook.tone || "medium",
    primaryGenre,
  };
}

// Derive primary genre for display
function derivePrimaryGenre(categories: string[], tags: string[]): string {
  const combined = [...categories, ...tags].join(" ").toLowerCase();
  
  // Priority order for genre detection
  if (combined.includes("romance")) return "Romance";
  if (combined.includes("fantasy")) return "Fantasy";
  if (combined.includes("thriller")) return "Thriller";
  if (combined.includes("mystery")) return "Mystery";
  if (combined.includes("science fiction") || combined.includes("sci-fi")) return "Sci-Fi";
  if (combined.includes("horror")) return "Horror";
  if (combined.includes("historical")) return "Historical";
  if (combined.includes("literary")) return "Literary Fiction";
  if (combined.includes("biography") || combined.includes("memoir")) return "Biography";
  if (combined.includes("self-help")) return "Self-Help";
  if (combined.includes("nonfiction") || combined.includes("non-fiction")) return "Nonfiction";
  if (combined.includes("contemporary")) return "Contemporary";
  if (combined.includes("young adult")) return "Young Adult";
  
  return "Fiction";
}

// Calculate similarity score between two books
function calculateBookSimilarity(bookA: any, bookB: any): number {
  let score = 0;
  
  // Same mood = high similarity
  if (bookA.mood === bookB.mood) score += 10;
  
  // Same pace
  if (bookA.pace === bookB.pace) score += 5;
  
  // Same length
  if (bookA.length === bookB.length) score += 3;
  
  // Similar spice level (within 1)
  if (Math.abs((bookA.spiceLevel || 1) - (bookB.spiceLevel || 1)) <= 1) score += 3;
  
  // Shared authors
  const authorsA = (bookA.authors || []).map((a: string) => a.toLowerCase());
  const authorsB = (bookB.authors || []).map((a: string) => a.toLowerCase());
  const sharedAuthors = authorsA.filter((a: string) => authorsB.includes(a)).length;
  score += sharedAuthors * 15; // High weight for same author
  
  // Shared tropes
  const tropesA = bookA.tropes || [];
  const tropesB = bookB.tropes || [];
  const sharedTropes = tropesA.filter((t: string) => tropesB.includes(t)).length;
  score += sharedTropes * 4;
  
  // Shared tags
  const tagsA = bookA.tags || [];
  const tagsB = bookB.tags || [];
  const sharedTags = tagsA.filter((t: string) => tagsB.includes(t)).length;
  score += sharedTags * 3;
  
  // Shared mood tags
  const moodTagsA = bookA.moodTags || [];
  const moodTagsB = bookB.moodTags || [];
  const sharedMoodTags = moodTagsA.filter((t: string) => moodTagsB.includes(t)).length;
  score += sharedMoodTags * 2;
  
  // Shared categories
  const catsA = (bookA.categories || []).map((c: string) => c.toLowerCase());
  const catsB = (bookB.categories || []).map((c: string) => c.toLowerCase());
  const sharedCats = catsA.filter((c: string) => catsB.includes(c)).length;
  score += sharedCats * 5;
  
  return score;
}

// LIGHTWEIGHT scoring for dynamically fetched books
// Philosophy: API results are already relevant - trust them! Only use scoring to ORDER results.
function scoreDynamicBooks(books: any[], answers: QuizAnswers) {
  const resultCount = answers.resultCount || 20;
  const hasRomanceSelected = answers.genres?.includes("romance") || false;
  
  const genreAliases: Record<string, string[]> = {
    "romance": ["romance", "romantic", "love story", "romantasy"],
    "fantasy": ["fantasy", "magical", "magic", "romantasy", "urban-fantasy", "dark-fantasy"],
    "mystery": ["mystery", "detective", "whodunit", "cozy-mystery"],
    "thriller": ["thriller", "suspense", "crime", "psychological thriller"],
    "sci-fi": ["science fiction", "sci-fi", "dystopian", "space", "cyberpunk"],
    "horror": ["horror", "gothic", "supernatural horror"],
    "historical-fiction": ["historical fiction", "historical", "regency", "medieval"],
    "contemporary": ["contemporary", "realistic fiction", "modern"],
    "literary-fiction": ["literary fiction", "literary"],
    "young-adult": ["young adult", "young-adult", "ya", "juvenile fiction"],
  };
  
  const enrichedBooks = books.map(enrichCatalogBook);
  
  const childrenFilter = isChildrensAgeGroup(answers.ageGroup);
  const juvenileKeywords = ["juvenile", "children", "kids", "picture book", "early reader", "middle grade", "ages 4", "ages 5", "ages 6", "ages 7", "ages 8", "ages 9", "ages 10", "ages 11", "ages 12"];
  
  const scoredBooks = enrichedBooks.map(book => {
    let score = 5;
    const romanceLevel = book.romanceLevel || "none";
    const bookMoodTags = book.moodTags || [];
    const bookTags = book.tags || [];
    const bookTropes = book.tropes || [];
    const categories = (book.categories || []).join(" ").toLowerCase();
    const description = (book.description || "").toLowerCase();
    const bookPrimaryGenre = (book.primaryGenre || "").toLowerCase();
    
    if (childrenFilter) {
      const isJuvenile = juvenileKeywords.some(k => categories.includes(k));
      if (!isJuvenile) return { book, score: -1 };
      score += 10;
    }

    // Hard-exclude juvenile/children's books from adult searches
    const isAdultSearch = answers.ageGroup === "adult" || answers.ageGroup === "new-adult";
    if (isAdultSearch) {
      const adultJuvKeywords = ["juvenile fiction", "juvenile nonfiction", "children", "kids", "picture book", "early reader", "middle grade"];
      const isJuvenileBook = adultJuvKeywords.some(k => categories.includes(k));
      if (isJuvenileBook) return { book, score: -1 };
    }

    // Hard fiction/nonfiction filter
    const isNonfictionOnly = answers.fictionType === "nonfiction";
    const isFictionOnly = answers.fictionType === "fiction";
    if (isNonfictionOnly || isFictionOnly) {
      const nonfictionMarkers = ["nonfiction", "non-fiction", "biography", "autobiography", "self-help", "memoir", "true crime", "history", "science", "psychology", "philosophy", "business", "true story", "motivational", "personal development"];
      const fictionMarkers = ["fiction", "novel", "fantasy", "science fiction", "mystery", "thriller", "romance", "horror", "adventure", "literary fiction", "young adult fiction", "historical fiction", "dystopian"];
      const hasNonfictionMarker = nonfictionMarkers.some(kw => categories.includes(kw) || description.includes(kw));
      const hasFictionMarker = fictionMarkers.some(kw => categories.includes(kw));
      const isNonfictionBook = hasNonfictionMarker && !hasFictionMarker;
      if (isNonfictionOnly && !isNonfictionBook) return { book, score: -1 };
      if (isFictionOnly && isNonfictionBook) return { book, score: -1 };
    }

    if (answers.avoidTopics && answers.avoidTopics.length > 0) {
      const bookWarnings = book.contentWarnings || [];
      const hasAvoided = bookWarnings.some((w: string) => answers.avoidTopics!.includes(w));
      if (hasAvoided) return { book, score: -1 };
    }
    
    if (answers.genres && answers.genres.length > 0) {
      let genreMatchCount = 0;
      for (const genre of answers.genres) {
        const aliases = genreAliases[genre] || [genre.toLowerCase()];
        const matchesCategory = aliases.some(a => categories.includes(a));
        const matchesTag = aliases.some(a => bookTags.includes(a));
        const matchesPrimaryGenre = aliases.some(a => bookPrimaryGenre.includes(a));
        const matchesDescription = aliases.some(a => description.includes(a));
        if (matchesCategory || matchesTag || matchesPrimaryGenre || matchesDescription) {
          genreMatchCount++;
        }
      }
      if (genreMatchCount > 0) {
        score += genreMatchCount * 12;
      } else {
        score -= 5;
      }
    }
    
    // Romance matching
    if (!hasRomanceSelected && romanceLevel === "central") {
      score -= 5;
    }
    if (hasRomanceSelected) {
      if (romanceLevel === "central") score += 15;
      else if (romanceLevel === "subplot") score += 5;
    }
    
    // Mood matching
    if (answers.mood && answers.mood.length > 0 && answers.mood.includes(book.mood as any)) score += 5;
    if (answers.pace && book.pace === answers.pace) score += 3;
    if (answers.length && book.length === answers.length) score += 3;
    
    // Mood tags matching
    if (answers.mood && answers.mood.length > 0) {
      const moodToTags: Record<string, string[]> = {
        "happy": ["cozy", "funny", "romantic"],
        "emotional": ["emotional", "romantic"],
        "adventurous": ["adventurous", "fast-paced"],
        "scary": ["dark", "suspenseful"],
        "thoughtful": ["thought-provoking", "atmospheric"],
      };
      for (const m of answers.mood) {
        const relevantMoodTags = moodToTags[m] || [];
        const moodTagMatches = bookMoodTags.filter((t: string) => relevantMoodTags.includes(t)).length;
        score += moodTagMatches * 2;
      }
    }
    
    // Quality boost
    let qualityBonus = 0;
    if (book.coverUrl) qualityBonus += 2;
    if (book.description && book.description.length > 100) qualityBonus += 1;
    if (book.description && book.description.length > 300) qualityBonus += 1;
    if (book.authors && book.authors.length > 0) qualityBonus += 1;
    if (book.pageCount && book.pageCount > 50) qualityBonus += 1;
    score += qualityBonus;
    
    // Trope matching
    if (answers.tropes && answers.tropes.length > 0) {
      const tropeMatches = bookTropes.filter((t: string) => answers.tropes!.includes(t)).length;
      score += tropeMatches * 4;
    }
    
    // Spice level matching
    if (hasRomanceSelected && answers.minSpice !== undefined) {
      const spice = book.spiceLevel || 1;
      if (spice >= answers.minSpice) score += 2;
    }
    
    return { book, score };
  });

  return scoredBooks
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map(item => ({ ...formatCatalogBook(item.book), _score: item.score }))
    .slice(0, resultCount);
}

// Helper to fetch books from multiple queries with MINIMAL quality filtering
// Goal: Return as many relevant books as possible - API results are already filtered by subject
async function fetchBooksFromQueries(queries: any[]): Promise<any[]> {
  const allBooks: any[] = [];
  const seenIds = new Set<string>();
  
  console.log(`Dynamic search with ${queries.length} queries:`, queries.map((q: any) => q.query));
  
  // Process up to 6 queries for variety, fetch 40 books per query for larger catalog
  for (const queryInfo of queries.slice(0, 6)) {
    try {
      const books = await searchGoogleBooks(queryInfo.query, 40);
      
      for (const book of books) {
        // MINIMAL quality filter: only require title (authors optional but preferred)
        if (!book.title) continue;
        
        if (!seenIds.has(book.sourceId)) {
          seenIds.add(book.sourceId);
          allBooks.push(book);
          
          // Cache in background (non-blocking)
          cacheBookInDatabase(book).catch(() => {});
        }
      }
    } catch (err) {
      console.log(`Query "${queryInfo.query}" failed:`, err);
    }
  }
  
  return allBooks;
}

// Cache a book in the database (deduplicate by sourceId/googleId)
async function cacheBookInDatabase(book: any): Promise<void> {
  try {
    // Check if already cached by sourceId
    const existing = await storage.getCatalogBookBySourceId(book.sourceId);
    if (existing) return;
    
    // Also check by ISBN13 if available
    if (book.isbn13) {
      const existingByIsbn = await storage.getCatalogBookByIsbn13(book.isbn13);
      if (existingByIsbn) return;
    }
    
    // Create the catalog book entry
    await storage.createCatalogBook(book);
  } catch (err) {
    // Silently ignore cache errors - not critical
    console.log(`Cache failed for ${book.title}:`, err);
  }
}
