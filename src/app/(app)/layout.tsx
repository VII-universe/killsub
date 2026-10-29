import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// App fonts live here, not in the root layout, so the marketing landing (app/(marketing)) carries only its own.
// `display: contents` keeps the body's flex layout exactly as before; the font variables still inherit.
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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`app-root contents ${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      {children}
    </div>
  );
}
