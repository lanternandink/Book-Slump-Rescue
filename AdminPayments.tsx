import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { CreditCard, Loader2, AlertTriangle, ArrowLeft, ExternalLink, DollarSign } from "lucide-react";

interface Payment {
  id: string;
  itemType: string;
  itemId: string;
  amount: number;
  status: string;
  url: string;
  createdAt: string;
  paidAt?: string;
}

interface DashboardStats {
  payments: { total: number; pending: number; completed: number };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
};

function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const isTestMode = import.meta.env.MODE !== "production";

export default function AdminPayments() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.isAdmin;

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
    enabled: isAdmin,
  });

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard-stats"],
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="Access Denied" description="Admin access only." />
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2" data-testid="text-access-denied">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to view this page.</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Payments - Admin" description="View and manage payments." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-4xl">
          {isTestMode && (
            <div className="mb-6 flex items-center gap-2 rounded-md bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 px-4 py-3" data-testid="banner-test-mode">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">TEST MODE — Using Stripe test keys. No real charges will be made.</span>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-payments-title">
              Payments
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Payment tracking for approved advertising and newsletter feature requests.
            </p>
          </motion.div>

          {paymentsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="p-5 text-center" data-testid="card-payments-total">
                    <p className="text-3xl font-bold">{stats.payments.total}</p>
                    <p className="text-sm text-muted-foreground">Total Payments</p>
                  </Card>
                  <Card className="p-5 text-center" data-testid="card-payments-pending">
                    <p className="text-3xl font-bold">{stats.payments.pending}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </Card>
                  <Card className="p-5 text-center" data-testid="card-payments-completed">
                    <p className="text-3xl font-bold">{stats.payments.completed}</p>
                    <p className="text-sm text-muted-foreground">Paid</p>
                  </Card>
                </div>
              )}

              {payments.length === 0 ? (
                <Card className="p-8 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg mb-2" data-testid="text-no-payments">No payments recorded yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Payments will appear here once ad or newsletter requests are approved and payment links are generated.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <motion.div
                      key={payment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4" data-testid={`card-payment-${payment.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={STATUS_VARIANT[payment.status] || "outline"} data-testid={`badge-payment-status-${payment.id}`}>
                              {STATUS_LABEL[payment.status] || payment.status}
                            </Badge>
                            <Badge variant="outline" className="capitalize">{payment.itemType}</Badge>
                            <Badge variant="outline" className="font-mono">
                              <DollarSign className="w-3 h-3 mr-0.5" />
                              {formatAmount(payment.amount)}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString()}
                            {payment.paidAt && ` — Paid ${new Date(payment.paidAt).toLocaleDateString()}`}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
                          <span className="text-muted-foreground">ID: <span className="font-mono text-xs">{payment.itemId.slice(0, 8)}...</span></span>
                          {payment.url && (
                            <a href={payment.url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs inline-flex items-center gap-1" data-testid={`link-payment-${payment.id}`}>
                              <ExternalLink className="w-3 h-3" />
                              Payment Link
                            </a>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <Link href="/admin/dashboard">
                  <Button variant="outline" data-testid="button-back-dashboard">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
