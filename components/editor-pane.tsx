// components/editor-pane.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "lucide-react";
import type { DocumentType } from "@/lib/types";
import { useDb } from "@/lib/db-context";
import { useDebounce } from "@/hooks/use-debounce";
import { updateDocument } from "@/lib/db";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { EditorToolbar } from "./editor-toolbar";

interface EditorPaneProps {
  markdown: string;
  onChange: (content: string) => void;
  currentDocument: DocumentType | null;
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  onEditCustomCss: () => void;
  // --- ▼ Undo/Redo 関連の props を追加 ▼ ---
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  // --- ▲ Undo/Redo 関連の props を追加 ▲ ---
}

export const EditorPane = React.memo(({
  markdown,
  onChange,
  currentDocument,
  selectedTheme,
  onThemeChange,
  onEditCustomCss,
  // --- ▼ props を受け取る ▼ ---
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  // --- ▲ props を受け取る ▲ ---
}: EditorPaneProps) => {
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollTopRef = useRef<number>(0); // 外部変更やスクロール操作時の位置保持用

  const debouncedMarkdown = useDebounce(markdown, 1000); // 自動保存用
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);
  const isMountedRef = useRef(false);

  // 初期コンテンツを保存済みとして設定 (変更なし)
  useEffect(() => {
    if (currentDocument) {
      setLastSavedContent(currentDocument.content);
      isMountedRef.current = true;
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [currentDocument]);

  // 自動保存ロジック (変更なし)
  useEffect(() => {
    if (!isMountedRef.current || !isDbInitialized || !currentDocument) {
      return;
    }
    // 自動保存は debouncedMarkdown (1秒遅延) を使う
    if (debouncedMarkdown === lastSavedContent || debouncedMarkdown === currentDocument.content) {
        return;
    }
    const saveDocument = async () => {
      if (isSaving) {
        console.log("Already saving, skipping.");
        return;
      }
      console.log("Debounced change detected, attempting to save document:", currentDocument.id);
      setIsSaving(true);
      try {
        const docToSave: DocumentType = {
          ...currentDocument,
          content: debouncedMarkdown, // 自動保存はデバウンスされた内容
          updatedAt: new Date(),
        };
        await updateDocument(docToSave);
        setLastSavedContent(debouncedMarkdown);
        console.log("Document saved successfully via useDebounce effect.");
      } catch (error) {
        handleError({ error, context: "ドキュメント自動保存 (useDebounce)" });
      } finally {
        if (isMountedRef.current) {
            setIsSaving(false);
        }
      }
    };
    saveDocument();
  }, [debouncedMarkdown, currentDocument, isDbInitialized, handleError, lastSavedContent, isSaving]);


  // カーソル位置にテキストを挿入する関数 (★修正箇所)
  const insertTextAtCursor = useCallback(
    (textBefore: string, textAfter = "") => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const currentScrollTop = textarea.scrollTop; // ★ アクション前のスクロール位置を保存
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText =
        textarea.value.substring(0, start) +
        textBefore +
        selectedText +
        textAfter +
        textarea.value.substring(end);

      onChange(newText); // page.tsx の handleEditorChange を呼ぶ

      // DOM更新とレンダリング後にカーソル位置とスクロール位置を復元
      // requestAnimationFrame を使用して、ブラウザの次の描画フレームで実行
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus(); // フォーカスを戻す
          const newCursorPos = start + textBefore.length + (selectedText ? selectedText.length : 0);
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos); // カーソル位置を設定
          textareaRef.current.scrollTop = currentScrollTop; // ★ 保存したスクロール位置を復元
          editorScrollTopRef.current = currentScrollTop; // ★ 内部状態も更新しておく
        }
      });
    },
    [onChange] // 依存配列は onChange のみ
  );

  // 画像参照を挿入する関数 (変更なし)
  const handleInsertImageReference = useCallback(
    (reference: string) => {
      insertTextAtCursor(reference);
    },
    [insertTextAtCursor]
  );

  // 個別のツールバーアクションハンドラ (変更なし)
  const handleH1Click = useCallback(() => insertTextAtCursor("# "), [insertTextAtCursor]);
  const handleH2Click = useCallback(() => insertTextAtCursor("## "), [insertTextAtCursor]);
  const handleBoldClick = useCallback(() => insertTextAtCursor("**", "**"), [insertTextAtCursor]);
  const handleItalicClick = useCallback(() => insertTextAtCursor("*", "*"), [insertTextAtCursor]);
  const handleLinkClick = useCallback(() => insertTextAtCursor("[", "](https://)"), [insertTextAtCursor]);
  const handleCodeClick = useCallback(() => insertTextAtCursor("```\n", "\n```"), [insertTextAtCursor]);
  const handleListClick = useCallback(() => insertTextAtCursor("- "), [insertTextAtCursor]);
  const handleQuoteClick = useCallback(() => insertTextAtCursor("> "), [insertTextAtCursor]);
  const handleHrClick = useCallback(() => insertTextAtCursor("\n---\n"), [insertTextAtCursor]);
  const handleMarpDirectiveClick = useCallback(() => insertTextAtCursor("---\nmarp: true\ntheme: default\npaginate: true\n---\n\n"), [insertTextAtCursor]);
  const handleImageUrlClick = useCallback(() => {
    const url = prompt("画像URLを入力してください:");
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      insertTextAtCursor(`![画像](${url})`);
    } else if (url) {
      alert("有効なURLを入力してください (http:// または https:// で始まる必要があります)。");
    }
  }, [insertTextAtCursor]);

  // スクロール位置の保持 (ユーザー操作や外部からの変更時) (変更なし)
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      editorScrollTopRef.current = textareaRef.current.scrollTop;
    }
  }, []);

  // 外部から markdown プロップが変更された場合にスクロール位置を復元 (変更なし)
  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = editorScrollTopRef.current;
    }
  }, [markdown]);

  // Render (変更なし)
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
      {/* ヘッダー (変更なし) */}
      <div className="flex items-center justify-between border-b p-2">
        <h3 className="truncate text-sm font-medium" title={currentDocument.title}>
          {currentDocument.title}
        </h3>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          {isSaving ? "保存中..." : "保存済み"}
        </div>
      </div>

      {/* ツールバーコンポーネントに Undo/Redo 関連の props を渡す (変更なし) */}
      <EditorToolbar
        onH1Click={handleH1Click}
        onH2Click={handleH2Click}
        onBoldClick={handleBoldClick}
        onItalicClick={handleItalicClick}
        onLinkClick={handleLinkClick}
        onCodeClick={handleCodeClick}
        onListClick={handleListClick}
        onQuoteClick={handleQuoteClick}
        onHrClick={handleHrClick}
        onMarpDirectiveClick={handleMarpDirectiveClick}
        onImageUrlClick={handleImageUrlClick}
        onInsertImageReference={handleInsertImageReference}
        selectedTheme={selectedTheme}
        onThemeChange={onThemeChange}
        onEditCustomCss={onEditCustomCss}
        currentDocument={currentDocument}
        // --- ▼ Undo/Redo 関連の props を渡す ▼ ---
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        // --- ▲ Undo/Redo 関連の props を渡す ▲ ---
      />

      {/* テキストエリア (変更なし) */}
      <Textarea
        ref={textareaRef}
        value={markdown}
        onChange={(e) => onChange(e.target.value)} // page.tsx の handleEditorChange を呼ぶ
        onScroll={handleScroll} // ユーザーのスクロール操作で位置を保存
        className="flex-1 resize-none rounded-none border-0 p-4 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Marpプレゼンテーションを作成するには、ここに入力を始めてください..."
        disabled={!isDbInitialized}
        aria-label="Markdown Editor"
      />
    </div>
  );
});

EditorPane.displayName = "EditorPane";
