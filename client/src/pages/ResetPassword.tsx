import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const resetPasswordSchema = z.object({
    password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Οι κωδικοί δεν ταιριάζουν",
    path: ["confirmPassword"],
});

export default function ResetPassword() {
    const { toast } = useToast();
    const [, setLocation] = useLocation();
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            toast({
                variant: "destructive",
                title: "Σφάλμα",
                description: "Λείπει το token επαλήθευσης.",
            });
            setLocation("/login");
        }
    }, [token, setLocation, toast]);

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof resetPasswordSchema>) {
        if (!token) return;
        setIsLoading(true);
        try {
            await apiRequest("POST", "/api/auth/reset-password", {
                token,
                password: values.password
            });
            setIsSuccess(true);
            toast({
                title: "Επιτυχία",
                description: "Ο κωδικός σας ενημερώθηκε επιτυχώς.",
            });
            setTimeout(() => setLocation("/login"), 3000);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Σφάλμα",
                description: error.message || "Κάτι πήγε στραβά.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Link href="/">
                        <a className="flex items-center gap-2 text-2xl font-bold text-primary italic">
                            ArchiLex
                        </a>
                    </Link>
                </div>

                <Card className="border-none shadow-xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl font-bold">Νέος Κωδικός</CardTitle>
                        <CardDescription>
                            {isSuccess
                                ? "Ο κωδικός σας άλλαξε. Μεταφέρεστε στη σελίδα σύνδεσης..."
                                : "Εισάγετε τον νέο επιθυμητό κωδικό πρόσβασης."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isSuccess ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Νέος Κωδικός</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input type="password" className="pl-10" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Επιβεβαίωση Κωδικού</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input type="password" className="pl-10" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Ενημέρωση Κωδικού
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <div className="text-center py-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <p className="text-slate-600 mb-6 font-medium">
                                    Η αλλαγή ολοκληρώθηκε!
                                </p>
                                <Link href="/login">
                                    <Button className="w-full">
                                        Σύνδεση τώρα
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
