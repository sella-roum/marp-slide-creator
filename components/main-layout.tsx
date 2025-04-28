import React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { LayoutMode } from "@/lib/constants";

interface MainLayoutProps {
  layoutMode: LayoutMode;
  isChatVisible: boolean;
  isEditorVisible: boolean;
  isPreviewVisible: boolean;
  renderChatPanel: () => React.ReactNode;
  renderEditorPanel: () => React.ReactNode;
  renderPreviewPanel: () => React.ReactNode;
  renderEditorPreviewGroup: (
    direction: "vertical" | "horizontal",
    defaultSize: number,
    order: number
  ) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = React.memo(
  ({
    layoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    renderChatPanel,
    renderEditorPanel,
    renderPreviewPanel,
    renderEditorPreviewGroup, // この関数は editor-bottom では直接使わない可能性あり
  }) => {
    // チャット/プレビューグループをレンダリングするヘルパー関数 (editor-bottom用)
    const renderChatPreviewGroup = (direction: "horizontal", defaultSize: number, order: number) =>
      (isChatVisible || isPreviewVisible) && (
        <ResizablePanel
          id={`chat-preview-group-${layoutMode}`}
          order={order}
          defaultSize={defaultSize}
          minSize={30}
        >
          <ResizablePanelGroup direction={direction}>
            {renderChatPanel()}
            {isChatVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {renderPreviewPanel()}
          </ResizablePanelGroup>
        </ResizablePanel>
      );

    return (
      <div className="flex-1 overflow-hidden border-t">
        {layoutMode === "default" && (
          <ResizablePanelGroup direction="horizontal">
            {renderChatPanel()}
            {isChatVisible && (isEditorVisible || isPreviewVisible) && (
              <ResizableHandle withHandle />
            )}
            {renderEditorPreviewGroup("vertical", isChatVisible ? 75 : 100, 2)}
          </ResizablePanelGroup>
        )}
        {layoutMode === "chat-right" && (
          <ResizablePanelGroup direction="horizontal">
            {renderEditorPreviewGroup("vertical", isChatVisible ? 75 : 100, 1)}
            {(isEditorVisible || isPreviewVisible) && isChatVisible && (
              <ResizableHandle withHandle />
            )}
            {renderChatPanel()}
          </ResizablePanelGroup>
        )}
        {layoutMode === "horizontal" && (
          <ResizablePanelGroup direction="horizontal">
            {renderChatPanel()}
            {isChatVisible && isEditorVisible && <ResizableHandle withHandle />}
            {renderEditorPanel()}
            {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {renderPreviewPanel()}
          </ResizablePanelGroup>
        )}
        {layoutMode === "editor-focused" && (
          <ResizablePanelGroup direction="vertical">
            {renderEditorPanel()}
            {isEditorVisible && (isChatVisible || isPreviewVisible) && (
              <ResizableHandle withHandle />
            )}
            {/* editor-focused ではチャット/プレビューが下に来る */}
            {renderChatPreviewGroup("horizontal", isEditorVisible ? 50 : 100, 2)}
          </ResizablePanelGroup>
        )}
        {/* 新しい editor-bottom レイアウト */}
        {layoutMode === "editor-bottom" && (
          <ResizablePanelGroup direction="vertical">
            {/* チャット/プレビューを上に配置 (order=1) */}
            {renderChatPreviewGroup("horizontal", isEditorVisible ? 50 : 100, 1)}
            {/* エディタパネルを下に配置 (order=2) */}
            {(isChatVisible || isPreviewVisible) && isEditorVisible && (
              <ResizableHandle withHandle />
            )}
            {renderEditorPanel()}
          </ResizablePanelGroup>
        )}
      </div>
    );
  }
);

MainLayout.displayName = "MainLayout";
