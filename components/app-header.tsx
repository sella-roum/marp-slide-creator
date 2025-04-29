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
// PanelBottomIcon をインポート
import {
  MessageSquareIcon,
  CodeIcon,
  EyeIcon,
  LayoutIcon,
  RowsIcon,
  ColumnsIcon,
  PanelRightIcon,
  PanelBottomIcon,
} from "lucide-react";
import type { DocumentType } from "@/lib/types";
import type { LayoutMode } from "@/lib/constants";

interface AppHeaderProps {
  currentDocument: DocumentType | null;
  markdownContent: string;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  isChatVisible: boolean;
  isEditorVisible: boolean;
  isPreviewVisible: boolean;
  togglePanel: (panel: "chat" | "editor" | "preview") => void;
  visiblePanelsCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = React.memo(
  ({
    currentDocument,
    markdownContent,
    layoutMode,
    setLayoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    togglePanel,
    visiblePanelsCount,
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
              <Button variant="outline" size="sm">
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
            aria-label="Toggle Chat Panel"
            disabled={visiblePanelsCount === 1 && isChatVisible}
          >
            <MessageSquareIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isEditorVisible}
            onPressedChange={() => togglePanel("editor")}
            aria-label="Toggle Editor Panel"
            disabled={visiblePanelsCount === 1 && isEditorVisible}
          >
            <CodeIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={isPreviewVisible}
            onPressedChange={() => togglePanel("preview")}
            aria-label="Toggle Preview Panel"
            disabled={visiblePanelsCount === 1 && isPreviewVisible}
          >
            <EyeIcon className="h-4 w-4" />
          </Toggle>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {/* エクスポートボタン */}
          <ExportDropdown
            markdown={markdownContent}
            documentTitle={currentDocument?.title || "Untitled"}
          />
        </div>
      </header>
    );
  }
);

AppHeader.displayName = "AppHeader";
