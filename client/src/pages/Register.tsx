import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const registerSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες"),
  fullName: z.string().min(2, "Εισάγετε το ονοματεπώνυμό σας"),
  profession: z.enum(["architect", "civil_engineer", "mechanical_engineer", "electrical_engineer", "other"]),
});

type RegisterForm = z.infer<typeof registerSchema>;

const professionLabels: Record<string, string> = {
  architect: "Αρχιτέκτονας",
  civil_engineer: "Πολιτικός Μηχανικός",
  mechanical_engineer: "Μηχανολόγος Μηχανικός",
  electrical_engineer: "Ηλεκτρολόγος Μηχανικός",
  other: "Άλλο",
};

export default function Register() {
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      profession: "architect",
    },
  });

  async function onSubmit(values: RegisterForm) {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", values);
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Σφάλμα", description: data.error, variant: "destructive" });
        return;
      }
      await refreshUser();
      setLocation("/dashboard");
    } catch {
      toast({ title: "Σφάλμα σύνδεσης", description: "Παρακαλώ δοκιμάστε ξανά", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">ArchiLex</span>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl">Δημιουργία Λογαριασμού</CardTitle>
            <CardDescription>
              Εγγραφείτε δωρεάν και αποκτήστε πρόσβαση στον AI βοηθό σας
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ονοματεπώνυμο</FormLabel>
                      <FormControl>
                        <Input placeholder="Γιώργος Παπαδόπουλος" data-testid="input-fullName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" data-testid="input-email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ειδικότητα</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-profession">
                            <SelectValue placeholder="Επιλέξτε ειδικότητα" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(professionLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value} data-testid={`option-profession-${value}`}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Κωδικός</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Τουλάχιστον 8 χαρακτήρες" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-register">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Δημιουργία Λογαριασμού
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Έχετε ήδη λογαριασμό;{" "}
              <Link href="/login" className="text-primary font-medium">
                Συνδεθείτε
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
