import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, User, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext.jsx";
import { DEMO_PATIENT_ENCOUNTER_ID } from "@/constants/demoPatient.js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loginClinical, loginPatient, role } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (role === "patient" && DEMO_PATIENT_ENCOUNTER_ID) {
      navigate(`/patient/${encodeURIComponent(DEMO_PATIENT_ENCOUNTER_ID)}`, { replace: true });
    } else if (role === "clinical") {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  return (
    <div className="app-auth-screen">
      <div className="mx-auto w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="app-title-hero">Sign In</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose how you are using Sepsis Copilot. Sign-in uses your browser session; password policies can be added for production.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                <CardTitle>Clinician</CardTitle>
              </div>
              <CardDescription>
                Browse encounters, open charts, and switch between clinician and patient views on an encounter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="primary" className="w-full" onClick={() => loginClinical()}>
                Continue as clinician
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <CardTitle>Patient &amp; Family</CardTitle>
              </div>
              <CardDescription>
                Opens your care summary directly. You won&apos;t see clinician tools or the browse list.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Test encounter: <span className="font-mono text-foreground">{DEMO_PATIENT_ENCOUNTER_ID}</span>
              </p>
              <Button type="button" variant="outline" className="w-full" onClick={() => loginPatient()}>
                <User className="mr-2 h-4 w-4" />
                Continue as patient
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
