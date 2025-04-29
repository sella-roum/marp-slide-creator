"use client";

import React from "react";
import { ImageCard } from "./image-card";
import type { ImageType } from "@/lib/types";

interface ImageGridProps {
  images: ImageType[];
  copiedStates: Record<string, boolean>;
  onInsert: (image: ImageType) => void;
  onCopy: (image: ImageType) => void;
  onDelete: (id: string, name: string) => void;
}

export const ImageGrid = React.memo(
  ({ images, copiedStates, onInsert, onCopy, onDelete }: ImageGridProps) => {
    if (!images || images.length === 0) {
      return null; // 画像がない場合は何も表示しない
    }

    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {images.map((image) => (
          <ImageCard
            key={image.id}
            image={image}
            isCopied={copiedStates[image.id] || false}
            onInsert={onInsert}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ))}
      </div>
    );
  }
);

ImageGrid.displayName = "ImageGrid";
