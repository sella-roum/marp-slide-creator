"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ImagePlusIcon, TrashIcon, UploadCloudIcon, Loader2Icon, AlertCircleIcon, CheckIcon, CopyIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ImageType } from "@/lib/types";
import { addImage, getImages, deleteImage } from "@/lib/db";
import { imageToBase64 } from "@/lib/utils";
import Image from 'next/image'; // next/image をサムネイル表示に使用

interface ImageLibraryProps {
  onInsertReference: (reference: string) => void; // 挿入する参照文字列を渡す
}

// DialogTrigger として使うための forwardRef
const ImageLibraryTrigger = React.forwardRef<HTMLButtonElement>((props, ref) => (
    <Button variant="ghost" size="icon" ref={ref} {...props}>
      <ImagePlusIcon className="h-4 w-4" />
      <span className="sr-only">画像ライブラリ</span>
    </Button>
));
ImageLibraryTrigger.displayName = "ImageLibraryTrigger";


export function ImageLibrary({ onInsertReference }: ImageLibraryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [images, setImages] = useState<ImageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // ライブラリを開いたときに画像を読み込む
  const loadImages = useCallback(async () => {
    // isOpen が true になってから少し待って実行 (Dialog のレンダリング待ち)
    await new Promise(resolve => setTimeout(resolve, 50));

    setIsLoading(true);
    setError(null);
    try {
      const loadedImages = await getImages();
      setImages(loadedImages);
    } catch (err) {
      console.error("Failed to load images:", err);
      setError("画像の読み込みに失敗しました。");
      toast({ title: "エラー", description: "画像の読み込みに失敗しました。", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]); // isOpen を依存配列から削除し、onOpenChange で制御

  // ダイアログの開閉状態が変わったときに画像を読み込む
  const handleOpenChange = (open: boolean) => {
      setIsOpen(open);
      if (open) {
          loadImages(); // 開いたときに読み込み開始
      } else {
          // 閉じたときに state をリセットしても良い
          // setImages([]);
          // setError(null);
      }
  }

  // 画像アップロード処理
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];

    try {
      const dataUrl = await imageToBase64(file);
      const imageData: Omit<ImageType, 'id' | 'createdAt'> = {
        name: file.name,
        dataUrl: dataUrl,
      };
      await addImage(imageData);
      toast({ title: "成功", description: `画像「${file.name}」をアップロードしました。` });
      await loadImages(); // アップロード後にリストを再読み込み
    } catch (err) {
      console.error("Failed to upload image:", err);
      toast({ title: "エラー", description: "画像のアップロードに失敗しました。", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 画像削除処理
  const handleDeleteImage = async (id: string, name: string) => {
    if (!confirm(`画像「${name}」を削除しますか？この操作は元に戻せません。`)) {
        return;
    }
    try {
      await deleteImage(id);
      toast({ title: "成功", description: `画像「${name}」を削除しました。` });
      setImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      console.error("Failed to delete image:", err);
      toast({ title: "エラー", description: "画像の削除に失敗しました。", variant: "destructive" });
    }
  };

  // 参照文字列を挿入
  const handleInsertClick = (image: ImageType) => {
    const reference = `![${image.name}](image://${image.id})`;
    onInsertReference(reference);
    handleOpenChange(false); // ダイアログを閉じる
    toast({ title: "画像参照を挿入しました", description: reference });
  };

   // 参照文字列をコピー
   const handleCopyReference = (image: ImageType) => {
    const reference = `![${image.name}](image://${image.id})`;
    navigator.clipboard.writeText(reference).then(() => {
      setCopiedStates((prev) => ({ ...prev, [image.id]: true }));
      toast({ title: "参照文字列をコピーしました" });
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [image.id]: false }));
      }, 2000);
    }).catch(err => {
      console.error('コピー失敗:', err);
      toast({ title: "コピーに失敗しました", variant: "destructive" });
    });
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <ImageLibraryTrigger />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[80vw] md:max-w-[60vw] lg:max-w-[50vw] h-[80vh] flex flex-col p-0"> {/* パディング削除 */}
        <DialogHeader className="p-6 pb-4 border-b"> {/* ヘッダーにパディングと境界線 */}
          <DialogTitle>画像ライブラリ</DialogTitle>
          <DialogDescription>
            アップロード済みの画像を表示・管理します。
          </DialogDescription>
        </DialogHeader>

        {/* アップロードボタン */}
        <div className="px-6 pt-4 flex-shrink-0"> {/* パディング追加 */}
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
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
            disabled={isUploading}
          />
        </div>

        {/* 画像リスト */}
        <ScrollArea className="flex-1 my-0 border-y"> {/* 上下のマージン削除、境界線追加 */}
          <div className="p-6"> {/* リストの周りにパディング */}
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-10 text-destructive">
                <AlertCircleIcon className="w-8 h-8 mb-2" />
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={loadImages} className="mt-4">再試行</Button>
              </div>
            )}
            {!isLoading && !error && images.length === 0 && (
              <div className="text-center text-muted-foreground py-10">
                アップロードされた画像はありません。
              </div>
            )}
            {!isLoading && !error && images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="border rounded-md overflow-hidden group relative flex flex-col shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-square w-full relative bg-muted flex items-center justify-center">
                      <Image
                        src={image.dataUrl}
                        alt={image.name}
                        layout="fill"
                        objectFit="contain"
                        className="group-hover:opacity-75 transition-opacity"
                        unoptimized // Base64画像なので最適化不要
                      />
                       <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                           <Button size="sm" className="text-xs h-7 w-full bg-primary/80 hover:bg-primary" onClick={() => handleInsertClick(image)}>挿入</Button>
                           <Button size="sm" variant="secondary" className="text-xs h-7 w-full bg-secondary/80 hover:bg-secondary" onClick={() => handleCopyReference(image)}>
                             {copiedStates[image.id] ? <CheckIcon className="w-3 h-3 mr-1"/> : <CopyIcon className="w-3 h-3 mr-1"/>}
                             参照コピー
                           </Button>
                           <Button size="sm" variant="destructive" className="text-xs h-7 w-full bg-destructive/80 hover:bg-destructive" onClick={() => handleDeleteImage(image.id, image.name)}>
                             <TrashIcon className="w-3 h-3 mr-1"/>削除
                           </Button>
                       </div>
                    </div>
                    <div className="p-2 text-xs bg-background flex-shrink-0">
                      <p className="truncate font-medium" title={image.name}>{image.name}</p>
                      <p className="text-muted-foreground">{new Date(image.createdAt).toLocaleDateString('ja-JP')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0"> {/* パディングと境界線 */}
          <DialogClose asChild>
            <Button type="button" variant="outline">閉じる</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
