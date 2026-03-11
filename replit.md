# Book Slump Rescue

## Overview
Book Slump Rescue is a web application designed to help readers overcome reading slumps by providing personalized book recommendations. It aims to offer a dynamic and personalized book discovery experience through quiz-driven recommendations, a browsable catalog, and various content curation features. The project includes an author portal, social functionalities like book clubs and a unified community feed, and a mobile application. Its ambition is to foster a vibrant reading community and support authors.

## User Preferences
Preferred communication style: Simple, everyday language.

## Mobile Responsiveness
- Navigation bar collapses on mobile: Similar, Boutique, Affiliate, and Authors links move into a "More" dropdown menu (hamburger icon). "Take Quiz" button hidden on small screens (<640px).
- All page grids collapse to single/two columns on mobile. Hero section uses `overflow-x-hidden`.
- Responsive breakpoints: `sm` (640px), `md` (768px), `lg` (1024px).

## System Architecture

### Core Functionality
- **Personalized Recommendations**: Quiz-driven system based on user preferences (mood, pace, spice, tropes) and book attributes, using a genre-first flow and additive scoring.
- **Discover Books**: A browsable catalog with client-side filtering, search, sorting, and pagination. Integrates with the Google Books API for dynamic content.
- **Content Curation**: Features like "Books Like This", "Featured Picks", and an affiliate-driven "Book Slump Shop" with admin management. **Indie Book of the Day**: Daily rotating indie pick displayed on the home page between the streak banner and Features section. Candidates pulled from active `indie_spotlights` (priority-ordered) then discoverable `authorBooks` with covers and descriptions. Deterministic date-based seed selects the daily pick; result stored in `dailyIndieBooks` table (keyed by YYYY-MM-DD date string) so the pick is stable across requests. Endpoint: `GET /api/book-of-the-day`. Admin manual override: `POST /api/admin/book-of-the-day`. Section hidden gracefully when no indie content is available.
- **Community & Social Features**:
    - **Block & Report System**: Users can block/unblock other users (`user_blocks` table) and report users or content (`user_reports` table). Blocking auto-unfollows both directions and cancels pending follow requests. Blocked users see a "You have blocked this user" message. Report dialog with reason categories (harassment, spam, inappropriate, hate_speech, impersonation, other) and optional details. Routes: `POST/DELETE /api/user/block`, `GET /api/user/blocked`, `POST /api/user/report`.
    - **Private Accounts & Follow Requests**: Users can toggle `isPrivateAccount` in Profile Settings. Private accounts require follow approval via `follow_requests` table. Follow button shows "Requested" state for pending requests. Profile Settings shows follow request management with approve/reject buttons. Toggling to public auto-approves all pending requests. Routes: `GET/PATCH /api/user/privacy`, `GET /api/user/follow-requests`, `POST /api/user/follow-requests/:id/approve`, `POST /api/user/follow-requests/:id/reject`.
    - **Unified Community Feed**: A central feed combining activity events and user posts (status updates, reviews, author posts) with filtering, infinite scroll pagination, likes, comments, notifications, and contextual affiliate cards. Includes "For You" personalization based on followed users and topics. Author profiles resolved via `getAuthorProfilesByUserIds()` (batched query, not full table scan).
    - **Trope + Vibe Discovery System**: Faceted search on `/discover` using a typed taxonomy (GENRE, SUBGENRE, TROPE, THEME, VIBE, etc.) with include/exclude filtering, facet counts, and saved filter presets.
    - **Badge System**: Supports milestone, seasonal challenge, and event badges with a unified `user_badges` table and a public gallery.
    - **Reading Challenges**: Seasonal challenges (e.g., Spring Reading Bloom, Summer Reading Escape) with progress tracking and badge awards.
    - **Indie Author Interviews & Spotlights**: Public displays with admin content management, submission forms, and sponsored placement options. Standardized pricing tiers: 7d/$15, 14d/$29, 30d/$39 (`PLACEMENT_PRICING_TIERS` in schema). Both `featured_placements` and `indie_spotlights` tables include `durationDays`, `pricePaid`, `placementType`, `orderId`. Auto-expiration on query. Admin extend/cancel endpoints. Public pricing at `GET /api/placement-pricing`.
    - **Video Review System**: Hub for BookTok/Bookstagram/YouTube reviews with submission and approval.
    - **Book Clubs**: Creation, joining, discussion threads with chapter-range tagging and spoiler flags, reading progress tracking, scheduled meetings with RSVP (going/maybe/can't go), member roles (admin/moderator/member). Dark academia themed UI with serif headings, amber accents, cream backgrounds. Features: banner section with club image/description/member avatars/join button, current read card with progress bar, discussion prompts for empty states, like/comment/pin buttons on posts, trending/top post highlights, reading schedule (admin-editable weekly chapter assignments via `club_reading_schedules` table), most active readers badges, mobile-optimized tab layout. Club admin can delete club. Global admin can delete any club or all clubs. Schema tables: `book_clubs`, `club_members` (with `currentChapter`/`currentPage`), `club_discussions` (with `chapterStart`/`chapterEnd`/`hasSpoilers`), `club_reading_books`, `club_votes`, `club_meetings`, `club_meeting_rsvps`, `club_reading_schedules` (weekNumber/label/chapterStart/chapterEnd). Admin endpoints: `DELETE /api/admin/clubs/all`, `DELETE /api/admin/clubs/:id`. Schedule endpoints: `GET /api/clubs/:id/schedule`, `PUT /api/clubs/:id/schedule`.
- **User Tools**: Cloud-synced library, reading goals, mood history, streaks, custom lists (with public sharing and reorder), quotes, series tracker, "Year in Review", Goodreads CSV import, and a TBR Quick-Pick. Reading lists support public/private toggle, shareable links (`/lists/:id`), and drag-to-reorder via `PATCH /api/user/lists/:id/reorder`. Public list view at `GET /api/lists/:id`.
- **Author Portal**: Tools for managing books, ARC distribution (with secure upload and watermarking), public profiles, and analytics. **ARC Limits**: Free accounts limited to 1 active ARC and 50 downloads per ARC. Subscribed authors ($9.99/mo Author Pro plan) get up to 5 active ARCs and unlimited downloads per ARC. Enforced server-side in `PATCH /api/user/author-books/:id` with `hasActiveSubscription()` check. Limits endpoint: `GET /api/user/arc-limits`. Frontend shows amber banner with usage info and upgrade prompt. Book Performance dashboard shows library saves, community posts/mentions, and ARC claims per book (`GET /api/user/author-analytics`). Includes 12-week trend chart showing weekly saves and community posts over time (CSS bar chart, no external charting library). **Media Kit Generator** (`MediaKitGenerator.tsx`): template-based content generation for author bio (short/medium/long, formal/balanced/casual tone), book summary, press release, social media posts (Twitter/Instagram/TikTok/general), and interview Q&A — auto-fills from profile and book data, editable output with copy-to-clipboard.
- **Kids Corner**: Gamified children's reading tracker with child profiles, logs, streaks, badges, progression levels, goals, and challenges, including a Reading Timer and Jelly Lock Screen.
- **Shareable Reading Stats Cards**: Users can generate branded social media image cards from their reading data at `/share-stats`. Three templates: Minimal (clean aesthetic), Detailed (comprehensive), Achievement (festive). Light/dark theme options. Pulls real data from user books, reading streaks, and challenges. Downloads as high-quality PNG (2x scale) via html2canvas for TikTok/Instagram/Threads/Facebook sharing. Files: `client/src/components/ReadingStatsCard.tsx`, `client/src/pages/ShareStats.tsx`.
- **Book Slump Rescue Mode**: Signature interactive reading recovery feature at `/rescue`. Users pick from 9 themed "rescue modes" (Get Me Hooked Fast, Cozy Reset, Easy Win, One-Sitting Read, Romantic Escape, Fantasy Reboot, Thriller Fix, Indie Rescue, Kindle Unlimited Rescue), then answer a 5-question quiz (slump severity, reading time, mood, genres, series preference). Results show 6 personalized book recommendations with cover images, genre tags, and a branded "why it fits" explanation per book. Books can be added to TBR (authenticated users) or discovered via search. "Rescue Me" button prominently placed in desktop nav and mobile "More" dropdown. Backend endpoint: `POST /api/rescue/recommend` leverages existing Google Books search + scoring pipeline with mode-specific search boosts. Future-ready: config-driven rescue modes and quiz questions (`client/src/lib/rescueModes.ts`), extensible for AI recommendations, community voting, and seasonal lists. Files: `client/src/pages/SlumpRescue.tsx`, `client/src/lib/rescueModes.ts`.
- **Community Guidelines Enforcement**: Reusable dialog component (`client/src/components/CommunityGuidelinesDialog.tsx`) with context-aware rules shown before users can submit. Integrated into: review submissions (SubmitReview.tsx), community posts (Community.tsx Composer), and user reports (ReaderProfile.tsx). Users must check an "I understand" checkbox before proceeding.
- **Admin Dashboard**: Central control for metrics, user management, content moderation, author/book management, newsletter system, and affiliate resources.
- **Monetization**: Affiliate link tracking and Stripe integration for payments (ads, newsletter). **Author Pro Subscription**: $9.99/month Stripe subscription (`price_data` dynamic pricing, no hardcoded price ID) gating the Media Kit Generator and unlocking up to 5 active ARCs with unlimited downloads. Webhook self-heals stale endpoint IDs on startup. Schema: `media_kit_subscriptions` table (userId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodStart/End, canceledAt). Endpoints: `GET /api/user/media-kit-subscription` (status check), `POST /api/media-kit/checkout` (Stripe Checkout session), `POST /api/media-kit/cancel` (cancel at period end). Webhook handles `checkout.session.completed` (creates subscription with idempotency), `customer.subscription.updated/deleted` (syncs status/period). Frontend shows paywall with pricing when not subscribed, cancel option when subscribed.
- **Ad Requests**: Stored in PostgreSQL `ad_requests` table (migrated from file-based JSON). Statuses: new, reviewing, needs-info, approved, approved-pending-payment, paid, scheduled, live, ended, declined. Admin endpoints for status updates, approval with Stripe link generation, and metadata editing. Stripe webhook handler updates status on payment completion.
- **Stripe Checkout for Placements**: Self-service checkout flow at `/spotlight-request`. Authors choose placement type (spotlight/frontpage/search_boost), select duration tier (7d/$15, 14d/$29, 30d/$39), fill in book details, and pay via Stripe Checkout. Webhook auto-creates `indie_spotlights` row on successful payment. Success page at `/placement/success`, cancel page at `/placement/cancel`. Endpoint: `POST /api/placements/checkout`.

### Technical Stack
- **Frontend**: React 18, TypeScript, Wouter, TanStack React Query, Tailwind CSS, shadcn/ui, Framer Motion, React Hook Form with Zod, built with Vite.
- **Backend**: Express.js 5, Node.js, TypeScript, ES modules.
- **Data Layer**: Drizzle ORM with PostgreSQL, Zod for schema validation.

### UI/UX Decisions
- **Landing Page**: Hero with quiz CTA, "How It Works" walkthrough, testimonials, feature grid, community stats, and newsletter signup. Authenticated users see a streak banner.
- **Onboarding**: WelcomeModal with a 4-step guided tour for first-time users.
- **Book Display**: Detailed book cards showing genre, tone, romance, and spice levels. All images use `loading="lazy"` and `decoding="async"` for performance. BookCard covers support `priority` prop for eager loading above-the-fold images with `fetchPriority="high"`. Fade-in transition on image load.
- **Accessibility**: WorldCat integration for library links.
- **Theming**: Tailwind CSS with `hover-elevate` utility.
- **PWA Support**: Installable web app with `pwabuilder-sw.js` service worker (offline-first static assets, network-first navigation, pre-cached app shell/manifest/icons). Registered in `main.tsx`. TWA-ready manifest with all icon sizes (48/72/96/144/192/512), split `any`/`maskable` purpose entries. Digital Asset Links at `/.well-known/assetlinks.json` for Android TWA verification. TWA build config and instructions in `twa/` directory.
- **SEO**: Dynamic meta tags, JSON-LD, sitemap, robots.txt.
- **Account Deletion**: Apple/Google Play compliant self-service account deletion at `/delete-account`. Tabbed UI covering both Book Slump Rescue and ARC Reader Kit. Requires auth + typing "DELETE_MY_ACCOUNT" + confirmation dialog. Endpoint: `DELETE /api/user/account`. Deletes all user data across 30+ tables including author profiles, ARC data, clubs, community posts, kids profiles, subscriptions, and the users table itself. Linked in footer.
- **Security**: Helmet headers, CORS lockdown, bot detection, rate limiting, request body limits, disabled x-powered-by.
- **Performance**: React.lazy() code-splitting for all 65+ route components, database indexes on `catalog_books` (isbn13, source_id, title) and `reading_list_items` (list_id), N+1 query fix in featured placements using LEFT JOIN. Server-side in-memory API cache (`cacheMiddleware`) with TTL, max 500 entries, expired-entry eviction, and prefix-based invalidation on writes. Cached endpoints: `/api/catalog` (120s), `/api/catalog/:id` (300s), `/api/discover/tags` (300s), `/api/similar` (180s), `/api/book-search` (120s), `/api/book-cover` (600s), `/api/authors` (300s), `/api/featured/spotlight` (300s), `/api/spotlights/active` (300s), `/api/community/trending` (600s), `/api/featured-picks` (300s), `/api/shop/products` (300s), `/api/nonfiction-categories` (3600s), `/api/placement-pricing` (3600s), `/sitemap.xml` (3600s). `X-Cache: HIT/MISS` response header for monitoring.

## External Dependencies

### APIs
- **Google Books API**: For dynamic book catalog data and metadata.

### Database
- **PostgreSQL**: Primary data store.

### Libraries & Frameworks
- **Drizzle ORM**: For database interactions.
- **Zod**: For schema validation.
- **React Hook Form**: For form management.
- **Radix UI**: For accessible UI components.
- **Tailwind CSS**: For styling.
- **Lucide React**: For icons.
- **Replit Auth**: For user authentication.

### Services
- **Stripe**: For payment processing.

## Mobile Apps

### Android (Google Play)
- TWA (Trusted Web Activity) package: `com.bookslumprescue.app`
- Asset links served at `GET /.well-known/assetlinks.json` with SHA-256 fingerprint

### iOS (Apple App Store)
- Bundle ID: `com.bookslumprescue.app`
- PWABuilder-generated Xcode project submitted to App Store Connect
- Universal Links enabled via `GET /.well-known/apple-app-site-association` (Express route with `Content-Type: application/json`)
- Static AASA file also at `client/public/.well-known/apple-app-site-association`
- Team ID stored in `APPLE_TEAM_ID` environment variable (required for AASA `appIDs` field)
- Once the App Store numeric app ID is assigned, update the `itunes` entry URL in `manifest.json`
- `viewport-fit=cover` added to viewport meta for iPhone notch/home-indicator support
- `body { padding-bottom: env(safe-area-inset-bottom) }` in index.css for home indicator clearance