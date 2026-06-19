import type { Metadata } from "next";
import { Hanken_Grotesk, Space_Grotesk } from "next/font/google";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  fallback: ["Avenir Next", "Segoe UI", "system-ui", "sans-serif"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  fallback: ["Avenir Next Condensed", "Segoe UI", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Personal Trainer AI",
  description: "Personal Trainer AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="h-full bg-[var(--app-bg)] text-[var(--app-text)]">
      <body className={`${hankenGrotesk.variable} ${spaceGrotesk.variable} min-h-full antialiased`}>
        {children}
      </body>
    </html>
  );
}
