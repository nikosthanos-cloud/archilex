import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  FileImage,
  FileText,
  Loader2,
  Building2,
  Trash2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface UploadRecord {
  id: string;
  filename: string;
  fileType: string;
  analysis: string;
  createdAt: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAnalysis(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      return <p key={i} className="font-semibold text-foreground mt-3 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
    }
    if (line.startsWith("## ") || line.startsWith("# ")) {
      return <p key={i} className="font-semibold text-base text-foreground mt-4 first:mt-0">{line.replace(/^#+\s/, "")}</p>;
    }
    if (line.match(/^\*\*.*\*\*/)) {
      return <p key={i} className="font-medium mt-2">{line.replace(/\*\*/g, "")}</p>;
    }
    if (line.startsWith("- ") || line.startsWith("• ")) {
      return <p key={i} className="pl-4 text-muted-foreground text-sm before:content-['•'] before:mr-2 before:text-primary">{line.replace(/^[-•]\s/, "")}</p>;
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
  });
}

export default function BlueprintAnalysis() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<{ filename: string; analysis: string } | null>(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  const { data: uploadsData, isLoading: uploadsLoading } = useQuery<{ uploads: UploadRecord[] }>({
    queryKey: ["/api/uploads/history"],
  });

  async function handleFile(file: File) {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Μη υποστηριζόμενος τύπος αρχείου", description: "Παρακαλώ ανεβάστε JPG, PNG ή PDF αρχείο.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Το αρχείο είναι πολύ μεγάλο", description: "Μέγιστο μέγεθος: 10MB", variant: "destructive" });
      return;
    }

    setAnalyzing(true);
    setCurrentAnalysis(null);
    setSelectedHistoryId(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/uploads/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.limitReached) {
          toast({ title: "Όριο χρήσεων μηνός", description: data.error, variant: "destructive" });
          return;
        }
        throw new Error(data.error);
      }
      setCurrentAnalysis({ filename: file.name, analysis: data.upload.analysis });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/history"] });
      refreshUser();
    } catch (err: any) {
      toast({ title: "Σφάλμα ανάλυσης", description: err.message || "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const selectedUpload = uploadsData?.uploads.find((u) => u.id === selectedHistoryId);
  const displayedAnalysis = currentAnalysis || (selectedUpload ? { filename: selectedUpload.filename, analysis: selectedUpload.analysis } : null);

  return (
    <div className="flex h-full min-h-0 gap-4 p-4">
      <div className="flex flex-col gap-4 w-72 shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ανέβασμα Σχεδίου</CardTitle>
            <CardDescription className="text-xs">JPG, PNG ή PDF έως 10MB</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border"
              } ${analyzing ? "opacity-50 pointer-events-none" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-blueprint"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-file-blueprint"
              />
              {analyzing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-xs">Ανάλυση σχεδίου...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-8 h-8" />
                  <p className="text-xs font-medium">Σύρτε αρχείο εδώ</p>
                  <p className="text-xs">ή κλικ για επιλογή</p>
                </div>
              )}
            </div>
            <Button
              className="w-full mt-3"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzing}
              data-testid="button-select-file"
            >
              <Upload className="w-4 h-4 mr-2" />
              Επιλογή Αρχείου
            </Button>
          </CardContent>
        </Card>

        <Card className="flex-1 min-h-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ιστορικό</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="px-4 pb-4 space-y-2">
                {uploadsLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Φόρτωση...
                  </div>
                )}
                {!uploadsLoading && (!uploadsData?.uploads || uploadsData.uploads.length === 0) && (
                  <p className="text-muted-foreground text-xs py-2">Δεν υπάρχουν αναλύσεις ακόμα</p>
                )}
                {uploadsData?.uploads.map((upload) => (
                  <button
                    key={upload.id}
                    onClick={() => { setSelectedHistoryId(upload.id); setCurrentAnalysis(null); }}
                    className={`w-full text-left p-2 rounded-md border text-xs transition-colors hover-elevate ${
                      selectedHistoryId === upload.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    data-testid={`button-history-upload-${upload.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {upload.fileType.includes("pdf") ? (
                        <FileText className="w-3 h-3 text-primary shrink-0" />
                      ) : (
                        <FileImage className="w-3 h-3 text-primary shrink-0" />
                      )}
                      <span className="truncate font-medium">{upload.filename}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{formatDate(upload.createdAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-w-0">
        {!displayedAnalysis && !analyzing && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <FileImage className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Ανάλυση Αρχιτεκτονικών Σχεδίων</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Ανεβάστε κάτοψη ή αρχιτεκτονικό σχέδιο (JPG, PNG, PDF) και λάβετε λεπτομερή ανάλυση από το AI σύστημα.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-left max-w-sm w-full">
              {["Γενική περιγραφή σχεδίου", "Αρχιτεκτονικά στοιχεία", "Κανονιστική συμμόρφωση", "Συστάσεις αδειοδότησης"].map((item) => (
                <div key={item} className="flex items-center gap-2 p-2 rounded-md bg-card border border-card-border">
                  <Building2 className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayedAnalysis && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{displayedAnalysis.filename}</CardTitle>
                  <CardDescription className="text-xs mt-1">Ανάλυση αρχιτεκτονικού σχεδίου</CardDescription>
                </div>
                <Badge variant="secondary" className="shrink-0">Ολοκληρώθηκε</Badge>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1">
              <CardContent className="p-4 space-y-1">
                {formatAnalysis(displayedAnalysis.analysis)}
              </CardContent>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}
