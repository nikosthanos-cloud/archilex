import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Scale, FileText, CheckCircle, MessageSquare, Shield, Zap, ArrowRight, Star } from "lucide-react";

const features = [
  {
    icon: Scale,
    title: "Νομική Τεκμηρίωση",
    description: "Άμεσες απαντήσεις βάσει του ελληνικού κτιριοδομικού νόμου, ΓΟΚ, ΝΟΚ και της ισχύουσας νομοθεσίας.",
  },
  {
    icon: FileText,
    title: "Οικοδομικές Άδειες",
    description: "Καθοδήγηση για διαδικασίες αδειοδότησης, απαιτούμενα δικαιολογητικά και αρμόδιες αρχές.",
  },
  {
    icon: Building2,
    title: "Τεχνικές Προδιαγραφές",
    description: "Πληροφορίες για αντισεισμικό κανονισμό, ενεργειακή απόδοση (ΚΕΝΑΚ) και τεχνικά πρότυπα.",
  },
  {
    icon: Shield,
    title: "Αυθαίρετα & Τακτοποίηση",
    description: "Ενημέρωση για ρυθμίσεις αυθαίρετων κατασκευών και διαδικασίες τακτοποίησης.",
  },
];

const plans = [
  {
    name: "Δωρεάν",
    price: "€0",
    period: "/μήνα",
    description: "Ιδανικό για να ξεκινήσετε",
    features: [
      "5 ερωτήσεις / μήνα",
      "AI βοηθός Claude",
      "Ιστορικό ερωτήσεων",
      "Υποστήριξη μέσω email",
    ],
    cta: "Ξεκινήστε Δωρεάν",
    variant: "outline" as const,
    highlighted: false,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/μήνα",
    description: "Για επαγγελματίες",
    features: [
      "Απεριόριστες ερωτήσεις",
      "AI βοηθός Claude Opus",
      "Ιστορικό ερωτήσεων",
      "Προτεραιότητα απόκρισης",
      "Εξειδικευμένη υποστήριξη",
    ],
    cta: "Αναβαθμίστε σε Pro",
    variant: "default" as const,
    highlighted: true,
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
              Άμεσες, αξιόπιστες απαντήσεις σε ερωτήσεις κτιριοδομικού δικαίου. Βασισμένο στην ελληνική νομοθεσία, ειδικά σχεδιασμένο για αρχιτέκτονες και μηχανικούς.
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
              <span>Αυθαίρετα & Τακτοποίηση</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ό,τι χρειάζεστε για την καθημερινή εργασία σας</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Εξειδικευμένος AI βοηθός που απαντά άμεσα σε τεχνικές και νομικές ερωτήσεις
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="hover-elevate" data-testid={`card-feature-${feature.title}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
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
              { step: "01", icon: MessageSquare, title: "Κάντε μια ερώτηση", desc: "Γράψτε ελεύθερα την ερώτησή σας στα ελληνικά" },
              { step: "02", icon: Zap, title: "Επεξεργασία AI", desc: "Το Claude αναλύει και αναζητά στη νομοθεσία" },
              { step: "03", icon: CheckCircle, title: "Λάβετε απάντηση", desc: "Λεπτομερής απάντηση βάσει ισχύουσας νομοθεσίας" },
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
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlighted ? "border-primary ring-1 ring-primary" : ""}
              data-testid={`card-plan-${plan.name}`}
            >
              <CardHeader className="pb-4">
                {plan.highlighted && (
                  <div className="flex justify-end mb-2">
                    <Badge className="gap-1">
                      <Star className="w-3 h-3" />
                      Δημοφιλές
                    </Badge>
                  </div>
                )}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm">{plan.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button variant={plan.variant} className="w-full" data-testid={`button-plan-${plan.name}`}>
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
            © 2025 ArchiLex. Για επαγγελματική χρήση από αρχιτέκτονες & μηχανικούς.
          </p>
        </div>
      </footer>
    </div>
  );
}
