import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Scale, FileText, CheckCircle, MessageSquare, Shield, Zap, ArrowRight,
  Star, ImageIcon, ClipboardList, Calculator, Banknote, FolderKanban, ScrollText,
  Crown,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Βοηθός",
    description: "Άμεσες απαντήσεις σε ερωτήσεις κτιριοδομικού δικαίου βάσει ελληνικής νομοθεσίας (Ν. 4495/2017, ΓΟΚ, ΝΟΚ). Ρωτήστε ελεύθερα στα ελληνικά.",
  },
  {
    icon: ImageIcon,
    title: "Σχέδια & Κατόψεις",
    description: "Ανεβάστε αρχιτεκτονικά σχέδια (JPG, PNG, PDF) και λάβετε αναλυτική έκθεση από το AI: περιγραφή χώρων, επιφάνειες, παρατηρήσεις συμμόρφωσης.",
  },
  {
    icon: ClipboardList,
    title: "Λίστα Δικαιολογητικών",
    description: "Δημιουργήστε εξατομικευμένη λίστα δικαιολογητικών για οικοδομική άδεια βάσει τύπου έργου, περιοχής και ιδιαιτεροτήτων. Εξαγωγή σε PDF.",
  },
  {
    icon: Calculator,
    title: "Εκτίμηση Κόστους",
    description: "Υπολογίστε το κόστος κατασκευής με βάση τιμές αγοράς 2024–2025. Αναλυτική κατανομή κατά κατηγορία εργασιών και εξαγωγή σε PDF.",
  },
  {
    icon: Banknote,
    title: "Αμοιβές ΤΕΕ",
    description: "Υπολογισμός ελάχιστων αμοιβών μηχανικού βάσει ΠΔ 696/1974 για αρχιτεκτονική, στατική, Η/Μ και ενεργειακή μελέτη, με ΦΠΑ.",
  },
  {
    icon: FolderKanban,
    title: "Έργα (Project Tracker)",
    description: "Παρακολουθήστε την πορεία οικοδομικών αδειών ανά έργο σε 5 στάδια. Καταχωρήστε σημειώσεις, προθεσμίες και εντοπίστε καθυστερήσεις.",
  },
  {
    icon: ScrollText,
    title: "Τεχνικές Εκθέσεις",
    description: "Δημιουργήστε επαγγελματικές τεχνικές εκθέσεις με AI: Αρχιτεκτονική Έκθεση, Σύνοψη Στατικής Μελέτης, Ενεργειακή Επιθεώρηση, Αυθαίρετα. Εξαγωγή PDF & Word.",
  },
];

const plans = [
  {
    name: "Δωρεάν",
    price: "€0",
    period: "/μήνα",
    description: "Ιδανικό για να ξεκινήσετε",
    features: [
      "10 χρήσεις / μήνα",
      "Πρόσβαση σε όλα τα εργαλεία",
      "AI βοηθός (Claude)",
      "Ιστορικό ερωτήσεων",
    ],
    cta: "Ξεκινήστε Δωρεάν",
    planKey: "free",
    variant: "outline" as const,
    highlighted: false,
    badge: null,
  },
  {
    name: "Starter",
    price: "€19",
    period: "/μήνα",
    description: "Για ελεύθερους επαγγελματίες",
    features: [
      "50 χρήσεις / μήνα",
      "Πρόσβαση σε όλα τα εργαλεία",
      "AI βοηθός (Claude)",
      "Εξαγωγή PDF",
      "Ιστορικό ερωτήσεων",
    ],
    cta: "Επιλογή Starter",
    planKey: "starter",
    variant: "outline" as const,
    highlighted: false,
    badge: null,
  },
  {
    name: "Professional",
    price: "€49",
    period: "/μήνα",
    description: "Για ενεργά γραφεία μηχανικών",
    features: [
      "200 χρήσεις / μήνα",
      "Πρόσβαση σε όλα τα εργαλεία",
      "AI βοηθός (Claude)",
      "Εξαγωγή PDF & Word",
      "Υποστήριξη προτεραιότητας",
    ],
    cta: "Επιλογή Professional",
    planKey: "professional",
    variant: "default" as const,
    highlighted: true,
    badge: "Δημοφιλές",
  },
  {
    name: "Unlimited",
    price: "€99",
    period: "/μήνα",
    description: "Για μεγάλες εταιρίες & γραφεία",
    features: [
      "Απεριόριστες χρήσεις",
      "Πρόσβαση σε όλα τα εργαλεία",
      "AI βοηθός (Claude)",
      "Εξαγωγή PDF & Word",
      "Υποστήριξη προτεραιότητας",
      "Πρώτη πρόσβαση σε νέες λειτουργίες",
    ],
    cta: "Επιλογή Unlimited",
    planKey: "unlimited",
    variant: "outline" as const,
    highlighted: false,
    badge: null,
  },
];

