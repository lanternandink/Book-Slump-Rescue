import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Rocket, Clock, Calendar, Lightbulb, Heart, CheckCircle2 } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const recentlyCompleted = [
  "Reading streaks and gamification to track your daily reading habits",
  "Import your Goodreads library via CSV export",
  "Reading mood history - see your past quiz answers and preferences",
  "Personal notes and quotes field for each book in your library",
  "Newsletter signup for weekly book picks and updates",
  "'Find at Library' links on every book card via WorldCat",
  "Multi-select quiz questions for settings and character preferences",
  "Social sharing for quiz results (Twitter, Facebook, email)",
  "Reading Challenge tracker with annual goals",
  "Cloud-synced library for logged-in users",
];

const roadmapSections = [
  {
    id: "done",
    title: "Recently Completed",
    subtitle: "Just Shipped",
    icon: CheckCircle2,
    color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    items: recentlyCompleted.slice(0, 5),
  },
  {
    id: "now",
    title: "Now",
    subtitle: "Current Focus",
    icon: Rocket,
    color: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    items: [
      "Improving quiz question variety and randomization",
      "Expanding the book catalog with more diverse genres",
      "Refining recommendation accuracy based on mood and preferences",
    ],
  },
  {
    id: "next",
    title: "Next Up",
    subtitle: "In Progress",
    icon: Clock,
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    items: [
      "Featured picks and curated genre collections",
      "Indie author spotlights and recommendations",
      "Better 'Books Like This' similarity matching",
    ],
  },
  {
    id: "soon",
    title: "Coming Soon",
    subtitle: "Planned",
    icon: Calendar,
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    items: [
      "More nonfiction categories and specialized topics",
      "Book clubs and shared reading lists",
      "Author Q&As and community features",
    ],
  },
  {
    id: "later",
    title: "Later",
    subtitle: "Only If Readers Want It",
    icon: Lightbulb,
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    items: [
      "Integration with library availability (Libby, OverDrive)",
      "Audiobook-specific recommendations",
      "Reading analytics and insights",
    ],
  },
];

export default function Updates() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Updates" description="Latest features, improvements, and updates to Book Slump Rescue." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4">
              What's Next
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A peek at what we're working on and where we're headed. 
              No timelines, no promises—just our honest roadmap.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {roadmapSections.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Card className="p-6" data-testid={`section-${section.id}`}>
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${section.color.split(' ').slice(0, 2).join(' ')}`}>
                        <Icon className={`w-5 h-5 ${section.color.split(' ').slice(2).join(' ')}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h2 className="font-display text-xl font-bold">
                            {section.title}
                          </h2>
                          <Badge variant="secondary" className="text-xs">
                            {section.subtitle}
                          </Badge>
                        </div>
                        <ul className="space-y-2">
                          {section.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-muted-foreground"
                            >
                              <span className="text-primary mt-1.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12"
          >
            <Card className="p-6 bg-gradient-to-br from-primary/5 to-orange-100/30 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-bold mb-2">
                    Our Values
                  </h2>
                  <div className="space-y-3 text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">The quiz and recommendations will always be free.</span>{" "}
                      We built this because we love books and want to help readers 
                      find their next favorite story.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Reader-first design.</span>{" "}
                      Every feature we add is designed to help you discover books you'll 
                      actually love—not to collect data or show ads.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Indie author friendly.</span>{" "}
                      We believe great stories come from everywhere. We're committed to 
                      helping indie authors reach new readers.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Book Slump Rescue. Made for readers, by readers.</p>
      </footer>
    </div>
  );
}
