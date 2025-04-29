"use client";

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DocumentType } from "@/lib/types";
import { updateDocument } from "@/lib/db";
import { debounce } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDb } from "@/lib/db-context";
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
} from "lucide-react";
import { ImageLibrary } from "./image-library";

interface EditorPaneProps {
  markdown: string;
  onChange: (content: string) => void;
  currentDocument: DocumentType | null;
}

export const EditorPane = React.memo(({ markdown, onChange, currentDocument }: EditorPaneProps) => {
  const { toast } = useToast();
  const { isDbInitialized } = useDb();
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollTopRef = useRef<number>(0);

  const insertTextAtCursor = useCallback(
    (textBefore: string, textAfter = "") => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText =
        textarea.value.substring(0, start) +
        textBefore +
        selectedText +
        textAfter +
        textarea.value.substring(end);
      onChange(newText);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = start + textBefore.length + (selectedText ? selectedText.length : 0);
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [onChange]
  );

  const handleInsertImageReference = useCallback(
    (reference: string) => {
      insertTextAtCursor(reference);
    },
    [insertTextAtCursor]
  );

  const debouncedSave = useRef(
    debounce(async (documentData: DocumentType) => {
      if (!isDbInitialized) {
        console.warn("EditorPane: DB not initialized, skipping save.");
        return;
      }
      try {
        setIsSaving(true);
        await updateDocument(documentData);
      } catch (error) {
        console.error("Failed to save document:", error);
        toast({ title: "エラー", description: "ドキュメント保存失敗", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1000)
  ).current;

  useEffect(() => {
    if (isDbInitialized && currentDocument && markdown !== currentDocument.content) {
      const docToSave: DocumentType = {
        ...currentDocument,
        content: markdown,
        updatedAt: new Date(),
      };
      debouncedSave(docToSave);
    }
  }, [markdown, currentDocument, debouncedSave, isDbInitialized]);

  const handleToolbarAction = useCallback(
    (action: string) => {
      switch (action) {
        case "h1":
          insertTextAtCursor("# ");
          break;
        case "h2":
          insertTextAtCursor("## ");
          break;
        case "bold":
          insertTextAtCursor("**", "**");
          break;
        case "italic":
          insertTextAtCursor("*", "*");
          break;
        case "link":
          insertTextAtCursor("[", "](https://)");
          break;
        case "code":
          insertTextAtCursor("```\n", "\n```");
          break;
        case "list":
          insertTextAtCursor("- ");
          break;
        case "quote":
          insertTextAtCursor("> ");
          break;
        case "hr":
          insertTextAtCursor("\n---\n");
          break;
        case "marp-directive":
          insertTextAtCursor("---\nmarp: true\ntheme: default\npaginate: true\n---\n\n");
          break;
        case "image-url":
          const url = prompt("画像URLを入力してください:");
          if (url) insertTextAtCursor(`![画像](${url})`);
          break;
        default:
          break;
      }
    },
    [insertTextAtCursor]
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      editorScrollTopRef.current = textareaRef.current.scrollTop;
    }
  }, []);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = editorScrollTopRef.current;
    }
  }, [markdown]);
  if (!currentDocument) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
        <FileIcon className="mb-4 h-12 w-12 opacity-50" />
        <p>ドキュメントを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <h3 className="truncate text-sm font-medium">{currentDocument.title}</h3>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {isSaving ? "保存中..." : "保存済み"}
        </div>
      </div>

      <div className="flex items-center overflow-x-auto border-b p-1">
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
                <LinkIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>画像URLを挿入</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ImageLibrary onInsertReference={handleInsertImageReference} />
            </TooltipTrigger>
            <TooltipContent>画像ライブラリを開く</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToolbarAction("marp-directive")}
              >
                Marp
              </Button>
            </TooltipTrigger>
            <TooltipContent>Marpディレクティブ挿入</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="flex-1 resize-none rounded-none border-0 p-4 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Marpプレゼンテーションを作成するには、ここに入力を始めてください..."
        disabled={!isDbInitialized}
      />
    </div>
  );
});

EditorPane.displayName = "EditorPane";
