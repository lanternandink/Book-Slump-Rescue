import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SEOHead } from "@/components/SEOHead";
import {
  AlertTriangle,
  BookOpen,
  FileText,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function DeleteAccount() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleted, setDeleted] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/user/account", {
        confirmation: "DELETE_MY_ACCOUNT",
      });
    },
    onSuccess: () => {
      setDeleted(true);
      queryClient.clear();
      toast({ title: "Account deleted", description: "All your data has been permanently removed." });
    },
    onError: () => {
      toast({
        title: "Deletion failed",
        description: "Something went wrong. Please try again or contact support.",
        variant: "destructive",
      });
    },
  });

  const dataCategories = [
    { label: "Reading library & book tracking data", icon: BookOpen },
    { label: "Reading challenges, streaks & badges", icon: CheckCircle2 },
    { label: "Reading lists, quotes & series tracking", icon: BookOpen },
    { label: "Quiz history & recommendation data", icon: FileText },
    { label: "Author profile, books & ARC listings", icon: FileText },
    { label: "ARC claims, downloads & feedback", icon: FileText },
    { label: "Book club memberships & discussions", icon: BookOpen },
    { label: "Community posts, comments & reactions", icon: BookOpen },
    { label: "Follows, notifications & activity history", icon: BookOpen },
    { label: "Kids Corner profiles & reading logs", icon: BookOpen },
    { label: "Subscription & payment records", icon: ShieldAlert },
    { label: "Saved filter presets & analytics", icon: FileText },
  ];

  if (deleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead
          title="Account Deleted"
          description="Your account has been permanently deleted."
        />
        <Navigation />
        <main className="flex-1 py-12 lg:py-16">
          <div className="container px-4 mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="font-display text-3xl font-bold mb-4" data-testid="text-account-deleted">
              Account Successfully Deleted
            </h1>
            <p className="text-muted-foreground text-lg mb-6">
              All your data has been permanently removed from our systems. This action cannot be undone.
            </p>
            <p className="text-sm text-muted-foreground">
              If you had an active subscription, please cancel it through your Stripe customer portal 
              to ensure you are not charged further. If you need assistance, contact us.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead
        title="Delete Account | Book Slump Rescue"
        description="Delete your Book Slump Rescue or ARC Reader Kit account and all associated data."
      />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
              <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-4" data-testid="text-page-title">
              Delete Your Account
            </h1>
            <p className="text-muted-foreground text-lg">
              Permanently delete your account and all associated data.
            </p>
          </motion.div>

          <Tabs defaultValue="bsr" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8" data-testid="delete-account-tabs">
              <TabsTrigger value="bsr" data-testid="tab-delete-bsr">
                <BookOpen className="w-4 h-4 mr-2" />
                Book Slump Rescue
              </TabsTrigger>
              <TabsTrigger value="arc" data-testid="tab-delete-arc">
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
                <Card className="p-6 border-red-200 dark:border-red-900/50" data-testid="card-bsr-delete-warning">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2 text-red-700 dark:text-red-400">
                        This Action Is Permanent
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        Deleting your Book Slump Rescue account will permanently remove all your data 
                        from our systems. This includes your reading history, book clubs, author profile, 
                        ARC listings, and all other associated information. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-bsr-data-deleted">
                  <h2 className="font-display text-xl font-bold mb-4">
                    What Gets Deleted
                  </h2>
                  <ul className="space-y-3">
                    {dataCategories.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-muted-foreground">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{item.label}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-6" data-testid="card-bsr-instructions">
                  <h2 className="font-display text-xl font-bold mb-4">
                    How to Delete Your Account
                  </h2>
                  <ol className="space-y-4 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
                      <span>Log in to your Book Slump Rescue account using the "Log In" button in the navigation bar.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
                      <span>Return to this page after logging in.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">3</span>
                      <span>Type <strong>DELETE_MY_ACCOUNT</strong> in the confirmation field below.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">4</span>
                      <span>Click the "Permanently Delete My Account" button. Your data will be deleted immediately.</span>
                    </li>
                  </ol>
                </Card>

                {isAuthenticated ? (
                  <Card className="p-6 border-red-200 dark:border-red-900/50" data-testid="card-bsr-delete-form">
                    <h2 className="font-display text-xl font-bold mb-4 text-red-700 dark:text-red-400">
                      Delete Your Account
                    </h2>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="confirm-delete" className="text-sm font-medium">
                          Type <strong>DELETE_MY_ACCOUNT</strong> to confirm
                        </Label>
                        <Input
                          id="confirm-delete"
                          placeholder="DELETE_MY_ACCOUNT"
                          value={confirmText}
                          onChange={(e) => setConfirmText(e.target.value)}
                          className="mt-2 max-w-sm"
                          data-testid="input-confirm-delete"
                        />
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={confirmText !== "DELETE_MY_ACCOUNT" || deleteMutation.isPending}
                            data-testid="button-delete-account"
                          >
                            {deleteMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Permanently Delete My Account
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete your account and all associated data across 
                              Book Slump Rescue and ARC Reader Kit. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate()}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              data-testid="button-confirm-final-delete"
                            >
                              Yes, Delete Everything
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 bg-muted/30" data-testid="card-login-prompt">
                    <div className="flex items-start gap-4">
                      <ShieldAlert className="w-6 h-6 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div>
                        <h2 className="font-display text-xl font-bold mb-2">
                          Log In Required
                        </h2>
                        <p className="text-muted-foreground leading-relaxed">
                          You must be logged in to delete your account. Please use the "Log In" button 
                          in the navigation bar, then return to this page.
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-6 bg-muted/30" data-testid="card-bsr-contact">
                  <h2 className="font-display text-xl font-bold mb-2">
                    Need Help?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you are unable to log in or encounter issues deleting your account, 
                    please contact us and we will process your deletion request manually within 
                    48 hours. Include your username or account email in your request.
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
                <Card className="p-6 border-primary/20 bg-primary/5" data-testid="card-arc-delete-header">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-1" data-testid="text-arc-delete-title">
                        ARC Reader Kit / ARC Reader Hub Account Deletion
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        A subsidiary of Book Slump Rescue
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-red-200 dark:border-red-900/50" data-testid="card-arc-delete-warning">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2 text-red-700 dark:text-red-400">
                        Important Notice
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        ARC Reader Kit (also known as ARC Reader Hub) is a subsidiary service of Book Slump Rescue 
                        that shares the same account system. Deleting your account will remove all data 
                        across both Book Slump Rescue and ARC Reader Kit services.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6" data-testid="card-arc-data-deleted">
                  <h2 className="font-display text-xl font-bold mb-4">
                    ARC Reader Kit Data That Gets Deleted
                  </h2>
                  <ul className="space-y-3">
                    {[
                      "Author profile and all book listings",
                      "ARC download URLs, coupon codes & expiry settings",
                      "ARC claim history and reader download records",
                      "ARC waitlist entries and blocked user lists",
                      "ARC feedback and claim reports",
                      "Media Kit Pro subscription status",
                      "Sponsored placement and spotlight requests",
                      "Interview requests and submissions",
                      "All associated Book Slump Rescue data (reading library, clubs, etc.)",
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-muted-foreground">
                        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-6" data-testid="card-arc-instructions">
                  <h2 className="font-display text-xl font-bold mb-4">
                    How to Delete Your ARC Reader Kit Account
                  </h2>
                  <ol className="space-y-4 text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">1</span>
                      <span>Log in to your account using the "Log In" button at the top of the page.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">2</span>
                      <span>Switch to the "Book Slump Rescue" tab above (since both services share one account).</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">3</span>
                      <span>Type <strong>DELETE_MY_ACCOUNT</strong> in the confirmation field.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center">4</span>
                      <span>Click "Permanently Delete My Account." All data across both services will be deleted immediately.</span>
                    </li>
                  </ol>
                </Card>

                <Card className="p-6" data-testid="card-arc-subscription-note">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold mb-2">
                        Active Subscriptions
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        If you have an active Media Kit Pro subscription, deleting your account 
                        will remove your subscription record from our system. To ensure you are 
                        not charged further, we recommend canceling your subscription through 
                        your Stripe customer portal before deleting your account. If you delete 
                        your account without canceling, contact us and we will cancel it for you.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-muted/30" data-testid="card-arc-contact">
                  <h2 className="font-display text-xl font-bold mb-2">
                    Need Help?
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you are unable to delete your account through the self-service option, 
                    contact us with your username or account email. We will process your 
                    deletion request manually within 48 hours in compliance with applicable 
                    data protection requirements.
                  </p>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <footer className="py-8 border-t text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Book Slump Rescue. Made for readers, by readers.</p>
      </footer>
    </div>
  );
}
