import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calculator, Download, Info, AlertCircle, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const formSchema = z.object({
  projectType: z.string().min(1, "Επιλέξτε τύπο έργου"),
  category: z.string().min(1, "Επιλέξτε κατηγορία"),
  area: z.string().min(1, "Εισάγετε εμβαδόν"),
  cost: z.string().min(1, "Εισάγετε κόστος κατασκευής"),
  includeArchitectural: z.boolean(),
  includeStatic: z.boolean(),
  includeEM: z.boolean(),
  includeEnergy: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface StudyFee {
  name: string;
  nameEn: string;
  percentage: number;
  baseFee: number;
  minFee: number;
  finalFee: number;
  included: boolean;
}

interface FeeResult {
  studies: StudyFee[];
  subtotal: number;
  vat: number;
  total: number;
  projectType: string;
  category: string;
  area: number;
  cost: number;
  typeMultiplier: number;
}

const STUDY_CONFIG = {
  architectural: { name: "Αρχιτεκτονική Μελέτη", percentages: { Α: 2.5, Β: 3.0, Γ: 3.5 }, minFee: 1500 },
  static: { name: "Στατική Μελέτη", percentages: { Α: 1.5, Β: 2.0, Γ: 2.5 }, minFee: 1000 },
  em: { name: "Η/Μ Εγκαταστάσεις", percentages: { Α: 1.0, Β: 1.5, Γ: 2.0 }, minFee: 800 },
  energy: { name: "Ενεργειακή Μελέτη (ΜΕΑ)", percentages: { Α: 0.5, Β: 0.7, Γ: 1.0 }, minFee: 500 },
};

const TYPE_MULTIPLIERS: Record<string, number> = {
  "Νέα κατασκευή": 1.0,
  "Προσθήκη": 1.15,
  "Ανακαίνιση": 0.75,
};

const TYPE_LABELS: Record<string, string> = {
  "Νέα κατασκευή": "Νέα Κατασκευή (×1.00)",
  "Προσθήκη": "Προσθήκη (×1.15)",
  "Ανακαίνιση": "Ανακαίνιση (×0.75)",
};

const CATEGORY_LABELS: Record<string, string> = {
  "Α": "Κατηγορία Α — Απλά κτίρια (αποθήκες, στάβλοι, βοηθητικά)",
  "Β": "Κατηγορία Β — Συνήθη κτίρια (κατοικίες, γραφεία, εμπορικά)",
  "Γ": "Κατηγορία Γ — Σύνθετα κτίρια (νοσοκομεία, ξενοδοχεία Α, αθλητικά)",
};

function calculateFees(values: FormValues): FeeResult {
  const cost = parseFloat(values.cost);
  const area = parseFloat(values.area);
  const category = values.category as "Α" | "Β" | "Γ";
  const typeMultiplier = TYPE_MULTIPLIERS[values.projectType] ?? 1.0;

  const studies: StudyFee[] = [
    {
      name: STUDY_CONFIG.architectural.name,
      nameEn: "architectural",
      percentage: STUDY_CONFIG.architectural.percentages[category],
      baseFee: (cost * STUDY_CONFIG.architectural.percentages[category]) / 100,
      minFee: STUDY_CONFIG.architectural.minFee,
      finalFee: 0,
      included: values.includeArchitectural,
    },
    {
      name: STUDY_CONFIG.static.name,
      nameEn: "static",
      percentage: STUDY_CONFIG.static.percentages[category],
      baseFee: (cost * STUDY_CONFIG.static.percentages[category]) / 100,
      minFee: STUDY_CONFIG.static.minFee,
      finalFee: 0,
      included: values.includeStatic,
    },
    {
      name: STUDY_CONFIG.em.name,
      nameEn: "em",
      percentage: STUDY_CONFIG.em.percentages[category],
      baseFee: (cost * STUDY_CONFIG.em.percentages[category]) / 100,
      minFee: STUDY_CONFIG.em.minFee,
      finalFee: 0,
      included: values.includeEM,
    },
    {
      name: STUDY_CONFIG.energy.name,
      nameEn: "energy",
      percentage: STUDY_CONFIG.energy.percentages[category],
      baseFee: (cost * STUDY_CONFIG.energy.percentages[category]) / 100,
      minFee: STUDY_CONFIG.energy.minFee,
      finalFee: 0,
      included: values.includeEnergy,
    },
  ];

  studies.forEach((s) => {
    const withMultiplier = s.baseFee * typeMultiplier;
    s.finalFee = s.included ? Math.max(withMultiplier, s.minFee) : 0;
  });

  const subtotal = studies.reduce((sum, s) => sum + s.finalFee, 0);
  const vat = subtotal * 0.24;
  const total = subtotal + vat;

  return { studies, subtotal, vat, total, projectType: values.projectType, category, area, cost, typeMultiplier };
}

function fmt(n: number): string {
  return n.toLocaleString("el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface EngineerInfo {
  name: string;
  teeNumber: string;
  specialty: string;
}

function buildPdfHtml(result: FeeResult, generatedDate: string, engineer?: EngineerInfo): string {
  const includedStudies = result.studies.filter((s) => s.included);
  const rows = includedStudies.map((s) => `
    <tr>
      <td class="td-name">${s.name}</td>
      <td class="td-pct">${s.percentage.toFixed(1)}%</td>
      <td class="td-base">${fmt(s.baseFee)} €</td>
      <td class="td-mult">${fmt(s.baseFee * result.typeMultiplier)} €</td>
      <td class="td-min">${fmt(s.minFee)} €</td>
      <td class="td-final">${fmt(s.finalFee)} €</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; width: 794px; }
  .header { background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%); color: white; padding: 24px 36px 20px; display: flex; align-items: center; justify-content: space-between; }
  .logo-text { font-size: 22px; font-weight: 700; }
  .logo-sub { font-size: 10px; opacity: 0.8; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; opacity: 0.85; }
  .header-right .doc-title { font-size: 13px; font-weight: 600; opacity: 1; margin-bottom: 3px; }
  .info-box { background: #f0f4ff; border-left: 4px solid #1d4ed8; margin: 20px 36px 0; padding: 14px 18px; border-radius: 0 6px 6px 0; }
  .info-title { font-size: 11px; font-weight: 700; color: #1d4ed8; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .info-label { font-size: 9px; color: #6b7280; text-transform: uppercase; margin-bottom: 2px; }
  .info-value { font-size: 11px; font-weight: 600; }
  .section { margin: 20px 36px 0; }
  .section-title { font-size: 12px; font-weight: 700; color: #1d4ed8; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #1d4ed8; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1d4ed8; color: white; padding: 7px 8px; text-align: left; font-weight: 600; font-size: 9.5px; }
  td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .td-name { font-weight: 600; }
  .td-pct, .td-base, .td-mult, .td-min, .td-final { text-align: right; }
  .td-final { font-weight: 700; color: #1d4ed8; }
  .totals { margin: 16px 36px 0; display: flex; justify-content: flex-end; }
  .totals-table { width: 280px; }
  .total-row td { padding: 5px 8px; font-size: 11px; }
  .total-row.subtotal td { border-bottom: 1px solid #e5e7eb; }
  .total-row.vat td { color: #6b7280; }
  .total-row.grand td { background: #1d4ed8; color: white; font-weight: 700; font-size: 13px; border-radius: 4px; }
  .note-box { margin: 14px 36px 0; padding: 10px 14px; background: #fefce8; border: 1px solid #fde68a; border-radius: 6px; font-size: 9.5px; color: #78350f; line-height: 1.5; }
  .footer { margin: 16px 36px 0; padding: 12px 0 28px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  .footer-logo { font-weight: 700; color: #1d4ed8; font-size: 11px; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo-text">ArchiLex</div>
      <div class="logo-sub">Πλατφόρμα AI για Αρχιτέκτονες & Μηχανικούς</div>
    </div>
    <div class="header-right">
      <div class="doc-title">Υπολογισμός Αμοιβών ΤΕΕ</div>
      <div>Ημερομηνία: ${generatedDate}</div>
      <div>Βάσει ΠΔ 696/1974 & ισχύουσων διατάξεων</div>
    </div>
  </div>

  <div class="info-box">
    <div class="info-title">Στοιχεία Έργου</div>
    <div class="info-grid">
      <div><div class="info-label">Τύπος Έργου</div><div class="info-value">${result.projectType}</div></div>
      <div><div class="info-label">Κατηγορία</div><div class="info-value">Κατηγορία ${result.category}</div></div>
      <div><div class="info-label">Εμβαδόν</div><div class="info-value">${fmt(result.area)} τ.μ.</div></div>
      <div><div class="info-label">Κόστος Κατασκευής</div><div class="info-value">${fmt(result.cost)} €</div></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Ανάλυση Αμοιβών ανά Μελέτη</div>
    <table>
      <thead>
        <tr>
          <th>Μελέτη</th>
          <th style="text-align:right">Συντελεστής</th>
          <th style="text-align:right">Βάση Αμοιβή</th>
          <th style="text-align:right">Μετά Πολ/τή (×${result.typeMultiplier.toFixed(2)})</th>
          <th style="text-align:right">Ελάχιστη</th>
          <th style="text-align:right">Τελική Αμοιβή</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <table class="totals-table">
      <tr class="total-row subtotal">
        <td>Σύνολο χωρίς ΦΠΑ</td>
        <td style="text-align:right; font-weight:600">${fmt(result.subtotal)} €</td>
      </tr>
      <tr class="total-row vat">
        <td>ΦΠΑ 24%</td>
        <td style="text-align:right">${fmt(result.vat)} €</td>
      </tr>
      <tr class="total-row grand">
        <td>ΓΕΝΙΚΟ ΣΥΝΟΛΟ</td>
        <td style="text-align:right">${fmt(result.total)} €</td>
      </tr>
    </table>
  </div>

  <div class="note-box">
    ⚠ Οι αμοιβές υπολογίστηκαν βάσει ΠΔ 696/1974 (όπως τροποποιήθηκε) και αποτελούν ελάχιστες νόμιμες αμοιβές ΤΕΕ. 
    Η τελική αμοιβή καθορίζεται με σύμβαση μεταξύ μηχανικού και εντολέα. 
    Πολλαπλαστής τύπου έργου: ×${result.typeMultiplier.toFixed(2)} (${result.projectType}).
  </div>

  ${engineer && (engineer.name || engineer.teeNumber || engineer.specialty) ? `
  <div class="info-box" style="margin-top:14px;">
    <div class="info-title">Στοιχεία Μηχανικού</div>
    <div class="info-grid" style="grid-template-columns: repeat(3, 1fr);">
      ${engineer.name ? `<div><div class="info-label">Ονοματεπώνυμο</div><div class="info-value">${engineer.name}</div></div>` : ""}
      ${engineer.specialty ? `<div><div class="info-label">Ειδικότητα</div><div class="info-value">${engineer.specialty}</div></div>` : ""}
      ${engineer.teeNumber ? `<div><div class="info-label">Αρ. Μητρώου ΤΕΕ</div><div class="info-value">${engineer.teeNumber}</div></div>` : ""}
    </div>
  </div>` : ""}

  <div class="footer">
    <div><span class="footer-logo">ArchiLex</span> — Υπολογισμός Αμοιβών ΤΕΕ</div>
    <div>archilexapp.com · Παραγωγή: ${generatedDate}</div>
  </div>
</body>
</html>`;
}

export default function TeeCalculator() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [result, setResult] = useState<FeeResult | null>(null);
  const [exporting, setExporting] = useState(false);
  const FREE_LIMIT = 10;
  const limitReached = user?.plan === "free" && (user?.usesThisMonth ?? 0) >= FREE_LIMIT;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectType: "",
      category: "",
      area: "",
      cost: "",
      includeArchitectural: true,
      includeStatic: true,
      includeEM: true,
      includeEnergy: false,
    },
  });

  function onSubmit(values: FormValues) {
    if (limitReached) return;
    const area = parseFloat(values.area);
    const cost = parseFloat(values.cost);
    if (isNaN(area) || area <= 0) {
      form.setError("area", { message: "Εισάγετε έγκυρο εμβαδόν" });
      return;
    }
    if (isNaN(cost) || cost <= 0) {
      form.setError("cost", { message: "Εισάγετε έγκυρο κόστος" });
      return;
    }
    if (!values.includeArchitectural && !values.includeStatic && !values.includeEM && !values.includeEnergy) {
      toast({ title: "Επιλέξτε μελέτες", description: "Επιλέξτε τουλάχιστον μία μελέτη", variant: "destructive" });
      return;
    }
    setResult(calculateFees(values));
    apiRequest("POST", "/api/usage/increment").then(() => refreshUser()).catch(() => {});
  }

  async function handleExportPDF() {
    if (!result) return;
    setExporting(true);
    try {
      const generatedDate = new Date().toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" });
      const engineerInfo: EngineerInfo = {
        name: user ? (user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : user.fullName) : "",
        teeNumber: user?.teeNumber ?? "",
        specialty: user?.specialty ?? "",
      };
      const htmlContent = buildPdfHtml(result, generatedDate, engineerInfo);

      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;z-index:-1;";
      document.body.appendChild(container);

      const innerBody = (container.querySelector("body") as HTMLElement) || container;
      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(innerBody, { scale: 2, useCORS: true, logging: false, backgroundColor: "#fff", windowWidth: 794 });
      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      let page = 0;
      let remaining = (canvas.height * pdfW) / canvas.width;

      while (remaining > 0) {
        if (page > 0) pdf.addPage();
        const srcY = (page * pdfH * canvas.width) / pdfW;
        const srcH = Math.min((pdfH * canvas.width) / pdfW, canvas.height - srcY);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        pageCanvas.getContext("2d")!.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.97), "JPEG", 0, 0, pdfW, (srcH * pdfW) / canvas.width);
        remaining -= pdfH;
        page++;
      }

      const filename = `ArchiLex_Αμοιβές_ΤΕΕ_${result.projectType.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
      toast({ title: "PDF αποθηκεύτηκε!", description: `Το αρχείο "${filename}" λήφθηκε επιτυχώς.` });
    } catch {
      toast({ title: "Σφάλμα εξαγωγής PDF", description: "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  const studies = [
    { field: "includeArchitectural" as const, label: "Αρχιτεκτονική Μελέτη" },
    { field: "includeStatic" as const, label: "Στατική Μελέτη" },
    { field: "includeEM" as const, label: "Η/Μ Εγκαταστάσεις" },
    { field: "includeEnergy" as const, label: "Ενεργειακή Μελέτη (ΜΕΑ)" },
  ];

  return (
    <div className="flex h-full min-h-0 gap-4 p-4">
      <div className="w-72 shrink-0 overflow-y-auto">
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Στοιχεία Έργου</CardTitle>
            <CardDescription className="text-xs leading-tight">Υπολογισμός αμοιβών βάσει ΠΔ 696/1974</CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[11px] leading-none">Τύπος Έργου</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs" data-testid="select-projectType">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Νέα κατασκευή">Νέα κατασκευή</SelectItem>
                          <SelectItem value="Προσθήκη">Προσθήκη</SelectItem>
                          <SelectItem value="Ανακαίνιση">Ανακαίνιση</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[11px] leading-none">Κατηγορία Κτιρίου</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-7 text-xs" data-testid="select-category">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Α">Κατηγορία Α (Απλά κτίρια)</SelectItem>
                          <SelectItem value="Β">Κατηγορία Β (Συνήθη κτίρια)</SelectItem>
                          <SelectItem value="Γ">Κατηγορία Γ (Σύνθετα κτίρια)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] leading-none">Εμβαδόν (τ.μ.)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="200" className="h-7 text-xs" data-testid="input-area" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cost"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] leading-none">Κόστος (€)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="200000" className="h-7 text-xs" data-testid="input-cost" {...field} />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="border-t border-border pt-1.5 space-y-0.5">
                  <p className="text-[11px] font-medium text-muted-foreground mb-1">Περιλαμβανόμενες Μελέτες</p>
                  {studies.map((s) => (
                    <FormField
                      key={s.field}
                      control={form.control}
                      name={s.field}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 py-0.5">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`checkbox-${s.field}`}
                            />
                          </FormControl>
                          <FormLabel className="text-[11px] font-normal cursor-pointer leading-tight">{s.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                {limitReached && (
                  <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs text-destructive" data-testid="banner-limit-reached">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Εξαντλήσατε το μηνιαίο όριο ({FREE_LIMIT} χρήσεις). Αναβαθμίστε σε <strong>Pro</strong> για απεριόριστη πρόσβαση.</span>
                  </div>
                )}
                <Button type="submit" size="sm" className="w-full" disabled={limitReached} data-testid="button-calculate">
                  <Calculator className="w-3.5 h-3.5 mr-2" />
                  Υπολογισμός Αμοιβών
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="mt-3">
          <CardContent className="px-3 py-3">
            <p className="text-[11px] font-medium flex items-center gap-1.5 mb-2">
              <Info className="w-3.5 h-3.5 text-primary" />
              Κατηγορίες Κτιρίου
            </p>
            <div className="space-y-1.5">
              {Object.entries(CATEGORY_LABELS).map(([cat, desc]) => (
                <div key={cat} className="text-[10px] text-muted-foreground leading-snug">
                  <span className="font-semibold text-foreground">Κατ. {cat}:</span> {desc.split("—")[1]?.trim()}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-w-0">
        {!result && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calculator className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Αμοιβές Μηχανικών ΤΕΕ</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Υπολογίστε τις ελάχιστες νόμιμες αμοιβές μηχανικών βάσει του ΠΔ 696/1974 και της ισχύουσας νομοθεσίας ΤΕΕ.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs max-w-sm w-full">
              {[
                { label: "Αρχιτεκτονική", pcts: "Α:2.5% / Β:3.0% / Γ:3.5%" },
                { label: "Στατική", pcts: "Α:1.5% / Β:2.0% / Γ:2.5%" },
                { label: "Η/Μ", pcts: "Α:1.0% / Β:1.5% / Γ:2.0%" },
                { label: "Ενεργειακή", pcts: "Α:0.5% / Β:0.7% / Γ:1.0%" },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-md bg-card border border-border/60 text-left">
                  <p className="font-semibold text-foreground mb-0.5">{item.label}</p>
                  <p className="text-muted-foreground text-[10px]">{item.pcts}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 shrink-0">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">Ανάλυση Αμοιβών ΤΕΕ</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {result.projectType} · Κατηγορία {result.category} · {fmt(result.area)} τ.μ. · {fmt(result.cost)} €
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={handleExportPDF} disabled={exporting} className="gap-2" data-testid="button-export-pdf">
                    {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    {exporting ? "Εξαγωγή..." : "Εξαγωγή PDF"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setResult(null)} data-testid="button-reset">
                    Νέος Υπολογισμός
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Αμοιβές ανά Μελέτη</h4>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/60">
                        <th className="text-left px-3 py-2 font-semibold">Μελέτη</th>
                        <th className="text-right px-3 py-2 font-semibold">Συντελεστής</th>
                        <th className="text-right px-3 py-2 font-semibold">Βάση Αμοιβή</th>
                        <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">
                          Μετά Πολ/τή <span className="font-normal text-muted-foreground">(×{result.typeMultiplier.toFixed(2)})</span>
                        </th>
                        <th className="text-right px-3 py-2 font-semibold">Ελάχιστη</th>
                        <th className="text-right px-3 py-2 font-semibold text-primary">Τελική</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.studies.map((study) => (
                        <tr key={study.nameEn} className={`border-t border-border/40 ${!study.included ? "opacity-40" : ""}`}>
                          <td className="px-3 py-2.5 font-medium">
                            {study.name}
                            {!study.included && <span className="ml-2 text-[10px] text-muted-foreground">(δεν επιλέχθηκε)</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{study.percentage.toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(study.baseFee)} €</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(study.baseFee * result.typeMultiplier)} €</td>
                          <td className="px-3 py-2.5 text-right text-muted-foreground">{fmt(study.minFee)} €</td>
                          <td className={`px-3 py-2.5 text-right font-semibold ${study.included ? "text-primary" : "text-muted-foreground"}`}>
                            {study.included ? `${fmt(study.finalFee)} €` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  * Η τελική αμοιβή ισούται με το μεγαλύτερο από: (Βάση × Πολλαπλαστής) ή Ελάχιστη νόμιμη αμοιβή
                </p>
              </div>

              <div className="flex justify-end">
                <div className="w-72 rounded-lg border border-border overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-muted/40">
                    <span className="text-sm text-muted-foreground">Σύνολο χωρίς ΦΠΑ</span>
                    <span className="text-sm font-semibold">{fmt(result.subtotal)} €</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2 border-t border-border/40">
                    <span className="text-sm text-muted-foreground">ΦΠΑ 24%</span>
                    <span className="text-sm text-muted-foreground">{fmt(result.vat)} €</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-primary text-primary-foreground">
                    <span className="text-sm font-bold">ΓΕΝΙΚΟ ΣΥΝΟΛΟ</span>
                    <span className="text-lg font-bold">{fmt(result.total)} €</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Τύπος Έργου</p>
                  <Badge variant="secondary" className="text-xs">{TYPE_LABELS[result.projectType]}</Badge>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Κατηγορία Κτιρίου</p>
                  <Badge variant="secondary" className="text-xs">Κατηγορία {result.category}</Badge>
                </div>
                <div className="rounded-lg bg-muted/40 border border-border/60 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Αμοιβή / τ.μ.</p>
                  <p className="text-sm font-semibold">{fmt(result.subtotal / result.area)} €/τ.μ.</p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <strong>Σημείωση:</strong> Οι υπολογισμοί βασίζονται στο ΠΔ 696/1974 (ΦΕΚ Α' 423) και τροποποιήσεις αυτού.
                Αποτελούν ελάχιστες νόμιμες αμοιβές ΤΕΕ. Η τελική αμοιβή καθορίζεται ελεύθερα με ιδιωτικό συμφωνητικό.
                Για πολύπλοκα έργα ή ειδικές κατηγορίες (π.χ. πολιτισμός, υγεία) ισχύουν αυξημένοι συντελεστές.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
