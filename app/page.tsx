"use client";

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { ChatPane } from "@/components/chat-pane";
import { EditorPane } from "@/components/editor-pane";
import { PreviewPane } from "@/components/preview-pane";
import { AppHeader } from "@/components/app-header";
import { MainLayout } from "@/components/main-layout";
import { ResizablePanel } from "@/components/ui/resizable";
import { useAppContext } from "@/contexts/AppContext";

export default function Home() {
  const { documentManager, layoutManager } = useAppContext();
  const { currentDocument, markdownContent, handleMarkdownChange, isSaving } = documentManager;

  const {
    layoutMode,
    setLayoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    togglePanel,
    visiblePanelsCount,
  } = layoutManager;

  const chatPanelComponent = isChatVisible && (
    <ResizablePanel
      id="chat-panel"
      collapsible={true}
      collapsedSize={0}
      minSize={15}
      defaultSize={layoutMode === "horizontal" ? 25 : layoutMode === "editor-focused" ? 40 : 25}
      className="min-h-[100px] min-w-[200px]"
    >
      <div
        className={`flex h-full flex-col ${layoutMode === "chat-right" ? "border-l" : "border-r"}`}
      >
        <div className="h-full flex-1 overflow-hidden">
          <ChatPane currentDocument={currentDocument!} onApplyToEditor={handleMarkdownChange} />
        </div>
      </div>
    </ResizablePanel>
  );

  const editorPanelComponent = isEditorVisible && (
    <ResizablePanel
      id="editor-panel"
      collapsible={true}
      collapsedSize={0}
      minSize={15}
      defaultSize={layoutMode === "horizontal" ? 40 : 50}
      className="min-h-[100px] min-w-[200px]"
    >
      <div className="flex h-full flex-col">
        <EditorPane
          markdown={markdownContent}
          onChange={handleMarkdownChange}
          currentDocument={currentDocument!}
        />
      </div>
    </ResizablePanel>
  );

  const previewPanelComponent = isPreviewVisible && (
    <ResizablePanel
      id="preview-panel"
      collapsible={true}
      collapsedSize={0}
      minSize={15}
      defaultSize={layoutMode === "horizontal" ? 35 : layoutMode === "editor-focused" ? 60 : 50}
      className="min-h-[100px] min-w-[200px]"
    >
      <div className="flex h-full flex-col">
        <PreviewPane markdown={markdownContent} />
      </div>
    </ResizablePanel>
  );

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <AppHeader
        currentDocument={currentDocument}
        markdownContent={markdownContent}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        isChatVisible={isChatVisible}
        isEditorVisible={isEditorVisible}
        isPreviewVisible={isPreviewVisible}
        togglePanel={togglePanel}
        visiblePanelsCount={visiblePanelsCount}
        isSaving={isSaving}
      />

      <MainLayout
        layoutMode={layoutMode}
        isChatVisible={isChatVisible}
        isEditorVisible={isEditorVisible}
        isPreviewVisible={isPreviewVisible}
        chatPanel={chatPanelComponent}
        editorPanel={editorPanelComponent}
        previewPanel={previewPanelComponent}
      />

      <Toaster />
    </main>
  );
}
