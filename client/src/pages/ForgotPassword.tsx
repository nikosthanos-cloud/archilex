import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const forgotPasswordSchema = z.object({
    email: z.string().email("Μη έγκυρο email"),
});

export default function ForgotPassword() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const form = useForm<z.infer<typeof forgotPasswordSchema>>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
        setIsLoading(true);
        try {
            await apiRequest("POST", "/api/auth/forgot-password", values);
            setIsSubmitted(true);
            toast({
                title: "Το αίτημα στάλθηκε",
                description: "Αν το email υπάρχει στο σύστημα, θα λάβετε οδηγίες επαναφοράς.",
            });
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
                        <CardTitle className="text-2xl font-bold">Επαναφορά Κωδικού</CardTitle>
                        <CardDescription>
                            {!isSubmitted
                                ? "Εισάγετε το email σας για να λάβετε σύνδεσμο επαναφοράς."
                                : "Ελέγξτε τα εισερχόμενά σας για οδηγίες."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!isSubmitted ? (
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                                        <Input className="pl-10" placeholder="your@email.com" {...field} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Αποστολή Συνδέσμου
                                    </Button>
                                </form>
                            </Form>
                        ) : (
                            <div className="text-center py-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                    <Mail className="h-8 w-8" />
                                </div>
                                <p className="text-slate-600 mb-6">
                                    Στείλαμε οδηγίες επαναφοράς στο email σας. Παρακαλούμε ελέγξτε και το φάκελο των ανεπιθύμητων (spam).
                                </p>
                                <Button variant="outline" className="w-full" onClick={() => setIsSubmitted(false)}>
                                    Αλλαγή email
                                </Button>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Link href="/login">
                            <a className="flex items-center text-sm text-slate-500 hover:text-primary transition-colors">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Επιστροφή στη σύνδεση
                            </a>
                        </Link>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
