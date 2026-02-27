import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function VerifyEmail() {
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");

    useEffect(() => {
        async function verify() {
            if (!token) {
                setStatus("error");
                setMessage("Λείπει το token επαλήθευσης.");
                return;
            }

            try {
                const res = await fetch(`/api/auth/verify-email?token=${token}`);
                const data = await res.json();

                if (res.ok) {
                    setStatus("success");
                    setMessage("Το email σας επαληθεύτηκε με επιτυχία!");
                } else {
                    setStatus("error");
                    setMessage(data.error || "Η επαλήθευση απέτυχε.");
                }
            } catch (err) {
                setStatus("error");
                setMessage("Παρουσιάστηκε σφάλμα κατά την επικοινωνία με τον διακομιστή.");
            }
        }

        verify();
    }, [token]);

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
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">Επαλήθευση Email</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center py-6">
                        {status === "loading" && (
                            <>
                                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                                <p className="text-slate-600">Γίνεται επαλήθευση στοιχείων...</p>
                            </>
                        )}

                        {status === "success" && (
                            <>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                                    <CheckCircle2 className="h-8 w-8" />
                                </div>
                                <p className="text-slate-600 text-center mb-6">{message}</p>
                                <Link href="/dashboard">
                                    <Button className="w-full">Συνέχεια στο Dashboard</Button>
                                </Link>
                            </>
                        )}

                        {status === "error" && (
                            <>
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                                    <XCircle className="h-8 w-8" />
                                </div>
                                <p className="text-red-600 text-center mb-6">{message}</p>
                                <Link href="/login">
                                    <Button variant="outline" className="w-full">Επιστροφή στη Σύνδεση</Button>
                                </Link>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
