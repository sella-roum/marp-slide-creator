import React from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDropdown } from "@/components/export-dropdown";
import { ThemeToggle } from "./theme-toggle";
import {
  MessageSquareIcon,
  CodeIcon,
  EyeIcon,
  LayoutIcon,
  RowsIcon,
  ColumnsIcon,
  PanelRightIcon,
  PanelBottomIcon,
  HelpCircleIcon, // ★ HelpCircleIcon をインポート
} from "lucide-react";
import type { DocumentType } from "@/lib/types";
import type { LayoutMode } from "@/lib/constants";

interface AppHeaderProps {
  currentDocument: DocumentType | null;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  isChatVisible: boolean;
  isEditorVisible: boolean;
  isPreviewVisible: boolean;
  togglePanel: (panel: "chat" | "editor" | "preview") => void;
  visiblePanelsCount: number;
  onOpenHelpDialog: () => void; // ★ ヘルプダイアログを開く関数を受け取るプロップを追加
}

export const AppHeader: React.FC<AppHeaderProps> = React.memo(
  ({
    currentDocument,
    layoutMode,
    setLayoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    togglePanel,
    visiblePanelsCount,
    onOpenHelpDialog, // ★ プロップを受け取る
  }) => {
    return (
      <header className="flex flex-shrink-0 items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-lg font-semibold" title={currentDocument?.title}>
            {currentDocument?.title || "読み込み中..."}
          </h1>
        </div>
        <div className="flex items-center space-x-1">
          {/* レイアウト選択ドロップダウン */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" aria-label="レイアウトを選択">
                <LayoutIcon className="mr-1 h-4 w-4" />
                Layout
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>レイアウト選択</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={layoutMode}
                onValueChange={(value) => setLayoutMode(value as LayoutMode)}
              >
                <DropdownMenuRadioItem value="horizontal">
                  <RowsIcon className="mr-2 h-4 w-4 opacity-50" /> 横3列
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="default">
                  <ColumnsIcon className="mr-2 h-4 w-4 opacity-50" /> チャット左配置
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="chat-right">
                  <PanelRightIcon className="mr-2 h-4 w-4 opacity-50" /> チャット右配置
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="editor-focused">
                  <RowsIcon className="mr-2 h-4 w-4 rotate-90 opacity-50" /> エディタ上配置
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="editor-bottom">
                  <PanelBottomIcon className="mr-2 h-4 w-4 opacity-50" /> エディタ下配置
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* 表示切り替えトグル */}
          <Toggle
            size="sm"
            pressed={isChatVisible}
            onPressedChange={() => togglePanel("chat")}
            aria-label="チャットパネルの表示切り替え"
            disabled={visiblePanelsCount === 1 && isChatVisible}
          >
            <MessageSquareIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isEditorVisible}
            onPressedChange={() => togglePanel("editor")}
            aria-label="エディタパネルの表示切り替え"
            disabled={visiblePanelsCount === 1 && isEditorVisible}
          >
            <CodeIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isPreviewVisible}
            onPressedChange={() => togglePanel("preview")}
            aria-label="プレビューパネルの表示切り替え"
            disabled={visiblePanelsCount === 1 && isPreviewVisible}
          >
            <EyeIcon className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* エクスポートボタン */}
          <ExportDropdown
            currentDocument={currentDocument}
          />

          {/* テーマ切り替えボタン */}
          <ThemeToggle />

          {/* --- ★ ヘルプボタンを追加 --- */}
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button variant="outline" size="icon" onClick={onOpenHelpDialog} aria-label="ヘルプを開く">
            <HelpCircleIcon className="h-4 w-4" />
          </Button>
          {/* --- ここまで --- */}
        </div>
      </header>
    );
  }
);

AppHeader.displayName = "AppHeader";
