import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";

export default function PlacementSuccess() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Payment Successful" description="Your sponsored placement has been activated." />
      <Navigation />
      <div className="container mx-auto px-4 py-16 max-w-lg">
        <Card>
          <CardContent className="pt-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-payment-success">Payment Successful!</h1>
            <p className="text-muted-foreground mb-2">
              Your sponsored placement has been activated and will go live shortly.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              You'll receive a confirmation email with your placement details. If you have any questions, don't hesitate to reach out.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/">
                <Button data-testid="link-back-home">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Link href="/spotlight-request">
                <Button variant="outline" data-testid="link-new-placement">
                  Purchase Another Placement
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
