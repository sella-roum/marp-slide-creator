"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { TrashIcon, CopyIcon, CheckIcon } from "lucide-react";
import type { ImageType } from "@/lib/types";

interface ImageCardProps {
  image: ImageType;
  isCopied: boolean;
  onInsert: (image: ImageType) => void;
  onCopy: (image: ImageType) => void;
  onDelete: (id: string, name: string) => void;
}

export const ImageCard = React.memo(
  ({ image, isCopied, onInsert, onCopy, onDelete }: ImageCardProps) => {
    const formatDate = (date: Date) => {
      // Dateオブジェクトであることを確認
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        return "無効な日付";
      }
      return date.toLocaleDateString("ja-JP");
    };

    return (
      <div
        className="group relative flex flex-col overflow-hidden rounded-md border shadow-sm transition-shadow hover:shadow-md"
      >
        <div className="relative flex aspect-square w-full items-center justify-center bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img // next/image は Base64 URL でエラーになることがあるため、通常の img タグを使用
            src={image.dataUrl}
            alt={image.name}
            className="absolute inset-0 h-full w-full object-contain transition-opacity group-hover:opacity-75"
            loading="lazy" // 遅延読み込みを追加
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="sm"
              className="h-7 w-full bg-primary/80 text-xs hover:bg-primary"
              onClick={() => onInsert(image)}
              aria-label={`画像「${image.name}」を挿入`}
            >
              挿入
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 w-full bg-secondary/80 text-xs hover:bg-secondary"
              onClick={() => onCopy(image)}
              aria-label={`画像「${image.name}」の参照文字列をコピー`}
            >
              {isCopied ? (
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
              onClick={() => onDelete(image.id, image.name)}
              aria-label={`画像「${image.name}」を削除`}
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
          <p className="text-muted-foreground">{formatDate(image.createdAt)}</p>
        </div>
      </div>
    );
  }
);

ImageCard.displayName = "ImageCard";
