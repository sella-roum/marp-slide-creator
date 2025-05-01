"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageLibrary } from "./image-library";
import {
  LinkIcon,
  CodeIcon,
  ListIcon,
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  QuoteIcon,
  SeparatorHorizontalIcon,
  PaletteIcon,
  ImagePlusIcon,
  FileCodeIcon,
} from "lucide-react";
import type { DocumentType } from "@/lib/types"; // ★ DocumentType をインポート

interface EditorToolbarProps {
  onH1Click: () => void;
  onH2Click: () => void;
  onBoldClick: () => void;
  onItalicClick: () => void;
  onLinkClick: () => void;
  onCodeClick: () => void;
  onListClick: () => void;
  onQuoteClick: () => void;
  onHrClick: () => void;
  onMarpDirectiveClick: () => void;
  onImageUrlClick: () => void;
  onInsertImageReference: (reference: string) => void;
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  onEditCustomCss: () => void;
  currentDocument: DocumentType | null; // ★ currentDocument を受け取る
}

export const EditorToolbar = React.memo(
  ({
    onH1Click,
    onH2Click,
    onBoldClick,
    onItalicClick,
    onLinkClick,
    onCodeClick,
    onListClick,
    onQuoteClick,
    onHrClick,
    onMarpDirectiveClick,
    onImageUrlClick,
    onInsertImageReference,
    selectedTheme,
    onThemeChange,
    onEditCustomCss,
    currentDocument, // ★ Props を受け取る
  }: EditorToolbarProps) => {
    const themes = [
      { value: "default", label: "Default" },
      { value: "gaia", label: "Gaia" },
      { value: "uncover", label: "Uncover" },
      { value: "custom", label: "Custom CSS" },
    ];

    const currentThemeLabel = themes.find(t => t.value === selectedTheme)?.label || selectedTheme;
    // ★ カスタムCSSが存在するかどうかを判定
    const hasCustomCss = !!currentDocument?.customCss?.trim();

    return (
      <div className="flex flex-wrap items-center overflow-x-auto border-b p-1">
        <TooltipProvider delayDuration={100}>
          {/* --- 既存のツールバーボタン (省略) --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onH1Click} aria-label="見出し1">
                <Heading1Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し1</TooltipContent>
          </Tooltip>
          {/* ... 他のボタン ... */}
           <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onHrClick} aria-label="スライド区切り">
                <SeparatorHorizontalIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>スライド区切り (---)</TooltipContent>
          </Tooltip>

          {/* --- テーマ選択ドロップダウン --- */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="ml-1" aria-label={`現在のテーマ: ${currentThemeLabel}, テーマを変更`}>
                    <PaletteIcon className="mr-1 h-4 w-4" />
                    <span className="hidden sm:inline">{currentThemeLabel}</span>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>テーマを選択</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>スライドテーマ</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={selectedTheme} onValueChange={onThemeChange}>
                {themes.map((theme) => (
                  <DropdownMenuRadioItem
                    key={theme.value}
                    value={theme.value}
                    // ★ Custom CSS は customCss がある場合のみ有効化
                    disabled={theme.value === 'custom' && !hasCustomCss}
                  >
                    {theme.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* --- カスタムCSS編集ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onEditCustomCss} aria-label="カスタムCSSを編集">
                <FileCodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>カスタムCSSを編集</TooltipContent>
          </Tooltip>

          {/* --- 既存の画像関連ボタン (省略) --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onImageUrlClick} aria-label="画像URLを挿入">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像URLを挿入</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ImageLibrary onInsertReference={onInsertImageReference} />
            </TooltipTrigger>
            <TooltipContent>画像ライブラリを開く</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarpDirectiveClick}
                aria-label="Marpディレクティブを挿入"
              >
                Marp
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marpディレクティブ挿入</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
);

EditorToolbar.displayName = "EditorToolbar";
