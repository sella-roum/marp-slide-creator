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
import { SINGLE_DOCUMENT_ID, type LayoutMode, MAX_HISTORY_SIZE } from "@/lib/constants";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useDebounce } from "@/hooks/use-debounce";
import { updateMarkdownTheme } from "@/lib/utils";
import { CustomCssDialog } from "@/components/custom-css-dialog";
import { HelpDialog } from "@/components/help-dialog"; // ★ HelpDialog をインポート

export default function Home() {
  const { isDbInitialized, dbError } = useDb();
  const { handleError } = useErrorHandler();
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  const [editorContent, setEditorContent] = useState("");
  const debouncedEditorContent = useDebounce(editorContent, 500); // プレビュー用
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("horizontal");
  const [isCustomCssDialogOpen, setIsCustomCssDialogOpen] = useState(false);
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false); // ★ ヘルプダイアログの状態を追加

  // --- Undo/Redo 用 State ---
  const [history, setHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoingOrRedoingRef = useRef(false);
  const debouncedEditorContentForHistory = useDebounce(editorContent, 750);

  // DB初期化エラーハンドリング
  useEffect(() => {
    if (dbError) {
      handleError({ error: dbError, context: "データベース初期化" });
    }
  }, [dbError, handleError]);

  // 履歴初期化処理
  const initializeHistory = useCallback((initialContent: string) => {
    setHistory([initialContent]);
    setHistoryPointer(0);
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // 単一ドキュメントの読み込み/作成
  const loadOrCreateSingleDocument = useCallback(async () => {
    if (!isDbInitialized) return;
    try {
      console.log(`Loading document with ID: ${SINGLE_DOCUMENT_ID}`);
      let doc = await getDocument(SINGLE_DOCUMENT_ID);

      if (!doc) {
        console.log("Document not found, creating a new one...");
        const initialContent = "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n";
        const newDocData: DocumentType = {
          id: SINGLE_DOCUMENT_ID,
          title: "My Presentation",
          content: initialContent,
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
        initializeHistory(initialContent);
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
            setEditorContent(doc.content);
            console.log("Document loaded/updated in state:", doc.title, "Theme:", doc.selectedTheme);
            if (!prevDoc || prevDoc.id !== doc.id) {
                initializeHistory(doc.content);
            }
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
  }, [isDbInitialized, handleError, initializeHistory]);

  // DB初期化後にドキュメント読み込み
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // 履歴追加ロジック
  const addHistoryEntry = useCallback((newContent: string) => {
    if (isUndoingOrRedoingRef.current) return;
    const newHistory = history.slice(0, historyPointer + 1);
    newHistory.push(newContent);
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }
    setHistory(newHistory);
    const newPointer = newHistory.length - 1;
    setHistoryPointer(newPointer);
    setCanUndo(newPointer > 0);
    setCanRedo(false);
  }, [history, historyPointer]);

  // デバウンスされたコンテンツが変更されたら履歴に追加
  useEffect(() => {
    if (historyPointer === -1 || isUndoingOrRedoingRef.current) return;
    if (debouncedEditorContentForHistory !== history[historyPointer]) {
      addHistoryEntry(debouncedEditorContentForHistory);
    }
  }, [debouncedEditorContentForHistory, addHistoryEntry, history, historyPointer]);

  // Markdown 変更ハンドラ
  const handleEditorChange = useCallback((content: string) => {
    if (!isUndoingOrRedoingRef.current) {
        // console.log("Change triggered by user/toolbar.");
    }
    setEditorContent(content);
  }, []);

  // Undo/Redo ハンドラ
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoingOrRedoingRef.current = true;
    const newPointer = historyPointer - 1;
    setHistoryPointer(newPointer);
    setEditorContent(history[newPointer]);
    setCanUndo(newPointer > 0);
    setCanRedo(true);
    requestAnimationFrame(() => { isUndoingOrRedoingRef.current = false; });
    console.log("Undo performed");
  }, [canUndo, history, historyPointer]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoingOrRedoingRef.current = true;
    const newPointer = historyPointer + 1;
    setHistoryPointer(newPointer);
    setEditorContent(history[newPointer]);
    setCanUndo(true);
    setCanRedo(newPointer < history.length - 1);
     requestAnimationFrame(() => { isUndoingOrRedoingRef.current = false; });
    console.log("Redo performed");
  }, [canRedo, history, historyPointer]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKey = event.ctrlKey || event.metaKey;
      if (isModKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault(); handleUndo();
      } else if ((isModKey && event.key === 'y') || (isModKey && event.shiftKey && event.key === 'z')) {
        event.preventDefault(); handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // テーマ変更ハンドラ
  const handleThemeChange = useCallback(async (newTheme: string) => {
    if (!currentDocument || newTheme === currentDocument.selectedTheme) return;
    console.log("Theme changed to:", newTheme);
    let updatedContent = editorContent;
    if (newTheme !== 'custom') {
      updatedContent = updateMarkdownTheme(editorContent, newTheme);
      setEditorContent(updatedContent);
    }
    const updatedDoc: DocumentType = {
      ...currentDocument,
      content: updatedContent,
      selectedTheme: newTheme,
      updatedAt: new Date(),
    };
    setCurrentDocument(updatedDoc);
    addHistoryEntry(updatedContent);

    try {
      await updateDocument(updatedDoc);
      console.log("Theme updated in DB.");
    } catch (error) {
      handleError({ error, context: "テーマの保存" });
      setCurrentDocument(currentDocument);
      setEditorContent(currentDocument.content);
    }
  }, [currentDocument, editorContent, handleError, addHistoryEntry]);

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
    };
    setCurrentDocument(updatedDoc);
    try {
      await updateDocument(updatedDoc);
      console.log("Custom CSS saved to DB.");
    } catch (error) {
      handleError({ error, context: "カスタムCSSの保存" });
      setCurrentDocument(currentDocument);
    }
  }, [currentDocument, handleError]);

  // ★ ヘルプダイアログを開くハンドラを追加
  const handleOpenHelpDialog = useCallback(() => {
    setIsHelpDialogOpen(true);
  }, []);

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
          id="chat-panel" order={layoutMode === "chat-right" ? 2 : 1}
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
          id="editor-panel" order={layoutMode === "editor-focused" ? 1 : layoutMode === "chat-right" ? 1 : 2}
          collapsible={true} collapsedSize={0} minSize={15}
          defaultSize={layoutMode === "horizontal" ? 40 : 50}
          className="min-h-[100px] min-w-[200px]"
        >
          <div className="flex h-full flex-col">
            <EditorPane
              markdown={editorContent}
              onChange={handleEditorChange}
              currentDocument={currentDocument}
              selectedTheme={currentDocument?.selectedTheme || 'default'}
              onThemeChange={handleThemeChange}
              onEditCustomCss={handleEditCustomCss}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
            />
          </div>
        </ResizablePanel>
      ),
    [isEditorVisible, layoutMode, editorContent, handleEditorChange, currentDocument, handleThemeChange, handleEditCustomCss, handleUndo, handleRedo, canUndo, canRedo]
  );

  const renderPreviewPanel = useCallback(
    () =>
      isPreviewVisible && (
        <ResizablePanel
          id="preview-panel" order={layoutMode === "editor-focused" ? 2 : layoutMode === "chat-right" ? 2 : 3}
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
        <ResizablePanel id={`editor-preview-group-${layoutMode}`} order={order} defaultSize={defaultSize} minSize={30}>
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
        onOpenHelpDialog={handleOpenHelpDialog} // ★ ヘルプダイアログを開く関数を渡す
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

      {/* ★ ヘルプダイアログ */}
      <HelpDialog
        isOpen={isHelpDialogOpen}
        onOpenChange={setIsHelpDialogOpen}
      />

      <Toaster />
    </main>
  );
}
