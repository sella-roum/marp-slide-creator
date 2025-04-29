"use client";

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "lucide-react";
import type { DocumentType } from "@/lib/types";
import { useDb } from "@/lib/db-context";
import { useAutoSave } from "@/hooks/use-auto-save"; // 自動保存フックをインポート
import { EditorToolbar, type EditorToolbarAction } from "./editor-toolbar"; // ツールバーコンポーネントをインポート

interface EditorPaneProps {
  markdown: string;
  onChange: (content: string) => void;
  currentDocument: DocumentType | null;
}

// React.memo でラップ
export const EditorPane = React.memo(({ markdown, onChange, currentDocument }: EditorPaneProps) => {
  const { isDbInitialized } = useDb(); // DB初期化状態を取得
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollTopRef = useRef<number>(0); // スクロール位置を保持するref

  // 自動保存フックを使用
  const { isSaving } = useAutoSave({ document: currentDocument, content: markdown });

  // カーソル位置にテキストを挿入する関数 (変更なし)
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

  // 画像参照を挿入する関数 (変更なし)
  const handleInsertImageReference = useCallback(
    (reference: string) => {
      insertTextAtCursor(reference);
    },
    [insertTextAtCursor]
  );

  // ツールバーのアクションハンドラ (変更なし)
  const handleToolbarAction = useCallback(
    (action: EditorToolbarAction) => {
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
          // 簡単なURL形式チェックを追加（より厳密なチェックも可能）
          if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
            insertTextAtCursor(`![画像](${url})`);
          } else if (url) {
            alert("有効なURLを入力してください (http:// または https:// で始まる必要があります)。");
          }
          break;
        default:
          // 未知のアクションに対する処理（必要であれば）
          console.warn("Unknown toolbar action:", action);
          break;
      }
    },
    [insertTextAtCursor]
  );

  // スクロール位置の保持 (変更なし)
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

  // Render
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
      {/* ヘッダー: ドキュメントタイトルと保存状態表示 */}
      <div className="flex items-center justify-between border-b p-2">
        <h3 className="truncate text-sm font-medium" title={currentDocument.title}>
          {currentDocument.title}
        </h3>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {/* isSaving は useAutoSave フックから取得 */}
          {isSaving ? "保存中..." : "保存済み"}
        </div>
      </div>

      {/* ツールバーコンポーネントをレンダリング */}
      <EditorToolbar
        onAction={handleToolbarAction}
        onInsertImageReference={handleInsertImageReference}
      />

      {/* テキストエリア */}
      <Textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="flex-1 resize-none rounded-none border-0 p-4 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Marpプレゼンテーションを作成するには、ここに入力を始めてください..."
        disabled={!isDbInitialized} // DB初期化中は無効化
        aria-label="Markdown Editor" // アクセシビリティのためのラベル
      />
    </div>
  );
});

EditorPane.displayName = "EditorPane";
