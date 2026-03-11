import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { WelcomeModal } from "@/components/WelcomeModal";
import { ArrowRight, BookOpenText, Sparkles, Coffee, Star, BookOpen, Library, Target, Quote, BookMarked, BarChart3, HelpCircle, Heart, Smartphone, Flame, Trophy, SlidersHorizontal, Users, MessageCircle, Zap, CheckCircle2, ExternalLink, CalendarDays, Flower2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { FEATURED_SLOTS } from "@/data/featured";
import { DisclosureTag } from "@/components/DisclosureTag";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const { data: streakData } = useQuery<{ currentStreak: number; longestStreak: number; totalBooksFinished: number }>({
    queryKey: ["/api/user/streak"],
    enabled: isAuthenticated,
  });

  const { data: bookOfDay, isLoading: bookOfDayLoading } = useQuery<{
    id: number; date: string; bookTitle: string; authorName: string;
    coverUrl: string | null; description: string | null; genres: string[] | null;
    buyLink: string | null; authorSlug: string | null; sourceType: string;
  }>({
    queryKey: ["/api/book-of-the-day"],
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const reopenWelcome = () => {
    localStorage.removeItem("bookslump_welcome_seen");
    setShowWelcome(true);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Find Your Next Great Read"
        description="Overcome your reading slump with personalized book recommendations based on your mood, preferences, and reading goals."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Book Slump Rescue",
          "description": "Personalized book recommendation app to help readers overcome reading slumps",
          "applicationCategory": "Entertainment",
          "operatingSystem": "Web"
        }}
      />
      <Navigation />
      <WelcomeModal />

      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative flex-1 flex items-center py-16 lg:py-24 overflow-hidden">
          <div className="absolute inset-0 z-0">
            {/* Abstract decorative background */}
            <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-orange-200/20 rounded-full blur-3xl" />
          </div>

          <div className="container px-4 mx-auto relative z-10">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>Stuck in a reading rut?</span>
                </div>
                <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
                  Find your next <span className="text-primary relative inline-block">
                    5-star read
                    <svg className="absolute w-full h-3 -bottom-1 left-0 text-primary/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                      <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
                    </svg>
                  </span>
                </h1>
                <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Tell us what you're in the mood for, and we'll curate a personalized list of books to get you out of your slump.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/quiz">
                  <Button size="lg" className="rounded-full shadow-xl shadow-primary/25" data-testid="button-fix-slump">
                    Fix My Slump <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/discover">
                  <Button variant="outline" size="lg" className="rounded-full gap-2" data-testid="button-browse-books">
                    <SlidersHorizontal className="w-4 h-4" /> Browse & Filter
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </section>

        {isAuthenticated && streakData && (
          <section className="py-6 border-t border-border/40">
            <div className="container px-4 mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="p-6 bg-gradient-to-r from-primary/5 via-background to-primary/5 border-primary/20" data-testid="streak-banner">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Flame className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Welcome back{user?.username ? `, ${user.username}` : ""}!</p>
                        <p className="font-display font-bold text-lg" data-testid="text-streak-count">
                          {streakData.currentStreak > 0
                            ? `${streakData.currentStreak}-day reading streak`
                            : streakData.totalBooksFinished > 0
                              ? `${streakData.totalBooksFinished} book${streakData.totalBooksFinished !== 1 ? "s" : ""} finished`
                              : "Start your reading streak!"}
                        </p>
                        {streakData.currentStreak === 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1" data-testid="text-streak-nudge">
                            {streakData.longestStreak > 0
                              ? `Your ${streakData.longestStreak}-day streak ended — log a book today to start a new one!`
                              : "Log your first book to start a streak!"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 text-sm">
                      {streakData.longestStreak > 0 && (
                        <div className="flex items-center gap-2" data-testid="text-longest-streak">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">Best: {streakData.longestStreak} days</span>
                        </div>
                      )}
                      {streakData.totalBooksFinished > 0 && streakData.currentStreak > 0 && (
                        <div className="flex items-center gap-2" data-testid="text-books-finished">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">{streakData.totalBooksFinished} finished</span>
                        </div>
                      )}
                      <Link href="/saved">
                        <Button size="sm" className="rounded-full" data-testid="button-log-reading">
                          {streakData.currentStreak === 0 ? "Log Reading" : "Add to Library"}
                        </Button>
                      </Link>
                      <Link href="/challenge">
                        <Button variant="outline" size="sm" className="rounded-full" data-testid="button-streak-challenge">
                          View Challenge
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </section>
        )}

        {/* Spring Reading Bloom Challenge Banner */}
        <section className="py-8 border-t border-border/40 bg-gradient-to-br from-pink-50/70 via-background to-green-50/50 dark:from-pink-950/20 dark:via-background dark:to-green-950/20">
          <div className="container px-4 mx-auto max-w-5xl">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 p-5 sm:p-6 rounded-xl border border-pink-200/70 dark:border-pink-800/40 bg-white/80 dark:bg-background/80 shadow-sm" data-testid="card-spring-challenge-promo">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                  <Flower2 className="w-7 h-7 text-pink-500" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h2 className="font-display text-lg font-bold" data-testid="text-spring-promo-title">Spring Reading Bloom Challenge</h2>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-none text-[10px] font-semibold uppercase tracking-wide">Active Now</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">March 10 – April 15, 2026</p>
                  <p className="text-sm text-muted-foreground">Complete 12 reading prompts, log your books, and earn the exclusive <span className="font-medium text-pink-600 dark:text-pink-400">Spring Bloom 2026</span> badge.</p>
                </div>
                <Link href="/challenge" className="flex-shrink-0" data-testid="link-spring-challenge-promo">
                  <Button className="gap-2 bg-pink-600 hover:bg-pink-700 dark:bg-pink-700 dark:hover:bg-pink-600 text-white whitespace-nowrap">
                    <Flower2 className="w-4 h-4" /> Join the Challenge
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Indie Book of the Day */}
        {(bookOfDayLoading || bookOfDay) && (
          <section className="py-10 border-t border-border/40 bg-gradient-to-br from-amber-50/60 via-background to-amber-50/30 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10">
            <div className="container px-4 mx-auto max-w-5xl">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-400">Indie Book of the Day</span>
                  {bookOfDay && (
                    <span className="text-xs text-muted-foreground ml-1">
                      {new Date(bookOfDay.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </span>
                  )}
                </div>

                {bookOfDayLoading ? (
                  <div className="flex gap-5 items-start">
                    <Skeleton className="w-24 h-36 rounded-lg flex-shrink-0" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-5 w-56" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                ) : bookOfDay ? (
                  <Card className="overflow-hidden border-amber-200/60 dark:border-amber-800/40 bg-white/80 dark:bg-background/80 shadow-sm" data-testid="card-book-of-day">
                    <div className="flex gap-5 p-5 sm:p-6">
                      {bookOfDay.coverUrl ? (
                        <img
                          src={bookOfDay.coverUrl}
                          alt={bookOfDay.bookTitle}
                          className="w-24 sm:w-28 object-cover rounded-md shadow-md flex-shrink-0 self-start"
                          loading="lazy"
                          decoding="async"
                          data-testid="img-book-of-day-cover"
                        />
                      ) : (
                        <div className="w-24 sm:w-28 h-36 sm:h-40 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-8 h-8 text-amber-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h2 className="font-display text-lg sm:text-xl font-bold leading-tight mb-0.5" data-testid="text-book-of-day-title">
                          {bookOfDay.bookTitle}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-2" data-testid="text-book-of-day-author">by {bookOfDay.authorName}</p>

                        {bookOfDay.genres && bookOfDay.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {bookOfDay.genres.slice(0, 3).map(g => (
                              <Badge key={g} variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-none">
                                {g}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {bookOfDay.description && (
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-4" data-testid="text-book-of-day-desc">
                            {bookOfDay.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 items-center">
                          {bookOfDay.buyLink ? (
                            <a href={bookOfDay.buyLink} target="_blank" rel="noopener noreferrer" data-testid="link-book-of-day-buy">
                              <Button size="sm" className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600">
                                <ExternalLink className="w-3.5 h-3.5" /> Get this Book
                              </Button>
                            </a>
                          ) : null}
                          {bookOfDay.authorSlug && (
                            <Link href={`/authors/${bookOfDay.authorSlug}`} data-testid="link-book-of-day-author">
                              <Button size="sm" variant="outline" className="gap-1.5 border-amber-300 dark:border-amber-700">
                                View Author
                              </Button>
                            </Link>
                          )}
                          <span className="text-[10px] text-muted-foreground italic ml-1">Indie pick • Rotates daily</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : null}
              </motion.div>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="py-20 bg-white/50 border-t border-border/40">
          <div className="container px-4 mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <BookOpenText className="w-8 h-8 text-primary" />,
                  title: "Tailored to Your Mood",
                  desc: "Whether you want to cry, laugh, or be terrified, we match books to your current emotional state."
                },
                {
                  icon: <Coffee className="w-8 h-8 text-primary" />,
                  title: "Respects Your Time",
                  desc: "Filter by length and pace. Perfect for busy schedules or long weekend binges."
                },
                {
                  icon: <Sparkles className="w-8 h-8 text-primary" />,
                  title: "Specific Tastes",
                  desc: "Love 'Enemies to Lovers'? Hate cliffhangers? We take your tropes and dealbreakers seriously."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card p-8 rounded-2xl border border-border/50 shadow-sm hover-elevate"
                >
                  <div className="mb-4 bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 border-t border-border/40 bg-muted/10">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Simple as 1-2-3</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
                How It Works
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Go from stuck to reading in under two minutes.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                {
                  step: "1",
                  title: "Tell Us Your Mood",
                  desc: "Take a quick quiz about what you're in the mood for — genre, pace, tone, spice level, and tropes.",
                  icon: <BookOpenText className="w-6 h-6" />,
                },
                {
                  step: "2",
                  title: "Get Matched",
                  desc: "Our recommendation engine scores hundreds of books against your preferences and surfaces the best fits.",
                  icon: <Sparkles className="w-6 h-6" />,
                },
                {
                  step: "3",
                  title: "Start Reading",
                  desc: "Save your picks, track your progress, build streaks, and join a community of readers just like you.",
                  icon: <CheckCircle2 className="w-6 h-6" />,
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="relative text-center"
                  data-testid={`how-it-works-step-${item.step}`}
                >
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary/20">
                    {item.step}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                    {item.icon}
                  </div>
                  <h3 className="font-display text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center mt-10"
            >
              <Link href="/quiz">
                <Button size="lg" className="rounded-full shadow-xl shadow-primary/25 gap-2" data-testid="button-try-quiz-how">
                  Try It Now — It's Free <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="py-16 border-t border-border/40">
          <div className="container px-4 mx-auto max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
                What Readers Are Saying
              </h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  quote: "I hadn't picked up a book in months. This quiz recommended something I never would have found on my own and I couldn't put it down.",
                  name: "Sarah K.",
                  detail: "Romance reader",
                },
                {
                  quote: "The mood-matching is genius. I said I wanted something cozy and slow-paced, and every recommendation was perfect.",
                  name: "Jamie T.",
                  detail: "Fantasy fan",
                },
                {
                  quote: "My kids love the Kids Corner — the badges and streaks have turned reading into a game they actually want to play.",
                  name: "Michelle R.",
                  detail: "Parent of two readers",
                },
              ].map((testimonial, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-6 h-full flex flex-col" data-testid={`testimonial-${i}`}>
                    <div className="flex gap-0.5 mb-3">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400 dark:fill-yellow-300 dark:text-yellow-300" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1 italic">"{testimonial.quote}"</p>
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.detail}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What You Can Do Section */}
        <section className="py-20 border-t border-border/40">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Everything You Need</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
                More Than Recommendations
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Track your reading, join book clubs, build streaks, and connect with readers who get it.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: <BookOpen className="w-6 h-6" />,
                  title: "Personalized Quiz",
                  desc: "Answer questions about your mood, pace, and preferences to get tailored book recommendations.",
                  link: "/quiz"
                },
                {
                  icon: <SlidersHorizontal className="w-6 h-6" />,
                  title: "Discover Books",
                  desc: "Browse the full catalog with powerful filters for genre, mood, pace, and spice level.",
                  link: "/discover"
                },
                {
                  icon: <Library className="w-6 h-6" />,
                  title: "Your Library",
                  desc: "Track books you've read, are reading, or want to read. Rate, review, and add notes.",
                  link: "/saved"
                },
                {
                  icon: <Target className="w-6 h-6" />,
                  title: "Reading Challenge",
                  desc: "Set an annual reading goal and track your progress with milestone badges.",
                  link: "/challenge"
                },
                {
                  icon: <BookMarked className="w-6 h-6" />,
                  title: "Reading Lists",
                  desc: "Create custom themed collections like 'Summer Reads' or 'Book Club Picks'.",
                  link: "/lists"
                },
                {
                  icon: <Quote className="w-6 h-6" />,
                  title: "Save Quotes",
                  desc: "Capture memorable passages from your favorite books with page numbers.",
                  link: "/quotes"
                },
                {
                  icon: <MessageCircle className="w-6 h-6" />,
                  title: "Community Feed",
                  desc: "Share reviews, post updates, and connect with fellow readers.",
                  link: "/community"
                },
                {
                  icon: <Users className="w-6 h-6" />,
                  title: "Book Clubs",
                  desc: "Join or create clubs, discuss books, nominate picks, and track group progress.",
                  link: "/clubs"
                },
                {
                  icon: <BarChart3 className="w-6 h-6" />,
                  title: "Year in Review",
                  desc: "See your annual reading stats, top books, and monthly breakdown.",
                  link: "/year-in-review"
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={feature.link}>
                    <Card className="h-full p-6 hover-elevate cursor-pointer" data-testid={`feature-card-${i}`}>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="text-center mt-8"
            >
              <Button variant="ghost" size="sm" onClick={reopenWelcome} className="text-muted-foreground" data-testid="button-show-tour">
                <HelpCircle className="w-4 h-4 mr-2" />
                Show Welcome Tour Again
              </Button>
            </motion.div>
          </div>
        </section>

        {/* Featured Picks Section */}
        <section className="py-20 border-t border-border/40">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-primary fill-primary" />
                <span className="text-sm font-medium text-primary">Curated for You</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Featured Picks
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Hand-picked recommendations across every genre to spark your next reading adventure.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURED_SLOTS.slice(0, 4).map((slot, index) => (
                <motion.div
                  key={slot.genre}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="h-full flex flex-col overflow-hidden hover-elevate"
                    data-testid={`home-featured-${slot.genre}`}
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-muted to-muted/50 relative">
                      {slot.coverImageUrl ? (
                        <img
                          src={slot.coverImageUrl}
                          alt={slot.bookTitle}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-col gap-1">
                        <Badge className="bg-primary text-primary-foreground">
                          {slot.genreLabel}
                        </Badge>
                        {slot.isSponsored && <DisclosureTag type="sponsored" />}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="font-display font-bold text-base mb-1 line-clamp-2">
                        {slot.bookTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        by {slot.authorName}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {slot.shortBlurb}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center mt-8"
            >
              <Link href="/featured">
                <Button variant="outline" size="lg" className="rounded-full" data-testid="button-view-all-featured">
                  View All Featured Picks <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Community Stats Section */}
        <section className="py-16 border-t border-border/40 bg-muted/20">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Better Together</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
                Join Our Growing Community
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto">Readers helping readers find their next favorite book. Share reviews, join clubs, and never read alone again.</p>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {[
                { label: "Books in Catalog", value: "500+", icon: <BookOpen className="w-5 h-5" /> },
                { label: "Genres Covered", value: "18", icon: <Library className="w-5 h-5" /> },
                { label: "Community Feed", value: "Live", icon: <MessageCircle className="w-5 h-5" /> },
                { label: "Author Profiles", value: "Growing", icon: <Star className="w-5 h-5" /> },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="p-5 text-center" data-testid={`stat-${i}`}>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-3">
                      {stat.icon}
                    </div>
                    <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="text-center mt-8"
            >
              <Link href="/community">
                <Button variant="outline" size="lg" className="rounded-full gap-2" data-testid="button-join-community">
                  <MessageCircle className="w-4 h-4" /> Visit the Community Feed <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Support the App Section */}
        <section className="py-20 border-t border-border/40">
          <div className="container px-4 mx-auto max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 mb-4">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium text-primary">Coming Soon</span>
              </div>
              <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-4">
                Help Us Build the App
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                We're building Book Slump Rescue for iPhone and Android so you can get personalized recommendations anywhere. Your support helps make it happen.
              </p>
              <Card className="p-8 bg-primary/5 border-primary/20 max-w-md mx-auto">
                <Heart className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2">Support Development</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Every contribution goes directly toward building and launching the mobile app on the App Store and Google Play.
                </p>
                <a href="https://www.buymeacoffee.com/bookslumprescue" target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-full shadow-lg shadow-primary/20 gap-2" data-testid="button-donate">
                    <Heart className="w-4 h-4" />
                    Buy Us a Coffee
                  </Button>
                </a>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 border-t border-border/40 bg-muted/30">
          <div className="container px-4 mx-auto max-w-xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <NewsletterSignup />
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
}
