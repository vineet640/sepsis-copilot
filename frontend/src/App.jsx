import React from "react";
import { Routes, Route, Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Stethoscope, Bell, LogOut } from "lucide-react";
import ModeToggle from "./components/ModeToggle.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";
import PatientBrowser from "./pages/PatientBrowser.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import EncounterDashboardShowcase from "./pages/EncounterDashboardShowcase.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import LiquidGlassButtonDemo from "./pages/LiquidGlassButtonDemo.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function AppChrome() {
  const path = useLocation().pathname;
  const auth = useAuth();
  const homeTo =
    auth.role === "patient" && auth.patientEncounterId
      ? `/patient/${encodeURIComponent(auth.patientEncounterId)}`
      : "/";
  const showBrowseBack = auth.role === "clinical" && path !== "/";
  const showModeToggle = auth.role === "clinical" && path.startsWith("/patient/");

  return (
    <>
      <header className="app-header">
        <div className="app-content-width flex h-full items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Stethoscope className="h-5 w-5 text-primary" />
            </div>
            <Link
              to={homeTo}
              className="font-display shrink-0 text-[1.0625rem] font-semibold tracking-tight text-primary no-underline hover:text-primary/80"
            >
              First Hour
            </Link>
            {showBrowseBack ? (
              <Link
                to="/"
                className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                ← Browse
              </Link>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {showModeToggle ? <ModeToggle /> : null}
            <ThemeToggle />
            <Button variant="ghost" size="icon" type="button" aria-label="Notifications">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8">
              <AvatarFallback>{auth.role === "patient" ? "PT" : "DR"}</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => auth.logout()}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/demo/liquid-glass" element={<LiquidGlassButtonDemo />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppChrome />}>
          <Route path="/" element={<PatientBrowser />} />
          <Route path="/patient/:encounterId" element={<PatientDashboard />} />
          <Route path="/demo/encounter" element={<EncounterDashboardShowcase />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
