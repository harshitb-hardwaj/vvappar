import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Vyapaar Invoices", description: "GST invoicing for small businesses" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
