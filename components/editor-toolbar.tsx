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
} from "lucide-react";

// ツールバーで実行可能なアクションの型
export type EditorToolbarAction =
  | "h1"
  | "h2"
  | "bold"
  | "italic"
  | "link"
  | "code"
  | "list"
  | "quote"
  | "hr"
  | "marp-directive"
  | "image-url";

interface EditorToolbarProps {
  onAction: (action: EditorToolbarAction) => void;
  onInsertImageReference: (reference: string) => void;
}

export const EditorToolbar = React.memo(
  ({ onAction, onInsertImageReference }: EditorToolbarProps) => {
    // アクションを呼び出すヘルパー関数
    const handleAction = (action: EditorToolbarAction) => () => onAction(action);

    return (
      <div className="flex items-center overflow-x-auto border-b p-1">
        <TooltipProvider delayDuration={100}>
          {/* 見出し1 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("h1")} aria-label="見出し1">
                <Heading1Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し1</TooltipContent>
          </Tooltip>
          {/* 見出し2 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("h2")} aria-label="見出し2">
                <Heading2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し2</TooltipContent>
          </Tooltip>
          {/* 太字 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("bold")} aria-label="太字">
                <BoldIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>太字 (Ctrl+B)</TooltipContent>
          </Tooltip>
          {/* 斜体 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("italic")} aria-label="斜体">
                <ItalicIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体 (Ctrl+I)</TooltipContent>
          </Tooltip>
          {/* リンク */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("link")} aria-label="リンク">
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リンク</TooltipContent>
          </Tooltip>
          {/* リスト */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("list")} aria-label="リスト">
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リスト</TooltipContent>
          </Tooltip>
          {/* 引用 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("quote")} aria-label="引用">
                <QuoteIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>引用</TooltipContent>
          </Tooltip>
          {/* コードブロック */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("code")} aria-label="コードブロック">
                <CodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>コードブロック</TooltipContent>
          </Tooltip>
          {/* スライド区切り */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("hr")} aria-label="スライド区切り">
                <SeparatorHorizontalIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>スライド区切り (---)</TooltipContent>
          </Tooltip>
          {/* 画像URL挿入 */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleAction("image-url")} aria-label="画像URLを挿入">
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
                onClick={handleAction("marp-directive")}
                aria-label="Marpディレクティブ挿入"
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
