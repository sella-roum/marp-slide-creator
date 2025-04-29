import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DbProvider } from "@/lib/db-context"; // DbProvider をインポート
import ErrorBoundary from "@/components/error-boundary"; // ★ ErrorBoundary をインポート

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI-Assisted Marp Slide Creator",
  description: "Create Marp slides with AI assistance from Google Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* DbProvider でラップ */}
          <DbProvider>
            {/* ★ ErrorBoundary で children をラップ */}
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </DbProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
