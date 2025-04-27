"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { DocumentType } from "@/lib/types"
import { updateDocument, createVersion } from "@/lib/db"
import { debounce, imageToBase64 } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  ImageIcon,
  CodeIcon,
  ListIcon,
  BoldIcon,
  ItalicIcon,
  LinkIcon,
  Heading1Icon,
  Heading2Icon,
  QuoteIcon,
  SeparatorHorizontalIcon,
  FileIcon,
  SaveIcon,
} from "lucide-react"

interface EditorPaneProps {
  markdown: string
  onChange: (content: string) => void
  currentDocument: DocumentType | null
}

export function EditorPane({ markdown, onChange, currentDocument }: EditorPaneProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Save document with debounce
  const debouncedSave = useRef(
    debounce(async (document: DocumentType) => {
      try {
        setIsSaving(true)
        await updateDocument(document)
        // Create a version every 10 minutes or significant changes
        const shouldCreateVersion =
          !document.versions?.length || Date.now() - new Date(document.versions[0].createdAt).getTime() > 10 * 60 * 1000

        if (shouldCreateVersion) {
          await createVersion(document.id, document.content)
        }
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
    }, 1000),
  ).current

  // Save document when content changes
  useEffect(() => {
    if (currentDocument && markdown !== currentDocument.content) {
      debouncedSave({
        ...currentDocument,
        content: markdown,
        updatedAt: new Date(),
      })
    }
  }, [markdown, currentDocument, debouncedSave])

  // Manual save function
  const handleSave = async () => {
    if (!currentDocument) return

    try {
      setIsSaving(true)
      await updateDocument({
        ...currentDocument,
        content: markdown,
        updatedAt: new Date(),
      })

      // Always create a version when manually saving
      await createVersion(currentDocument.id, markdown, "手動保存")

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

  // Insert text at cursor position
  const insertTextAtCursor = (textBefore: string, textAfter = "") => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = textarea.value.substring(start, end)

    const newText =
      textarea.value.substring(0, start) + textBefore + selectedText + textAfter + textarea.value.substring(end)

    onChange(newText)

    // Set cursor position after the inserted text
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + textBefore.length + selectedText.length + textAfter.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Handle toolbar actions
  const handleToolbarAction = (action: string) => {
    switch (action) {
      case "h1":
        insertTextAtCursor("# ")
        break
      case "h2":
        insertTextAtCursor("## ")
        break
      case "bold":
        insertTextAtCursor("**", "**")
        break
      case "italic":
        insertTextAtCursor("*", "*")
        break
      case "link":
        insertTextAtCursor("[", "](https://)")
        break
      case "code":
        insertTextAtCursor("```\n", "\n```")
        break
      case "list":
        insertTextAtCursor("- ")
        break
      case "quote":
        insertTextAtCursor("> ")
        break
      case "hr":
        insertTextAtCursor("\n---\n")
        break
      case "marp-directive":
        insertTextAtCursor("---\nmarp: true\ntheme: default\npaginate: true\n---\n\n")
        break
      case "mermaid":
        insertTextAtCursor("```mermaid\ngraph TD;\n  A[開始] --> B[処理];\n  B --> C[終了];\n```\n")
        break
      case "image-url":
        const url = prompt("画像URLを入力:")
        if (url) {
          insertTextAtCursor(`![画像](${url})`)
        }
        break
      case "image-upload":
        if (fileInputRef.current) {
          fileInputRef.current.click()
        }
        break
      default:
        break
    }
  }

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      const file = files[0]
      const base64 = await imageToBase64(file)
      insertTextAtCursor(`![${file.name}](${base64})`)

      toast({
        title: "画像追加",
        description: "画像がドキュメントに追加されました",
      })
    } catch (error) {
      console.error("Failed to upload image:", error)
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      })
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <FileIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>ドキュメントを選択するか、新規作成してください</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium truncate">{currentDocument.title}</h3>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving} className="flex items-center">
            <SaveIcon className="h-4 w-4 mr-1" />
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>

      <div className="flex items-center p-1 border-b overflow-x-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("h1")}>
                <Heading1Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し1</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("h2")}>
                <Heading2Icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>見出し2</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("bold")}>
                <BoldIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>太字</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("italic")}>
                <ItalicIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>斜体</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("link")}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リンク</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("list")}>
                <ListIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>リスト</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("quote")}>
                <QuoteIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>引用</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("code")}>
                <CodeIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>コードブロック</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("hr")}>
                <SeparatorHorizontalIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>スライド区切り</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("image-url")}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像URL挿入</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => handleToolbarAction("image-upload")}>
                <ImageIcon className="h-4 w-4" />
                <span className="sr-only">画像アップロード</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像アップロード</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleToolbarAction("marp-directive")}>
                Marp
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marpディレクティブ挿入</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleToolbarAction("mermaid")}>
                Mermaid
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mermaidダイアグラム挿入</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
      </div>

      <Textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 resize-none font-mono text-sm p-4 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Marpプレゼンテーションを作成するには、ここに入力を始めてください..."
      />
    </div>
  )
}
