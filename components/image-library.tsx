"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { ImagePlusIcon } from "lucide-react";
import { ImageLibraryDialogContent } from "./image-library-dialog-content";

interface ImageLibraryProps {
  onInsertReference: (reference: string) => void;
}

// ImageLibraryTrigger は変更なし
const ImageLibraryTrigger = React.forwardRef<HTMLButtonElement>((props, ref) => (
  <Button variant="ghost" size="icon" ref={ref} {...props} aria-label="画像ライブラリを開く">
    <ImagePlusIcon className="h-4 w-4" />
    <span className="sr-only">画像ライブラリ</span>
  </Button>
));
ImageLibraryTrigger.displayName = "ImageLibraryTrigger";

export const ImageLibrary = React.forwardRef<HTMLButtonElement, ImageLibraryProps>(
  ({ onInsertReference }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open);
    }, []);

    const closeDialog = useCallback(() => {
      setIsOpen(false);
    }, []);

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        {/* Tooltip のラップを削除し、元の構造に戻す */}
        <DialogTrigger asChild>
          <ImageLibraryTrigger ref={ref} />
        </DialogTrigger>

        {/* ダイアログの中身 */}
        <ImageLibraryDialogContent
          onInsertReference={onInsertReference}
          closeDialog={closeDialog}
        />
      </Dialog>
    );
  }
);

ImageLibrary.displayName = "ImageLibrary";
