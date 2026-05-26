import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/toaster";
import { SiteShell } from "@/components/site-shell";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "Bookify — Where dreams rise through the silence.",
  description:
    "A cinematic platform for assessing the quality of textbooks, reference books, and e-books — built for deep thinkers, bold creators, and quiet rebels.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${instrumentSerif.variable} dark`}
    >
      <body className="min-h-screen antialiased">
        <AuthProvider>
          <SiteShell>{children}</SiteShell>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
