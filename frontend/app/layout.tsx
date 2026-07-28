import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import Sidebar from "../Components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AgriCore",
    template: "%s | AgriCore",
  },
  description:
    "Agricultural engineering CRM for customers, machines, jobs, quotes and invoices.",
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen bg-slate-100">
          <Sidebar />

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}