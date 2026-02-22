import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, Minus, Info, Euro, RotateCcw, AlertCircle, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";

const estimatorSchema = z.object({
  area: z.string().min(1, "Εισάγετε εμβαδόν").refine((v) => Number(v) > 0, "Εισάγετε έγκυρο εμβαδόν"),
  constructionType: z.string().min(1, "Επιλέξτε τύπο κατασκευής"),
  region: z.string().min(1, "Επιλέξτε περιοχή"),
  energyClass: z.string().min(1, "Επιλέξτε ενεργειακή κλάση"),
  quality: z.string().min(1, "Επιλέξτε ποιότητα κατασκευής"),
});

type EstimatorForm = z.infer<typeof estimatorSchema>;

const BASE_COSTS: Record<string, number> = {
  "Μονοκατοικία": 1200,
  "Πολυκατοικία": 1100,
  "Εμπορικό κτίριο": 1350,
  "Βιομηχανικό / Αποθήκη": 700,
  "Κτίριο γραφείων": 1400,
  "Ξενοδοχείο": 1600,
  "Αναπαλαίωση": 900,
};

const REGION_MULTIPLIERS: Record<string, { min: number; max: number; label: string }> = {
  "Αττική (Αθήνα / Νότια)": { min: 1.20, max: 1.45, label: "Αττική" },
  "Αττική (Βόρεια / Ανατολική)": { min: 1.15, max: 1.40, label: "Β. Αττική" },
  "Θεσσαλονίκη": { min: 1.05, max: 1.25, label: "Θεσσαλονίκη" },
  "Αστικά κέντρα (Πάτρα, Ηράκλειο, κλπ)": { min: 0.95, max: 1.15, label: "Αστικά" },
  "Νησιά (Κυκλάδες, Δωδεκάνησα)": { min: 1.25, max: 1.55, label: "Νησιά" },
  "Νησιά (Λοιπά)": { min: 1.10, max: 1.35, label: "Νησιά (λοιπά)" },
  "Ηπειρωτική Ελλάδα (επαρχία)": { min: 0.80, max: 1.00, label: "Επαρχία" },
};

const ENERGY_MULTIPLIERS: Record<string, number> = {
  "Α+ (Σχεδόν μηδενικής ενέργειας)": 1.25,
  "Α": 1.15,
  "Β+": 1.06,
  "Β": 1.00,
  "Γ": 0.95,
};

const QUALITY_MULTIPLIERS: Record<string, { factor: number; label: string }> = {
  "Οικονομική": { factor: 0.80, label: "Οικονομική" },
  "Τυπική": { factor: 1.00, label: "Τυπική" },
  "Υψηλή": { factor: 1.25, label: "Υψηλή" },
  "Πολυτελής": { factor: 1.60, label: "Πολυτελής" },
};

const PERMIT_COSTS: Record<string, number> = {
  "Μονοκατοικία": 3500,
  "Πολυκατοικία": 6000,
  "Εμπορικό κτίριο": 7500,
  "Βιομηχανικό / Αποθήκη": 4000,
  "Κτίριο γραφείων": 8000,
  "Ξενοδοχείο": 12000,
  "Αναπαλαίωση": 2500,
};

interface EstimateResult {
  minCostPerSqm: number;
  maxCostPerSqm: number;
  minTotal: number;
  maxTotal: number;
  midTotal: number;
  permitCost: number;
  engineeringCost: number;
  grandMinTotal: number;
  grandMaxTotal: number;
  area: number;
  constructionType: string;
  region: string;
  energyClass: string;
  quality: string;
}

function formatEuro(amount: number) {
  return new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
}

function calculate(values: EstimatorForm): EstimateResult {
  const area = Number(values.area);
  const base = BASE_COSTS[values.constructionType] || 1200;
  const regionData = REGION_MULTIPLIERS[values.region];
  const energyFactor = ENERGY_MULTIPLIERS[values.energyClass] || 1;
  const qualityFactor = QUALITY_MULTIPLIERS[values.quality]?.factor || 1;

  const minCostPerSqm = Math.round(base * regionData.min * energyFactor * qualityFactor);
  const maxCostPerSqm = Math.round(base * regionData.max * energyFactor * qualityFactor);
  const minTotal = minCostPerSqm * area;
  const maxTotal = maxCostPerSqm * area;
  const midTotal = (minTotal + maxTotal) / 2;

  const permitCost = PERMIT_COSTS[values.constructionType] || 5000;
  const engineeringCost = Math.round(midTotal * 0.06);
  const grandMinTotal = minTotal + permitCost + engineeringCost;
  const grandMaxTotal = maxTotal + permitCost + engineeringCost;

  return {
    minCostPerSqm, maxCostPerSqm, minTotal, maxTotal, midTotal,
    permitCost, engineeringCost, grandMinTotal, grandMaxTotal,
    area, constructionType: values.constructionType,
    region: values.region, energyClass: values.energyClass, quality: values.quality,
  };
}

