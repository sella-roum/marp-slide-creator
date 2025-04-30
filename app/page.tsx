"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useDb } from "@/lib/db-context";
import { getDocument, updateDocument } from "@/lib/db";
import type { DocumentType } from "@/lib/types";
import { ChatPane } from "@/components/chat-pane";
import { EditorPane } from "@/components/editor-pane";
import { PreviewPane } from "@/components/preview-pane";
import { AppHeader } from "@/components/app-header";
import { MainLayout } from "@/components/main-layout";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SINGLE_DOCUMENT_ID, type LayoutMode } from "@/lib/constants";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useDebounce } from "@/hooks/use-debounce"; // useDebounce フックをインポート

export default function Home() {
  const { isDbInitialized, dbError } = useDb();
  const { handleError } = useErrorHandler();
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  // --- ▼ ステートを分割 ▼ ---
  const [editorContent, setEditorContent] = useState(""); // エディタの現在の内容
  const debouncedEditorContent = useDebounce(editorContent, 500); // 500ms 遅延でプレビュー用コンテンツを生成
  // --- ▲ ステートを分割 ▲ ---
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");

  // DB初期化エラーハンドリング (変更なし)
  useEffect(() => {
    if (dbError) {
      handleError({ error: dbError, context: "データベース初期化" });
    }
  }, [dbError, handleError]);

  // 単一ドキュメントの読み込み/作成
  const loadOrCreateSingleDocument = useCallback(async () => {
    if (!isDbInitialized) return;
    try {
      console.log(`Loading document with ID: ${SINGLE_DOCUMENT_ID}`);
      let doc = await getDocument(SINGLE_DOCUMENT_ID);

      if (!doc) {
        console.log("Document not found, creating a new one...");
        const newDocData: DocumentType = {
          id: SINGLE_DOCUMENT_ID,
          title: "My Presentation",
          content: "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await updateDocument(newDocData);
        doc = await getDocument(SINGLE_DOCUMENT_ID);
        if (!doc) {
          throw new Error("Failed to create or retrieve the document after creation attempt.");
        }
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          // ドキュメントが変更された場合のみステートを更新
          if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
            // --- ▼ editorContent を初期化 ▼ ---
            setEditorContent(doc.content);
            // --- ▲ editorContent を初期化 ▲ ---
            console.log("Document loaded/updated in state:", doc.title);
            return doc;
          }
          return prevDoc;
        });
      } else {
        console.error("Failed to load or create the document.");
        handleError({ error: new Error("Document is null after load/create attempt"), context: "ドキュメント読み込み/作成" });
      }
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("Database"))) {
        handleError({ error, context: "ドキュメント読み込み/作成" });
      }
    }
  }, [isDbInitialized, handleError]);

  // DB初期化後にドキュメント読み込み (変更なし)
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // --- ▼ Markdown 変更ハンドラ (setEditorContent を呼び出す) ▼ ---
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
  }, []);
  // --- ▲ Markdown 変更ハンドラ ▲ ---

  // カラム表示状態トグル関数 (変更なし)
  const togglePanel = useCallback((panel: "chat" | "editor" | "preview") => {
    switch (panel) {
      case "chat": setIsChatVisible((prev) => !prev); break;
      case "editor": setIsEditorVisible((prev) => !prev); break;
      case "preview": setIsPreviewVisible((prev) => !prev); break;
    }
  }, []);

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(Boolean).length;

  // 各パネルのレンダリング関数 (渡すプロパティを修正)
  const renderChatPanel = useCallback(
    () =>
      isChatVisible && (
        <ResizablePanel
          id="chat-panel"
          order={layoutMode === "chat-right" ? 2 : 1}
          collapsible={true} collapsedSize={0} minSize={15}
          defaultSize={layoutMode === "horizontal" ? 25 : layoutMode === "editor-focused" ? 40 : 25}
          className="min-h-[100px] min-w-[200px]"
        >
          <div className={`flex h-full flex-col ${layoutMode === "chat-right" ? "border-l" : "border-r"}`}>
            <div className="h-full flex-1 overflow-hidden">
              {/* --- ▼ ChatPane に渡す markdownContent を editorContent に変更 ▼ --- */}
              <ChatPane currentDocument={currentDocument} onApplyToEditor={handleEditorChange} />
              {/* --- ▲ ChatPane に渡す markdownContent を editorContent に変更 ▲ --- */}
            </div>
          </div>
        </ResizablePanel>
      ),
    // --- ▼ 依存配列を更新 ▼ ---
    [isChatVisible, layoutMode, currentDocument, handleEditorChange]
    // --- ▲ 依存配列を更新 ▲ ---
  );

  const renderEditorPanel = useCallback(
    () =>
      isEditorVisible && (
        <ResizablePanel
          id="editor-panel"
          order={layoutMode === "editor-focused" ? 1 : layoutMode === "chat-right" ? 1 : 2}
          collapsible={true} collapsedSize={0} minSize={15}
          defaultSize={layoutMode === "horizontal" ? 40 : 50}
          className="min-h-[100px] min-w-[200px]"
        >
          <div className="flex h-full flex-col">
            {/* --- ▼ EditorPane に editorContent と handleEditorChange を渡す ▼ --- */}
            <EditorPane
              markdown={editorContent}
              onChange={handleEditorChange}
              currentDocument={currentDocument}
            />
            {/* --- ▲ EditorPane に editorContent と handleEditorChange を渡す ▲ --- */}
          </div>
        </ResizablePanel>
      ),
    // --- ▼ 依存配列を更新 ▼ ---
    [isEditorVisible, layoutMode, editorContent, handleEditorChange, currentDocument]
    // --- ▲ 依存配列を更新 ▲ ---
  );

  const renderPreviewPanel = useCallback(
    () =>
      isPreviewVisible && (
        <ResizablePanel
          id="preview-panel"
          order={layoutMode === "editor-focused" ? 2 : layoutMode === "chat-right" ? 2 : 3}
          collapsible={true} collapsedSize={0} minSize={15}
          defaultSize={layoutMode === "horizontal" ? 35 : layoutMode === "editor-focused" ? 60 : 50}
          className="min-h-[100px] min-w-[200px]"
        >
          <div className="flex h-full flex-col">
            {/* --- ▼ PreviewPane に debouncedEditorContent を渡す ▼ --- */}
            <PreviewPane markdown={debouncedEditorContent} />
            {/* --- ▲ PreviewPane に debouncedEditorContent を渡す ▲ --- */}
          </div>
        </ResizablePanel>
      ),
    // --- ▼ 依存配列を更新 ▼ ---
    [isPreviewVisible, layoutMode, debouncedEditorContent]
    // --- ▲ 依存配列を更新 ▲ ---
  );

  // エディタ/プレビューのグループをレンダリングする関数 (変更なし)
  const renderEditorPreviewGroup = useCallback(
    (direction: "vertical" | "horizontal", defaultSize: number, order: number) =>
      (isEditorVisible || isPreviewVisible) && (
        <ResizablePanel
          id={`editor-preview-group-${layoutMode}`}
          order={order}
          defaultSize={defaultSize}
          minSize={30}
        >
          <ResizablePanelGroup direction={direction}>
            {renderEditorPanel()}
            {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
            {renderPreviewPanel()}
          </ResizablePanelGroup>
        </ResizablePanel>
      ),
    [isEditorVisible, isPreviewVisible, layoutMode, renderEditorPanel, renderPreviewPanel]
  );

  // DB未初期化時の表示 (変更なし)
  if (!isDbInitialized || dbError) {
    return (
      <main className="flex h-screen flex-col items-center justify-center">
        {dbError ? (
          <div className="text-destructive">データベースエラーが発生しました。詳細はコンソールを確認してください。</div>
        ) : (
          <div>データベースを初期化中...</div>
        )}
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* --- ▼ AppHeader に editorContent を渡す ▼ --- */}
      <AppHeader
        currentDocument={currentDocument}
        markdownContent={editorContent} // エクスポート用に最新の内容を渡す
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        isChatVisible={isChatVisible}
        isEditorVisible={isEditorVisible}
        isPreviewVisible={isPreviewVisible}
        togglePanel={togglePanel}
        visiblePanelsCount={visiblePanelsCount}
      />
      {/* --- ▲ AppHeader に editorContent を渡す ▲ --- */}

      {/* MainLayout (変更なし) */}
      <MainLayout
        layoutMode={layoutMode}
        isChatVisible={isChatVisible}
        isEditorVisible={isEditorVisible}
        isPreviewVisible={isPreviewVisible}
        renderChatPanel={renderChatPanel}
        renderEditorPanel={renderEditorPanel}
        renderPreviewPanel={renderPreviewPanel}
        renderEditorPreviewGroup={renderEditorPreviewGroup}
      />

      <Toaster />
    </main>
  );
}
