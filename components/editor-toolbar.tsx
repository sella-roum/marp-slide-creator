"use client";

import React from "react";
import { Button } from "@/components/ui/button";
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
  // 必要に応じて他のアイコンもインポート
} from "lucide-react";

// EditorToolbarAction 型は不要になる

interface EditorToolbarProps {
  // onAction の代わりに個別のハンドラを追加
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
  }: EditorToolbarProps) => {
    // handleAction ヘルパー関数は不要になる

    return (
      <div className="flex items-center overflow-x-auto border-b p-1">
        <TooltipProvider delayDuration={100}>
          {/* 見出し1 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onH1Click} aria-label="見出し1">
                <Heading1Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し1</TooltipContent>
          </Tooltip>
          {/* 見出し2 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onH2Click} aria-label="見出し2">
                <Heading2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し2</TooltipContent>
          </Tooltip>
          {/* 太字 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onBoldClick} aria-label="太字">
                <BoldIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>太字 (Ctrl+B)</TooltipContent>
          </Tooltip>
          {/* 斜体 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onItalicClick} aria-label="斜体">
                <ItalicIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体 (Ctrl+I)</TooltipContent>
          </Tooltip>
          {/* リンク */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onLinkClick} aria-label="リンク">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リンク</TooltipContent>
          </Tooltip>
          {/* リスト */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onListClick} aria-label="リスト">
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リスト</TooltipContent>
          </Tooltip>
          {/* 引用 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onQuoteClick} aria-label="引用">
                <QuoteIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>引用</TooltipContent>
          </Tooltip>
          {/* コードブロック */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onCodeClick} aria-label="コードブロック">
                <CodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>コードブロック</TooltipContent>
          </Tooltip>
          {/* スライド区切り */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onHrClick} aria-label="スライド区切り">
                <SeparatorHorizontalIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>スライド区切り (---)</TooltipContent>
          </Tooltip>
          {/* 画像URL挿入 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onImageUrlClick} aria-label="画像URLを挿入">
                {/* LinkIcon を流用するか、専用アイコンを用意 */}
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像URLを挿入</TooltipContent>
          </Tooltip>
          {/* 画像ライブラリ */}
          <Tooltip>
            {/* TooltipTrigger で ImageLibrary をラップし、asChild を使用 */}
            <TooltipTrigger asChild>
              {/* ImageLibrary に onInsertReference を渡す */}
              <ImageLibrary onInsertReference={onInsertImageReference} />
            </TooltipTrigger>
            <TooltipContent>画像ライブラリを開く</TooltipContent>
          </Tooltip>
          {/* Marpディレクティブ */}
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