const professions = ["Αρχιτέκτονες", "Πολιτικοί Μηχανικοί", "Μηχανολόγοι Μηχανικοί", "Ηλεκτρολόγοι Μηχανικοί"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ArchiLex</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover-elevate px-2 py-1 rounded-md">Λειτουργίες</a>
            <a href="#pricing" className="hover-elevate px-2 py-1 rounded-md">Τιμολόγηση</a>
          </nav>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/login">
              <Button variant="ghost" size="sm" data-testid="button-login-header">Σύνδεση</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" data-testid="button-register-header">Εγγραφή</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-primary/4" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-36">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2 mb-6">
              {professions.map((p) => (
                <Badge key={p} variant="secondary" data-testid={`badge-profession-${p}`}>{p}</Badge>
              ))}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
              Ο AI Βοηθός για{" "}
              <span className="text-primary">Ελληνικές Οικοδομικές Άδειες</span>
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              Επτά εξειδικευμένα εργαλεία για αρχιτέκτονες και μηχανικούς — από ερωτήσεις νομοθεσίας ως τεχνικές εκθέσεις και εκτίμηση κόστους.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="gap-2" data-testid="button-get-started">
                  Ξεκινήστε Δωρεάν
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" data-testid="button-login-hero">
                  Έχω ήδη λογαριασμό
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Ν. 4495/2017 Αδειοδότηση</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>ΓΟΚ & ΝΟΚ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Αντισεισμικός Κανονισμός</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>ΚΕΝΑΚ & Ενεργειακή Απόδοση</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>ΠΔ 696/1974 Αμοιβές ΤΕΕ</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Όλα τα εργαλεία που χρειάζεστε</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Επτά εξειδικευμένες λειτουργίες σχεδιασμένες για την καθημερινή εργασία Ελλήνων μηχανικών
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title}`}>
              <CardContent className="p-6">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-muted/30 border-t border-b border-border py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Πώς λειτουργεί</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: MessageSquare, title: "Επιλέξτε εργαλείο", desc: "Επιλέξτε ένα από τα 7 εξειδικευμένα εργαλεία ανάλογα με την ανάγκη σας" },
              { step: "02", icon: Zap, title: "Εισάγετε τα στοιχεία", desc: "Γράψτε την ερώτησή σας ή συμπληρώστε τα στοιχεία του έργου σας" },
              { step: "03", icon: CheckCircle, title: "Λάβετε αποτέλεσμα", desc: "Λεπτομερείς απαντήσεις, εκθέσεις και υπολογισμοί σε δευτερόλεπτα" },
            ].map((item) => (
              <div key={item.step} className="text-center" data-testid={`step-${item.step}`}>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-mono text-primary font-bold mb-2">{item.step}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Απλή & Διαφανής Τιμολόγηση</h2>
          <p className="text-muted-foreground text-lg">Ξεκινήστε δωρεάν, αναβαθμίστε όταν χρειαστεί</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-primary ring-2 ring-primary relative" : "relative"}
              data-testid={`card-plan-${plan.name}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1 shadow-sm">
                    <Star className="w-3 h-3" />
                    {plan.badge}
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-4 pt-6">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-xs">{plan.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant={plan.variant} className="w-full" size="sm" data-testid={`button-plan-${plan.name}`}>
                    {plan.planKey !== "free" && <Crown className="w-3 h-3 mr-1" />}
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-bold text-sm">ArchiLex</span>
          </div>
          <p className="text-muted-foreground text-xs">
            © 2026 ArchiLex. Για επαγγελματική χρήση από αρχιτέκτονες & μηχανικούς.
          </p>
        </div>
      </footer>
    </div>
  );
}
