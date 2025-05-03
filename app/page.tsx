// app/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react"; // useRef をインポート
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
// --- ▼ 定数をインポート ▼ ---
import { SINGLE_DOCUMENT_ID, type LayoutMode, MAX_HISTORY_SIZE } from "@/lib/constants";
// --- ▲ 定数をインポート ▲ ---
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useDebounce } from "@/hooks/use-debounce";
import { updateMarkdownTheme } from "@/lib/utils";
import { CustomCssDialog } from "@/components/custom-css-dialog";

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

  // --- ▼ Undo/Redo 用 State ▼ ---
  const [history, setHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const isUndoingOrRedoingRef = useRef(false); // Undo/Redo操作中フラグ
  const debouncedEditorContentForHistory = useDebounce(editorContent, 750); // 履歴記録用デバウンス (プレビューより少し長め)
  // --- ▲ Undo/Redo 用 State ▲ ---

  // DB初期化エラーハンドリング (変更なし)
  useEffect(() => {
    if (dbError) {
      handleError({ error: dbError, context: "データベース初期化" });
    }
  }, [dbError, handleError]);

  // --- ▼ 履歴初期化処理を追加 ▼ ---
  const initializeHistory = useCallback((initialContent: string) => {
    setHistory([initialContent]);
    setHistoryPointer(0);
    setCanUndo(false);
    setCanRedo(false);
  }, []);
  // --- ▲ 履歴初期化処理を追加 ▲ ---

  // 単一ドキュメントの読み込み/作成 (履歴初期化を追加)
  const loadOrCreateSingleDocument = useCallback(async () => {
    if (!isDbInitialized) return;
    try {
      console.log(`Loading document with ID: ${SINGLE_DOCUMENT_ID}`);
      let doc = await getDocument(SINGLE_DOCUMENT_ID);

      if (!doc) {
        console.log("Document not found, creating a new one...");
        const initialContent = "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n"; // 初期コンテンツ
        const newDocData: DocumentType = {
          id: SINGLE_DOCUMENT_ID,
          title: "My Presentation",
          content: initialContent, // 初期コンテンツを設定
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
        initializeHistory(initialContent); // ★ 新規作成時に履歴を初期化
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
            setEditorContent(doc.content);
            console.log("Document loaded/updated in state:", doc.title, "Theme:", doc.selectedTheme);
            // ★ ドキュメント読み込み時にも履歴を初期化
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
  }, [isDbInitialized, handleError, initializeHistory]); // initializeHistory を依存配列に追加

  // DB初期化後にドキュメント読み込み (変更なし)
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // --- ▼ 履歴追加ロジック ▼ ---
  const addHistoryEntry = useCallback((newContent: string) => {
    // Undo/Redo操作中は履歴を追加しない
    if (isUndoingOrRedoingRef.current) {
      return;
    }
    // 現在の履歴ポインタ以降の履歴を削除
    const newHistory = history.slice(0, historyPointer + 1);
    // 新しいコンテンツを追加
    newHistory.push(newContent);
    // 最大履歴サイズを超えたら古い履歴を削除
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift(); // 配列の先頭を削除
    }
    setHistory(newHistory);
    // ポインタを新しい末尾に更新
    const newPointer = newHistory.length - 1;
    setHistoryPointer(newPointer);
    // Undo/Redo可能状態を更新
    setCanUndo(newPointer > 0);
    setCanRedo(false); // 新しいエントリを追加したらRedoは不可
  }, [history, historyPointer]);

  // デバウンスされたコンテンツが変更されたら履歴に追加
  useEffect(() => {
    // 初期読み込み時やUndo/Redo中は無視
    if (historyPointer === -1 || isUndoingOrRedoingRef.current) {
      return;
    }
    // 履歴の最新エントリと比較して変更があれば追加
    if (debouncedEditorContentForHistory !== history[historyPointer]) {
      addHistoryEntry(debouncedEditorContentForHistory);
    }
  }, [debouncedEditorContentForHistory, addHistoryEntry, history, historyPointer]);
  // --- ▲ 履歴追加ロジック ▲ ---

  // Markdown 変更ハンドラ (setEditorContent のみ行う)
  const handleEditorChange = useCallback((content: string) => {
    // Undo/Redo操作による変更でなければ、フラグをリセットしておく
    // (直接入力やツールバー操作の場合)
    if (isUndoingOrRedoingRef.current) {
        // console.log("Change triggered by Undo/Redo, skipping history flag reset for now.");
    } else {
        // console.log("Change triggered by user/toolbar.");
    }
    setEditorContent(content);
  }, []); // 依存配列は空でOK

  // --- ▼ Undo/Redo ハンドラ ▼ ---
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    isUndoingOrRedoingRef.current = true; // 操作開始フラグ
    const newPointer = historyPointer - 1;
    setHistoryPointer(newPointer);
    setEditorContent(history[newPointer]); // 履歴から復元
    setCanUndo(newPointer > 0);
    setCanRedo(true);
    // フラグをリセット (非同期の可能性も考慮するなら setTimeout(..., 0) など)
    requestAnimationFrame(() => { isUndoingOrRedoingRef.current = false; });
    console.log("Undo performed");
  }, [canUndo, history, historyPointer]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    isUndoingOrRedoingRef.current = true; // 操作開始フラグ
    const newPointer = historyPointer + 1;
    setHistoryPointer(newPointer);
    setEditorContent(history[newPointer]); // 履歴から復元
    setCanUndo(true);
    setCanRedo(newPointer < history.length - 1);
    // フラグをリセット
     requestAnimationFrame(() => { isUndoingOrRedoingRef.current = false; });
    console.log("Redo performed");
  }, [canRedo, history, historyPointer]);
  // --- ▲ Undo/Redo ハンドラ ▲ ---

  // --- ▼ キーボードショートカット ▼ ---
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKey = event.ctrlKey || event.metaKey; // Ctrl (Win/Linux) or Cmd (Mac)

      if (isModKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if (
        (isModKey && event.key === 'y') || // Ctrl+Y (Win/Linux Redo)
        (isModKey && event.shiftKey && event.key === 'z') // Ctrl+Shift+Z (Common Redo) / Cmd+Shift+Z (Mac Redo)
      ) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]); // ハンドラを依存配列に追加
  // --- ▲ キーボードショートカット ▲ ---


  // テーマ変更ハンドラ (変更なし)
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
    // ★ テーマ変更も履歴に追加（デバウンス経由）
    // handleEditorChange(updatedContent); // これだとデバウンスされる
    addHistoryEntry(updatedContent); // 即時履歴追加する場合

    try {
      await updateDocument(updatedDoc);
      console.log("Theme updated in DB.");
    } catch (error) {
      handleError({ error, context: "テーマの保存" });
      setCurrentDocument(currentDocument);
      setEditorContent(currentDocument.content);
      // エラー時は履歴を戻す処理も必要になる可能性があるが、一旦省略
    }
  }, [currentDocument, editorContent, handleError, addHistoryEntry]); // addHistoryEntry を依存配列に追加

  // カスタムCSS編集ダイアログを開くハンドラ (変更なし)
  const handleEditCustomCss = useCallback(() => {
    if (!currentDocument) return;
    setIsCustomCssDialogOpen(true);
  }, [currentDocument]);

  // カスタムCSS保存ハンドラ (変更なし)
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
    // ★ CSS変更はエディタ内容の変更ではないため、履歴には追加しない
    try {
      await updateDocument(updatedDoc);
      console.log("Custom CSS saved to DB.");
    } catch (error) {
      handleError({ error, context: "カスタムCSSの保存" });
      setCurrentDocument(currentDocument);
    }
  }, [currentDocument, handleError]);

  // カラム表示状態トグル関数 (変更なし)
  const togglePanel = useCallback((panel: "chat" | "editor" | "preview") => {
    switch (panel) {
      case "chat": setIsChatVisible((prev) => !prev); break;
      case "editor": setIsEditorVisible((prev) => !prev); break;
      case "preview": setIsPreviewVisible((prev) => !prev); break;
    }
  }, []);

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(Boolean).length;

  // 各パネルのレンダリング関数 (EditorPane に Undo/Redo 関連の props を渡す)
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
                onApplyToEditor={handleEditorChange} // AI適用時も handleEditorChange を使う
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
              onChange={handleEditorChange} // テキストエリア変更、ツールバー操作で呼ばれる
              currentDocument={currentDocument}
              selectedTheme={currentDocument?.selectedTheme || 'default'}
              onThemeChange={handleThemeChange}
              onEditCustomCss={handleEditCustomCss}
              // --- ▼ Undo/Redo 関連の props を渡す ▼ ---
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              // --- ▲ Undo/Redo 関連の props を渡す ▲ ---
            />
          </div>
        </ResizablePanel>
      ),
    // --- ▼ 依存配列に Undo/Redo 関連を追加 ▼ ---
    [isEditorVisible, layoutMode, editorContent, handleEditorChange, currentDocument, handleThemeChange, handleEditCustomCss, handleUndo, handleRedo, canUndo, canRedo]
    // --- ▲ 依存配列に Undo/Redo 関連を追加 ▲ ---
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
              markdown={debouncedEditorContent} // プレビューはデバウンスされたものを使用
              selectedTheme={currentDocument?.selectedTheme || 'default'}
              customCss={currentDocument?.customCss || ''}
            />
          </div>
        </ResizablePanel>
      ),
    [isPreviewVisible, layoutMode, debouncedEditorContent, currentDocument?.selectedTheme, currentDocument?.customCss]
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

      {/* カスタムCSSダイアログ (変更なし) */}
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
