import { useState, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { FileUp, Send, CheckCircle, Loader2, Download, AlertTriangle } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { useToast } from "@/hooks/use-toast";

export default function ArcUpload() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ id: string; downloadUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({ authorName: "", bookTitle: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast({ title: "Invalid file type", description: "Only PDF files are allowed.", variant: "destructive" });
        e.target.value = "";
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast({ title: "File too large", description: "Maximum file size is 20 MB.", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.authorName.trim() || !formData.bookTitle.trim()) {
      toast({ title: "Missing required fields", description: "Please fill in author name and book title.", variant: "destructive" });
      return;
    }
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a PDF file to upload.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const body = new FormData();
      body.append("authorName", formData.authorName.trim());
      body.append("bookTitle", formData.bookTitle.trim());
      body.append("arcFile", selectedFile);

      const res = await fetch("/api/arc-upload", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Upload failed.");
      }

      setResult({ id: data.id, downloadUrl: data.downloadUrl });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans">
        <SEOHead title="ARC Uploaded - Book Slump Rescue" description="Your ARC has been uploaded and watermarked successfully." />
        <Navigation />
        <main className="flex-1 py-12 lg:py-16">
          <div className="container px-4 mx-auto max-w-2xl">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <Card className="p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold" data-testid="text-arc-upload-success">
                    ARC uploaded and watermarked successfully!
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Your Advanced Review Copy has been watermarked with your author name and is ready for distribution.
                  </p>
                  <a href={result.downloadUrl} data-testid="link-arc-download">
                    <Button className="mt-2">
                      <Download className="w-4 h-4 mr-1.5" />
                      Download Watermarked ARC
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      setResult(null);
                      setFormData({ authorName: "", bookTitle: "" });
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    data-testid="button-upload-another"
                  >
                    Upload Another ARC
                  </Button>
                </div>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <SEOHead title="Upload ARC - Book Slump Rescue" description="Upload your Advanced Review Copy (ARC) for watermarking and distribution." />
      <Navigation />

      <main className="flex-1 py-12 lg:py-16">
        <div className="container px-4 mx-auto max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <FileUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3" data-testid="text-arc-upload-title">
              Upload Your ARC
            </h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              Submit your Advanced Review Copy as a PDF. We'll add a watermark with your author name and provide a secure download link.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="authorName">Author Name *</Label>
                    <Input
                      id="authorName"
                      value={formData.authorName}
                      onChange={e => handleChange("authorName", e.target.value)}
                      placeholder="Your name or pen name"
                      required
                      data-testid="input-arc-author-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bookTitle">Book Title *</Label>
                    <Input
                      id="bookTitle"
                      value={formData.bookTitle}
                      onChange={e => handleChange("bookTitle", e.target.value)}
                      placeholder="Title of your book"
                      required
                      data-testid="input-arc-book-title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="arcFile">PDF File * (max 20 MB)</Label>
                  <Input
                    id="arcFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    required
                    data-testid="input-arc-file"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Only PDF files are accepted. Your ARC will be watermarked with your author name for protection.
                  </p>
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full" data-testid="button-arc-submit">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      Uploading & Watermarking...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-1.5" />
                      Upload ARC
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
