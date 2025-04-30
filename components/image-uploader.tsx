"use client";

import React from "react"; // useRef をインポートする必要はなくなりました
import { Button } from "@/components/ui/button";
import { UploadCloudIcon, Loader2Icon } from "lucide-react";

interface ImageUploaderProps {
  isUploading: boolean;
  isDbInitialized: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  triggerFileInput: () => void;
  // fileInputRef の型を null を許容するように修正
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ImageUploader = React.memo(
  ({
    isUploading,
    isDbInitialized,
    onFileSelect,
    triggerFileInput,
    fileInputRef, // props として受け取る
  }: ImageUploaderProps) => {
    return (
      <div className="flex-shrink-0 px-6 pt-4">
        <Button onClick={triggerFileInput} disabled={isUploading || !isDbInitialized}>
          {isUploading ? ( // ボタンテキストが状態によって変わるため、aria-labelで固定の目的を示す
            <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloudIcon className="mr-2 h-4 w-4" />
          )}
          {isUploading ? "アップロード中..." : "新しい画像をアップロード"}
        </Button>
        <input
          aria-label="画像ファイルを選択" // input自体は非表示だが念のため
          type="file"
          ref={fileInputRef} // props から受け取った ref を設定
          onChange={onFileSelect}
          accept="image/*" // 画像ファイルのみを受け付ける
          className="hidden" // input要素自体は非表示
          disabled={isUploading || !isDbInitialized}
          aria-hidden="true" // スクリーンリーダーから隠す
        />
      </div>
    );
  }
);

ImageUploader.displayName = "ImageUploader";
