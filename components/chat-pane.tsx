"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import type { DocumentType, ChatMessageType, GeminiRequestType, GeminiResponseType } from "@/lib/types"
import { getChatHistory, saveChatMessage } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"
import { extractMarkdownCode } from "@/lib/utils"
import { SendIcon, CopyIcon, CheckIcon, MessageSquareIcon, AlertCircleIcon } from "lucide-react"

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

  // Send prompt to Gemini API
  const handleSendPrompt = async () => {
    if (!prompt.trim() || !currentDocument) return

    // Reset any previous errors
    setError(null)

    // Add user message to chat history
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      documentId: currentDocument.id,
      role: "user",
      content: prompt,
      timestamp: new Date(),
    }

    setChatHistory([...chatHistory, userMessage])

    try {
      await saveChatMessage(currentDocument.id, "user", prompt)

      setIsLoading(true)
      setPrompt("")

      // Prepare request for Gemini API
      const request: GeminiRequestType = {
        prompt,
        context: {
          currentMarkdown: currentDocument.content,
        },
      }

      // Call Gemini API via backend
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      })

      const data: GeminiResponseType = await response.json()

      if (!response.ok || !data.success || !data.result) {
        throw new Error(data.error?.message || `API error: ${response.status}`)
      }

      // Add assistant message to chat history
      const assistantMessage: ChatMessageType = {
        id: Date.now().toString(),
        documentId: currentDocument.id,
        role: "assistant",
        content: data.result.text,
        timestamp: new Date(),
      }

      setChatHistory([...chatHistory, userMessage, assistantMessage])
      await saveChatMessage(currentDocument.id, "assistant", data.result.text)
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

  // Apply code to editor
  const handleApplyToEditor = (content: string) => {
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

  // Copy content to clipboard
  const handleCopyToClipboard = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)

    setTimeout(() => {
      setCopiedId(null)
    }, 2000)

    toast({
      title: "コピー完了",
      description: "クリップボードにコピーしました",
    })
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
      <div className="flex-1 h-[calc(100%-6rem)]">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {chatHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Geminiにプレゼンテーション作成のサポートを依頼しましょう。</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-medium">プロンプト例:</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() => setPrompt("人工知能についてのプレゼンテーションの概要を作成してください。")}
                  >
                    人工知能についてのプレゼンテーションの概要を作成
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() =>
                      setPrompt("青色のカラースキームを使用したカスタムMarp CSSテーマを生成してください。")
                    }
                  >
                    青色のカラースキームを使用したカスタムMarp CSSテーマを生成
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-2 px-3"
                    onClick={() =>
                      setPrompt("ソフトウェア開発ライフサイクルを示すMermaidダイアグラムを作成してください。")
                    }
                  >
                    ソフトウェア開発ライフサイクルを示すMermaidダイアグラムを作成
                  </Button>
                </div>
              </div>
            ) : (
              chatHistory.map((message) => (
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
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                </Card>
              ))
            )}
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

      <div className="p-3 border-t h-24">
        <div className="flex space-x-2 h-full">
          <Textarea
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
          <Button
            onClick={handleSendPrompt}
            disabled={!prompt.trim() || isLoading || !currentDocument}
            className="self-end"
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
