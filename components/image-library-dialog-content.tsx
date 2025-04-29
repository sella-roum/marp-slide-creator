"use client";

import React from "react";
import {
  DialogContent, // DialogContent をルート要素にする
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2Icon, AlertCircleIcon } from "lucide-react";
import { useImageLibrary } from "@/hooks/use-image-library";
import { ImageGrid } from "./image-grid";
import { ImageUploader } from "./image-uploader";

interface ImageLibraryDialogContentProps {
  // isOpen, onOpenChange は不要になる
  onInsertReference: (reference: string) => void;
  closeDialog: () => void; // ダイアログを閉じる関数は必要
}

// コンポーネント名を変更
export const ImageLibraryDialogContent = React.memo(
  ({ onInsertReference, closeDialog }: ImageLibraryDialogContentProps) => {
    // useImageLibrary フックに渡す isOpen は常に true として扱う (DialogContent が表示されている前提)
    const {
      images,
      isLoading,
      isUploading,
      error,
      copiedStates,
      isDbInitialized,
      fileInputRef,
      loadImages,
      handleImageUpload,
      handleDeleteImage,
      handleInsertClick,
      handleCopyReference,
      triggerFileInput,
    } = useImageLibrary({ isOpen: true, onInsertReference, closeDialog }); // isOpen: true に変更

    return (
      // DialogContent をルート要素にする
      <DialogContent className="flex h-[80vh] max-h-[800px] flex-col p-0 sm:max-w-[80vw] md:max-w-[70vw] lg:max-w-[60vw]">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>画像ライブラリ</DialogTitle>
          <DialogDescription>アップロード済みの画像を表示・管理します。</DialogDescription>
        </DialogHeader>

        <ImageUploader
          isUploading={isUploading}
          isDbInitialized={isDbInitialized}
          onFileSelect={handleImageUpload}
          triggerFileInput={triggerFileInput}
          fileInputRef={fileInputRef}
        />

        <ScrollArea className="my-0 flex-1 border-y">
          <div className="p-6">
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <AlertCircleIcon className="mb-2 h-8 w-8" />
                <p>{error}</p>
                {isDbInitialized && (
                  <Button variant="outline" size="sm" onClick={loadImages} className="mt-4">
                    再試行
                  </Button>
                )}
              </div>
            )}
            {!isLoading && !error && images.length === 0 && (
              <div className="py-10 text-center text-muted-foreground">
                {isDbInitialized
                  ? "アップロードされた画像はありません。"
                  : "データベース初期化中..."}
              </div>
            )}
            {!isLoading && !error && images.length > 0 && (
              <ImageGrid
                images={images}
                copiedStates={copiedStates}
                onInsert={handleInsertClick}
                onCopy={handleCopyReference}
                onDelete={handleDeleteImage}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
          {/* DialogClose は DialogContent の子要素として配置可能 */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    );
  }
);

ImageLibraryDialogContent.displayName = "ImageLibraryDialogContent"; // 名前を変更
