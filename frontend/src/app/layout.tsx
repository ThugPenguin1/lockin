import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Circadian — Energy-Based Productivity",
  description: "Stop managing time. Start managing energy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-50 antialiased">{children}</body>
    </html>
  );
}
