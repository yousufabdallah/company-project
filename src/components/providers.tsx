"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

function LangDirManager() {
  const lang = useApp((s) => s.lang);
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    html.classList.toggle("lang-ar", lang === "ar");
  }, [lang]);
  return null;
}

// Restore an existing session (httpOnly cookie) on app load
function SessionHydrator() {
  const login = useApp((s) => s.login);
  const user = useApp((s) => s.user);
  const screen = useApp((s) => s.screen);
  useEffect(() => {
    // Only hydrate if we don't already have a user (avoids overriding logout on landing)
    if (user || screen !== "landing") return;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (data.user) {
          login(data.user);
        }
      } catch {
        // ignore — stay on landing
      }
    })();
  }, [login, user, screen]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={client}>
        <LangDirManager />
        <SessionHydrator />
        {children}
        <Toaster />
        <SonnerToaster position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
