import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Shield, BookOpen, Coffee, Database, FileText, Download, Lock, Eye, UserCheck, CreditCard } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Privacy Policy" description="Learn how Book Slump Rescue protects your reading data and privacy." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground text-lg">
              Your privacy matters. Here's how we handle your data.
            </p>
          </motion.div>

          <Tabs defaultValue="bsr" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8" data-testid="privacy-tabs">
              <TabsTrigger value="bsr" data-testid="tab-privacy-bsr">
                <BookOpen className="w-4 h-4 mr-2" />
                Book Slump Rescue
              </TabsTrigger>
              <TabsTrigger value="arc" data-testid="tab-privacy-arc">
                <FileText className="w-4 h-4 mr-2" />
                ARC Reader Kit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bsr">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        We Don't Sell Your Data
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        Your quiz answers and reading preferences are used only to generate 
                        personalized book recommendations. We do not sell, share, or transfer 
                        your personal data to third parties for marketing or any other purposes.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        No Account Required
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        You can use all core features of Book Slump Rescue without creating 
                        an account. Your saved books are stored locally in your browser. 
                        We don't require email addresses, passwords, or any personal 
                        identification to use our quiz and recommendations.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Database className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Third-Party Services
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        We use the following third-party services:
                      </p>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Google Books API:</span>
                          <span>
                            We use Google's public book database to fetch book information 
                            and recommendations. Your quiz answers are used to search their 
                            catalog but are not stored by Google.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <Coffee className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Optional Support
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        If you choose to support us through Buy Me a Coffee, that transaction 
                        is handled entirely by their platform. We receive only your display 
                        name and support amount. Your payment details are never shared with us.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/30">
                  <h2 className="font-display text-xl font-bold mb-2">
                    Questions?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about how we handle your data, feel free to 
                    reach out. We're committed to being transparent about our practices.
                  </p>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="arc">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="space-y-6"
              >
                <Card className="p-6 border-primary/20 bg-primary/5" data-testid="card-arc-header">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-1" data-testid="text-arc-policy-title">
                        ARC Reader Kit Privacy Policy
                      </h2>
                      <p className="text-sm text-muted-foreground mb-3" data-testid="text-arc-subsidiary">
                        A subsidiary of Book Slump Rescue
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        ARC Reader Kit (also known as ARC Reader Hub) is a service operated by Book Slump Rescue 
                        that connects authors with readers through Advance Reader Copy (ARC) distribution. 
                        This policy covers how we handle data specific to the ARC Reader Kit service.
                      </p>
                      <p className="text-xs text-muted-foreground mt-3">
                        Effective date: March 2026
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-info-collected">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Information We Collect
                      </h2>
                      <p className="text-muted-foreground leading-relaxed mb-4">
                        When you use ARC Reader Kit, we may collect the following information:
                      </p>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">For Readers:</span>
                          <span>
                            Your Replit account identifier (used for authentication), ARC claim history, 
                            download timestamps, and any reviews or feedback you submit. We do not collect 
                            your email address unless you voluntarily provide it to an author.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">For Authors:</span>
                          <span>
                            Your author profile information (display name, bio, genres, social links), 
                            book metadata (titles, descriptions, cover images, purchase links), ARC 
                            configuration (download URLs, coupon codes, claim limits, expiration dates), 
                            and subscription status.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-data-usage">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        How We Use Your Data
                      </h2>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">ARC Distribution:</span>
                          <span>
                            We track claim counts and download activity to enforce per-book limits 
                            set by authors and to prevent abuse. This data is visible only to the 
                            author who listed the ARC.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Usage Limits:</span>
                          <span>
                            Free-tier authors are limited to 1 active ARC with up to 50 downloads. 
                            We track these limits using your account identifier and subscription status. 
                            Upgrading to a paid plan removes these restrictions.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Recommendations:</span>
                          <span>
                            ARC availability and genre information may be used to surface relevant 
                            ARCs to readers browsing the platform. We do not use this data for 
                            advertising or share it with external recommendation engines.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-downloads">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Download className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        ARC Downloads & External Links
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        ARC download URLs and coupon codes are provided by authors and may point to 
                        third-party services (e.g., BookFunnel, StoryOrigin, direct file hosting). 
                        When you follow an ARC download link, you leave the ARC Reader Kit platform 
                        and are subject to that service's own privacy policy. We are not responsible 
                        for data collected by third-party download platforms.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-security">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Data Security & Retention
                      </h2>
                      <ul className="space-y-3 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Security:</span>
                          <span>
                            All ARC Reader Kit data is stored in our secured PostgreSQL database. 
                            Authentication is handled through Replit's identity service — we never 
                            store passwords directly. ARC download links with time-limited expiry 
                            are automatically invalidated after the author-set duration.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Retention:</span>
                          <span>
                            ARC claim records are retained for as long as the associated book listing 
                            is active. When an author removes a book or disables ARC distribution, 
                            claim records are preserved for the author's analytics but download access 
                            is immediately revoked.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="font-medium text-foreground">Deletion:</span>
                          <span>
                            Authors can delete their book listings at any time, which removes associated 
                            ARC data. Readers can request removal of their claim history by contacting us.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-payments">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Payments & Subscriptions
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        ARC Reader Kit subscriptions (Media Kit Pro) are processed through Stripe. 
                        We store your subscription status and billing period dates but never have 
                        access to your full credit card number. All payment processing is handled 
                        entirely by Stripe in accordance with PCI-DSS standards. You can view 
                        Stripe's privacy policy at{" "}
                        <a
                          href="https://stripe.com/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                          data-testid="link-stripe-privacy"
                        >
                          stripe.com/privacy
                        </a>.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-no-sale">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        We Don't Sell Your Data
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        Consistent with Book Slump Rescue's core policy, ARC Reader Kit does not sell, 
                        rent, or share your personal data with third parties for marketing purposes. 
                        Author-reader interactions facilitated through ARC claims stay within our platform.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/30" data-testid="card-arc-questions">
                  <h2 className="font-display text-xl font-bold mb-2">
                    Questions About ARC Reader Kit?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    ARC Reader Kit is a subsidiary service of Book Slump Rescue. For questions about 
                    this privacy policy or your data, please reach out through our main platform. 
                    The general Book Slump Rescue privacy policy also applies to all shared platform features.
                  </p>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Book Slump Rescue. Made for readers, by readers.</p>
      </footer>
    </div>
  );
}
