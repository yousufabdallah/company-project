import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Al-Manara Auto Service — Workshop SaaS",
  description:
    "Multi-tenant Auto Repair & Car Service Workshop management platform — customers, vehicles, job cards, estimates, inventory, invoices, payments and reports.",
  keywords: ["auto workshop", "SaaS", "job cards", "inventory", "invoices", "workshop management"],
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased bg-background text-foreground`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
