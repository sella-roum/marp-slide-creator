"use client";

import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ImagePlusIcon,
  TrashIcon,
  UploadCloudIcon,
  Loader2Icon,
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ImageType } from "@/lib/types";
import { addImage, getImages, deleteImage } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { imageToBase64 } from "@/lib/utils";
import Image from "next/image";

interface ImageLibraryProps {
  onInsertReference: (reference: string) => void;
}

const ImageLibraryTrigger = React.forwardRef<HTMLButtonElement>((props, ref) => (
  <Button variant="ghost" size="icon" ref={ref} {...props}>
    <ImagePlusIcon className="h-4 w-4" />
    <span className="sr-only">画像ライブラリ</span>
  </Button>
));
ImageLibraryTrigger.displayName = "ImageLibraryTrigger";

export const ImageLibrary = React.memo(({ onInsertReference }: ImageLibraryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<ImageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isDbInitialized } = useDb();

  const loadImages = useCallback(async () => {
    if (!isDbInitialized) {
      console.log("ImageLibrary: DB not initialized, skipping image load.");
      setError("データベースが初期化されていません。");
      setIsLoading(false);
      setImages([]);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));

    setIsLoading(true);
    setError(null);
    try {
      const loadedImages = await getImages();
      setImages(loadedImages);
    } catch (err) {
      console.error("Failed to load images:", err);
      setError("画像の読み込みに失敗しました。");
      toast({
        title: "エラー",
        description: "画像の読み込みに失敗しました。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isDbInitialized]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        loadImages();
      }
    },
    [loadImages]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDbInitialized) {
        toast({
          title: "エラー",
          description: "データベース未初期化のためアップロードできません。",
          variant: "destructive",
        });
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
        toast({ title: "成功", description: `画像「${file.name}」をアップロードしました。` });
        await loadImages();
      } catch (err) {
        console.error("Failed to upload image:", err);
        toast({
          title: "エラー",
          description: "画像のアップロードに失敗しました。",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [isDbInitialized, loadImages, toast]
  );
  const handleDeleteImage = useCallback(
    async (id: string, name: string) => {
      if (!isDbInitialized) {
        toast({
          title: "エラー",
          description: "データベース未初期化のため削除できません。",
          variant: "destructive",
        });
        return;
      }
      if (!confirm(`画像「${name}」を削除しますか？この操作は元に戻せません。`)) {
        return;
      }
      try {
        await deleteImage(id);
        toast({ title: "成功", description: `画像「${name}」を削除しました。` });
        setImages((prev) => prev.filter((img) => img.id !== id));
      } catch (err) {
        console.error("Failed to delete image:", err);
        toast({
          title: "エラー",
          description: "画像の削除に失敗しました。",
          variant: "destructive",
        });
      }
    },
    [isDbInitialized, toast]
  );
  const handleInsertClick = useCallback(
    (image: ImageType) => {
      const reference = `![${image.name}](image://${image.id})`;
      onInsertReference(reference);
      handleOpenChange(false);
      toast({ title: "画像参照を挿入しました", description: reference });
    },
    [onInsertReference, handleOpenChange, toast]
  );

  const handleCopyReference = useCallback(
    (image: ImageType) => {
      const reference = `![${image.name}](image://${image.id})`;
      navigator.clipboard
        .writeText(reference)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [image.id]: true }));
          toast({ title: "参照文字列をコピーしました" });
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [image.id]: false }));
          }, 2000);
        })
        .catch((err) => {
          console.error("コピー失敗:", err);
          toast({ title: "コピーに失敗しました", variant: "destructive" });
        });
    },
    [toast]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ImageLibraryTrigger />
      </DialogTrigger>
      <DialogContent className="flex h-[80vh] flex-col p-0 sm:max-w-[80vw] md:max-w-[60vw] lg:max-w-[50vw]">
        <DialogHeader className="border-b p-6 pb-4">
          <DialogTitle>画像ライブラリ</DialogTitle>
          <DialogDescription>アップロード済みの画像を表示・管理します。</DialogDescription>
        </DialogHeader>

        <div className="flex-shrink-0 px-6 pt-4">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !isDbInitialized}
          >
            {isUploading ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloudIcon className="mr-2 h-4 w-4" />
            )}
            新しい画像をアップロード
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
            disabled={isUploading || !isDbInitialized}
          />
        </div>

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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative flex flex-col overflow-hidden rounded-md border shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="relative flex aspect-square w-full items-center justify-center bg-muted">
                      <Image
                        src={image.dataUrl}
                        alt={image.name}
                        layout="fill"
                        objectFit="contain"
                        className="transition-opacity group-hover:opacity-75"
                        unoptimized
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          size="sm"
                          className="h-7 w-full bg-primary/80 text-xs hover:bg-primary"
                          onClick={() => handleInsertClick(image)}
                        >
                          挿入
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 w-full bg-secondary/80 text-xs hover:bg-secondary"
                          onClick={() => handleCopyReference(image)}
                        >
                          {copiedStates[image.id] ? (
                            <CheckIcon className="mr-1 h-3 w-3" />
                          ) : (
                            <CopyIcon className="mr-1 h-3 w-3" />
                          )}
                          参照コピー
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 w-full bg-destructive/80 text-xs hover:bg-destructive"
                          onClick={() => handleDeleteImage(image.id, image.name)}
                        >
                          <TrashIcon className="mr-1 h-3 w-3" />
                          削除
                        </Button>
                      </div>
                    </div>
                    <div className="flex-shrink-0 bg-background p-2 text-xs">
                      <p className="truncate font-medium" title={image.name}>
                        {image.name}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(image.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 border-t p-6 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ImageLibrary.displayName = "ImageLibrary";
