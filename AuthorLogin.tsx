import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import {
  PenTool, BookOpen, BarChart3, Users, Shield,
  Globe, LogIn, Loader2, ArrowRight,
  Star, TrendingUp, Eye
} from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useEffect } from "react";

export default function AuthorLogin() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/author-dashboard");
    }
  }, [isAuthenticated, setLocation]);

  const features = [
    {
      icon: BookOpen,
      title: "Manage Your Books",
      description: "Add your published and upcoming titles with cover art, descriptions, and purchase links."
    },
    {
      icon: Users,
      title: "ARC Distribution",
      description: "Distribute advance reader copies with built-in security, waitlists, and claim tracking."
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track profile views, buy clicks, and ARC page engagement with detailed analytics."
    },
    {
      icon: Globe,
      title: "Public Author Profile",
      description: "Get a custom author page with your bio, social links, and complete book catalog."
    },
    {
      icon: Star,
      title: "Featured Placements",
      description: "Get discovered through genre spotlights and featured author placements."
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead 
        title="Author Portal - Book Slump Rescue" 
        description="Join Book Slump Rescue as an author. Manage your books, distribute ARCs, track analytics, and connect with readers." 
      />
      <Navigation />

      <main className="flex-1">
        <section className="relative py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
          <div className="container px-4 mx-auto max-w-5xl relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <Badge variant="secondary" className="mb-4">
                <PenTool className="w-3 h-3 mr-1" />
                Author Portal
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                Share Your Stories<br />With the World
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
                Join Book Slump Rescue as an author. Manage your catalog, distribute advance copies, 
                and connect directly with readers looking for their next great read.
              </p>

              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a href="/api/login">
                    <Button size="lg" className="gap-2 text-base" data-testid="button-author-login">
                      <LogIn className="w-5 h-5" />
                      Sign In to Author Portal
                    </Button>
                  </a>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Free to join. No fees or commissions.</p>
                    <p className="text-xs opacity-75">Your books may occasionally be featured on our affiliate shop to support the platform.</p>
                  </div>
                </div>
              )}
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className="p-5 h-full">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                        <feature.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="p-6 md:p-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="font-display text-2xl font-bold mb-2">How It Works</h2>
                    <ol className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="flex-shrink-0 mt-0.5">1</Badge>
                        <span>Sign in with your account (or create one free)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="flex-shrink-0 mt-0.5">2</Badge>
                        <span>Set up your author profile with bio, genres, and social links</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="flex-shrink-0 mt-0.5">3</Badge>
                        <span>Add your books with covers, descriptions, and purchase links</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="flex-shrink-0 mt-0.5">4</Badge>
                        <span>Optionally enable ARC distribution for advance reader copies</span>
                      </li>
                    </ol>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Shield className="w-4 h-4 text-green-500" />
                      <span>8-layer ARC security</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span>Profile view tracking</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <span>Buy click analytics</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
