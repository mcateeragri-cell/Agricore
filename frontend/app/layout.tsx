import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import AppShell from "../Components/AppShell";
import OfflineBootstrap from "../Components/offline/offline-bootstrap";
import ThemeProvider from "../Components/theme/theme-provider";
import ThemeInitialiser from "../Components/theme/theme-initialiser";

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

  applicationName: "AgriCore",
  manifest: "/manifest.webmanifest",

  appleWebApp: {
    capable: true,
    title: "AgriCore",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },

  icons: {
    icon: [
      {
        url: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeInitialiser />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <OfflineBootstrap />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}