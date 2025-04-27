import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { LayoutMode } from '@/lib/constants';

interface MainLayoutProps {
  layoutMode: LayoutMode;
  isChatVisible: boolean;
  isEditorVisible: boolean;
  isPreviewVisible: boolean;
  renderChatPanel: () => React.ReactNode;
  renderEditorPanel: () => React.ReactNode;
  renderPreviewPanel: () => React.ReactNode;
  renderEditorPreviewGroup: (direction: "vertical" | "horizontal", defaultSize: number, order: number) => React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = React.memo(({
  layoutMode,
  isChatVisible,
  isEditorVisible,
  isPreviewVisible,
  renderChatPanel,
  renderEditorPanel,
  renderPreviewPanel,
  renderEditorPreviewGroup,
}) => {
  return (
    <div className="flex-1 overflow-hidden border-t">
      {layoutMode === 'default' && (
        <ResizablePanelGroup direction="horizontal">
          {renderChatPanel()}
          {isChatVisible && (isEditorVisible || isPreviewVisible) && <ResizableHandle withHandle />}
          {renderEditorPreviewGroup("vertical", isChatVisible ? 75 : 100, 2)}
        </ResizablePanelGroup>
      )}
      {layoutMode === 'chat-right' && (
        <ResizablePanelGroup direction="horizontal">
          {renderEditorPreviewGroup("vertical", isChatVisible ? 75 : 100, 1)}
          {(isEditorVisible || isPreviewVisible) && isChatVisible && <ResizableHandle withHandle />}
          {renderChatPanel()}
        </ResizablePanelGroup>
      )}
      {layoutMode === 'horizontal' && (
        <ResizablePanelGroup direction="horizontal">
          {renderChatPanel()}
          {isChatVisible && isEditorVisible && <ResizableHandle withHandle />}
          {renderEditorPanel()}
          {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
          {renderPreviewPanel()}
        </ResizablePanelGroup>
      )}
       {layoutMode === 'editor-focused' && (
          <ResizablePanelGroup direction="vertical">
              {renderEditorPanel()}
              {isEditorVisible && (isChatVisible || isPreviewVisible) && <ResizableHandle withHandle />}
              {(isChatVisible || isPreviewVisible) && (
                  <ResizablePanel id="chat-preview-group-editor-focused" order={2} defaultSize={isEditorVisible ? 50 : 100} minSize={30}>
                      <ResizablePanelGroup direction="horizontal">
                          {renderChatPanel()}
                          {isChatVisible && isPreviewVisible && <ResizableHandle withHandle />}
                          {renderPreviewPanel()}
                      </ResizablePanelGroup>
                  </ResizablePanel>
              )}
          </ResizablePanelGroup>
       )}
    </div>
  );
});

MainLayout.displayName = 'MainLayout';
