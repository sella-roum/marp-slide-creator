"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { useDb } from "@/lib/db-context"; // useDb フックをインポート
import {
    // initializeDB, // initializeDB は DbProvider で実行
    getDocument,
    updateDocument,
} from "@/lib/db"
import type { DocumentType } from "@/lib/types"
import { ChatPane } from "@/components/chat-pane"
import { EditorPane } from "@/components/editor-pane"
import { PreviewPane } from "@/components/preview-pane"
import { AppHeader } from "@/components/app-header"; // AppHeader をインポート
import { MainLayout } from "@/components/main-layout"; // MainLayout をインポート
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
// 定数をインポート
import { SINGLE_DOCUMENT_ID, type LayoutMode } from '@/lib/constants';

export default function Home() {
  const { toast } = useToast()
  const { isDbInitialized, dbError } = useDb(); // DB初期化状態とエラーを取得
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');

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

  // 単一ドキュメントの読み込み/作成 (useCallback の依存配列修正)
  const loadOrCreateSingleDocument = useCallback(async () => {
    // isDbInitialized を DbContext から取得するため、引数から削除
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
        // 外部で変更された場合のみ state を更新するように修正
        setCurrentDocument(prevDoc => {
            if (!prevDoc || prevDoc.id !== doc.id || prevDoc.updatedAt < doc.updatedAt) {
                setMarkdownContent(doc.content);
                console.log("Document loaded/updated in state:", doc.title);
                return doc;
            }
            return prevDoc; // 変更なければ state を維持
        });
      } else {
          console.error("Failed to load or create the document.");
          toast({ title: "エラー", description: "ドキュメントの読み込み/作成に失敗", variant: "destructive"});
      }

    } catch (error) {
      console.error("Failed to load or create single document:", error);
      // DBエラーは DbContext でハンドリングするため、ここでは重複しないように注意
      if (!(error instanceof Error && error.message.includes("Database"))) {
          toast({ title: "ドキュメントエラー", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
      }
    }
  // 依存配列から markdownContent を削除し、isDbInitialized を追加
  }, [isDbInitialized, toast]);

  // DB初期化後にドキュメント読み込み
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // Markdown 変更ハンドラ (useCallback でメモ化)
  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdownContent(content);
    // currentDocument の更新は debouncedSave に任せる
  }, []); // 依存配列は空

  // カラム表示状態トグル関数 (useCallback でメモ化)
  const togglePanel = useCallback((panel: 'chat' | 'editor' | 'preview') => {
    // isXxxVisible の state setter は安定しているので依存配列に含めなくて良い
    switch (panel) {
      case 'chat': setIsChatVisible(prev => !prev); break;
      case 'editor': setIsEditorVisible(prev => !prev); break;
      case 'preview': setIsPreviewVisible(prev => !prev); break;
    }
  }, []); // 依存配列は空

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(Boolean).length;

  // 各パネルのレンダリング関数 (useCallback でメモ化)
  const renderChatPanel = useCallback(() => (
    isChatVisible && (
      <ResizablePanel
        id="chat-panel"
        order={layoutMode === 'chat-right' ? 2 : 1}
        collapsible={true}
        collapsedSize={0}
        minSize={15}
        defaultSize={layoutMode === 'horizontal' ? 25 : (layoutMode === 'editor-focused' ? 40 : 25)}
        className="min-w-[200px] min-h-[100px]"
      >
        <div className={`h-full flex flex-col ${layoutMode === 'chat-right' ? 'border-l' : 'border-r'}`}>
          <div className="flex-1 overflow-hidden h-full">
            <ChatPane
              currentDocument={currentDocument}
              onApplyToEditor={handleMarkdownChange}
            />
          </div>
        </div>
      </ResizablePanel>
    )
  // 依存配列に必要な state と関数を追加
  ), [isChatVisible, layoutMode, currentDocument, handleMarkdownChange]);

  const renderEditorPanel = useCallback(() => (
    isEditorVisible && (
      <ResizablePanel
        id="editor-panel"
        order={layoutMode === 'editor-focused' ? 1 : (layoutMode === 'chat-right' ? 1 : 2)}
        collapsible={true}
        collapsedSize={0}
        minSize={15}
        defaultSize={layoutMode === 'horizontal' ? 40 : 50}
        className="min-w-[200px] min-h-[100px]"
      >
        <div className="h-full flex flex-col">
          <EditorPane
            markdown={markdownContent}
            onChange={handleMarkdownChange}
            currentDocument={currentDocument}
          />
        </div>
      </ResizablePanel>
    )
  // 依存配列に必要な state と関数を追加
  ), [isEditorVisible, layoutMode, markdownContent, handleMarkdownChange, currentDocument]);

  const renderPreviewPanel = useCallback(() => (
    isPreviewVisible && (
      <ResizablePanel
        id="preview-panel"
        order={layoutMode === 'editor-focused' ? 2 : (layoutMode === 'chat-right' ? 2 : 3)}
        collapsible={true}
        collapsedSize={0}
        minSize={15}
        defaultSize={layoutMode === 'horizontal' ? 35 : (layoutMode === 'editor-focused' ? 60 : 50)}
        className="min-w-[200px] min-h-[100px]"
      >
        <div className="h-full flex flex-col">
          <PreviewPane markdown={markdownContent} />
        </div>
      </ResizablePanel>
    )
  // 依存配列に必要な state を追加
  ), [isPreviewVisible, layoutMode, markdownContent]);

  // エディタ/プレビューのグループをレンダリングする関数 (useCallback でメモ化)
  const renderEditorPreviewGroup = useCallback((direction: "vertical" | "horizontal", defaultSize: number, order: number) => (
    (isEditorVisible || isPreviewVisible) && (
        <ResizablePanel id={`editor-preview-group-${layoutMode}`} order={order} defaultSize={defaultSize} minSize={30}>
            <ResizablePanelGroup direction={direction}>
                {renderEditorPanel()}
                {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
                {renderPreviewPanel()}
            </ResizablePanelGroup>
        </ResizablePanel>
    )
  // 依存配列に必要な state と関数を追加
  ), [isEditorVisible, isPreviewVisible, layoutMode, renderEditorPanel, renderPreviewPanel]);

  // DBが初期化されていない、またはエラーがある場合はローディング表示やエラー表示
  if (!isDbInitialized || dbError) {
    return (
      <main className="flex flex-col h-screen items-center justify-center">
        {dbError ? (
          <div className="text-destructive">データベースエラー: {dbError.message}</div>
        ) : (
          <div>データベースを初期化中...</div>
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* ヘッダーコンポーネントを使用 */}
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

      {/* レイアウトコンポーネントを使用 */}
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
