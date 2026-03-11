import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

export default function PlacementCancel() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Payment Cancelled" description="Your placement purchase was cancelled." />
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardContent className="pt-8 text-center">
            <XCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-payment-cancelled">Payment Cancelled</h1>
            <p className="text-muted-foreground mb-6">
              No charges were made. You can return to the spotlight request page to try again whenever you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/spotlight-request">
                <Button data-testid="link-try-again">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Spotlight Request
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" data-testid="link-back-home">
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
