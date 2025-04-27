"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" // Tabs は右ペインでまだ使うので残す
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { initializeDB, getDocuments, getDocument, addDocument } from "@/lib/db" // addDocument を追加 (初期ドキュメント作成用)
import type { DocumentType } from "@/lib/types"
// import { NavigationPane } from "@/components/navigation-pane" // 削除
import { ChatPane } from "@/components/chat-pane"
import { EditorPane } from "@/components/editor-pane"
import { PreviewPane } from "@/components/preview-pane"
import { PresentationMode } from "@/components/presentation-mode"
import { ExportDropdown } from "@/components/export-dropdown"
// import { LayoutIcon, MessageSquareIcon, HistoryIcon } from "lucide-react" // LayoutIcon, HistoryIcon を削除
import { MessageSquareIcon } from "lucide-react" // MessageSquareIcon のみ残す

export default function Home() {
  const { toast } = useToast()
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  // const [documents, setDocuments] = useState<DocumentType[]>([]) // NavigationPane がないので不要
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  // const [leftPaneTab, setLeftPaneTab] = useState("documents") // 初期値を chat に変更、Tabs自体が不要になる
  const [rightPaneTab, setRightPaneTab] = useState("editor")

  // Initialize IndexedDB
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDB()
        setIsDbInitialized(true)

        // Load documents (最初の1つだけ読み込むか、なければ作成)
        const docs = await getDocuments()
        // setDocuments(docs) // 不要

        // Load last opened document or create a default one
        let docToLoad: DocumentType | null = null;
        if (docs.length > 0) {
          // 最後に更新されたドキュメントを読み込むように変更 (より適切)
          const sortedDocs = docs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
          const lastDocId = sortedDocs[0].id;
          docToLoad = await getDocument(lastDocId);
        } else {
          // ドキュメントがなければ新規作成
          const newDoc: Omit<DocumentType, 'id' | 'versions'> = {
            title: "Untitled Presentation",
            content: "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n",
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const createdDocId = await addDocument(newDoc);
          docToLoad = await getDocument(createdDocId);
          toast({ title: "新しいプレゼンテーションを作成しました" });
        }

        if (docToLoad) {
          setCurrentDocument(docToLoad)
          setMarkdownContent(docToLoad.content)
        }

      } catch (error) {
        console.error("Failed to initialize database:", error)
        toast({
          title: "Database Error",
          description: "Failed to initialize the local database. Some features may not work.",
          variant: "destructive",
        })
      }
    }

    initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]) // isDbInitialized を依存配列から削除 (無限ループ防止のため)

  // Handle document change (NavigationPaneがないため、この関数は現状使われないが、将来的にドキュメント切り替えを実装するなら必要)
  // const handleDocumentChange = async (doc: DocumentType) => {
  //   if (doc) {
  //     setCurrentDocument(doc)
  //     setMarkdownContent(doc.content)
  //   }
  // }

  // Handle markdown content change
  const handleMarkdownChange = (content: string) => {
    setMarkdownContent(content)

    // Update current document in state (actual save to DB is debounced in the editor)
    if (currentDocument) {
      setCurrentDocument({
        ...currentDocument,
        content,
        updatedAt: new Date(),
      })
    }
  }

  // Toggle presentation mode
  const togglePresentationMode = () => {
    setIsPresentationMode(!isPresentationMode)
  }

  // Refresh documents list (NavigationPaneがないため不要)
  // const refreshDocuments = async () => {
  //   const docs = await getDocuments()
  //   setDocuments(docs)
  // }

  if (isPresentationMode && currentDocument) {
    return <PresentationMode markdown={markdownContent} onExit={togglePresentationMode} />
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-2 border-b">
        <h1 className="text-xl font-bold">AI-Assisted Marp Slide Creator</h1>
        <div className="flex items-center space-x-2">
          {/* ドキュメント選択UIをここに追加することも検討可能 */}
          <ExportDropdown markdown={markdownContent} documentTitle={currentDocument?.title || "Untitled"} />
          <Button variant="outline" onClick={togglePresentationMode} disabled={!currentDocument}>
            Present
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Chat Only */}
        {/* w-1/3 から w-1/4 などに幅を調整しても良い */}
        <div className="w-1/3 border-r h-full flex flex-col">
          {/* Tabs コンポーネントを削除し、ChatPane を直接表示 */}
          <div className="flex items-center p-3 border-b bg-muted"> {/* ヘッダー的なものを追加 */}
            <MessageSquareIcon className="h-4 w-4 mr-2" />
            <h3 className="text-sm font-medium">AI Chat</h3>
          </div>
          <div className="flex-1 overflow-hidden h-full">
            <ChatPane
              currentDocument={currentDocument}
              onApplyToEditor={(content) => handleMarkdownChange(content)}
            />
          </div>
          {/* --- Tabs 削除 ここから ---
          <Tabs value={leftPaneTab} onValueChange={setLeftPaneTab} className="w-full h-full flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="documents" className="flex-1">
                <LayoutIcon className="h-4 w-4 mr-2" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1">
                <MessageSquareIcon className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                <HistoryIcon className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="flex-1 overflow-hidden h-full">
              <NavigationPane
                documents={documents}
                currentDocument={currentDocument}
                onDocumentChange={handleDocumentChange}
                onDocumentsChange={refreshDocuments}
                isDbInitialized={isDbInitialized}
              />
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden h-full">
              <ChatPane
                currentDocument={currentDocument}
                onApplyToEditor={(content) => handleMarkdownChange(content)}
              />
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden h-full">
              <VersionHistoryPane
                currentDocument={currentDocument}
                onRestoreVersion={(content) => handleMarkdownChange(content)}
              />
            </TabsContent>
          </Tabs>
          --- Tabs 削除 ここまで --- */}
        </div>

        {/* Right Column - Editor and Preview */}
        {/* w-2/3 から w-3/4 などに幅を調整しても良い */}
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
  )
}
