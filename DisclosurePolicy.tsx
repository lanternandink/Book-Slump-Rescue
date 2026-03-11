import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { DisclosureTag } from "@/components/DisclosureTag";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { FileText, Mail } from "lucide-react";

interface DisclosureConfig {
  policyLastUpdated: string;
  policySections: {
    affiliateLinks: string;
    sponsoredFeatures: string;
    adTransparency: string;
    contact: string;
  };
}

export default function DisclosurePolicy() {
  const { data: config } = useQuery<DisclosureConfig>({
    queryKey: ["/api/disclosure-config"],
  });

  const lastUpdated = config?.policyLastUpdated
    ? new Date(config.policyLastUpdated).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Disclosure Policy - Book Slump Rescue"
        description="Our affiliate and sponsorship disclosure policy, including FTC compliance and transparency information."
      />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-disclosure-title">
              Disclosure Policy
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Transparency is important to us. Here's how we handle affiliate links, sponsorships, and paid content.
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-3" data-testid="text-last-updated">
                Last updated: {lastUpdated}
              </p>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 space-y-6">
              <section className="space-y-2">
                <h2 className="text-xl font-semibold" data-testid="text-disclosure-ftc">FTC Compliance</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  In accordance with the Federal Trade Commission (FTC) guidelines, Book Slump Rescue discloses that some of the links on our website are affiliate links. This means we may earn a small commission if you make a purchase through these links, at no additional cost to you. These commissions help support the maintenance and development of our platform.
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold" data-testid="text-disclosure-affiliate">Affiliate Links</h2>
                  <DisclosureTag type="affiliate" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {config?.policySections?.affiliateLinks ||
                    "Some links on BookSlumpRescue are affiliate links. This means we may earn a small commission if you make a purchase through these links, at no additional cost to you. These commissions help support the maintenance and development of our platform. Affiliate relationships do not influence our editorial recommendations or quiz-driven book suggestions."}
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold" data-testid="text-disclosure-sponsored">Sponsored Features</h2>
                  <DisclosureTag type="sponsored" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {config?.policySections?.sponsoredFeatures ||
                    "Authors and publishers may pay for spotlight placement, featured positions, or newsletter inclusion on BookSlumpRescue. All sponsored content is clearly marked with a \"Sponsored Feature\" label. Sponsorships do not affect our organic recommendation algorithm or quiz results."}
                </p>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold" data-testid="text-disclosure-ads">Ad Transparency</h2>
                  <DisclosureTag type="promotional" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {config?.policySections?.adTransparency ||
                    "All paid advertisements and promotions on BookSlumpRescue are clearly marked with a \"Paid Promotion\" label. We believe in full transparency so our readers can always distinguish between organic recommendations and paid content."}
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-xl font-semibold">Our Commitment</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We are committed to honesty and transparency. Every resource and recommendation on our platform reflects our genuine assessment. Affiliate relationships do not influence the order, prominence, or inclusion of any book or resource in our recommendations. Our primary goal is to help readers discover books they'll love.
                </p>
              </section>

              <section className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold" data-testid="text-disclosure-contact">Contact for Questions</h2>
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {config?.policySections?.contact ||
                    "If you have any questions about our disclosure practices, affiliate relationships, or sponsored content, please reach out to us at contact@bookslumprescue.com."}
                </p>
              </section>

              <div className="pt-4 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  This policy applies to all content on BookSlumpRescue. All disclosure tags are displayed client-side and cannot be removed or hidden.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
