"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useDb } from "@/lib/db-context"; // useDb フックをインポート
import { getDocument, updateDocument } from "@/lib/db";
import type { DocumentType } from "@/lib/types";
import { ChatPane } from "@/components/chat-pane";
import { EditorPane } from "@/components/editor-pane";
import { PreviewPane } from "@/components/preview-pane";
import { AppHeader } from "@/components/app-header"; // AppHeader をインポート
import { MainLayout } from "@/components/main-layout"; // MainLayout をインポート
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
// 定数をインポート
import { SINGLE_DOCUMENT_ID, type LayoutMode } from "@/lib/constants";

export default function Home() {
  const { toast } = useToast();
  const { isDbInitialized, dbError } = useDb(); // DB初期化状態とエラーを取得
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  const [markdownContent, setMarkdownContent] = useState("");
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  // layoutMode の初期値を 'horizontal' に変更
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");

  // DB初期化エラーハンドリング
  useEffect(() => {
    if (dbError) {
      toast({
        title: "データベースエラー",
        description: `データベースの初期化に失敗しました: ${dbError.message}`,
        variant: "destructive",
      });
    }
  }, [dbError, toast]);

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
        if (doc) {
          toast({ title: "新しいプレゼンテーションを作成しました" });
        } else {
          throw new Error("Failed to create or retrieve the document after creation attempt.");
        }
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
            setMarkdownContent(doc.content);
            console.log("Document loaded/updated in state:", doc.title);
            return doc;
          }
          return prevDoc;
        });
      } else {
        console.error("Failed to load or create the document.");
        toast({
          title: "エラー",
          description: "ドキュメントの読み込み/作成に失敗",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load or create single document:", error);
      if (!(error instanceof Error && error.message.includes("Database"))) {
        toast({
          title: "ドキュメントエラー",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }
    }
  }, [isDbInitialized, toast]);

  // DB初期化後にドキュメント読み込み
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // Markdown 変更ハンドラ
  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdownContent(content);
  }, []);

  // カラム表示状態トグル関数
  const togglePanel = useCallback((panel: "chat" | "editor" | "preview") => {
    switch (panel) {
      case "chat":
        setIsChatVisible((prev) => !prev);
        break;
      case "editor":
        setIsEditorVisible((prev) => !prev);
        break;
      case "preview":
        setIsPreviewVisible((prev) => !prev);
        break;
    }
  }, []);

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(
    Boolean
  ).length;

  // 各パネルのレンダリング関数
  const renderChatPanel = useCallback(
    () =>
      isChatVisible && (
        <ResizablePanel
          id="chat-panel"
          order={layoutMode === "chat-right" ? 2 : 1}
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
              <ChatPane currentDocument={currentDocument} onApplyToEditor={handleMarkdownChange} />
            </div>
          </div>
        </ResizablePanel>
      ),
    [isChatVisible, layoutMode, currentDocument, handleMarkdownChange]
  );

  const renderEditorPanel = useCallback(
    () =>
      isEditorVisible && (
        <ResizablePanel
          id="editor-panel"
          order={layoutMode === "editor-focused" ? 1 : layoutMode === "chat-right" ? 1 : 2}
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
              currentDocument={currentDocument}
            />
          </div>
        </ResizablePanel>
      ),
    [isEditorVisible, layoutMode, markdownContent, handleMarkdownChange, currentDocument]
  );

  const renderPreviewPanel = useCallback(
    () =>
      isPreviewVisible && (
        <ResizablePanel
          id="preview-panel"
          order={layoutMode === "editor-focused" ? 2 : layoutMode === "chat-right" ? 2 : 3}
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
      ),
    [isPreviewVisible, layoutMode, markdownContent]
  );

  // エディタ/プレビューのグループをレンダリングする関数
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

  if (!isDbInitialized || dbError) {
    return (
      <main className="flex h-screen flex-col items-center justify-center">
        {dbError ? (
          <div className="text-destructive">データベースエラー: {dbError.message}</div>
        ) : (
          <div>データベースを初期化中...</div>
        )}
      </main>
    );
  }

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
      />

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
