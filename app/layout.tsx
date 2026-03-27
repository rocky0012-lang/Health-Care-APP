import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Health Care",
  description: "A health care management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" className={cn("h-full", "font-sans", inter.variable)}>
        <body className="min-h-screen text-white font-sans antialiased">
          {children}
        </body>
    </html>
  );
}
