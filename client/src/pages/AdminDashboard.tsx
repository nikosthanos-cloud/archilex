import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Users, TrendingUp, UserCheck, UserX, LayoutDashboard,
  BarChart3, Building2, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

type AdminSection = "dashboard" | "users" | "analytics";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  inactiveUsers: number;
  recentSignups: number;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  plan: string;
  createdAt: string;
  lastLoginAt: string | null;
  role: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Δωρεάν",
  starter: "Starter",
  professional: "Professional",
  unlimited: "Unlimited",
  pro: "Pro",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("el-GR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function getSubscriptionStatus(user: AdminUser): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (user.plan !== "free") return { label: "Ενεργή", variant: "default" };
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const signupDate = new Date(user.createdAt);
  if (signupDate >= sevenDaysAgo) return { label: "Δοκιμαστική", variant: "secondary" };
  return { label: "Ανενεργή", variant: "outline" };
}

function buildDailyLoginsChart(users: AdminUser[]) {
  const days: string[] = [];
  const counts: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const label = d.toLocaleDateString("el-GR", { day: "numeric", month: "short" });
    const cnt = users.filter(u => {
      if (!u.lastLoginAt) return false;
      const t = new Date(u.lastLoginAt);
      return t >= d && t < next;
    }).length;
    days.push(label);
    counts.push(cnt);
  }
  return { days, counts };
}

function buildWeeklySignupsChart(users: AdminUser[]) {
  const weeks: string[] = [];
  const counts: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date();
    start.setDate(start.getDate() - i * 7 - start.getDay());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const label = start.toLocaleDateString("el-GR", { day: "numeric", month: "short" });
    const cnt = users.filter(u => {
      const t = new Date(u.createdAt);
      return t >= start && t < end;
    }).length;
    weeks.push(label);
    counts.push(cnt);
  }
  return { weeks, counts };
}

