import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend, ArcElement
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, TrendingUp, UserCheck, UserX, LayoutDashboard,
  BarChart3, Building2, LogOut, MoreHorizontal, CreditCard,
  History, Trash2, ShieldAlert, Euro
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

type AdminSection = "dashboard" | "users" | "payments" | "analytics";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  inactiveUsers: number;
  recentSignups: number;
  monthlyRevenue: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  plan: string;
  usesThisMonth: number;
  createdAt: string;
  lastLoginAt: string | null;
  role: string;
}

interface Payment {
  id: string;
  userId: string;
  stripePaymentId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Δωρεάν",
  starter: "Starter",
  professional: "Professional",
  unlimited: "Unlimited",
};

const PLAN_LIMITS: Record<string, number> = {
  free: 10,
  starter: 50,
  professional: 200,
  unlimited: 999999,
};

const PLAN_VARIANTS: Record<string, string> = {
  free: "bg-slate-100 text-slate-700 border-slate-200",
  starter: "bg-blue-100 text-blue-700 border-blue-200",
  professional: "bg-emerald-100 text-emerald-700 border-emerald-200",
  unlimited: "bg-amber-100 text-amber-700 border-amber-200 border-2",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

const NAV_ITEMS: { section: AdminSection; icon: any; label: string }[] = [
  { section: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { section: "users", icon: Users, label: "Χρήστες" },
  { section: "payments", icon: CreditCard, label: "Πληρωμές" },
  { section: "analytics", icon: BarChart3, label: "Αναλυτικά" },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newPlan, setNewPlan] = useState("");

  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery<{ payments: Payment[] }>({
    queryKey: ["/api/admin/payments"],
    enabled: activeSection === "payments" || activeSection === "dashboard",
  });

  const { data: historyData } = useQuery<{ questions: any[] }>({
    queryKey: [`/api/admin/users/${selectedUser?.id}/questions`],
    enabled: !!selectedUser && isHistoryDialogOpen,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/plan`, { plan });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsPlanDialogOpen(false);
      toast({ title: "Επιτυχία", description: "Το πλάνο ενημερώθηκε" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsDeleteOpen(false);
      toast({ title: "Επιτυχία", description: "Ο χρήστης διαγράφηκε" });
    }
  });

  const allUsers = usersData?.users ?? [];
  const allPayments = paymentsData?.payments ?? [];

  // ── Charts Data ──
  const planDistribution = {
    labels: Object.values(PLAN_LABELS),
    datasets: [{
      data: Object.keys(PLAN_LABELS).map(k => allUsers.filter(u => u.plan === k).length),
      backgroundColor: ["#cbd5e1", "#60a5fa", "#34d399", "#fbbf24"],
    }]
  };

  const revenue30Days = {
    labels: Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toLocaleDateString("el-GR", { day: "numeric" });
    }),
    datasets: [{
      label: "Έσοδα (€)",
      data: Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        const next = new Date(d);
        next.setDate(next.getDate() + 1);
        return allPayments
          .filter(p => {
            const pd = new Date(p.createdAt);
            return pd >= d && pd < next;
          })
          .reduce((acc, p) => acc + (p.amount / 100), 0);
      }),
      backgroundColor: "rgba(52, 211, 153, 0.6)",
      borderColor: "#10b981",
      borderWidth: 1,
    }]
  };

  return (
    <div className="flex h-screen w-full bg-[#f8fafc]">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white shadow-sm flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="font-extrabold text-lg tracking-tight text-slate-900">ArchiLex</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">ADMIN CONSOLE</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ section, icon: Icon, label }) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeSection === section
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-slate-600" onClick={() => setLocation("/dashboard")}>
            <LayoutDashboard className="w-5 h-5" /> Κύρια εφαρμογή
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => logout()}>
            <LogOut className="w-5 h-5" /> Αποσύνδεση
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-slate-200 sticky top-0 z-10">
          <h1 className="font-bold text-xl text-slate-800">
            {activeSection === "dashboard" && "Dashboard Επισκόπηση"}
            {activeSection === "users" && "Διαχείριση Χρηστών"}
            {activeSection === "payments" && "Ιστορικό Πληρωμών"}
            {activeSection === "analytics" && "Αναλυτικά Στοιχεία"}
          </h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Λειτουργία Διαχειριστή
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* ── Dashboard Section ── */}
          {activeSection === "dashboard" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: "Συνολικοί Χρήστες", value: stats?.totalUsers, icon: Users, color: "blue" },
                  { label: "Ενεργές Συνδρομές", value: stats?.activeSubscriptions, icon: UserCheck, color: "emerald" },
                  { label: "Έσοδα Μήνα", value: stats?.monthlyRevenue ? `€${stats.monthlyRevenue.toFixed(2)}` : "€0.00", icon: Euro, color: "amber" },
                  { label: "Νέοι Χρήστες (7ημ)", value: stats?.recentSignups, icon: TrendingUp, color: "indigo" },
                ].map((s, idx) => (
                  <Card key={idx} className="border-none shadow-sm overflow-hidden group">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{s.label}</p>
                          <p className="text-3xl font-black text-slate-900">{statsLoading ? "—" : s.value}</p>
                        </div>
                        <div className={`p-4 rounded-2xl bg-${s.color}-50 text-${s.color}-600 group-hover:scale-110 transition-transform`}>
                          <s.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Πρόσφατες Πληρωμές</CardTitle>
                    <CardDescription>Οι 10 τελευταίες συναλλαγές μέσω Stripe</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Χρήστης (ID)</TableHead>
                          <TableHead>Πλάνο</TableHead>
                          <TableHead>Ποσό</TableHead>
                          <TableHead>Ημερομηνία</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsLoading ? (
                          <TableRow><TableCell colSpan={4} className="h-40 text-center">Φόρτωση...</TableCell></TableRow>
                        ) : allPayments.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="h-40 text-center">Δεν βρέθηκαν πληρωμές</TableCell></TableRow>
                        ) : allPayments.slice(0, 5).map(p => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-[10px]">{p.userId.slice(0, 8)}...</TableCell>
                            <TableCell><Badge className={PLAN_VARIANTS[p.plan]}>{PLAN_LABELS[p.plan]}</Badge></TableCell>
                            <TableCell className="font-bold text-emerald-600">€{(p.amount / 100).toFixed(2)}</TableCell>
                            <TableCell className="text-slate-500 italic">{formatDate(p.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Κατανομή Πλάνων</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <div className="h-48 w-48 mb-6">
                      <Pie data={planDistribution} options={{ plugins: { legend: { display: false } } }} />
                    </div>
                    <div className="w-full space-y-2">
                      {Object.entries(PLAN_LABELS).map(([key, label], idx) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: planDistribution.datasets[0].backgroundColor[idx] }} />
                            <span className="font-medium text-slate-600">{label}</span>
                          </div>
                          <span className="font-bold">{allUsers.filter(u => u.plan === key).length}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Users Section ── */}
          {activeSection === "users" && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Πλήρης Κατάλογος Χρηστών</CardTitle>
                <CardDescription>Διαχείριση συνδρομών και έλεγχος ιστορικού</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead className="w-[200px]">Ονοματεπώνυμο</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Πλάνο</TableHead>
                      <TableHead>Χρήση Μήνα</TableHead>
                      <TableHead>Εγγραφή</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-60 text-center">Φόρτωση...</TableCell></TableRow>
                    ) : allUsers.map(u => {
                      const limit = PLAN_LIMITS[u.plan] || 1;
                      const usagePercent = Math.min((u.usesThisMonth / limit) * 100, 100);
                      return (
                        <TableRow key={u.id}>
                          <TableCell className="font-bold text-slate-900">
                            {u.fullName}
                            {u.role === "admin" && <Badge className="ml-2 bg-slate-900 text-white border-none">Admin</Badge>}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">{u.email}</TableCell>
                          <TableCell><Badge variant="outline" className={`font-bold ${PLAN_VARIANTS[u.plan]}`}>{PLAN_LABELS[u.plan]}</Badge></TableCell>
                          <TableCell className="w-[180px]">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span>{u.usesThisMonth} / {limit === 999999 ? "∞" : limit}</span>
                                <span>{Math.round(usagePercent)}%</span>
                              </div>
                              <Progress value={usagePercent} className={`h-1.5 ${usagePercent > 90 ? "bg-red-100 [&>div]:bg-red-500" : ""}`} />
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs">{formatDate(u.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl items-center">
                                <DropdownMenuLabel>Διαχείριση</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setNewPlan(u.plan); setIsPlanDialogOpen(true); }}>
                                  <CreditCard className="mr-2 h-4 w-4" /> Αλλαγή Πλάνου
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedUser(u); setIsHistoryDialogOpen(true); }}>
                                  <History className="mr-2 h-4 w-4" /> Ιστορικό Ερωτήσεων
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => { setSelectedUser(u); setIsDeleteOpen(true); }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Διαγραφή Χρήστη
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Payments Section ── */}
          {activeSection === "payments" && (
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Ιστορικό Πληρωμών</CardTitle>
                <CardDescription>Επιτυχημένες συναλλαγές από την αρχή λειτουργίας</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow>
                      <TableHead>ID Συναλλαγής</TableHead>
                      <TableHead>Χρήστης (ID)</TableHead>
                      <TableHead>Πλάνο</TableHead>
                      <TableHead>Ποσό</TableHead>
                      <TableHead>Ημερομηνία</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentsLoading ? (
                      <TableRow><TableCell colSpan={6} className="h-60 text-center">Φόρτωση...</TableCell></TableRow>
                    ) : allPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-slate-400">{p.stripePaymentId}</TableCell>
                        <TableCell className="font-mono text-xs italic">{p.userId.slice(0, 12)}...</TableCell>
                        <TableCell><Badge className={PLAN_VARIANTS[p.plan]}>{PLAN_LABELS[p.plan]}</Badge></TableCell>
                        <TableCell className="font-black text-slate-800">€{(p.amount / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{formatDate(p.createdAt)}</TableCell>
                        <TableCell><Badge variant="default" className="bg-emerald-500 text-white border-none">Ολοκληρώθηκε</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Analytics Section ── */}
          {activeSection === "analytics" && (
            <div className="space-y-8">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Έσοδα τελευταίων 30 ημερών</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Bar data={revenue30Days} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, grid: { color: "#f1f5f9" } }, x: { grid: { display: false } } }
                  }} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Νέοι Χρήστες ανά Εβδομάδα (12 εβδ)</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <Line data={{
                    labels: Array.from({ length: 12 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (11 - i) * 7);
                      return `W${12 - (11 - i)}`;
                    }),
                    datasets: [{
                      label: "Εγγραφές",
                      data: Array.from({ length: 12 }, (_, i) => {
                        const start = new Date();
                        start.setDate(start.getDate() - (11 - i) * 7 - 6);
                        const end = new Date(start);
                        end.setDate(start.getDate() + 7);
                        return allUsers.filter(u => {
                          const d = new Date(u.createdAt);
                          return d >= start && d < end;
                        }).length;
                      }),
                      borderColor: "#6366f1",
                      backgroundColor: "rgba(99, 102, 241, 0.1)",
                      fill: true,
                      tension: 0.4
                    }]
                  }} options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                  }} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* ── Dialogs ── */}

      {/* Change Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Αλλαγή Πλάνου</DialogTitle>
            <DialogDescription>
              Επιλέξτε το νέο πλάνο για τον χρήστη <strong>{selectedUser?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Επιλέξτε πλάνο" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(PLAN_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPlanDialogOpen(false)}>Ακύρωση</Button>
            <Button
              onClick={() => updatePlanMutation.mutate({ userId: selectedUser!.id, plan: newPlan })}
              disabled={updatePlanMutation.isPending}
            >
              Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Ιστορικό Ερωτήσεων AI</DialogTitle>
            <DialogDescription>
              Δείτε τις ερωτήσεις και τις απαντήσεις που έλαβε ο χρήστης <strong>{selectedUser?.fullName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4 pr-2">
            {historyData?.questions.length === 0 ? (
              <p className="text-center text-slate-500 py-10 italic">Δεν υπάρχει ιστορικό ερωτήσεων</p>
            ) : historyData?.questions.map((q: any) => (
              <div key={q.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                <p className="font-bold text-slate-900 text-sm">Ε: {q.question}</p>
                <Separator className="bg-slate-200" />
                <p className="text-slate-600 text-sm whitespace-pre-wrap">Α: {q.answer}</p>
                <p className="text-[10px] text-slate-400 italic">{formatDate(q.createdAt)}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600">Οριστική Διαγραφή Χρήστη</DialogTitle>
            <DialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη <strong>{selectedUser?.fullName}</strong>;
              Αυτή η ενέργεια είναι μόνιμη και θα διαγράψει και όλα τα δεδομένα του (έργα, ερωτήσεις, αρχεία).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Ακύρωση</Button>
            <Button
              variant="destructive"
              className="rounded-xl px-6"
              onClick={() => deleteUserMutation.mutate(selectedUser!.id)}
              disabled={deleteUserMutation.isPending}
            >
              Διαγραφή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
