"use client";
import "./globals.css";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>LockIn — Study Together, Stay Focused</title>
        <meta name="description" content="AI-powered social study platform with friend group accountability" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-lockin-bg text-lockin-text antialiased">
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#12121a",
              border: "1px solid #1e1e2e",
              color: "#f0f0f5",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
