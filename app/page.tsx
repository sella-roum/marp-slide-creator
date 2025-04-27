"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
// useToast は hooks ディレクトリからインポート
import { useToast } from "@/hooks/use-toast"
import {
    initializeDB,
    getDocument,
    updateDocument,
} from "@/lib/db"
import type { DocumentType } from "@/lib/types"
import { ChatPane } from "@/components/chat-pane"
import { EditorPane } from "@/components/editor-pane"
import { PreviewPane } from "@/components/preview-pane"
// PresentationMode のインポート削除
import { ExportDropdown } from "@/components/export-dropdown"
// PresentationIcon, VersionHistoryPane 関連のアイコン削除
import { MessageSquareIcon, CodeIcon, EyeIcon, LayoutIcon, RowsIcon, ColumnsIcon, PanelRightIcon } from "lucide-react"
import { Toggle } from "@/components/ui/toggle"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Separator } from "@/components/ui/separator"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SINGLE_DOCUMENT_ID = "main-document";
type LayoutMode = 'default' | 'horizontal' | 'editor-focused' | 'chat-right';

export default function Home() {
  const { toast } = useToast()
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  // isPresentationMode state 削除
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('default');
  // VersionHistoryPane 関連の state 削除

  // DB初期化
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDB();
        setIsDbInitialized(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
        toast({ title: "DB初期化エラー", variant: "destructive" });
      }
    };
    initialize();
  }, [toast]);

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
          // バージョン履歴削除に伴い、初期コンテンツをシンプルに
          content: "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await updateDocument(newDocData); // put 操作で作成
        doc = await getDocument(SINGLE_DOCUMENT_ID);
        if (doc) {
            toast({ title: "新しいプレゼンテーションを作成しました" });
        } else {
            throw new Error("Failed to create or retrieve the document after creation attempt.");
        }
      }

      if (doc) {
        // currentDocument の比較ロジックを簡略化 (初回ロード or ID変更時のみ更新)
        if (!currentDocument || doc.id !== currentDocument.id) {
            setCurrentDocument(doc);
            setMarkdownContent(doc.content);
            console.log("Document loaded/updated:", doc.title);
        } else if (doc.content !== markdownContent) {
            // DBから読み込んだ内容が現在のstateと異なる場合（外部での変更など）は更新
            setMarkdownContent(doc.content);
            setCurrentDocument(doc); // currentDocumentも更新
            console.log("Document content updated from DB.");
        } else {
            console.log("Document already up-to-date in state.");
        }
      } else {
          console.error("Failed to load or create the document.");
          toast({ title: "エラー", description: "ドキュメントの読み込み/作成に失敗", variant: "destructive"});
      }

    } catch (error) {
      console.error("Failed to load or create single document:", error);
      toast({ title: "ドキュメントエラー", variant: "destructive" });
    }
  // currentDocument を依存配列から削除し、無限ループの可能性を減らす
  }, [isDbInitialized, toast, markdownContent]);

  // DB初期化後にドキュメント読み込み
  useEffect(() => {
    if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [isDbInitialized, loadOrCreateSingleDocument]);

  // Markdown 変更ハンドラ
  const handleMarkdownChange = (content: string) => {
    setMarkdownContent(content);
    // currentDocument の更新は debouncedSave に任せる
    // setCurrentDocument((prevDoc) => {
    //     if (!prevDoc) return null;
    //     // バージョン履歴削除に伴い、versions プロパティを削除
    //     const { versions, ...rest } = prevDoc;
    //     return { ...rest, content, updatedAt: new Date() };
    // });
  };

  // プレゼンテーションモード関連削除
  // const togglePresentationMode = () => { setIsPresentationMode(!isPresentationMode); };

  // カラム表示状態トグル関数
  const togglePanel = (panel: 'chat' | 'editor' | 'preview') => {
    switch (panel) {
      case 'chat': setIsChatVisible(!isChatVisible); break;
      case 'editor': setIsEditorVisible(!isEditorVisible); break;
      case 'preview': setIsPreviewVisible(!isPreviewVisible); break;
    }
  };

  // プレゼンテーションモードの条件分岐削除
  // if (isPresentationMode && currentDocument) { ... }

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(Boolean).length;

  // 各パネルのレンダリング関数 (変更なし)
  const renderChatPanel = () => (
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
          {/* ChatPane ヘッダーは ChatPane 内部に移動したため削除 */}
          <div className="flex-1 overflow-hidden h-full">
            <ChatPane
              currentDocument={currentDocument}
              onApplyToEditor={handleMarkdownChange}
            />
          </div>
        </div>
      </ResizablePanel>
    )
  );

  const renderEditorPanel = () => (
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
  );

  const renderPreviewPanel = () => (
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
  );

  // エディタ/プレビューのグループをレンダリングする関数 (変更なし)
  const renderEditorPreviewGroup = (direction: "vertical" | "horizontal", defaultSize: number, order: number) => (
    (isEditorVisible || isPreviewVisible) && (
        <ResizablePanel id={`editor-preview-group-${layoutMode}`} order={order} defaultSize={defaultSize} minSize={30}>
            <ResizablePanelGroup direction={direction}>
                {renderEditorPanel()}
                {isEditorVisible && isPreviewVisible && <ResizableHandle withHandle />}
                {renderPreviewPanel()}
            </ResizablePanelGroup>
        </ResizablePanel>
    )
  );

  // VersionHistoryPane のレンダリング削除

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
            {/* DocumentDropdown 削除 */}
            <h1 className="text-lg font-semibold truncate" title={currentDocument?.title}>
                {currentDocument?.title || "読み込み中..."}
            </h1>
        </div>
        <div className="flex items-center space-x-1">
            {/* レイアウト選択ドロップダウン (変更なし) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <LayoutIcon className="h-4 w-4 mr-1" />
                        Layout
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>レイアウト選択</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={layoutMode} onValueChange={(value) => setLayoutMode(value as LayoutMode)}>
                        <DropdownMenuRadioItem value="default"><ColumnsIcon className="h-4 w-4 mr-2 opacity-50"/> デフォルト (左チャット)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="chat-right"><PanelRightIcon className="h-4 w-4 mr-2 opacity-50"/> チャット右配置</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="horizontal"><RowsIcon className="h-4 w-4 mr-2 opacity-50"/> 横3列</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="editor-focused"><RowsIcon className="h-4 w-4 mr-2 opacity-50 rotate-90"/> エディタ重視 (縦積)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>

             <Separator orientation="vertical" className="h-6 mx-1" />

             {/* 表示切り替えトグル (変更なし) */}
             <Toggle size="sm" pressed={isChatVisible} onPressedChange={() => togglePanel('chat')} aria-label="Toggle Chat Panel" disabled={visiblePanelsCount === 1 && isChatVisible}><MessageSquareIcon className="h-4 w-4" /></Toggle>
             <Toggle size="sm" pressed={isEditorVisible} onPressedChange={() => togglePanel('editor')} aria-label="Toggle Editor Panel" disabled={visiblePanelsCount === 1 && isEditorVisible}><CodeIcon className="h-4 w-4" /></Toggle>
             <Toggle size="sm" pressed={isPreviewVisible} onPressedChange={() => togglePanel('preview')} aria-label="Toggle Preview Panel" disabled={visiblePanelsCount === 1 && isPreviewVisible}><EyeIcon className="h-4 w-4" /></Toggle>
             {/* Version History トグル削除 */}

             <Separator orientation="vertical" className="h-6 mx-1" />

          {/* エクスポートボタン (変更なし) */}
          <ExportDropdown markdown={markdownContent} documentTitle={currentDocument?.title || "Untitled"} />
          {/* Present ボタン削除済み */}
        </div>
      </header>

      {/* Main Content (変更なし) */}
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

      <Toaster />
    </main>
  );
}
