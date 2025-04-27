"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { DocumentType, ChatMessageType, GeminiRequestType, GeminiResponseType } from "@/lib/types"
import { getChatHistory, saveChatMessage } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { extractMarkdownCode } from "@/lib/utils"
import { SendIcon, CopyIcon, CheckIcon, MessageSquareIcon, AlertCircleIcon, FileIcon, UploadIcon } from "lucide-react"
import { FileUploader } from "@/components/file-uploader"

interface ChatPaneProps {
  currentDocument: DocumentType | null
  onApplyToEditor: (content: string) => void
}

export function ChatPane({ currentDocument, onApplyToEditor }: ChatPaneProps) {
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessageType[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [activeTab, setActiveTab] = useState<string>("chat")
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Load chat history when document changes
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentDocument) {
        setChatHistory([])
        return
      }

      try {
        const history = await getChatHistory(currentDocument.id)
        setChatHistory(history)
      } catch (error) {
        console.error("Failed to load chat history:", error)
        toast({
          title: "エラー",
          description: "チャット履歴の読み込みに失敗しました",
          variant: "destructive",
        })
      }
    }

    loadChatHistory()
    setError(null)
  }, [currentDocument, toast])

  // Scroll to bottom when chat history changes
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [chatHistory])

  // Handle file upload
  const handleFileUpload = (files: File[]) => {
    setUploadedFiles(files)

    // If files are uploaded, switch to chat tab
    if (files.length > 0) {
      setActiveTab("chat")

      // Generate prompt based on file type
      const fileTypes = files.map((file) => file.type).join(", ")
      const fileNames = files.map((file) => file.name).join(", ")

      let autoPrompt = ""
      if (files.some((file) => file.type.startsWith("image/"))) {
        autoPrompt = `この画像を分析して、スライドに使用できる内容を抽出してください。ファイル: ${fileNames}`
      } else if (files.some((file) => file.type === "application/pdf")) {
        autoPrompt = `このPDFを分析して、内容を要約したスライドを作成してください。ファイル: ${fileNames}`
      } else if (files.some((file) => file.type === "text/plain" || file.type === "text/markdown")) {
        autoPrompt = `このテキストを分析して、スライドに変換してください。ファイル: ${fileNames}`
      }

      if (autoPrompt) {
        setPrompt(autoPrompt)
      }
    }
  }

  // Process files for Gemini API
  const processFilesForGemini = async (files: File[]): Promise<{ fileContents: string; fileType: string }> => {
    if (files.length === 0) return { fileContents: "", fileType: "" }

    const file = files[0] // Currently handling only the first file

    // For images, convert to base64
    if (file.type.startsWith("image/")) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            fileContents: reader.result as string,
            fileType: "image",
          })
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    }

    // For text files
    if (file.type === "text/plain" || file.type === "text/markdown") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          resolve({
            fileContents: reader.result as string,
            fileType: "text",
          })
        }
        reader.onerror = reject
        reader.readAsText(file)
      })
    }

    // For PDFs, we'll extract text if possible
    if (file.type === "application/pdf") {
      // In a real implementation, you'd use a PDF.js or similar library
      // For now, we'll just indicate it's a PDF
      return {
        fileContents: `PDF file: ${file.name} (${Math.round(file.size / 1024)} KB)`,
        fileType: "pdf",
      }
    }

    return { fileContents: "", fileType: "" }
  }

  // Send prompt to Gemini API
  const handleSendPrompt = async () => {
    if ((!prompt.trim() && uploadedFiles.length === 0) || !currentDocument) return

    // Reset any previous errors
    setError(null)

    // Process uploaded files if any
    let fileData = { fileContents: "", fileType: "" }
    if (uploadedFiles.length > 0) {
      try {
        fileData = await processFilesForGemini(uploadedFiles)
      } catch (error) {
        console.error("Failed to process files:", error)
        toast({
          title: "エラー",
          description: "ファイルの処理に失敗しました",
          variant: "destructive",
        })
        return
      }
    }

    // Add user message to chat history
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      documentId: currentDocument.id,
      role: "user",
      content:
        prompt + (uploadedFiles.length > 0 ? `\n[添付ファイル: ${uploadedFiles.map((f) => f.name).join(", ")}]` : ""),
      timestamp: new Date(),
    }

    // Update chat history immediately to show user message
    setChatHistory((prev) => [...prev, userMessage])

    try {
      await saveChatMessage(currentDocument.id, "user", userMessage.content)

      setIsLoading(true)
      setPrompt("")

      // Clear uploaded files after sending
      const filesToProcess = [...uploadedFiles]
      setUploadedFiles([])

      // Prepare request for Gemini API
      const request: GeminiRequestType = {
        prompt,
        context: {
          currentMarkdown: currentDocument.content,
        },
        fileData: fileData.fileContents
          ? {
              content: fileData.fileContents,
              type: fileData.fileType,
            }
          : undefined,
      }

      console.log("Sending request to Gemini API:", {
        prompt,
        hasFileData: !!fileData.fileContents,
        fileType: fileData.fileType,
      })

      // Call Gemini API via backend
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      // JSON以外の応答に備えてrawテキストを取得
      const raw = await response.text()
      let data: GeminiResponseType
      try {
        data = JSON.parse(raw)
      } catch (e) {
        throw new Error(`Invalid JSON response from Gemini: ${raw}`)
      }

      if (!response.ok || !data.success || !data.result) {
        const errMsg = data.error?.message || raw || `API error: ${response.status}`
        throw new Error(errMsg)
      }

      // Add assistant message to chat history
      const assistantMessage: ChatMessageType = {
        id: Date.now().toString(),
        documentId: currentDocument.id,
        role: "assistant",
        content: JSON.stringify(data.result),
        timestamp: new Date(),
      }

      setChatHistory((prev) => [...prev.filter((msg) => msg.id !== userMessage.id), userMessage, assistantMessage])
      await saveChatMessage(currentDocument.id, "assistant", assistantMessage.content)
    } catch (error) {
      console.error("Failed to get response from Gemini:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      toast({
        title: "Geminiエラー",
        description: "Gemini APIからの応答の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle prompt example click
  const handlePromptExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt)
    // Focus the textarea
    const textarea = document.querySelector('textarea[name="chat-input"]') as HTMLTextAreaElement
    if (textarea) {
      textarea.focus()
    }
  }

  // Parse assistant message content
  const parseAssistantMessage = (content: string): { text: string; markdown: string | null } => {
    try {
      const parsed = JSON.parse(content)
      return {
        text: parsed.text || parsed.result?.text || content,
        markdown: parsed.markdown || parsed.result?.markdownCode || null,
      }
    } catch (e) {
      // If not valid JSON, return original content
      return {
        text: content,
        markdown: extractMarkdownCode(content),
      }
    }
  }

  // Apply code to editor
  const handleApplyToEditor = (content: string) => {
    const { markdown } = parseAssistantMessage(content)

    if (markdown) {
      onApplyToEditor(markdown)
      toast({
        title: "成功",
        description: "Markdownをエディタに適用しました",
      })
    } else {
      // Fall back to extracting markdown code
      const code = extractMarkdownCode(content)
      if (code) {
        onApplyToEditor(code)
        toast({
          title: "成功",
          description: "エディタに適用しました",
        })
      } else {
        onApplyToEditor(content)
        toast({
          title: "テキストとして適用",
          description: "Markdownコードブロックが見つからなかったため、テキストとして適用しました",
        })
      }
    }
  }

  // Copy content to clipboard
  const handleCopyToClipboard = (id: string, content: string) => {
    const { markdown, text } = parseAssistantMessage(content)

    // Copy markdown if available, otherwise copy text
    navigator.clipboard.writeText(markdown || text)
    setCopiedId(id)

    setTimeout(() => {
      setCopiedId(null)
    }, 2000)

    toast({
      title: "コピー完了",
      description: "クリップボードにコピーしました",
    })
  }

  // Render message content
  const renderMessageContent = (message: ChatMessageType) => {
    if (message.role === "user") {
      return <div className="whitespace-pre-wrap text-sm">{message.content}</div>
    }

    const { text, markdown } = parseAssistantMessage(message.content)

    return (
      <div className="space-y-4">
        <div className="whitespace-pre-wrap text-sm">{text}</div>
        {markdown && (
          <div className="mt-2">
            <Badge variant="outline" className="mb-2">
              Markdown
            </Badge>
            <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {markdown.length > 500 ? `${markdown.substring(0, 500)}...` : markdown}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <MessageSquareIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>ドキュメントを選択すると、Geminiアシスタントが利用できます</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2">
          <TabsTrigger value="chat" className="flex-1">
            チャット
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex-1">
            ファイルアップロード
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1">
            <ScrollArea className="h-full" ref={scrollAreaRef}>
              <div className="p-4 space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {chatHistory.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Geminiにプレゼンテーション作成のサポートを依頼しましょう。</p>
                    <div className="mt-4 space-y-2 text-sm">
                      <p className="font-medium">プロンプト例:</p>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() =>
                          handlePromptExampleClick("人工知能についてのプレゼンテーションの概要を作成してください。")
                        }
                      >
                        人工知能についてのプレゼンテーションの概要を作成
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() =>
                          handlePromptExampleClick(
                            "青色のカラースキームを使用したカスタムMarp CSSテーマを生成してください。",
                          )
                        }
                      >
                        青色のカラースキームを使用したカスタムMarp CSSテーマを生成
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start h-auto py-2 px-3"
                        onClick={() =>
                          handlePromptExampleClick(
                            "ソフトウェア開発ライフサイクルを示すMermaidダイアグラムを作成してください。",
                          )
                        }
                      >
                        ソフトウェア開発ライフサイクルを示すMermaidダイアグラムを作成
                      </Button>
                    </div>
                  </div>
                )}

                {chatHistory.map((message) => (
                  <Card
                    key={message.id}
                    className={`p-3 ${message.role === "user" ? "bg-primary/10" : "bg-secondary/10"}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{message.role === "user" ? "あなた" : "Gemini"}</span>
                      <div className="flex space-x-1">
                        {message.role === "assistant" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleApplyToEditor(message.content)}
                            >
                              <span className="sr-only">エディタに適用</span>
                              <span className="text-xs">適用</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleCopyToClipboard(message.id, message.content)}
                            >
                              <span className="sr-only">コピー</span>
                              {copiedId === message.id ? (
                                <CheckIcon className="h-3 w-3" />
                              ) : (
                                <CopyIcon className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <Separator className="my-2" />
                    {renderMessageContent(message)}
                  </Card>
                ))}

                {isLoading && (
                  <Card className="p-3 bg-secondary/10">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">Gemini</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="p-3 border-t">
            {uploadedFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {uploadedFiles.map((file, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    <FileIcon className="h-3 w-3" />
                    {file.name}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex space-x-2">
              <Textarea
                name="chat-input"
                placeholder="Geminiに質問や指示を入力..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendPrompt()
                  }
                }}
                className="min-h-[80px] resize-none flex-1"
                disabled={isLoading || !currentDocument}
              />
              <div className="flex flex-col justify-end space-y-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setActiveTab("upload")}
                  title="ファイルをアップロード"
                >
                  <UploadIcon className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleSendPrompt}
                  disabled={(!prompt.trim() && uploadedFiles.length === 0) || isLoading || !currentDocument}
                >
                  <SendIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 flex-1">
            <FileUploader onFilesSelected={handleFileUpload} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
