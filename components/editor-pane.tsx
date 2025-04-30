"use client";

import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { FileIcon } from "lucide-react";
import type { DocumentType } from "@/lib/types";
import { useDb } from "@/lib/db-context";
// import { useAutoSave } from "@/hooks/use-auto-save"; // useAutoSave は削除
import { useDebounce } from "@/hooks/use-debounce"; // 作成した useDebounce フックをインポート
import { updateDocument } from "@/lib/db"; // updateDocument を直接使用
import { useErrorHandler } from "@/hooks/use-error-handler"; // エラーハンドラをインポート
import { EditorToolbar } from "./editor-toolbar";

interface EditorPaneProps {
  markdown: string;
  onChange: (content: string) => void;
  currentDocument: DocumentType | null;
}

// React.memo でラップ
export const EditorPane = React.memo(({ markdown, onChange, currentDocument }: EditorPaneProps) => {
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler(); // エラーハンドラフックを使用
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorScrollTopRef = useRef<number>(0);
  // const { isSaving } = useAutoSave({ document: currentDocument, content: markdown }); // useAutoSave を削除

  // --- ▼ useDebounce と isSaving ステートを追加 ▼ ---
  const debouncedMarkdown = useDebounce(markdown, 1000); // 1秒後にデバウンスされた値を取得
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);
  const isMountedRef = useRef(false); // マウント状態を追跡するRef
  // --- ▲ useDebounce と isSaving ステートを追加 ▲ ---

  // 初期コンテンツを保存済みとして設定
  useEffect(() => {
    if (currentDocument) {
      setLastSavedContent(currentDocument.content);
      // マウント後に isMountedRef を true に設定
      isMountedRef.current = true;
    }
    // アンマウント時に false に戻す
    return () => {
      isMountedRef.current = false;
    };
  }, [currentDocument]);


  // --- ▼ デバウンスされた値が変更されたら自動保存を実行する useEffect ▼ ---
  useEffect(() => {
    // マウント直後やDB未初期化、ドキュメントがない場合は保存しない
    if (!isMountedRef.current || !isDbInitialized || !currentDocument) {
      return;
    }

    // デバウンスされた内容が最後に保存した内容と同じ場合は保存しない
    // または、デバウンスされた内容が現在のドキュメントの初期内容と同じ場合も保存しない（ドキュメント切り替え直後など）
    if (debouncedMarkdown === lastSavedContent || debouncedMarkdown === currentDocument.content) {
        // console.log("Skipping save: content unchanged or initial content.");
        return;
    }

    // 保存処理
    const saveDocument = async () => {
      // 保存中に再度呼ばれた場合は無視
      if (isSaving) {
        console.log("Already saving, skipping.");
        return;
      }

      console.log("Debounced change detected, attempting to save document:", currentDocument.id);
      setIsSaving(true);
      try {
        const docToSave: DocumentType = {
          ...currentDocument,
          content: debouncedMarkdown, // デバウンスされた最新の内容
          updatedAt: new Date(),
        };
        await updateDocument(docToSave);
        setLastSavedContent(debouncedMarkdown); // 保存成功したら最後に保存した内容を更新
        console.log("Document saved successfully via useDebounce effect.");
      } catch (error) {
        handleError({ error, context: "ドキュメント自動保存 (useDebounce)" });
        // 保存失敗時は isSaving を解除するが、lastSavedContent は更新しない
      } finally {
        // マウントされている場合のみステートを更新
        if (isMountedRef.current) {
            setIsSaving(false);
        }
      }
    };

    saveDocument();

  }, [debouncedMarkdown, currentDocument, isDbInitialized, handleError, lastSavedContent, isSaving]); // 依存配列に注意
  // --- ▲ デバウンスされた値が変更されたら自動保存を実行する useEffect ▲ ---


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
          {/* isSaving ステートを使用 */}
          {isSaving ? "保存中..." : "保存済み"}
        </div>
      </div>

      {/* ツールバーコンポーネント (変更なし) */}
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
