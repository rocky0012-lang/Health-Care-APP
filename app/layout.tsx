import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
      lang="en" suppressHydrationWarning className="h-full font-sans">
        <body className="min-h-full overflow-x-hidden overflow-y-auto text-white font-sans antialiased">
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
