// components/theme-toggle.tsx
"use client";

import * as React from "react";
// ★ Check アイコンをインポート
import { MoonIcon, SunIcon, CheckIcon } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils"; // ★ cn ユーティリティをインポート

export function ThemeToggle() {
  // ★ theme も取得するように変更
  const { setTheme, theme } = useTheme();

  // ★ 各メニューアイテムをレンダリングするヘルパー関数 (任意ですが可読性のため)
  const renderMenuItem = (value: string, label: string) => (
    <DropdownMenuItem onClick={() => setTheme(value)}>
      {/* ★ 現在のテーマと一致する場合にチェックマークを表示 */}
      <CheckIcon
        className={cn(
          "mr-2 h-4 w-4",
          theme === value ? "opacity-100" : "opacity-0" // ★ 一致しない場合は非表示
        )}
      />
      {label}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="テーマを切り替え">
          <SunIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <MoonIcon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* ★ ヘルパー関数を使ってアイテムをレンダリング */}
        {renderMenuItem("light", "ライト")}
        {renderMenuItem("dark", "ダーク")}
        {renderMenuItem("system", "システム")}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
