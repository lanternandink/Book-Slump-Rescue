import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, BookOpen, CheckCircle, AlertCircle, Undo2, ArrowLeft, Eye } from "lucide-react";

type ParsedBook = {
  title: string;
  author: string;
  shelf: string;
  rating: string;
  dateRead: string;
  review: string;
  isbn13: string;
  pageCount: string;
};

type ImportResult = {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: string[];
  batchId: string | null;
  dryRun: boolean;
};

function parseGoodreadsCSV(text: string): ParsedBook[] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (ch === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) lines.push(current);

  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map(h => h.toLowerCase().trim());

  const col = (name: string) => headers.findIndex(h => h === name || h.includes(name));
  const titleIdx = col("title");
  const authorIdx = col("author");
  const shelfIdx = headers.findIndex(h => h === "exclusive shelf");
  const ratingIdx = headers.findIndex(h => h === "my rating");
  const dateReadIdx = headers.findIndex(h => h === "date read");
  const reviewIdx = headers.findIndex(h => h === "my review");
  const isbn13Idx = headers.findIndex(h => h === "isbn13");
  const pagesIdx = headers.findIndex(h => h === "number of pages");

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = parseCSVRow(line);
    return {
      title: cols[titleIdx] || "",
      author: cols[authorIdx] || "",
      shelf: cols[shelfIdx] || "to-read",
      rating: cols[ratingIdx] || "0",
      dateRead: cols[dateReadIdx] || "",
      review: cols[reviewIdx] || "",
      isbn13: cols[isbn13Idx] || "",
      pageCount: cols[pagesIdx] || "",
    };
  }).filter(b => b.title.trim());
}

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function GoodreadsImport() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedBooks, setParsedBooks] = useState<ParsedBook[]>([]);
  const [fileName, setFileName] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  const shelfCounts = {
    read: parsedBooks.filter(b => b.shelf === "read").length,
    currentlyReading: parsedBooks.filter(b => b.shelf === "currently-reading").length,
    toRead: parsedBooks.filter(b => b.shelf === "to-read").length,
    other: parsedBooks.filter(b => !["read", "currently-reading", "to-read"].includes(b.shelf)).length,
  };

  const importMutation = useMutation({
    mutationFn: async ({ dryRun }: { dryRun: boolean }) => {
      const res = await apiRequest("POST", "/api/user/import/goodreads", {
        books: parsedBooks,
        dryRun,
      });
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: (data) => {
      setImportResult(data);
      if (!data.dryRun && data.batchId) {
        setLastBatchId(data.batchId);
        queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      }
    },
    onError: () => {
      toast({ title: "Import failed", description: "Something went wrong.", variant: "destructive" });
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/import/goodreads/rollback", { batchId: lastBatchId });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Rollback complete", description: data.message });
      setLastBatchId(null);
      setImportResult(null);
      queryClient.invalidateQueries({ queryKey: ["/api/user/books"] });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    setLastBatchId(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const books = parseGoodreadsCSV(text);
      setParsedBooks(books);
      if (books.length === 0) {
        toast({ title: "No books found", description: "Could not parse the CSV file. Make sure it's a Goodreads library export.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground">You need to be logged in to import your Goodreads library.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container px-4 mx-auto py-8 max-w-3xl">
        <div className="mb-6">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="gap-1 mb-4" data-testid="link-back-profile">
              <ArrowLeft className="w-4 h-4" /> Back to Profile
            </Button>
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight" data-testid="text-import-title">
            Import from Goodreads
          </h1>
          <p className="text-muted-foreground mt-1">
            Upload your Goodreads library export CSV to import your reading history.
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="w-5 h-5" /> Upload CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-select-file"
                >
                  Choose CSV File
                </Button>
                {fileName && (
                  <p className="mt-2 text-sm text-muted-foreground" data-testid="text-file-name">
                    Selected: {fileName}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Go to Goodreads → My Books → Import and Export → Export Library to get your CSV.
              </p>
            </div>
          </CardContent>
        </Card>

        {parsedBooks.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" /> Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4" data-testid="import-summary">
                  <Badge variant="outline" className="text-sm">
                    {parsedBooks.length} total books
                  </Badge>
                  <Badge variant="default" className="text-sm">
                    {shelfCounts.read} read
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    {shelfCounts.currentlyReading} reading
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    {shelfCounts.toRead} to-read
                  </Badge>
                  {shelfCounts.other > 0 && (
                    <Badge variant="outline" className="text-sm">
                      {shelfCounts.other} other
                    </Badge>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-3 font-medium">Title</th>
                        <th className="text-left py-2 pr-3 font-medium">Author</th>
                        <th className="text-left py-2 pr-3 font-medium">Shelf</th>
                        <th className="text-left py-2 pr-3 font-medium">Rating</th>
                        <th className="text-left py-2 font-medium">Date Read</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedBooks.slice(0, 20).map((book, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-2 pr-3 max-w-[200px] truncate" data-testid={`preview-title-${i}`}>
                            {book.title}
                          </td>
                          <td className="py-2 pr-3 max-w-[150px] truncate text-muted-foreground">
                            {book.author}
                          </td>
                          <td className="py-2 pr-3">
                            <Badge variant={book.shelf === "read" ? "default" : "outline"} className="text-xs">
                              {book.shelf}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">
                            {book.rating && book.rating !== "0" ? `${book.rating}★` : "—"}
                          </td>
                          <td className="py-2 text-muted-foreground text-xs">
                            {book.dateRead || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedBooks.length > 20 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 20 of {parsedBooks.length} books.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => importMutation.mutate({ dryRun: true })}
                    disabled={importMutation.isPending}
                    className="gap-2"
                    data-testid="button-dry-run"
                  >
                    <Eye className="w-4 h-4" />
                    Dry Run (Preview Only)
                  </Button>
                  <Button
                    onClick={() => importMutation.mutate({ dryRun: false })}
                    disabled={importMutation.isPending}
                    className="gap-2"
                    data-testid="button-import-now"
                  >
                    <Upload className="w-4 h-4" />
                    {importMutation.isPending ? "Importing..." : "Import Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {importResult && (
              <Card className="mb-6" data-testid="import-result">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {importResult.dryRun ? (
                      <Eye className="w-5 h-5 text-blue-500" />
                    ) : importResult.errors > 0 ? (
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {importResult.dryRun ? "Dry Run Results" : "Import Complete"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 font-medium" data-testid="text-import-message">
                    {importResult.message}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-600" data-testid="text-created-count">
                        {importResult.created}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {importResult.dryRun ? "Would create" : "Created"}
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600" data-testid="text-updated-count">
                        {importResult.updated}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {importResult.dryRun ? "Would update" : "Updated"}
                      </div>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold" data-testid="text-skipped-count">
                        {importResult.skipped}
                      </div>
                      <div className="text-xs text-muted-foreground">Skipped</div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-red-600" data-testid="text-error-count">
                        {importResult.errors}
                      </div>
                      <div className="text-xs text-muted-foreground">Errors</div>
                    </div>
                  </div>

                  {importResult.errorDetails.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 mb-4">
                      <p className="text-sm font-medium text-red-600 mb-1">Error Details:</p>
                      {importResult.errorDetails.map((err, i) => (
                        <p key={i} className="text-xs text-red-500">{err}</p>
                      ))}
                    </div>
                  )}

                  {!importResult.dryRun && lastBatchId && (
                    <Button
                      variant="outline"
                      onClick={() => rollbackMutation.mutate()}
                      disabled={rollbackMutation.isPending}
                      className="gap-2"
                      data-testid="button-rollback"
                    >
                      <Undo2 className="w-4 h-4" />
                      {rollbackMutation.isPending ? "Rolling back..." : "Undo This Import"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2">How it works</h3>
            <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>Go to <strong>Goodreads → My Books → Import and Export</strong></li>
              <li>Click <strong>"Export Library"</strong> to download your CSV</li>
              <li>Upload the CSV file here</li>
              <li>Preview your books and run a <strong>dry run</strong> first to see what would happen</li>
              <li>Click <strong>"Import Now"</strong> to add books to your library</li>
              <li>If anything goes wrong, use the <strong>"Undo"</strong> button to rollback</li>
            </ol>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-1">What gets imported</h4>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Book title and author</li>
                <li>• Reading status (read, currently reading, to-read)</li>
                <li>• Your rating (1-5 stars)</li>
                <li>• Your review text</li>
                <li>• Date read and page count</li>
                <li>• Existing books won't be duplicated — missing info gets filled in</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
