import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Agency — AI Specialists Hub",
  description: "232 specialized AI agents across 18 divisions. Each agent is a specialized expert with personality, processes, and proven deliverables.",
  keywords: ["AI Agency", "AI Agents", "Specialized AI", "Automation", "AI Development"],
  authors: [{ name: "The Agency" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "The Agency — AI Specialists Hub",
    description: "232 specialized AI agents across 18 divisions",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Agency — AI Specialists Hub",
    description: "232 specialized AI agents across 18 divisions",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
