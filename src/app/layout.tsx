import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
