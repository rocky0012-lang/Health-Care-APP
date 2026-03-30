import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const FontsSans = Plus_Jakarta_Sans({
  subsets:['latin'],
  weight: ['400', '500', '600', '700'],
  variable:'--font-sans'});

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
      lang="en"  suppressHydrationWarning  className={cn("h-full", "font-sans", FontsSans.variable)}>
        <body className="h-full overflow-hidden text-white font-sans antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
          >
            {children}
          </ThemeProvider>
        </body>
    </html>
  );
}
