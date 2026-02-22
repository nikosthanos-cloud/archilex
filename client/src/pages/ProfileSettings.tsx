import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { updateProfileSchema } from "@shared/schema";

type ProfileForm = z.infer<typeof updateProfileSchema>;

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<ProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      officeAddress: "",
      teeNumber: "",
      specialty: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        officeAddress: user.officeAddress ?? "",
        teeNumber: user.teeNumber ?? "",
        specialty: user.specialty ?? "",
      });
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json.user;
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: "Αποθηκεύτηκε", description: "Τα στοιχεία σας ενημερώθηκαν επιτυχώς." });
    },
    onError: (err: any) => {
      toast({ title: "Σφάλμα", description: err.message || "Αποτυχία ενημέρωσης.", variant: "destructive" });
    },
  });

  function onSubmit(data: ProfileForm) {
    saveMutation.mutate(data);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Προφίλ</h1>
          <p className="text-sm text-muted-foreground">Διαχειριστείτε τα προσωπικά σας στοιχεία</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Προσωπικά Στοιχεία</CardTitle>
              <CardDescription>Τα στοιχεία αυτά χρησιμοποιούνται στις Τεχνικές Εκθέσεις και στις Αμοιβές ΤΕΕ.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Όνομα *</FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. Γιώργος" data-testid="input-firstName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Επώνυμο *</FormLabel>
                      <FormControl>
                        <Input placeholder="π.χ. Παπαδόπουλος" data-testid="input-lastName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" data-testid="input-email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Τηλέφωνο Επικοινωνίας</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. 210 1234567" data-testid="input-phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="officeAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Διεύθυνση Γραφείου</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Ερμού 12, Αθήνα" data-testid="input-officeAddress" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <FormField
                control={form.control}
                name="teeNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Αριθμός Μητρώου ΤΕΕ</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. 123456" data-testid="input-teeNumber" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ειδικότητα</FormLabel>
                    <FormControl>
                      <Input placeholder="π.χ. Αρχιτέκτονας Μηχανικός" data-testid="input-specialty" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2" data-testid="button-save-profile">
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Αποθήκευση
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
