"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// VersionType のインポート削除
import type { DocumentType } from "@/lib/types"
// createVersion, getVersions のインポート削除
import { updateDocument } from "@/lib/db"
import { debounce } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  LinkIcon,
  CodeIcon,
  ListIcon,
  BoldIcon,
  ItalicIcon,
  Heading1Icon,
  Heading2Icon,
  QuoteIcon,
  SeparatorHorizontalIcon,
  FileIcon,
  ImagePlusIcon,
} from "lucide-react"
import { ImageLibrary } from "./image-library"

interface EditorPaneProps {
  markdown: string
  onChange: (content: string) => void
  currentDocument: DocumentType | null
}

export function EditorPane({ markdown, onChange, currentDocument }: EditorPaneProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 画像参照を挿入する関数 (変更なし)
  const handleInsertImageReference = (reference: string) => {
    insertTextAtCursor(reference);
  };

  // Save document with debounce (バージョン作成ロジック削除)
  const debouncedSave = useRef(
    debounce(async (documentData: DocumentType) => {
      // バージョン取得ロジック削除

      try {
        setIsSaving(true);
        // versions プロパティを除外する処理を削除
        await updateDocument(documentData);
        // バージョン作成ロジック削除
      } catch (error) {
        console.error("Failed to save document:", error);
        toast({ title: "エラー", description: "ドキュメント保存失敗", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1000)
  ).current;

  // Save document when content changes (変更なし)
  useEffect(() => {
    if (currentDocument && markdown !== currentDocument.content) {
      const docToSave: DocumentType = {
        ...currentDocument,
        content: markdown,
        updatedAt: new Date(),
        // versions プロパティは DocumentType にないので不要
      };
      debouncedSave(docToSave);
    }
  }, [markdown, currentDocument, debouncedSave]);

  // Insert text at cursor position (変更なし)
  const insertTextAtCursor = (textBefore: string, textAfter = "") => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const newText = textarea.value.substring(0, start) + textBefore + selectedText + textAfter + textarea.value.substring(end);
    onChange(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + textBefore.length + (selectedText ? selectedText.length : 0);
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle toolbar actions (変更なし)
  const handleToolbarAction = (action: string) => {
    switch (action) {
      case "h1": insertTextAtCursor("# "); break;
      case "h2": insertTextAtCursor("## "); break;
      case "bold": insertTextAtCursor("**", "**"); break;
      case "italic": insertTextAtCursor("*", "*"); break;
      case "link": insertTextAtCursor("[", "](https://)"); break;
      case "code": insertTextAtCursor("```\n", "\n```"); break;
      case "list": insertTextAtCursor("- "); break;
      case "quote": insertTextAtCursor("> "); break;
      case "hr": insertTextAtCursor("\n---\n"); break;
      case "marp-directive": insertTextAtCursor("---\nmarp: true\ntheme: default\npaginate: true\n---\n\n"); break;
      case "image-url":
        const url = prompt("画像URLを入力してください:");
        if (url) insertTextAtCursor(`![画像](${url})`);
        break;
      default: break;
    }
  };

  // Render (変更なし)
  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <FileIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>ドキュメントを読み込み中...</p> {/* メッセージ変更 */}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium truncate">{currentDocument.title}</h3>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {isSaving ? "保存中..." : "保存済み"}
        </div>
      </div>

      <div className="flex items-center p-1 border-b overflow-x-auto">
        <TooltipProvider>
          {/* ツールバーボタン (変更なし) */}
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("h1")}><Heading1Icon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>見出し1</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("h2")}><Heading2Icon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>見出し2</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("bold")}><BoldIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>太字</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("italic")}><ItalicIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>斜体</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("link")}><LinkIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>リンク</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("list")}><ListIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>リスト</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("quote")}><QuoteIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>引用</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("code")}><CodeIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>コードブロック</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("hr")}><SeparatorHorizontalIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>スライド区切り</TooltipContent></Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleToolbarAction("image-url")}><LinkIcon className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>画像URLを挿入</TooltipContent></Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ImageLibrary onInsertReference={handleInsertImageReference} />
            </TooltipTrigger>
            <TooltipContent>画像ライブラリを開く</TooltipContent>
          </Tooltip>
          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" onClick={() => handleToolbarAction("marp-directive")}>Marp</Button></TooltipTrigger><TooltipContent>Marpディレクティブ挿入</TooltipContent></Tooltip>
        </TooltipProvider>
      </div>

      <Textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 resize-none font-mono text-sm p-4 rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Marpプレゼンテーションを作成するには、ここに入力を始めてください..."
      />
    </div>
  );
}
