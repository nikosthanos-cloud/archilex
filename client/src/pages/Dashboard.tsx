import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2, Send, Loader2, LogOut, MessageSquare, History,
  Crown, User, ChevronRight, Sparkles, AlertCircle, FileImage,
  ClipboardList, Calculator, Banknote, FolderKanban, ScrollText, CheckCircle, UserCog, ShieldCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarFooter,
} from "@/components/ui/sidebar";
import BlueprintAnalysis from "./BlueprintAnalysis";
import PermitChecklist from "./PermitChecklist";
import CostEstimator from "./CostEstimator";
import TeeCalculator from "./TeeCalculator";
import Projects from "./Projects";
import TechnicalReports from "./TechnicalReports";
import ProfileSettings from "./ProfileSettings";

interface Question {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

type View = "chat" | "blueprint" | "checklist" | "estimator" | "tee" | "projects" | "reports" | "history" | "profile";

const EXAMPLE_QUESTIONS = [
  "Ποια είναι η διαδικασία έκδοσης οικοδομικής άδειας για νέα κατοικία;",
  "Ποιες είναι οι απαιτήσεις για ενεργειακή πιστοποίηση κτιρίου;",
  "Πώς μπορώ να τακτοποιήσω αυθαίρετη κατασκευή;",
  "Ποιος είναι ο μέγιστος συντελεστής δόμησης σε πολεοδομημένες περιοχές;",
];

const professionLabels: Record<string, string> = {
  architect: "Αρχιτέκτονας",
  civil_engineer: "Πολιτικός Μηχανικός",
  mechanical_engineer: "Μηχανολόγος Μηχανικός",
  electrical_engineer: "Ηλεκτρολόγος Μηχανικός",
  other: "Μηχανικός",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const NAV_ITEMS: { view: View; icon: typeof MessageSquare; label: string }[] = [
  { view: "chat", icon: MessageSquare, label: "AI Βοηθός" },
  { view: "blueprint", icon: FileImage, label: "Σχέδια & Κατόψεις" },
  { view: "checklist", icon: ClipboardList, label: "Λίστα Δικαιολογητικών" },
  { view: "estimator", icon: Calculator, label: "Εκτίμηση Κόστους" },
  { view: "tee", icon: Banknote, label: "Αμοιβές ΤΕΕ" },
  { view: "projects", icon: FolderKanban, label: "Έργα" },
  { view: "reports", icon: ScrollText, label: "Τεχνικές Εκθέσεις" },
  { view: "history", icon: History, label: "Ιστορικό" },
  { view: "profile", icon: UserCog, label: "Προφίλ" },
];

const PLAN_LIMITS: Record<string, number | null> = {
  free: 10,
  starter: 50,
  professional: 200,
  unlimited: null,
  pro: null,
};

const PLAN_LABELS: Record<string, string> = {
  free: "Δωρεάν",
  starter: "Starter",
  professional: "Professional",
  unlimited: "Unlimited",
  pro: "Pro",
};

const UPGRADE_PLANS = [
  {
    key: "starter",
    name: "Starter",
    price: "€19",
    period: "/μήνα",
    description: "Για ελεύθερους επαγγελματίες",
    features: ["50 χρήσεις / μήνα", "Πρόσβαση σε όλα τα εργαλεία", "Εξαγωγή PDF"],
    highlighted: false,
  },
  {
    key: "professional",
    name: "Professional",
    price: "€49",
    period: "/μήνα",
    description: "Για ενεργά γραφεία μηχανικών",
    features: ["200 χρήσεις / μήνα", "Πρόσβαση σε όλα τα εργαλεία", "Εξαγωγή PDF & Word", "Υποστήριξη προτεραιότητας"],
    highlighted: true,
  },
  {
    key: "unlimited",
    name: "Unlimited",
    price: "€99",
    period: "/μήνα",
    description: "Για μεγάλες εταιρίες & γραφεία",
    features: ["Απεριόριστες χρήσεις", "Πρόσβαση σε όλα τα εργαλεία", "Εξαγωγή PDF & Word", "Υποστήριξη προτεραιότητας", "Πρώτη πρόσβαση σε νέες λειτουργίες"],
    highlighted: false,
  },
];

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [question, setQuestion] = useState("");
  const [activeView, setActiveView] = useState<View>("chat");
  const [currentMessages, setCurrentMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: historyData, isLoading: historyLoading } = useQuery<{ questions: Question[] }>({
    queryKey: ["/api/questions/history"],
  });

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", "/api/questions/ask", { question: q });
      const data = await res.json();
      if (!res.ok) throw { message: data.error, limitReached: data.limitReached };
      return data.question as Question;
    },
    onSuccess: (q) => {
      setCurrentMessages((prev) => [...prev, { role: "ai", text: q.answer }]);
      queryClient.invalidateQueries({ queryKey: ["/api/questions/history"] });
      refreshUser();
    },
    onError: (err: any) => {
      if (err.limitReached) {
        setCurrentMessages((prev) => [...prev, { role: "ai", text: "LIMIT:" + err.message }]);
      } else {
        toast({ title: "Σφάλμα", description: err.message, variant: "destructive" });
      }
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/subscription/upgrade", { plan });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data.user;
    },
    onSuccess: (_data, plan) => {
      refreshUser();
      setShowUpgradeDialog(false);
      toast({ title: "Αναβάθμιση επιτυχής!", description: `Μεταβήκατε στο πλάνο ${PLAN_LABELS[plan] || plan}.` });
    },
    onError: (err: any) => {
      toast({ title: "Σφάλμα", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages, askMutation.isPending]);

  function handleSend() {
    if (!question.trim() || askMutation.isPending) return;
    const q = question.trim();
    setQuestion("");
    setCurrentMessages((prev) => [...prev, { role: "user", text: q }]);
    askMutation.mutate(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const planLimit = user ? (PLAN_LIMITS[user.plan] ?? null) : null;
  const isLimitedPlan = planLimit !== null;
  const usesUsed = isLimitedPlan ? Math.min(planLimit!, user?.usesThisMonth || 0) : null;
  const usesLeft = isLimitedPlan ? Math.max(0, planLimit! - (user?.usesThisMonth || 0)) : null;
  const canUpgrade = user?.plan !== "unlimited" && user?.plan !== "pro";
  const activeNavLabel = NAV_ITEMS.find((n) => n.view === activeView)?.label || "";
  const planLabel = user ? (PLAN_LABELS[user.plan] || user.plan) : "";

  return (
    <SidebarProvider style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base tracking-tight">ArchiLex</span>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Εργαλεία</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map(({ view, icon: Icon, label }) => (
                    <SidebarMenuItem key={view}>
                      <SidebarMenuButton
                        onClick={() => setActiveView(view)}
                        className={activeView === view ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""}
                        data-testid={`button-nav-${view}`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Πλάνο</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 py-3 rounded-md bg-sidebar-accent/50 mx-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">{planLabel} Πλάνο</span>
                    <Badge variant={isLimitedPlan ? "secondary" : "default"} className="text-xs" data-testid="badge-plan">
                      {isLimitedPlan ? planLabel : <><Crown className="w-2.5 h-2.5 mr-1" />{planLabel}</>}
                    </Badge>
                  </div>
                  {isLimitedPlan ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-1">
                        <span className="font-semibold text-sidebar-foreground" data-testid="text-uses-used">{usesUsed}</span>
                        <span>/{planLimit} χρήσεις αυτόν τον μήνα</span>
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        <span className="font-semibold text-sidebar-foreground" data-testid="text-uses-left">{usesLeft}</span> απομένουν
                      </p>
                      <div className="h-1.5 bg-sidebar-border rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${(usesUsed || 0) >= planLimit! ? "bg-red-500" : (usesUsed || 0) >= planLimit! * 0.7 ? "bg-amber-500" : "bg-primary"}`}
                          style={{ width: `${((usesUsed || 0) / planLimit!) * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mb-3">Απεριόριστη πρόσβαση σε όλα τα εργαλεία</p>
                  )}
                  {canUpgrade && (
                    <Button size="sm" className="w-full gap-1" onClick={() => setShowUpgradeDialog(true)} data-testid="button-upgrade">
                      <Crown className="w-3 h-3" />
                      Αναβάθμιση
                    </Button>
                  )}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <Separator className="mb-3" />
            <div className="flex items-center gap-3 px-1 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate" data-testid="text-user-name">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.profession ? professionLabels[user.profession] : ""}</p>
              </div>
            </div>
            {user?.role === "admin" && (
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => setLocation("/admin")} data-testid="button-admin-panel">
                <ShieldCheck className="w-4 h-4" />
                Admin Panel
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={logout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              Αποσύνδεση
            </Button>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 min-w-0">
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="font-semibold text-sm">{activeNavLabel}</h1>
            </div>
            <div className="flex items-center gap-2">
              {!isLimitedPlan && (
                <Badge className="gap-1" data-testid="badge-plan-header">
                  <Crown className="w-3 h-3" />
                  {planLabel}
                </Badge>
              )}
            </div>
          </header>

          {/* ── AI Chat ── */}
          {activeView === "chat" && (
            <div className="flex flex-col flex-1 min-h-0">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                  {currentMessages.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-7 h-7 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold mb-2">Πώς μπορώ να σας βοηθήσω;</h2>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-8">
                        Κάντε οποιαδήποτε ερώτηση σχετικά με οικοδομικές άδειες και κατασκευαστικό δίκαιο στην Ελλάδα
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3 text-left">
                        {EXAMPLE_QUESTIONS.map((q) => (
                          <button
                            key={q}
                            onClick={() => setQuestion(q)}
                            className="p-3 rounded-md border border-border text-sm text-left hover-elevate bg-card text-card-foreground"
                            data-testid="button-example-question"
                          >
                            <ChevronRight className="w-3 h-3 text-primary inline mr-1" />
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentMessages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.role}-${i}`}>
                      {msg.role === "ai" && (
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className={`max-w-[80%] rounded-md px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-card-border text-card-foreground"}`}>
                        {msg.text.startsWith("LIMIT:") ? (
                          <div className="flex gap-2 items-start">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-destructive mb-1">Όριο χρήσεων μηνός</p>
                              <p className="text-muted-foreground text-xs">{msg.text.replace("LIMIT:", "")}</p>
                              {canUpgrade && (
                                <Button size="sm" className="mt-3 gap-1" onClick={() => setShowUpgradeDialog(true)}>
                                  <Crown className="w-3 h-3" />
                                  Αναβάθμιση
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                          <User className="w-4 h-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {askMutation.isPending && (
                    <div className="flex gap-3 justify-start" data-testid="message-loading">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                        <Building2 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-card border border-card-border rounded-md px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Αναζήτηση στη νομοθεσία...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-border p-4 bg-background shrink-0">
                <div className="max-w-3xl mx-auto">
                  {isLimitedPlan && usesLeft === 0 && (
                    <div className="mb-3 p-3 rounded-md bg-destructive/10 border border-destructive/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Εξαντλήσατε το μηνιαίο όριο των {planLimit} χρήσεων</span>
                      </div>
                      {canUpgrade && (
                        <Button size="sm" onClick={() => setShowUpgradeDialog(true)} className="shrink-0 gap-1">
                          <Crown className="w-3 h-3" />
                          Αναβάθμιση
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <Textarea
                      placeholder="Γράψτε την ερώτησή σας εδώ... (Enter για αποστολή)"
                      className="resize-none min-h-[48px] max-h-32 text-sm"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={askMutation.isPending}
                      data-testid="input-question"
                    />
                    <Button size="icon" onClick={handleSend} disabled={!question.trim() || askMutation.isPending} data-testid="button-send">
                      {askMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                  {isLimitedPlan && usesLeft !== null && usesLeft > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 text-right" data-testid="text-uses-remaining">
                      {usesLeft} από {planLimit} χρήσεις απομένουν αυτόν τον μήνα
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Blueprint Analysis ── */}
          {activeView === "blueprint" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <BlueprintAnalysis />
            </div>
          )}

          {/* ── Permit Checklist ── */}
          {activeView === "checklist" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <PermitChecklist />
            </div>
          )}

          {/* ── Cost Estimator ── */}
          {activeView === "estimator" && (
            <div className="flex-1 min-h-0 overflow-auto">
              <CostEstimator />
            </div>
          )}

          {/* ── TEE Fee Calculator ── */}
          {activeView === "tee" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <TeeCalculator />
            </div>
          )}

          {/* ── Projects ── */}
          {activeView === "projects" && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <Projects />
            </div>
          )}

          {/* ── Technical Reports ── */}
          {activeView === "reports" && (
            <div className="flex-1 min-h-0 overflow-hidden p-4">
              <TechnicalReports />
            </div>
          )}

          {/* ── Profile Settings ── */}
          {activeView === "profile" && (
            <div className="flex-1 min-h-0 overflow-auto">
              <ProfileSettings />
            </div>
          )}

          {/* ── History ── */}
          {activeView === "history" && (
            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto px-4 py-6">
                <h2 className="text-lg font-semibold mb-4">Ιστορικό Ερωτήσεων</h2>
                {historyLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Φόρτωση...</span>
                  </div>
                )}
                {!historyLoading && historyData?.questions.length === 0 && (
                  <div className="text-center py-12">
                    <History className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Δεν έχετε κάνει ερωτήσεις ακόμα</p>
                    <Button variant="outline" size="sm" className="mt-4" onClick={() => setActiveView("chat")}>
                      Κάντε την πρώτη σας ερώτηση
                    </Button>
                  </div>
                )}
                <div className="space-y-4">
                  {historyData?.questions.map((q) => (
                    <Card key={q.id} data-testid={`card-history-${q.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-secondary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-relaxed">{q.question}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(q.createdAt)}</p>
                          </div>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <Building2 className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{q.answer}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ── Upgrade Dialog ── */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Αναβαθμίστε το Πλάνο σας</DialogTitle>
            <DialogDescription>
              Επιλέξτε το πλάνο που ταιριάζει στις ανάγκες σας
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-3 gap-4 mt-2">
            {UPGRADE_PLANS.filter((p) => p.key !== user?.plan).map((plan) => (
              <div
                key={plan.key}
                className={`rounded-lg border p-4 flex flex-col ${plan.highlighted ? "border-primary ring-2 ring-primary bg-primary/5" : "border-border"}`}
                data-testid={`upgrade-option-${plan.key}`}
              >
                {plan.highlighted && (
                  <Badge className="self-start mb-2 gap-1 text-xs">Δημοφιλές</Badge>
                )}
                <h3 className="font-semibold text-base">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1 mb-1">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-xs">{plan.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                <ul className="space-y-1.5 mb-4 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full gap-1"
                  onClick={() => upgradeMutation.mutate(plan.key)}
                  disabled={upgradeMutation.isPending}
                  data-testid={`button-select-plan-${plan.key}`}
                >
                  {upgradeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                  Επιλογή {plan.name}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
