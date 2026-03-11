import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { FileUp, Loader2, AlertTriangle, ArrowLeft, Download, Trash2 } from "lucide-react";

interface ArcFile {
  id: string;
  authorName: string;
  bookTitle: string;
  originalPath: string;
  watermarkedPath: string;
  uploadedAt: string;
}

export default function AdminArcs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = (user as any)?.isAdmin;

  const { data: arcs = [], isLoading } = useQuery<ArcFile[]>({
    queryKey: ["/api/admin/arcs"],
    enabled: isAdmin,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/arcs/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/arcs"] });
      toast({ title: "ARC deleted", description: "The ARC file has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete ARC.", variant: "destructive" });
    },
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
      <SEOHead title="ARC Management - Admin" description="Manage Advanced Review Copy uploads." />
      <Navigation />

      <main className="flex-1 py-8 lg:py-12">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-admin-arcs-title">
              ARC Management
            </h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              View and manage all uploaded Advanced Review Copies.
            </p>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-6">
              {arcs.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground text-lg mb-2" data-testid="text-no-arcs">No ARCs uploaded yet.</p>
                  <p className="text-sm text-muted-foreground">
                    Authors can upload their PDFs at the ARC Upload page.
                  </p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {arcs.map((arc) => (
                    <motion.div
                      key={arc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-4" data-testid={`card-arc-${arc.id}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <h3 className="font-semibold text-lg truncate" data-testid={`text-arc-title-${arc.id}`}>
                              {arc.bookTitle}
                            </h3>
                            <p className="text-sm text-muted-foreground" data-testid={`text-arc-author-${arc.id}`}>
                              by {arc.authorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Uploaded: {new Date(arc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <a href={`/arc-download/${arc.id}`} data-testid={`link-download-arc-${arc.id}`}>
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                            </a>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => deleteMutation.mutate(arc.id)}
                              data-testid={`button-delete-arc-${arc.id}`}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
