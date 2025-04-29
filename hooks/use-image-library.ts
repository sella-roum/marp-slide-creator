"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ImageType } from "@/lib/types";
import { addImage, getImages, deleteImage } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { imageToBase64 } from "@/lib/utils";
import { useErrorHandler } from "@/hooks/use-error-handler"; // ★ インポート

interface UseImageLibraryProps {
  isOpen: boolean; // ダイアログが開いているかどうかの状態
  onInsertReference: (reference: string) => void;
  closeDialog: () => void; // ダイアログを閉じるための関数
}

export function useImageLibrary({ isOpen, onInsertReference, closeDialog }: UseImageLibraryProps) {
  const [images, setImages] = useState<ImageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler(); // ★ エラーハンドラフックを使用

  // 画像読み込み関数
  const loadImages = useCallback(async () => {
    if (!isDbInitialized) {
      console.log("useImageLibrary: DB not initialized, skipping image load.");
      setError("データベースが初期化されていません。");
      setIsLoading(false);
      setImages([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const loadedImages = await getImages();
      setImages(loadedImages);
    } catch (err) {
      setError("画像の読み込みに失敗しました。");
      handleError({ error: err, context: "画像ライブラリの読み込み" }); // ★ 共通ハンドラを使用
    } finally {
      setIsLoading(false);
    }
  }, [isDbInitialized, handleError]); // ★ handleError を依存配列に追加

  // ダイアログが開かれたときに画像を読み込む
  useEffect(() => {
    if (isOpen) {
      // isOpen が true になってから少し待って実行 (Dialog のレンダリング待ち)
      const timer = setTimeout(() => {
        loadImages();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      // ダイアログが閉じたら状態をリセット
      setImages([]);
      setError(null);
      setIsLoading(false);
      setIsUploading(false);
      setCopiedStates({});
    }
  }, [isOpen, loadImages]); // isOpen と loadImages を依存配列に追加

  // 画像アップロード処理
  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDbInitialized) {
        // エラーハンドラを呼ぶほどではないかもしれないが、ログは出す
        console.warn("useImageLibrary: DB not initialized, cannot upload.");
        // 必要ならトーストも出す
        // handleError({ error: new Error("Database not initialized"), context: "画像アップロード", userMessage: "データベース未初期化のためアップロードできません。" });
        return;
      }
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsUploading(true);
      const file = files[0];

      try {
        const dataUrl = await imageToBase64(file);
        const imageData: Omit<ImageType, "id" | "createdAt"> = {
          name: file.name,
          dataUrl: dataUrl,
        };
        await addImage(imageData);
        // toast({ title: "成功", description: `画像「${file.name}」をアップロードしました。` }); // 成功時のトーストは任意
        await loadImages(); // アップロード後にリストを再読み込み
      } catch (err) {
        handleError({ error: err, context: "画像アップロード" }); // ★ 共通ハンドラを使用
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // ファイル選択をリセット
        }
      }
    },
    [isDbInitialized, loadImages, handleError] // ★ handleError を依存配列に追加
  );

  // 画像削除処理
  const handleDeleteImage = useCallback(
    async (id: string, name: string) => {
      if (!isDbInitialized) {
        console.warn("useImageLibrary: DB not initialized, cannot delete.");
        // handleError({ error: new Error("Database not initialized"), context: "画像削除", userMessage: "データベース未初期化のため削除できません。" });
        return;
      }
      // confirm はブラウザ標準のブロッキングな関数なので、より良いUI（AlertDialogなど）を検討する余地あり
      if (!confirm(`画像「${name}」を削除しますか？この操作は元に戻せません。`)) {
        return;
      }
      try {
        await deleteImage(id);
        // toast({ title: "成功", description: `画像「${name}」を削除しました。` }); // 成功時のトーストは任意
        setImages((prev) => prev.filter((img) => img.id !== id));
      } catch (err) {
        handleError({ error: err, context: "画像削除" }); // ★ 共通ハンドラを使用
      }
    },
    [isDbInitialized, handleError] // ★ handleError を依存配列に追加
  );

  // 参照文字列を挿入
  const handleInsertClick = useCallback(
    (image: ImageType) => {
      const reference = `![${image.name}](image://${image.id})`;
      onInsertReference(reference);
      closeDialog(); // ダイアログを閉じる
      // toast({ title: "画像参照を挿入しました", description: reference }); // 成功時のトーストは任意
    },
    [onInsertReference, closeDialog]
  );

  // 参照文字列をコピー
  const handleCopyReference = useCallback(
    (image: ImageType) => {
      const reference = `![${image.name}](image://${image.id})`;
      navigator.clipboard
        .writeText(reference)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [image.id]: true }));
          // toast({ title: "参照文字列をコピーしました" }); // 成功時のトーストは任意
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [image.id]: false }));
          }, 2000);
        })
        .catch((err) => {
          handleError({ error: err, context: "画像参照のコピー" }); // ★ 共通ハンドラを使用
        });
    },
    [handleError] // ★ handleError を依存配列に追加
  );

  // ファイル選択ダイアログを開く
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    images,
    isLoading,
    isUploading,
    error,
    copiedStates,
    isDbInitialized,
    fileInputRef,
    loadImages, // 再試行用に公開
    handleImageUpload,
    handleDeleteImage,
    handleInsertClick,
    handleCopyReference,
    triggerFileInput,
  };
}
