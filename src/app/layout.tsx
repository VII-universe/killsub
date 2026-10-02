import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ec4899",
};

export const metadata: Metadata = {
  title: "Killsub — Přehled všech předplatných na jednom místě",
  description: "Killsub ti ukáže kolik platíš za předplatná, pomůže ti zrušit ta zbytečná a ušetřit peníze. Netflix, Spotify, Adobe a stovky dalších.",
  keywords: "předplatné, správa předplatných, zrušit předplatné, Netflix, Spotify, ušetřit peníze",
  metadataBase: new URL("https://killsub.vercel.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Killsub",
  },
  openGraph: {
    title: "Killsub — Zabij zbytečná předplatná",
    description: "Přehled všech předplatných na jednom místě. Zjisti kolik platíš a ušetři.",
    url: "https://killsub.vercel.app",
    siteName: "Killsub",
    locale: "cs_CZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Killsub — Zabij zbytečná předplatná",
    description: "Přehled všech předplatných na jednom místě.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="cs"
      data-theme="neon"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex flex-col antialiased selection:bg-pink-500/30 selection:text-pink-200">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
