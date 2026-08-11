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
  metadataBase: new URL("https://getagricore.com"),

  title: {
    default: "AgriCore",
    template: "%s | AgriCore",
  },

  description:
    "Agricultural engineering management software for customers, machines, jobs, technicians, stock, service programmes, quotes and invoices.",

  openGraph: {
    type: "website",
    siteName: "AgriCore",
    title: "AgriCore | Agricultural engineering management software",
    description: "Run customers, machines, jobs, technicians, stock, service programmes, quotes and invoices from one agricultural engineering platform.",
    url: "https://getagricore.com",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "AgriCore" }],
  },

  twitter: {
    card: "summary",
    title: "AgriCore",
    description: "Agricultural engineering management software built for service businesses around machinery.",
    images: ["/icons/icon-512.png"],
  },

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