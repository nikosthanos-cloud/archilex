import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, CheckSquare, ClipboardList, Download } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const checklistSchema = z.object({
  projectType: z.string().min(1, "Επιλέξτε τύπο έργου"),
  location: z.string().min(2, "Εισάγετε τοποθεσία"),
  area: z.string().min(1, "Εισάγετε εμβαδόν"),
  floors: z.string().min(1, "Εισάγετε αριθμό ορόφων"),
  useType: z.string().min(1, "Επιλέξτε χρήση"),
  isNew: z.boolean(),
  hasBasement: z.boolean(),
  nearAntiquities: z.boolean(),
  nearSea: z.boolean(),
  isTraditionalSettlement: z.boolean(),
});

type ChecklistForm = z.infer<typeof checklistSchema>;

interface ProjectSummary {
  projectType: string;
  location: string;
  area: string;
  floors: string;
  useType: string;
  isNew: boolean;
  hasBasement: boolean;
  nearAntiquities: boolean;
  nearSea: boolean;
  isTraditionalSettlement: boolean;
}

function formatChecklist(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      return (
        <div key={i} className="mt-5 first:mt-0">
          <p className="font-semibold text-sm text-foreground bg-muted/50 px-3 py-2 rounded-md">
            {line.replace(/^#+\s/, "")}
          </p>
        </div>
      );
    }
    if (line.match(/^\*\*.*\*\*:?$/) || (line.startsWith("**") && line.endsWith("**"))) {
      return <p key={i} className="font-semibold text-sm mt-4 first:mt-0">{line.replace(/\*\*/g, "")}</p>;
    }
    if (line.match(/^\*\*.*\*\*/)) {
      const cleaned = line.replace(/\*\*(.*?)\*\*/g, "$1");
      return <p key={i} className="text-sm text-muted-foreground mt-1">{cleaned}</p>;
    }
    if (line.startsWith("- ") || line.startsWith("• ") || line.match(/^\d+\./)) {
      const content = line.replace(/^[-•]\s/, "").replace(/^\d+\.\s/, "");
      return (
        <div key={i} className="flex items-start gap-2 mt-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-snug">{content}</p>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1" />;
    return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
  });
}

function buildPdfHtml(checklist: string, project: ProjectSummary, generatedDate: string): string {
  const flagLine = (label: string, value: boolean) =>
    value ? `<span class="tag">${label}</span>` : "";

  const flags = [
    flagLine("Νέα κατασκευή", project.isNew),
    flagLine("Ανακαίνιση", !project.isNew),
    flagLine("Υπόγειο", project.hasBasement),
    flagLine("Κοντά σε αρχαιότητες", project.nearAntiquities),
    flagLine("Κοντά σε θάλασσα/αιγιαλό", project.nearSea),
    flagLine("Παραδοσιακός οικισμός", project.isTraditionalSettlement),
  ].filter(Boolean).join(" ");

  const formatLine = (line: string, idx: number): string => {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      return `<div class="section-header">${line.replace(/^#+\s/, "")}</div>`;
    }
    if (line.match(/^\*\*.*\*\*:?$/) || (line.startsWith("**") && line.endsWith("**"))) {
      return `<p class="subsection">${line.replace(/\*\*/g, "")}</p>`;
    }
    if (line.match(/^\*\*.*\*\*/)) {
      return `<p class="note">${line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</p>`;
    }
    if (line.startsWith("- ") || line.startsWith("• ") || line.match(/^\d+\./)) {
      const content = line.replace(/^[-•]\s/, "").replace(/^\d+\.\s/, "");
      return `<div class="checklist-item"><span class="checkbox">☐</span><span class="item-text">${content}</span></div>`;
    }
    if (line.trim() === "") return `<div class="spacer"></div>`;
    return `<p class="body-text">${line}</p>`;
  };

  const formattedLines = checklist.split("\n").map(formatLine).join("");

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a2e;
    background: #ffffff;
    width: 794px;
    padding: 0;
  }
  .header {
    background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
    color: white;
    padding: 28px 36px 22px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-icon {
    width: 40px;
    height: 40px;
    background: rgba(255,255,255,0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    font-weight: bold;
  }
  .logo-text {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .logo-subtitle {
    font-size: 10px;
    opacity: 0.8;
    margin-top: 2px;
  }
  .header-right {
    text-align: right;
    font-size: 10px;
    opacity: 0.85;
  }
  .header-right .doc-title {
    font-size: 13px;
    font-weight: 600;
    opacity: 1;
    margin-bottom: 3px;
  }

  .project-details {
    background: #f0f4ff;
    border-left: 4px solid #1d4ed8;
    margin: 24px 36px 0;
    padding: 16px 20px;
    border-radius: 0 6px 6px 0;
  }
  .project-details-title {
    font-size: 12px;
    font-weight: 700;
    color: #1d4ed8;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }
  .detail-item {}
  .detail-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
  }
  .detail-value {
    font-size: 11px;
    font-weight: 600;
    color: #1a1a2e;
  }
  .flags-row {
    margin-top: 12px;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tag {
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 20px;
    padding: 2px 10px;
    font-size: 9px;
    font-weight: 600;
  }

  .legal-ref {
    margin: 16px 36px 0;
    padding: 10px 14px;
    background: #fefce8;
    border: 1px solid #fde68a;
    border-radius: 6px;
    font-size: 9.5px;
    color: #78350f;
    line-height: 1.5;
  }

  .checklist-body {
    padding: 20px 36px 36px;
  }
  .section-header {
    background: #1d4ed8;
    color: white;
    padding: 7px 14px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    margin-top: 18px;
    margin-bottom: 6px;
  }
  .subsection {
    font-size: 11px;
    font-weight: 700;
    color: #1a1a2e;
    margin-top: 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 3px;
  }
  .note {
    font-size: 10px;
    color: #4b5563;
    margin: 4px 0;
    padding-left: 4px;
  }
  .checklist-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 5px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .checkbox {
    font-size: 14px;
    color: #9ca3af;
    line-height: 1;
    min-width: 16px;
    padding-top: 1px;
  }
  .item-text {
    font-size: 10.5px;
    color: #374151;
    line-height: 1.45;
    flex: 1;
  }
  .spacer { height: 4px; }
  .body-text {
    font-size: 10px;
    color: #6b7280;
    margin: 3px 0;
    line-height: 1.5;
  }

  .footer {
    margin: 0 36px;
    padding: 14px 0 28px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    color: #9ca3af;
  }
  .footer-logo {
    font-weight: 700;
    color: #1d4ed8;
    font-size: 11px;
  }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">A</div>
      <div>
        <div class="logo-text">ArchiLex</div>
        <div class="logo-subtitle">Πλατφόρμα AI για Αρχιτέκτονες & Μηχανικούς</div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-title">Κατάλογος Δικαιολογητικών</div>
      <div>Ημερομηνία: ${generatedDate}</div>
      <div>Βάσει Ν. 4495/2017</div>
    </div>
  </div>

  <div class="project-details">
    <div class="project-details-title">Στοιχεία Έργου</div>
    <div class="details-grid">
      <div class="detail-item">
        <div class="detail-label">Τύπος Έργου</div>
        <div class="detail-value">${project.projectType}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Χρήση</div>
        <div class="detail-value">${project.useType}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Τοποθεσία</div>
        <div class="detail-value">${project.location}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Εμβαδόν</div>
        <div class="detail-value">${project.area} τ.μ.</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Αριθμός Ορόφων</div>
        <div class="detail-value">${project.floors}</div>
      </div>
    </div>
    ${flags ? `<div class="flags-row">${flags}</div>` : ""}
  </div>

  <div class="legal-ref">
    ⚠ Ο κατάλογος αυτός είναι ενδεικτικός βάσει Ν. 4495/2017 και ισχύουσων διατάξεων. Ενδέχεται να απαιτούνται επιπλέον έγγραφα ανάλογα με τα ιδιαίτερα χαρακτηριστικά του έργου και την αρμόδια Υπηρεσία Δόμησης. Συνιστάται επαλήθευση με την οικεία ΥΔΟΜ.
  </div>

  <div class="checklist-body">
    ${formattedLines}
  </div>

  <div class="footer">
    <div>
      <span class="footer-logo">ArchiLex</span> — AI Βοηθός για Ελληνικές Οικοδομικές Άδειες
    </div>
    <div>archilexapp.com · Παραγωγή: ${generatedDate}</div>
  </div>
</body>
</html>`;
}

export default function PermitChecklist() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [checklist, setChecklist] = useState<string | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<ChecklistForm>({
    resolver: zodResolver(checklistSchema),
    defaultValues: {
      projectType: "",
      location: "",
      area: "",
      floors: "",
      useType: "",
      isNew: true,
      hasBasement: false,
      nearAntiquities: false,
      nearSea: false,
      isTraditionalSettlement: false,
    },
  });

  async function onSubmit(values: ChecklistForm) {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/permits/checklist", values);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChecklist(data.checklist);
      setProjectSummary(values);
    } catch (err: any) {
      toast({ title: "Σφάλμα", description: err.message || "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!checklist || !projectSummary) return;
    setExporting(true);

    try {
      const generatedDate = new Date().toLocaleDateString("el-GR", {
        day: "numeric", month: "long", year: "numeric",
      });

      const htmlContent = buildPdfHtml(checklist, projectSummary, generatedDate);

      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.style.background = "#ffffff";
      container.style.zIndex = "-1";
      document.body.appendChild(container);

      const innerBody = container.querySelector("body") as HTMLElement || container;

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(innerBody, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/jpeg", 0.97);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidthMm = pdfWidth;
      const canvasHeightMm = (canvas.height * pdfWidth) / canvas.width;

      let yPos = 0;
      let remainingHeight = canvasHeightMm;
      let page = 0;

      while (remainingHeight > 0) {
        if (page > 0) pdf.addPage();

        const srcY = (page * pdfHeight * canvas.width) / pdfWidth;
        const srcH = Math.min(
          (pdfHeight * canvas.width) / pdfWidth,
          canvas.height - srcY
        );

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.97);
        const pageImgHeight = (srcH * pdfWidth) / canvas.width;

        pdf.addImage(pageImgData, "JPEG", 0, 0, pdfWidth, pageImgHeight);

        remainingHeight -= pdfHeight;
        page++;
      }

      const filename = `ArchiLex_Δικαιολογητικά_${projectSummary.projectType.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      toast({ title: "PDF αποθηκεύτηκε!", description: `Το αρχείο "${filename}" λήφθηκε επιτυχώς.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Σφάλμα εξαγωγής PDF", description: "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 gap-4 p-4">
      <div className="w-80 shrink-0 flex flex-col gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Στοιχεία Έργου</CardTitle>
            <CardDescription className="text-xs">Συμπληρώστε τα στοιχεία για εξατομικευμένη λίστα</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Τύπος Έργου</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-projectType">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Μονοκατοικία">Μονοκατοικία</SelectItem>
                          <SelectItem value="Πολυκατοικία">Πολυκατοικία</SelectItem>
                          <SelectItem value="Εμπορικό κτίριο">Εμπορικό κτίριο</SelectItem>
                          <SelectItem value="Βιομηχανικό κτίριο">Βιομηχανικό κτίριο</SelectItem>
                          <SelectItem value="Ξενοδοχείο">Ξενοδοχείο</SelectItem>
                          <SelectItem value="Κτίριο γραφείων">Κτίριο γραφείων</SelectItem>
                          <SelectItem value="Αποθήκη">Αποθήκη</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="useType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Χρήση</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-useType">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Κατοικία">Κατοικία</SelectItem>
                          <SelectItem value="Εμπόριο">Εμπόριο</SelectItem>
                          <SelectItem value="Γραφεία">Γραφεία</SelectItem>
                          <SelectItem value="Βιομηχανία">Βιομηχανία</SelectItem>
                          <SelectItem value="Τουρισμός">Τουρισμός</SelectItem>
                          <SelectItem value="Αθλητισμός">Αθλητισμός</SelectItem>
                          <SelectItem value="Εκπαίδευση">Εκπαίδευση</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Τοποθεσία / Δήμος</FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. Αθήνα, Θεσσαλονίκη..." className="h-8 text-xs" data-testid="input-location" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Εμβαδόν (τ.μ.)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="150" className="h-8 text-xs" data-testid="input-area" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="floors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Όροφοι</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2" className="h-8 text-xs" data-testid="input-floors" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { name: "isNew" as const, label: "Νέα κατασκευή" },
                    { name: "hasBasement" as const, label: "Υπόγειο" },
                    { name: "nearAntiquities" as const, label: "Κοντά σε αρχαιότητες" },
                    { name: "nearSea" as const, label: "Κοντά σε θάλασσα/αιγιαλό" },
                    { name: "isTraditionalSettlement" as const, label: "Παραδοσιακός οικισμός" },
                  ].map((item) => (
                    <FormField
                      key={item.name}
                      control={form.control}
                      name={item.name}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel className="text-xs font-normal cursor-pointer">{item.label}</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid={`switch-${item.name}`} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-generate-checklist">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                  Δημιουργία Λίστας
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-w-0">
        {!checklist && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Κατάλογος Δικαιολογητικών</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Συμπληρώστε τα στοιχεία του έργου σας για να δημιουργήσετε εξατομικευμένη λίστα εγγράφων για οικοδομική άδεια.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs max-w-sm w-full">
              {["Τοπογραφικά & τίτλοι", "Αρχιτεκτονικές μελέτες", "Στατική μελέτη", "Η/Μ εγκαταστάσεις", "Ενεργειακή μελέτη", "Ειδικές εγκρίσεις"].map((item) => (
                <div key={item} className="flex items-center gap-2 p-2 rounded-md bg-card border border-card-border">
                  <FileText className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Δημιουργία εξατομικευμένης λίστας...</p>
          </div>
        )}

        {checklist && !loading && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Κατάλογος Δικαιολογητικών</CardTitle>
                  <CardDescription className="text-xs mt-1">Βάσει Ν. 4495/2017 και ισχύουσων διατάξεων</CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">Εξατομικευμένο</Badge>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={exporting}
                    className="gap-2"
                    data-testid="button-export-pdf"
                  >
                    {exporting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />
                    }
                    {exporting ? "Εξαγωγή..." : "Εξαγωγή PDF"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setChecklist(null); setProjectSummary(null); form.reset(); }} data-testid="button-reset-checklist">
                    Νέα Λίστα
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1" ref={pdfContainerRef}>
              <CardContent className="p-4 space-y-0.5">
                {formatChecklist(checklist)}
              </CardContent>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}
