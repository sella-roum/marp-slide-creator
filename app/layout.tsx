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
  description: "Google Gemini AIの支援でMarpプレゼンテーション作成を加速。Markdownエディタ、リアルタイムプレビュー、AIによるアウトライン・コンテンツ・CSSテーマ生成、画像ライブラリ、HTML/MDエクスポート機能を提供。データはブラウザのIndexedDBに安全に保存されます。",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
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
