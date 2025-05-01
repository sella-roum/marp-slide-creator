"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { useDebounce } from "@/hooks/use-debounce";
import { updateMarkdownTheme } from "@/lib/utils";
import { CustomCssDialog } from "@/components/custom-css-dialog";

export default function Home() {
  const { isDbInitialized, dbError } = useDb();
  const { handleError } = useErrorHandler();
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const debouncedEditorContent = useDebounce(editorContent, 500);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");
  const [isCustomCssDialogOpen, setIsCustomCssDialogOpen] = useState(false);

  // DB初期化エラーハンドリング
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
          selectedTheme: 'default',
          customCss: '',
        };
        await updateDocument(newDocData);
        doc = await getDocument(SINGLE_DOCUMENT_ID);
        if (!doc) {
          throw new Error("Failed to create or retrieve the document after creation attempt.");
        }
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
            setEditorContent(doc.content);
            console.log("Document loaded/updated in state:", doc.title, "Theme:", doc.selectedTheme);
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

  // DB初期化後にドキュメント読み込み
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // Markdown 変更ハンドラ
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
  }, []);

  // --- ★ テーマ変更ハンドラを修正 ---
  const handleThemeChange = useCallback(async (newTheme: string) => {
    if (!currentDocument || newTheme === currentDocument.selectedTheme) return;

    console.log("Theme changed to:", newTheme);

    let updatedContent = editorContent;
    // ★ 'custom' 以外のテーマが選択された場合のみ Markdown を更新
    if (newTheme !== 'custom') {
      updatedContent = updateMarkdownTheme(editorContent, newTheme);
      setEditorContent(updatedContent); // エディタ表示を更新
    }

    const updatedDoc: DocumentType = {
      ...currentDocument,
      content: updatedContent, // 更新後のコンテンツ (custom選択時は変更なし)
      selectedTheme: newTheme, // 選択されたテーマを設定
      // customCss は変更しない
      updatedAt: new Date(),
    };
    setCurrentDocument(updatedDoc); // ローカルステートを即時更新

    try {
      await updateDocument(updatedDoc); // DBに保存
      console.log("Theme updated in DB.");
    } catch (error) {
      handleError({ error, context: "テーマの保存" });
      // エラー発生時はステートを元に戻す
      setCurrentDocument(currentDocument);
      setEditorContent(currentDocument.content); // エディタの内容も元に戻す
    }
  }, [currentDocument, editorContent, handleError]);
  // --- テーマ変更ハンドラ修正ここまで ---

  // カスタムCSS編集ダイアログを開くハンドラ
  const handleEditCustomCss = useCallback(() => {
    if (!currentDocument) return;
    setIsCustomCssDialogOpen(true);
  }, [currentDocument]);

  // カスタムCSS保存ハンドラ
  const handleSaveCustomCss = useCallback(async (newCss: string) => {
    if (!currentDocument) return;

    console.log("Saving custom CSS...");
    const updatedDoc: DocumentType = {
      ...currentDocument,
      selectedTheme: 'custom',
      customCss: newCss,
      updatedAt: new Date(),
      // content は変更しない (theme: default のままにする)
      // 必要であればここで updateMarkdownTheme(editorContent, 'default') を呼ぶ
    };
    setCurrentDocument(updatedDoc);

    try {
      await updateDocument(updatedDoc);
      console.log("Custom CSS saved to DB.");
    } catch (error) {
      handleError({ error, context: "カスタムCSSの保存" });
      setCurrentDocument(currentDocument);
    }
  }, [currentDocument, handleError]); // editorContent は不要

  // カラム表示状態トグル関数
  const togglePanel = useCallback((panel: "chat" | "editor" | "preview") => {
    switch (panel) {
      case "chat": setIsChatVisible((prev) => !prev); break;
      case "editor": setIsEditorVisible((prev) => !prev); break;
      case "preview": setIsPreviewVisible((prev) => !prev); break;
    }
  }, []);

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(Boolean).length;

  // 各パネルのレンダリング関数
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
              <ChatPane
                currentDocument={currentDocument}
                onApplyToEditor={handleEditorChange}
                onApplyCustomCss={handleSaveCustomCss}
              />
            </div>
          </div>
        </ResizablePanel>
      ),
    [isChatVisible, layoutMode, currentDocument, handleEditorChange, handleSaveCustomCss]
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
            <EditorPane
              markdown={editorContent}
              onChange={handleEditorChange}
              currentDocument={currentDocument} // ★ EditorToolbar に渡すために必要
              selectedTheme={currentDocument?.selectedTheme || 'default'}
              onThemeChange={handleThemeChange}
              onEditCustomCss={handleEditCustomCss}
            />
          </div>
        </ResizablePanel>
      ),
    [isEditorVisible, layoutMode, editorContent, handleEditorChange, currentDocument, handleThemeChange, handleEditCustomCss]
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
            <PreviewPane
              markdown={debouncedEditorContent}
              selectedTheme={currentDocument?.selectedTheme || 'default'}
              customCss={currentDocument?.customCss || ''}
            />
          </div>
        </ResizablePanel>
      ),
    [isPreviewVisible, layoutMode, debouncedEditorContent, currentDocument?.selectedTheme, currentDocument?.customCss]
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

  // DB未初期化時の表示
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
      <AppHeader
        currentDocument={currentDocument}
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

      {/* カスタムCSSダイアログ */}
      <CustomCssDialog
        isOpen={isCustomCssDialogOpen}
        onOpenChange={setIsCustomCssDialogOpen}
        initialCss={currentDocument?.customCss || ''}
        onSave={handleSaveCustomCss}
      />

      <Toaster />
    </main>
  );
}
