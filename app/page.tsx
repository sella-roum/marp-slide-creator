"use client"

import { useEffect, useState, useCallback } from "react" // useCallback を追加
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import {
    initializeDB,
    getDocuments,
    getDocument,
    addDocument,
    updateDocument, // updateDocument をインポート
    deleteDocument, // deleteDocument をインポート
    renameDocument, // renameDocument をインポート
} from "@/lib/db"
import type { DocumentType } from "@/lib/types"
import { ChatPane } from "@/components/chat-pane"
import { EditorPane } from "@/components/editor-pane"
import { PreviewPane } from "@/components/preview-pane"
import { PresentationMode } from "@/components/presentation-mode"
import { ExportDropdown } from "@/components/export-dropdown"
import { DocumentDropdown } from "@/components/document-dropdown" // 新規コンポーネントをインポート
import { MessageSquareIcon } from "lucide-react"

export default function Home() {
  const { toast } = useToast()
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [documents, setDocuments] = useState<DocumentType[]>([]) // documents state を復活
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [rightPaneTab, setRightPaneTab] = useState("editor")

  // ドキュメントリストを読み込む関数
  const loadDocuments = useCallback(async (selectDocId?: string) => {
    if (!isDbInitialized) return; // DB初期化後に実行
    try {
      console.log("Loading documents...");
      const docs = await getDocuments();
      setDocuments(docs);
      console.log(`Loaded ${docs.length} documents.`);

      let docToSelect = null;

      if (selectDocId && docs.some(d => d.id === selectDocId)) {
        // 指定されたIDのドキュメントを選択
        docToSelect = await getDocument(selectDocId);
      } else if (docs.length > 0) {
        // 指定がない場合、または指定IDが見つからない場合は、最後に更新されたドキュメントを選択
        const sortedDocs = [...docs].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        docToSelect = await getDocument(sortedDocs[0].id);
        console.log("Selecting last updated document:", docToSelect?.title);
      } else {
        // ドキュメントが1つもない場合は新規作成
        console.log("No documents found, creating a new one.");
        const newDocData: Omit<DocumentType, 'id' | 'versions'> = {
          title: "Untitled Presentation",
          content: "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const newDocId = await addDocument(newDocData);
        docToSelect = await getDocument(newDocId);
        setDocuments([docToSelect!]); // 新規作成後リストを更新
        toast({ title: "新しいプレゼンテーションを作成しました" });
        console.log("Created and selected new document:", docToSelect?.title);
      }

      if (docToSelect && docToSelect.id !== currentDocument?.id) {
        setCurrentDocument(docToSelect);
        setMarkdownContent(docToSelect.content);
        console.log("Current document set to:", docToSelect.title);
      } else if (!docToSelect) {
          // ドキュメントが選択できなかった場合（エラーケース）
          setCurrentDocument(null);
          setMarkdownContent("");
          console.warn("No document could be selected.");
      }

    } catch (error) {
      console.error("Failed to load or select document:", error);
      toast({
        title: "ドキュメントエラー",
        description: "ドキュメントの読み込みまたは選択に失敗しました。",
        variant: "destructive",
      });
    }
  }, [isDbInitialized, toast, currentDocument?.id]); // currentDocument.id を依存配列に追加

  // Initialize IndexedDB and load initial documents
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDB();
        setIsDbInitialized(true);
        // DB初期化後にドキュメントを読み込む (loadDocuments が isDbInitialized を見て実行される)
      } catch (error) {
        console.error("Failed to initialize database:", error);
        toast({
          title: "Database Error",
          description: "Failed to initialize the local database.",
          variant: "destructive",
        });
      }
    };
    initialize();
  }, [toast]);

  // isDbInitialized が true になったらドキュメントを読み込む
  useEffect(() => {
    if (isDbInitialized) {
      loadDocuments();
    }
  }, [isDbInitialized, loadDocuments]);


  // Handle document change from dropdown
  const handleDocumentChange = useCallback(async (doc: DocumentType) => {
    if (doc && doc.id !== currentDocument?.id) {
      console.log("Changing document to:", doc.title);
      // 念のため最新のデータをDBから取得
      const fullDoc = await getDocument(doc.id);
      if (fullDoc) {
          setCurrentDocument(fullDoc);
          setMarkdownContent(fullDoc.content);
      } else {
          console.error(`Failed to get full document data for id: ${doc.id}`);
          toast({ title: "エラー", description: "ドキュメントの読み込みに失敗しました。", variant: "destructive" });
          await loadDocuments(); // リストを再読み込み
      }
    }
  }, [currentDocument?.id, toast, loadDocuments]);

  // Handle markdown content change
  const handleMarkdownChange = (content: string) => {
    setMarkdownContent(content);
    // Update current document in state (actual save to DB is debounced in the editor)
    if (currentDocument) {
      setCurrentDocument((prevDoc) => prevDoc ? {
        ...prevDoc,
        content,
        updatedAt: new Date(), // UI上の更新日時も更新
      } : null);
    }
  };

  // Toggle presentation mode
  const togglePresentationMode = () => {
    setIsPresentationMode(!isPresentationMode);
  };

  // Handle creating a new document
  const handleCreateNewDocument = async () => {
    try {
      const newDocData: Omit<DocumentType, 'id' | 'versions'> = {
        title: `Untitled ${documents.length + 1}`, // シンプルな連番タイトル
        content: "---\nmarp: true\ntheme: default\n---\n\n# New Slide\n\n",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const newDocId = await addDocument(newDocData);
      toast({ title: "新しいドキュメントを作成しました" });
      await loadDocuments(newDocId); // 新しいドキュメントを選択してリロード
    } catch (error) {
      console.error("Failed to create new document:", error);
      toast({
        title: "エラー",
        description: "新しいドキュメントの作成に失敗しました。",
        variant: "destructive",
      });
    }
  };

  // Handle renaming a document
  const handleRenameDocument = async (id: string, newTitle: string) => {
    try {
      await renameDocument(id, newTitle);
      toast({ title: "ドキュメント名を変更しました" });
      // 現在のドキュメントがリネームされた場合、UIも更新
      if (currentDocument?.id === id) {
        setCurrentDocument((prev) => prev ? { ...prev, title: newTitle, updatedAt: new Date() } : null);
      }
      await loadDocuments(currentDocument?.id); // リストを更新 (現在の選択を維持)
    } catch (error) {
      console.error("Failed to rename document:", error);
      toast({
        title: "エラー",
        description: "ドキュメント名の変更に失敗しました。",
        variant: "destructive",
      });
    }
  };

  // Handle deleting a document
  const handleDeleteDocument = async (id: string) => {
    if (documents.length <= 1) {
        toast({ title: "削除不可", description: "最後のドキュメントは削除できません。", variant: "destructive"});
        return;
    }
    try {
      await deleteDocument(id);
      toast({ title: "ドキュメントを削除しました" });
      // 削除されたのが現在のドキュメントなら、別のドキュメントを選択してリロード
      if (currentDocument?.id === id) {
        await loadDocuments(); // 引数なしで最後に更新されたものを選択
      } else {
        await loadDocuments(currentDocument?.id); // リストのみ更新
      }
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast({
        title: "エラー",
        description: "ドキュメントの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };


  if (isPresentationMode && currentDocument) {
    return <PresentationMode markdown={markdownContent} onExit={togglePresentationMode} />;
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2"> {/* ドロップダウンとタイトルをグループ化 */}
            <DocumentDropdown
                documents={documents}
                currentDocument={currentDocument}
                onDocumentChange={handleDocumentChange}
                onCreateNew={handleCreateNewDocument}
                onRename={handleRenameDocument}
                onDelete={handleDeleteDocument}
            />
            {/* <h1 className="text-xl font-bold hidden sm:block">AI Marp Creator</h1> */} {/* 必要ならタイトル表示 */}
        </div>
        <div className="flex items-center space-x-2">
          <ExportDropdown markdown={markdownContent} documentTitle={currentDocument?.title || "Untitled"} />
          <Button variant="outline" onClick={togglePresentationMode} disabled={!currentDocument}>
            Present
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Chat Only */}
        <div className="w-1/3 border-r h-full flex flex-col">
          <div className="flex items-center p-3 border-b bg-muted">
            <MessageSquareIcon className="h-4 w-4 mr-2" />
            <h3 className="text-sm font-medium">AI Chat</h3>
          </div>
          <div className="flex-1 overflow-hidden h-full">
            <ChatPane
              currentDocument={currentDocument}
              onApplyToEditor={(content) => handleMarkdownChange(content)}
            />
          </div>
        </div>

        {/* Right Column - Editor and Preview */}
        <div className="w-2/3 h-full flex flex-col">
          <Tabs value={rightPaneTab} onValueChange={setRightPaneTab} className="w-full h-full flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="editor" className="flex-1">
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="flex-1 overflow-hidden h-full">
              <EditorPane
                markdown={markdownContent}
                onChange={handleMarkdownChange}
                currentDocument={currentDocument}
              />
            </TabsContent>

            <TabsContent value="preview" className="flex-1 overflow-hidden h-full">
              <PreviewPane markdown={markdownContent} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Toaster />
    </main>
  );
}