const NAV_ITEMS: { section: AdminSection; icon: typeof LayoutDashboard; label: string }[] = [
  { section: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { section: "users", icon: Users, label: "Χρήστες" },
  { section: "analytics", icon: BarChart3, label: "Αναλυτικά" },
];

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ["/api/admin/users"],
  });

  const allUsers = usersData?.users ?? [];

  const { days: loginDays, counts: loginCounts } = buildDailyLoginsChart(allUsers);
  const { weeks: signupWeeks, counts: signupCounts } = buildWeeklySignupsChart(allUsers);

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
      x: { ticks: { maxTicksLimit: 10, maxRotation: 45 } },
    },
  };

  function handleLogout() {
    logout();
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">ArchiLex</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ section, icon: Icon, label }) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                activeSection === section
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
              data-testid={`button-admin-nav-${section}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => setLocation("/dashboard")}
            data-testid="button-admin-back"
          >
            <LayoutDashboard className="w-4 h-4" />
            Κύρια εφαρμογή
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={handleLogout}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            Αποσύνδεση
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">
        <header className="h-14 flex items-center px-6 border-b border-border bg-background shrink-0">
          <h1 className="font-semibold text-sm">
            {activeSection === "dashboard" && "Dashboard"}
            {activeSection === "users" && "Διαχείριση Χρηστών"}
            {activeSection === "analytics" && "Αναλυτικά Στοιχεία"}
          </h1>
        </header>

        <div className="p-6">
          {/* ── Dashboard Section ── */}
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="stat-total-users">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Σύνολο Χρηστών</p>
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-3xl font-bold">
                      {statsLoading ? "—" : stats?.totalUsers ?? 0}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-active-subs">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ενεργές Συνδρομές</p>
                      <UserCheck className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      {statsLoading ? "—" : stats?.activeSubscriptions ?? 0}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-inactive-users">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Αδρανείς (+7 ημ.)</p>
                      <UserX className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-3xl font-bold text-amber-600">
                      {statsLoading ? "—" : stats?.inactiveUsers ?? 0}
                    </p>
                  </CardContent>
                </Card>

                <Card data-testid="stat-recent-signups">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Νέες Εγγραφές (7 ημ.)</p>
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {statsLoading ? "—" : stats?.recentSignups ?? 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Πρόσφατες Εγγραφές (τελευταίες 7 ημέρες)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Όνομα</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Εγγραφή</TableHead>
                        <TableHead>Πλάνο</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usersLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Φόρτωση...</TableCell>
                        </TableRow>
                      ) : allUsers.filter(u => {
                        const d = new Date(u.createdAt);
                        return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                      }).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Δεν υπάρχουν πρόσφατες εγγραφές</TableCell>
                        </TableRow>
                      ) : (
                        allUsers.filter(u => new Date(u.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).map(u => (
                          <TableRow key={u.id} data-testid={`row-recent-user-${u.id}`}>
                            <TableCell className="font-medium">{u.fullName}</TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                            <TableCell><Badge variant="secondary">{PLAN_LABELS[u.plan] ?? u.plan}</Badge></TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Users Section ── */}
          {activeSection === "users" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Όλοι οι Χρήστες</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Όνομα</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Εγγραφή</TableHead>
                      <TableHead>Τελευταία Σύνδεση</TableHead>
                      <TableHead>Κατάσταση Συνδρομής</TableHead>
                      <TableHead>Πλάνο</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Φόρτωση...</TableCell>
                      </TableRow>
                    ) : allUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Δεν βρέθηκαν χρήστες</TableCell>
                      </TableRow>
                    ) : (
                      allUsers.map(u => {
                        const status = getSubscriptionStatus(u);
                        return (
                          <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                            <TableCell className="font-medium">
                              {u.fullName}
                              {u.role === "admin" && (
                                <Badge variant="default" className="ml-2 text-xs">Admin</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{formatDate(u.lastLoginAt)}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{PLAN_LABELS[u.plan] ?? u.plan}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ── Analytics Section ── */}
          {activeSection === "analytics" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ημερήσιες Συνδέσεις (τελευταίες 30 ημέρες)</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Φόρτωση...</div>
                  ) : (
                    <Bar
                      data-testid="chart-daily-logins"
                      data={{
                        labels: loginDays,
                        datasets: [{
                          label: "Συνδέσεις",
                          data: loginCounts,
                          backgroundColor: "hsl(var(--primary) / 0.7)",
                          borderColor: "hsl(var(--primary))",
                          borderWidth: 1,
                          borderRadius: 4,
                        }],
                      }}
                      options={chartOptions}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Νέες Εγγραφές ανά Εβδομάδα (τελευταία 12 εβδομάδες)</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">Φόρτωση...</div>
                  ) : (
                    <Line
                      data-testid="chart-weekly-signups"
                      data={{
                        labels: signupWeeks,
                        datasets: [{
                          label: "Εγγραφές",
                          data: signupCounts,
                          borderColor: "hsl(var(--primary))",
                          backgroundColor: "hsl(var(--primary) / 0.1)",
                          pointBackgroundColor: "hsl(var(--primary))",
                          tension: 0.3,
                          fill: true,
                        }],
                      }}
                      options={chartOptions}
                    />
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Κατανομή Πλάνων</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? <p className="text-muted-foreground text-sm">Φόρτωση...</p> : (
                      <div className="space-y-2">
                        {Object.entries(PLAN_LABELS).map(([key, label]) => {
                          const cnt = allUsers.filter(u => u.plan === key).length;
                          if (cnt === 0) return null;
                          return (
                            <div key={key} className="flex items-center justify-between" data-testid={`stat-plan-${key}`}>
                              <span className="text-sm">{label}</span>
                              <Badge variant="secondary">{cnt}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Στατιστικά Δραστηριότητας</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {usersLoading ? <p className="text-muted-foreground text-sm">Φόρτωση...</p> : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Σύνδεση σήμερα</span>
                          <Badge variant="secondary">
                            {allUsers.filter(u => {
                              if (!u.lastLoginAt) return false;
                              const d = new Date(u.lastLoginAt);
                              const today = new Date();
                              return d.toDateString() === today.toDateString();
                            }).length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Σύνδεση τελευταίες 7 ημ.</span>
                          <Badge variant="secondary">
                            {allUsers.filter(u => {
                              if (!u.lastLoginAt) return false;
                              return new Date(u.lastLoginAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                            }).length}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Ποτέ δεν συνδέθηκαν</span>
                          <Badge variant="outline">
                            {allUsers.filter(u => !u.lastLoginAt).length}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
