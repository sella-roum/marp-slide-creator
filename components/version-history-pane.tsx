"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { getVersions } from "@/lib/db"
import type { DocumentType, VersionType } from "@/lib/types"
import { HistoryIcon, ClockIcon } from "lucide-react"

interface VersionHistoryPaneProps {
  currentDocument: DocumentType | null
  onRestoreVersion: (content: string) => void
}

export function VersionHistoryPane({ currentDocument, onRestoreVersion }: VersionHistoryPaneProps) {
  const { toast } = useToast()
  const [versions, setVersions] = useState<VersionType[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Load versions when document changes
  useEffect(() => {
    const loadVersions = async () => {
      if (!currentDocument) {
        setVersions([])
        return
      }

      try {
        setIsLoading(true)
        const loadedVersions = await getVersions(currentDocument.id)
        setVersions(loadedVersions)
      } catch (error) {
        console.error("Failed to load versions:", error)
        toast({
          title: "エラー",
          description: "バージョン履歴の読み込みに失敗しました",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadVersions()
  }, [currentDocument, toast])

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <HistoryIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>ドキュメントを選択すると、バージョン履歴が表示されます</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <ClockIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>バージョン履歴はまだありません</p>
        <p className="text-sm mt-2">編集を続けると、自動的にバージョンが保存されます</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">バージョン履歴: {currentDocument.title}</h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {versions.map((version) => (
            <Card key={version.id} className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  {formatDate(version.createdAt)}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="content">
                    <AccordionTrigger className="text-xs">コンテンツを表示</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                        {version.content.substring(0, 500)}
                        {version.content.length > 500 && "..."}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
              <CardFooter className="pt-0 pb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRestoreVersion(version.content)}
                  className="w-full"
                >
                  このバージョンを復元
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
