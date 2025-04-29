"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDb } from "@/lib/db-context";
import { updateDocument } from "@/lib/db";
import { debounce } from "@/lib/utils";
import type { DocumentType } from "@/lib/types";

interface UseAutoSaveProps {
  document: DocumentType | null;
  content: string;
  delay?: number; // デバウンスの遅延時間 (ms)
}

export function useAutoSave({ document, content, delay = 1000 }: UseAutoSaveProps) {
  const { toast } = useToast();
  const { isDbInitialized } = useDb();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState<string | null>(null);

  // 初期コンテンツを保存済みとして設定
  useEffect(() => {
    if (document) {
      setLastSavedContent(document.content);
    }
  }, [document]);

  // デバウンスされた保存関数
  const debouncedSave = useRef(
    debounce(async (docToSave: DocumentType, currentContent: string) => {
      if (!isDbInitialized) {
        console.warn("useAutoSave: DB not initialized, skipping save.");
        return;
      }
      // 保存処理中に再度呼ばれた場合は無視（二重実行防止）
      if (isSaving) {
        console.log("useAutoSave: Already saving, skipping.");
        return;
      }

      console.log("useAutoSave: Attempting to save document:", docToSave.id);
      setIsSaving(true);
      try {
        await updateDocument(docToSave);
        setLastSavedContent(currentContent); // 保存成功したら最後に保存した内容を更新
        console.log("useAutoSave: Document saved successfully.");
      } catch (error) {
        console.error("useAutoSave: Failed to save document:", error);
        toast({ title: "エラー", description: "ドキュメントの自動保存に失敗しました", variant: "destructive" });
        // 保存失敗時は isSaving を解除するが、lastSavedContent は更新しない
      } finally {
        setIsSaving(false);
      }
    }, delay)
  ).current;

  // コンテンツまたはドキュメントが変更されたら自動保存をトリガー
  useEffect(() => {
    // DB未初期化、ドキュメント未選択、またはコンテンツが未変更の場合は何もしない
    if (!isDbInitialized || !document || content === lastSavedContent) {
      return;
    }

    // コンテンツが実際に変更された場合のみ保存処理をスケジュール
    if (content !== document.content) {
        console.log("useAutoSave: Content changed, scheduling save for doc:", document.id);
        const docToSave: DocumentType = {
          ...document,
          content: content, // 最新のコンテントで更新
          updatedAt: new Date(),
        };
        debouncedSave(docToSave, content);
    }

    // クリーンアップ関数で debounce をキャンセル (コンポーネントアンマウント時など)
    // ただし、debounce 関数の実装によっては不要な場合もある
    // return () => {
    //   debouncedSave.cancel?.(); // もし debounce 関数に cancel メソッドがあれば
    // };

  }, [content, document, isDbInitialized, debouncedSave, lastSavedContent]); // lastSavedContent も依存配列に追加

  // isSaving 状態を返す
  return { isSaving };
}
