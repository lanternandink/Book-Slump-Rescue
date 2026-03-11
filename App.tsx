import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { SWUpdateBanner, OfflineBanner } from "@/components/SWUpdateBanner";

const Home = lazy(() => import("@/pages/Home"));
const Quiz = lazy(() => import("@/pages/Quiz"));
const Results = lazy(() => import("@/pages/Results"));
const Saved = lazy(() => import("@/pages/Saved"));
const Similar = lazy(() => import("@/pages/Similar"));
const Featured = lazy(() => import("@/pages/Featured"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
const Events = lazy(() => import("@/pages/Events"));
const Updates = lazy(() => import("@/pages/Updates"));
const Shop = lazy(() => import("@/pages/Shop"));

const Admin = lazy(() => import("@/pages/Admin"));
const Challenge = lazy(() => import("@/pages/Challenge"));
const Stats = lazy(() => import("@/pages/Stats"));
const Profile = lazy(() => import("@/pages/Profile"));
const ReadingLists = lazy(() => import("@/pages/ReadingLists"));
const Quotes = lazy(() => import("@/pages/Quotes"));
const SeriesTracker = lazy(() => import("@/pages/SeriesTracker"));
const YearInReview = lazy(() => import("@/pages/YearInReview"));
const AuthorProfile = lazy(() => import("@/pages/AuthorProfile"));
const AuthorDashboard = lazy(() => import("@/pages/AuthorDashboard"));
const AuthorLogin = lazy(() => import("@/pages/AuthorLogin"));
const ReaderProfile = lazy(() => import("@/pages/ReaderProfile"));
const Clubs = lazy(() => import("@/pages/Clubs"));
const Discussions = lazy(() => import("@/pages/Discussions"));
const UsersPage = lazy(() => import("@/pages/Users"));
const AuthorSubmission = lazy(() => import("@/pages/AuthorSubmission"));
const AdvertisingRequest = lazy(() => import("@/pages/AdvertisingRequest"));
const AdminAds = lazy(() => import("@/pages/AdminAds"));
const NewsletterFeatureRequest = lazy(() => import("@/pages/NewsletterFeatureRequest"));
const AdminNewsletters = lazy(() => import("@/pages/AdminNewsletters"));
const Subscribe = lazy(() => import("@/pages/Subscribe"));
const AdminSendNewsletter = lazy(() => import("@/pages/AdminSendNewsletter"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminPayments = lazy(() => import("@/pages/AdminPayments"));
const ArcUpload = lazy(() => import("@/pages/ArcUpload"));
const AdminArcs = lazy(() => import("@/pages/AdminArcs"));
const Resources = lazy(() => import("@/pages/Resources"));
const SlumpRescue = lazy(() => import("@/pages/SlumpRescue"));
const AdminResources = lazy(() => import("@/pages/AdminResources"));
const DisclosurePolicy = lazy(() => import("@/pages/DisclosurePolicy"));
const Interviews = lazy(() => import("@/pages/Interviews"));
const InterviewSingle = lazy(() => import("@/pages/InterviewSingle"));
const AdminInterviews = lazy(() => import("@/pages/AdminInterviews"));
const BookReviews = lazy(() => import("@/pages/BookReviews"));
const SubmitReview = lazy(() => import("@/pages/SubmitReview"));
const AdminReviews = lazy(() => import("@/pages/AdminReviews"));
const AdminBooks = lazy(() => import("@/pages/AdminBooks"));
const AdminShop = lazy(() => import("@/pages/AdminShop"));
const AdminAuthors = lazy(() => import("@/pages/AdminAuthors"));
const KidsSection = lazy(() => import("@/pages/KidsSection"));
const AdminFeatured = lazy(() => import("@/pages/AdminFeatured"));
const AdminCommunity = lazy(() => import("@/pages/AdminCommunity"));
const AdminSpotlights = lazy(() => import("@/pages/AdminSpotlights"));
const SpotlightRequest = lazy(() => import("@/pages/SpotlightRequest"));
const PlacementSuccess = lazy(() => import("@/pages/PlacementSuccess"));
const PlacementCancel = lazy(() => import("@/pages/PlacementCancel"));
const InterviewRequestPage = lazy(() => import("@/pages/InterviewRequest"));
const AdminInterviewRequests = lazy(() => import("@/pages/AdminInterviewRequests"));
const SharedList = lazy(() => import("@/pages/SharedList"));
const Discover = lazy(() => import("@/pages/Discover"));
const Community = lazy(() => import("@/pages/Community"));
const BadgeGallery = lazy(() => import("@/pages/BadgeGallery"));
const GoodreadsImport = lazy(() => import("@/pages/GoodreadsImport"));
const BookDetail = lazy(() => import("@/pages/BookDetail"));
const DeleteAccount = lazy(() => import("@/pages/DeleteAccount"));
const ShareStats = lazy(() => import("@/pages/ShareStats"));
const NotFound = lazy(() => import("@/pages/not-found"));
const MyArcs = lazy(() => import("@/pages/MyArcs"));
const ArcLanding = lazy(() => import("@/pages/ArcLanding"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/quiz" component={Quiz} />
        <Route path="/results" component={Results} />
        <Route path="/discover" component={Discover} />
        <Route path="/book/:id" component={BookDetail} />
        <Route path="/saved" component={Saved} />
        <Route path="/similar" component={Similar} />
        <Route path="/featured" component={Featured} />
        <Route path="/events" component={Events} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/terms" component={Terms} />
        <Route path="/updates" component={Updates} />
        <Route path="/shop" component={Shop} />

        <Route path="/admin" component={Admin} />
        <Route path="/challenge" component={Challenge} />
        <Route path="/stats" component={Stats} />
        <Route path="/profile" component={Profile} />
        <Route path="/lists" component={ReadingLists} />
        <Route path="/lists/:id" component={SharedList} />
        <Route path="/quotes" component={Quotes} />
        <Route path="/series" component={SeriesTracker} />
        <Route path="/year-in-review" component={YearInReview} />
        <Route path="/import/goodreads" component={GoodreadsImport} />
        <Route path="/authors/interview-request" component={InterviewRequestPage} />
        <Route path="/authors/:slugOrId" component={AuthorProfile} />
        <Route path="/author-dashboard" component={AuthorDashboard} />
        <Route path="/author-login" component={AuthorLogin} />
        <Route path="/community" component={Community} />
        <Route path="/feed">{() => <Redirect to="/community" />}</Route>
        <Route path="/clubs" component={Clubs} />
        <Route path="/discussions" component={Discussions} />
        <Route path="/readers" component={UsersPage} />
        <Route path="/readers/:userId" component={ReaderProfile} />
        <Route path="/author-submission" component={AuthorSubmission} />
        <Route path="/advertising-request" component={AdvertisingRequest} />
        <Route path="/admin/ads" component={AdminAds} />
        <Route path="/newsletter-feature-request" component={NewsletterFeatureRequest} />
        <Route path="/admin/newsletters" component={AdminNewsletters} />
        <Route path="/subscribe" component={Subscribe} />
        <Route path="/admin/send-newsletter" component={AdminSendNewsletter} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/payments" component={AdminPayments} />
        <Route path="/arc-upload" component={ArcUpload} />
        <Route path="/admin/arcs" component={AdminArcs} />
        <Route path="/my-arcs" component={MyArcs} />
        <Route path="/arc/:token" component={ArcLanding} />
        <Route path="/rescue" component={SlumpRescue} />
        <Route path="/resources" component={Resources} />
        <Route path="/admin/resources" component={AdminResources} />
        <Route path="/disclosure-policy" component={DisclosurePolicy} />
        <Route path="/interviews" component={Interviews} />
        <Route path="/interviews/:id" component={InterviewSingle} />
        <Route path="/admin/interviews" component={AdminInterviews} />
        <Route path="/book-reviews" component={BookReviews} />
        <Route path="/submit-review" component={SubmitReview} />
        <Route path="/admin/reviews" component={AdminReviews} />
        <Route path="/admin/books" component={AdminBooks} />
        <Route path="/admin/shop" component={AdminShop} />
        <Route path="/admin/featured" component={AdminFeatured} />
        <Route path="/admin/community" component={AdminCommunity} />
        <Route path="/admin/spotlights" component={AdminSpotlights} />
        <Route path="/spotlight-request" component={SpotlightRequest} />
        <Route path="/placement/success" component={PlacementSuccess} />
        <Route path="/placement/cancel" component={PlacementCancel} />
        <Route path="/admin/interview-requests" component={AdminInterviewRequests} />
        <Route path="/admin/authors" component={AdminAuthors} />
        <Route path="/badges" component={BadgeGallery} />
        <Route path="/badges/public/:userId" component={BadgeGallery} />
        <Route path="/kids" component={KidsSection} />
        <Route path="/share-stats" component={ShareStats} />
        <Route path="/delete-account" component={DeleteAccount} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <Router />
          </main>
          <footer className="py-8 border-t bg-muted/30 mt-auto">
            <div className="container mx-auto px-4 flex flex-col items-center gap-4 text-center">
              <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
                <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-footer-privacy">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-footer-terms">
                  Terms of Service
                </Link>
                <span className="text-border">|</span>
                <Link href="/delete-account" className="hover:text-foreground transition-colors" data-testid="link-footer-delete-account">
                  Delete Account
                </Link>
                <span className="text-border">|</span>
                <Link href="/updates" className="hover:text-foreground transition-colors" data-testid="link-footer-updates">
                  What's Next
                </Link>
                <span className="text-border">|</span>
                <a href="https://www.buymeacoffee.com/bookslumprescue" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors" data-testid="link-footer-donate">
                  Support Us
                </a>
              </div>
              <p className="text-muted-foreground text-xs">
                Some content on BookSlumpRescue may be sponsored or contain affiliate links.{" "}
                <Link href="/disclosure-policy" className="underline hover:text-foreground transition-colors" data-testid="link-footer-disclosure">
                  See our Disclosure Policy
                </Link>
              </p>
              <p className="text-muted-foreground text-xs">
                © {new Date().getFullYear()} Book Slump Rescue. Made for readers, by readers.
              </p>
            </div>
          </footer>
        </div>
        <Toaster />
        <SWUpdateBanner />
        <OfflineBanner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
