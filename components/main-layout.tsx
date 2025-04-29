import React from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import type { LayoutMode } from "@/lib/constants";

interface MainLayoutProps {
  layoutMode: LayoutMode;
  isChatVisible: boolean;
  isEditorVisible: boolean;
  isPreviewVisible: boolean;
  chatPanel: React.ReactNode;
  editorPanel: React.ReactNode;
  previewPanel: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = React.memo(
  ({
    layoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    chatPanel,
    editorPanel,
    previewPanel,
  }) => {
    const renderEditorPreviewGroup = (
      direction: "vertical" | "horizontal",
      defaultSize: number,
      order: number
    ) =>
      (isEditorVisible || isPreviewVisible) && (
        <ResizablePanel
          id={`editor-preview-group-${layoutMode}`}
          order={order}
          defaultSize={defaultSize}
          minSize={30}
        >
          <ResizablePanelGroup direction={direction}>
            {isEditorVisible && editorPanel}
            {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {isPreviewVisible && previewPanel}
          </ResizablePanelGroup>
        </ResizablePanel>
      );

    const renderChatPreviewGroup = (direction: "horizontal", defaultSize: number, order: number) =>
      (isChatVisible || isPreviewVisible) && (
        <ResizablePanel
          id={`chat-preview-group-${layoutMode}`}
          order={order}
          defaultSize={defaultSize}
          minSize={30}
        >
          <ResizablePanelGroup direction={direction}>
            {isChatVisible && chatPanel}
            {isChatVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {isPreviewVisible && previewPanel}
          </ResizablePanelGroup>
        </ResizablePanel>
      );

    return (
      <div className="flex-1 overflow-hidden border-t">
        {layoutMode === "default" && (
          <ResizablePanelGroup direction="horizontal">
            {isChatVisible && chatPanel}
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
            {isChatVisible && chatPanel}
          </ResizablePanelGroup>
        )}
        {layoutMode === "horizontal" && (
          <ResizablePanelGroup direction="horizontal">
            {isChatVisible && chatPanel}
            {isChatVisible && isEditorVisible && <ResizableHandle withHandle />}
            {isEditorVisible && editorPanel}
            {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {isPreviewVisible && previewPanel}
          </ResizablePanelGroup>
        )}
        {layoutMode === "editor-focused" && (
          <ResizablePanelGroup direction="vertical">
            {isEditorVisible && editorPanel}
            {isEditorVisible && (isChatVisible || isPreviewVisible) && (
              <ResizableHandle withHandle />
            )}
            {renderChatPreviewGroup("horizontal", isEditorVisible ? 50 : 100, 2)}
          </ResizablePanelGroup>
        )}
        {layoutMode === "editor-bottom" && (
          <ResizablePanelGroup direction="vertical">
            {renderChatPreviewGroup("horizontal", isEditorVisible ? 50 : 100, 1)}
            {(isChatVisible || isPreviewVisible) && isEditorVisible && (
              <ResizableHandle withHandle />
            )}
            {isEditorVisible && editorPanel}
          </ResizablePanelGroup>
        )}
      </div>
    );
  }
);

MainLayout.displayName = "MainLayout";
