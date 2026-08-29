"use client";

import { useApp } from "@/lib/store";
import { AppShell } from "@/components/app-shell";
import { LandingScreen } from "@/components/screens/landing";
import { LoginScreen } from "@/components/screens/login";
import { SignupScreen } from "@/components/screens/signup";
import { SuperAdminScreen } from "@/components/screens/super-admin";

export default function Home() {
  const screen = useApp((s) => s.screen);

  if (screen === "landing") return <LandingScreen />;
  if (screen === "login") return <LoginScreen />;
  if (screen === "signup") return <SignupScreen />;
  if (screen === "superadmin") return <SuperAdminScreen />;
  return <AppShell />;
}
