// components/editor-toolbar.tsx
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
import { ImageLibrary } from "./image-library"; // ImageLibrary をインポート
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
  FileCodeIcon,
} from "lucide-react";
import type { DocumentType } from "@/lib/types";

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
  currentDocument: DocumentType | null;
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
    currentDocument,
  }: EditorToolbarProps) => {
    const themes = [
      { value: "default", label: "Default" },
      { value: "gaia", label: "Gaia" },
      { value: "uncover", label: "Uncover" },
      { value: "custom", label: "Custom CSS" },
    ];

    const currentThemeLabel = themes.find(t => t.value === selectedTheme)?.label || selectedTheme;
    const hasCustomCss = !!currentDocument?.customCss?.trim();

    return (
      <div className="flex flex-wrap items-center overflow-x-auto border-b p-1">
        <TooltipProvider delayDuration={100}>
          {/* --- 見出し1 ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onH1Click} aria-label="見出し1">
                <Heading1Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し1</TooltipContent>
          </Tooltip>
          {/* --- 見出し2 ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onH2Click} aria-label="見出し2">
                <Heading2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し2</TooltipContent>
          </Tooltip>
          {/* --- 太字 ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onBoldClick} aria-label="太字">
                <BoldIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>太字</TooltipContent>
          </Tooltip>
          {/* --- 斜体 ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onItalicClick} aria-label="斜体">
                <ItalicIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体</TooltipContent>
          </Tooltip>
          {/* --- リンク ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onLinkClick} aria-label="リンク">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リンク</TooltipContent>
          </Tooltip>
          {/* --- コードブロック ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCodeClick} aria-label="コードブロック">
                <CodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>コードブロック</TooltipContent>
          </Tooltip>
          {/* --- リスト ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onListClick} aria-label="リスト">
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リスト</TooltipContent>
          </Tooltip>
          {/* --- 引用 ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onQuoteClick} aria-label="引用">
                <QuoteIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>引用</TooltipContent>
          </Tooltip>
          {/* --- 水平線/スライド区切り ボタン --- */}
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

          {/* --- 画像URL挿入ボタン --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onImageUrlClick} aria-label="画像URLを挿入">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像URLを挿入</TooltipContent>
          </Tooltip>

          {/* --- ImageLibrary の Tooltip ラップ --- */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* ImageLibrary コンポーネントを内包する div */}
              <div className="inline-flex items-center justify-center">
                <ImageLibrary onInsertReference={onInsertImageReference} />
              </div>
            </TooltipTrigger>
            <TooltipContent>画像ライブラリを開く</TooltipContent>
          </Tooltip>

          {/* --- Marpディレクティブ挿入ボタン --- */}
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
