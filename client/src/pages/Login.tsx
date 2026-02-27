import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(1, "Εισάγετε τον κωδικό σας"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      await login(values.email, values.password);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Σφάλμα σύνδεσης", description: err.message || "Λάθος email ή κωδικός", variant: "destructive" });
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
            <CardTitle className="text-2xl">Σύνδεση</CardTitle>
            <CardDescription>
              Συνδεθείτε στον λογαριασμό σας για να συνεχίσετε
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Κωδικός</FormLabel>
                        <Link href="/forgot-password">
                          <a className="text-xs text-primary hover:underline">Ξεχάσατε τον κωδικό;</a>
                        </Link>
                      </div>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" data-testid="input-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-login">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Σύνδεση
                </Button>
              </form>
            </Form>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Δεν έχετε λογαριασμό;{" "}
              <Link href="/register" className="text-primary font-medium">
                Εγγραφείτε δωρεάν
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