function CostBar({ label, min, max, className }: { label: string; min: number; max: number; className?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{formatEuro(min)} – {formatEuro(max)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${className}`} style={{ width: "100%" }} />
      </div>
    </div>
  );
}

export default function CostEstimator() {
  const { user, refreshUser } = useAuth();
  const [result, setResult] = useState<EstimateResult | null>(null);
  const FREE_LIMIT = 10;
  const limitReached = user?.plan === "free" && (user?.usesThisMonth ?? 0) >= FREE_LIMIT;

  const form = useForm<EstimatorForm>({
    resolver: zodResolver(estimatorSchema),
    defaultValues: {
      area: "",
      constructionType: "",
      region: "",
      energyClass: "",
      quality: "",
    },
  });

  function onSubmit(values: EstimatorForm) {
    if (limitReached) return;
    setResult(calculate(values));
    apiRequest("POST", "/api/usage/increment").then(() => refreshUser()).catch(() => {});
  }

  return (
    <div className="flex h-full min-h-0 gap-4 p-4">
      <div className="w-80 shrink-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Παράμετροι Εκτίμησης</CardTitle>
            <CardDescription className="text-xs">Συμπληρώστε για υπολογισμό κόστους</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Εμβαδόν Κατασκευής (τ.μ.)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="150" className="h-8 text-xs" data-testid="input-area-estimator" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="constructionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Τύπος Κατασκευής</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-constructionType">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(BASE_COSTS).map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Περιοχή</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-region">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(REGION_MULTIPLIERS).map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="energyClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ενεργειακή Κλάση</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-energyClass">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(ENERGY_MULTIPLIERS).map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Ποιότητα Κατασκευής</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs" data-testid="select-quality">
                            <SelectValue placeholder="Επιλέξτε..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(QUALITY_MULTIPLIERS).map((k) => (
                            <SelectItem key={k} value={k}>{k}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {limitReached && (
                  <div className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs text-destructive" data-testid="banner-limit-reached">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Εξαντλήσατε το μηνιαίο όριο ({FREE_LIMIT} χρήσεις). Αναβαθμίστε σε <strong>Pro</strong> για απεριόριστη πρόσβαση.</span>
                  </div>
                )}
                <Button type="submit" className="w-full gap-2" disabled={limitReached} data-testid="button-calculate">
                  <Calculator className="w-4 h-4" />
                  Υπολογισμός Κόστους
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 min-w-0">
        {!result && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Calculator className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Εκτίμηση Κόστους Κατασκευής</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Εισάγετε τα στοιχεία του έργου σας για να λάβετε εκτίμηση κόστους βάσει τρεχουσών τιμών αγοράς στην Ελλάδα.
            </p>
            <div className="grid grid-cols-2 gap-3 text-xs max-w-sm w-full">
              {[
                "Κόστος κατασκευής",
                "Κόστος αδειοδότησης",
                "Αμοιβές μηχανικών",
                "Σύνολο επένδυσης",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 p-2 rounded-md bg-card border border-card-border">
                  <Euro className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 h-full overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Ελάχιστο κόστος</p>
                  <p className="text-xl font-bold text-foreground" data-testid="text-min-cost">{formatEuro(result.minTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatEuro(result.minCostPerSqm)}/τ.μ.</p>
                </CardContent>
              </Card>
              <Card className="border-primary ring-1 ring-primary">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Εκτίμηση κόστους</p>
                  <p className="text-xl font-bold text-primary" data-testid="text-mid-cost">{formatEuro(result.midTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatEuro(Math.round((result.minCostPerSqm + result.maxCostPerSqm) / 2))}/τ.μ.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Μέγιστο κόστος</p>
                  <p className="text-xl font-bold text-foreground" data-testid="text-max-cost">{formatEuro(result.maxTotal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatEuro(result.maxCostPerSqm)}/τ.μ.</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ανάλυση Κόστους</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <CostBar
                  label={`Κατασκευή (${result.area} τ.μ.)`}
                  min={result.minTotal}
                  max={result.maxTotal}
                  className="bg-primary"
                />
                <CostBar
                  label="Αμοιβές μηχανικών (~6%)"
                  min={Math.round(result.engineeringCost * 0.85)}
                  max={Math.round(result.engineeringCost * 1.15)}
                  className="bg-chart-2"
                />
                <CostBar
                  label="Κόστος αδειοδότησης"
                  min={Math.round(result.permitCost * 0.85)}
                  max={Math.round(result.permitCost * 1.25)}
                  className="bg-chart-3"
                />
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Συνολικό κόστος επένδυσης</span>
                  <span className="text-base font-bold text-primary" data-testid="text-grand-total">
                    {formatEuro(result.grandMinTotal)} – {formatEuro(result.grandMaxTotal)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Παράμετροι Υπολογισμού</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Εμβαδόν", value: `${result.area} τ.μ.` },
                    { label: "Τύπος", value: result.constructionType },
                    { label: "Περιοχή", value: REGION_MULTIPLIERS[result.region]?.label },
                    { label: "Ενέργεια", value: result.energyClass.split(" ")[0] },
                    { label: "Ποιότητα", value: QUALITY_MULTIPLIERS[result.quality]?.label },
                    { label: "Βάση €/τ.μ.", value: `${BASE_COSTS[result.constructionType]} €` },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs py-1 border-b border-border last:border-0">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    Οι εκτιμήσεις βασίζονται σε μέσες τιμές αγοράς 2024-2025 και είναι ενδεικτικές. Το τελικό κόστος επηρεάζεται από το έδαφος, την πολυπλοκότητα σχεδιασμού, τη διαθεσιμότητα υλικών και εργατικής δύναμης. Συνιστάται λήψη προσφορών από εργολάβους.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" size="sm" onClick={() => { setResult(null); form.reset(); }} className="gap-2" data-testid="button-reset-estimator">
              <RotateCcw className="w-4 h-4" />
              Νέος Υπολογισμός
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
