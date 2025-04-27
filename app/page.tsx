"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { initializeDB, getDocuments, getDocument, updateDocument, createVersion } from "@/lib/db"
import type { DocumentType } from "@/lib/types"
import { NavigationPane } from "@/components/navigation-pane"
import { ChatPane } from "@/components/chat-pane"
import { EditorPane } from "@/components/editor-pane"
import { PreviewPane } from "@/components/preview-pane"
import { PresentationMode } from "@/components/presentation-mode"
import { ExportDropdown } from "@/components/export-dropdown"
import { VersionHistoryPane } from "@/components/version-history-pane"
import { LayoutIcon, MessageSquareIcon, HistoryIcon, SaveIcon } from "lucide-react"

export default function Home() {
  const { toast } = useToast()
  const [isDbInitialized, setIsDbInitialized] = useState(false)
  const [documents, setDocuments] = useState<DocumentType[]>([])
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null)
  const [markdownContent, setMarkdownContent] = useState("")
  const [isPresentationMode, setIsPresentationMode] = useState(false)
  const [leftPaneTab, setLeftPaneTab] = useState("documents")
  const [rightPaneTab, setRightPaneTab] = useState("editor")
  const [isSaving, setIsSaving] = useState(false)

  // Initialize IndexedDB
  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeDB()
        setIsDbInitialized(true)

        // Load documents
        const docs = await getDocuments()
        setDocuments(docs)

        // Load last opened document or create a default one
        if (docs.length > 0) {
          const lastDoc = docs[0] // Assuming the first one is the most recent
          const fullDoc = await getDocument(lastDoc.id)
          if (fullDoc) {
            setCurrentDocument(fullDoc)
            setMarkdownContent(fullDoc.content)
          }
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
  }, [toast])

  // Handle document change
  const handleDocumentChange = async (doc: DocumentType) => {
    if (doc) {
      setCurrentDocument(doc)
      setMarkdownContent(doc.content)
    }
  }

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

  // Refresh documents list
  const refreshDocuments = async () => {
    const docs = await getDocuments()
    setDocuments(docs)
  }

  // Save document manually
  const handleSaveDocument = async () => {
    if (!currentDocument) return

    try {
      setIsSaving(true)

      // Update the document
      await updateDocument({
        ...currentDocument,
        content: markdownContent,
        updatedAt: new Date(),
      })

      // Create a version
      await createVersion(currentDocument.id, markdownContent, "Manual save")

      toast({
        title: "保存完了",
        description: "ドキュメントを保存しました",
      })
    } catch (error) {
      console.error("Failed to save document:", error)
      toast({
        title: "エラー",
        description: "ドキュメントの保存に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isPresentationMode && currentDocument) {
    return <PresentationMode markdown={markdownContent} onExit={togglePresentationMode} />
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-2 border-b">
        <h1 className="text-xl font-bold">AI-Assisted Marp Slide Creator</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleSaveDocument} disabled={!currentDocument || isSaving}>
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <ExportDropdown markdown={markdownContent} documentTitle={currentDocument?.title || "Untitled"} />
          <Button variant="outline" onClick={togglePresentationMode} disabled={!currentDocument}>
            Present
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column - Navigation, Chat, History */}
        <div className="w-1/3 border-r h-full flex flex-col">
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
  )
}
