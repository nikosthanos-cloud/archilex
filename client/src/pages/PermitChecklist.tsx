import { useState } from "react";
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
import { Loader2, FileText, CheckSquare, ClipboardList, Building2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

export default function PermitChecklist() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checklist, setChecklist] = useState<string | null>(null);

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
    } catch (err: any) {
      toast({ title: "Σφάλμα", description: err.message || "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setLoading(false);
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
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid={`switch-${item.name}`}
                            />
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
              {[
                "Τοπογραφικά & τίτλοι",
                "Αρχιτεκτονικές μελέτες",
                "Στατική μελέτη",
                "Η/Μ εγκαταστάσεις",
                "Ενεργειακή μελέτη",
                "Ειδικές εγκρίσεις",
              ].map((item) => (
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Κατάλογος Δικαιολογητικών</CardTitle>
                  <CardDescription className="text-xs mt-1">Βάσει Ν. 4495/2017 και ισχύουσων διατάξεων</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="secondary">Εξατομικευμένο</Badge>
                  <Button variant="outline" size="sm" onClick={() => setChecklist(null)} data-testid="button-reset-checklist">
                    Νέα Λίστα
                  </Button>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <ScrollArea className="flex-1">
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
