import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import AppNav from "@/components/AppNav";
import ProtectedRoute from "@/components/ProtectedRoute";

import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import AuthCallback from "@/pages/AuthCallback";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Tuner from "@/pages/Tuner";
import Drills from "@/pages/Drills";
import DrillPlayer from "@/pages/DrillPlayer";
import Vocal from "@/pages/Vocal";
import VocalExercise from "@/pages/VocalExercise";
import ToneLab from "@/pages/ToneLab";
import ProgressAltar from "@/pages/ProgressAltar";
import History from "@/pages/History";
import Pricing from "@/pages/Pricing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Settings from "@/pages/Settings";
import Diagnostics from "@/pages/Diagnostics";
import StaticPages from "@/pages/StaticPages";

function AuthedLayout() {
  return (
    <>
      <AppNav />
      <Outlet />
    </>
  );
}

function AppRouter() {
  const location = useLocation();
  // Detect OAuth callback (both legacy Emergent session_id in hash and direct Google code in query params)
  if (location.hash?.includes("session_id=") || location.search?.includes("code=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/about" element={<StaticPages page="about" />} />
      <Route path="/contact" element={<StaticPages page="contact" />} />
      <Route path="/privacy" element={<StaticPages page="privacy" />} />
      <Route path="/terms" element={<StaticPages page="terms" />} />

      <Route element={<ProtectedRoute><AuthedLayout /></ProtectedRoute>}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tuner" element={<Tuner />} />
        <Route path="/drills" element={<Drills />} />
        <Route path="/drills/:id" element={<DrillPlayer />} />
        <Route path="/vocal" element={<Vocal />} />
        <Route path="/vocal/:id" element={<VocalExercise />} />
        <Route path="/tone-lab" element={<ToneLab />} />
        <Route path="/progress" element={<ProgressAltar />} />
        <Route path="/history" element={<History />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/diagnostics" element={<Diagnostics />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App app-shell">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-center" theme="dark" toastOptions={{ className: "bg-[hsl(var(--popover))] border border-[hsl(var(--border))]" }} />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
