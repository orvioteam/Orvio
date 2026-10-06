import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orvio – Aufträge einfach planen.",
  description: "Orvio hilft mobilen Teams, Kunden, Mitarbeitende und Aufträge einfach zu organisieren.",
  openGraph: {
    title: "Orvio – Aufträge einfach planen.",
    description: "Orvio hilft mobilen Teams, Kunden, Mitarbeitende und Aufträge einfach zu organisieren.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f7f7f4] text-slate-900">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
