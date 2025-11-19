import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { DateRangeProvider } from "@/components/date-range-context";
import { TransactionsProvider } from "@/components/transactions/transactions-provider";
import AppShell from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GST Ledger",
  description: "Preview your GST-able expenses for NZ small business owners.",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-[#f5f5f7] text-slate-900 antialiased`}
      >
        <AuthProvider>
          <DateRangeProvider>
            <TransactionsProvider>
              <AppShell>{children}</AppShell>
            </TransactionsProvider>
          </DateRangeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
