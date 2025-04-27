"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { DocumentType, TemplateType } from "@/lib/types"
import { createDocument, deleteDocument, getTemplates, createTemplate } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { PlusIcon, TrashIcon, SaveIcon, FolderIcon } from "lucide-react"

interface NavigationPaneProps {
  documents: DocumentType[]
  currentDocument: DocumentType | null
  onDocumentChange: (document: DocumentType) => void
  onDocumentsChange: () => Promise<void>
  isDbInitialized: boolean
}

export function NavigationPane({
  documents,
  currentDocument,
  onDocumentChange,
  onDocumentsChange,
  isDbInitialized,
}: NavigationPaneProps) {
  const { toast } = useToast()
  const [newDocTitle, setNewDocTitle] = useState("無題のプレゼンテーション")
  const [newTemplateTitle, setNewTemplateTitle] = useState("")
  const [templates, setTemplates] = useState<TemplateType[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isTemplatesLoaded, setIsTemplatesLoaded] = useState(false)

  // Load templates
  const loadTemplates = async () => {
    if (!isDbInitialized || isTemplatesLoaded) return

    try {
      const loadedTemplates = await getTemplates()
      setTemplates(loadedTemplates)
      setIsTemplatesLoaded(true)
    } catch (error) {
      console.error("Failed to load templates:", error)
      toast({
        title: "エラー",
        description: "テンプレートの読み込みに失敗しました",
        variant: "destructive",
      })
    }
  }

  // Create new document
  const handleCreateDocument = async (templateId?: string) => {
    if (!isDbInitialized) return

    try {
      let content = ""
      let title = newDocTitle

      // If template is selected, use its content
      if (templateId) {
        const template = templates.find((t) => t.id === templateId)
        if (template) {
          content = template.content
          if (title === "無題のプレゼンテーション") {
            title = `${template.title}のコピー`
          }
        }
      }

      const newDoc = await createDocument(title, content)
      await onDocumentsChange()
      onDocumentChange(newDoc)

      toast({
        title: "成功",
        description: "新しいドキュメントを作成しました",
      })

      setIsCreateDialogOpen(false)
      setNewDocTitle("無題のプレゼンテーション")
      setSelectedTemplateId(null)
    } catch (error) {
      console.error("Failed to create document:", error)
      toast({
        title: "エラー",
        description: "ドキュメントの作成に失敗しました",
        variant: "destructive",
      })
    }
  }

  // Delete document
  const handleDeleteDocument = async (id: string) => {
    if (!isDbInitialized) return

    try {
      await deleteDocument(id)
      await onDocumentsChange()

      // If the deleted document was the current one, select another one
      if (currentDocument && currentDocument.id === id) {
        const remainingDocs = documents.filter((doc) => doc.id !== id)
        if (remainingDocs.length > 0) {
          onDocumentChange(remainingDocs[0])
        } else {
          // No documents left
          onDocumentChange({
            id: "",
            title: "",
            content: "",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        }
      }

      toast({
        title: "成功",
        description: "ドキュメントを削除しました",
      })
    } catch (error) {
      console.error("Failed to delete document:", error)
      toast({
        title: "エラー",
        description: "ドキュメントの削除に失敗しました",
        variant: "destructive",
      })
    }
  }

  // Save as template
  const handleSaveAsTemplate = async () => {
    if (!isDbInitialized || !currentDocument) return

    try {
      await createTemplate(newTemplateTitle || currentDocument.title, currentDocument.content)
      const loadedTemplates = await getTemplates()
      setTemplates(loadedTemplates)

      toast({
        title: "成功",
        description: "テンプレートを保存しました",
      })

      setIsTemplateDialogOpen(false)
      setNewTemplateTitle("")
    } catch (error) {
      console.error("Failed to save template:", error)
      toast({
        title: "エラー",
        description: "テンプレートの保存に失敗しました",
        variant: "destructive",
      })
    }
  }

  if (!isDbInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="text-sm font-medium">マイドキュメント</h3>
        <div className="flex space-x-1">
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open)
              if (open) loadTemplates()
            }}
          >
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" title="新規作成">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新規ドキュメント作成</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="title" className="text-sm font-medium">
                    タイトル
                  </label>
                  <Input id="title" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">テンプレート (任意)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={selectedTemplateId === null ? "default" : "outline"}
                      onClick={() => setSelectedTemplateId(null)}
                      className="h-auto py-2"
                    >
                      白紙
                    </Button>
                    {templates.map((template) => (
                      <Button
                        key={template.id}
                        variant={selectedTemplateId === template.id ? "default" : "outline"}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className="h-auto py-2"
                      >
                        {template.title}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleCreateDocument(selectedTemplateId || undefined)}>作成</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" disabled={!currentDocument} title="テンプレートとして保存">
                <SaveIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>テンプレートとして保存</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="templateTitle" className="text-sm font-medium">
                    テンプレート名
                  </label>
                  <Input
                    id="templateTitle"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    placeholder={currentDocument?.title || "マイテンプレート"}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveAsTemplate}>保存</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <ScrollArea className="flex-1 h-[calc(100%-3.5rem)]">
        <div className="space-y-1 p-2">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FolderIcon className="h-12 w-12 mb-4 opacity-50" />
              <p>ドキュメントがありません</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" />
                新規作成
              </Button>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  currentDocument && currentDocument.id === doc.id ? "bg-accent" : "hover:bg-accent/50"
                } cursor-pointer`}
                onClick={() => onDocumentChange(doc)}
              >
                <div className="truncate">{doc.title}</div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ドキュメントの削除</AlertDialogTitle>
                      <AlertDialogDescription>
                        "{doc.title}"を削除してもよろしいですか？この操作は元に戻せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.id)
                        }}
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
