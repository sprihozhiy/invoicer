import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ToastProvider } from "@/components/toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Invoicer",
  description: "Professional invoicing for the way you work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-[#0F0F0F] text-[#F5F5F5] antialiased`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
