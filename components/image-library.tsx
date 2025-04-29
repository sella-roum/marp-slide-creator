"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog"; // Dialog と DialogTrigger をインポート
import { ImagePlusIcon } from "lucide-react";
import { ImageLibraryDialogContent } from "./image-library-dialog-content"; // 新しいコンポーネント名をインポート

interface ImageLibraryProps {
  onInsertReference: (reference: string) => void;
}

// トリガーボタンのコンポーネント定義はそのまま
const ImageLibraryTrigger = React.forwardRef<HTMLButtonElement>((props, ref) => (
  <Button variant="ghost" size="icon" ref={ref} {...props} aria-label="画像ライブラリを開く">
    <ImagePlusIcon className="h-4 w-4" />
    <span className="sr-only">画像ライブラリ</span>
  </Button>
));
ImageLibraryTrigger.displayName = "ImageLibraryTrigger";

// ImageLibrary を forwardRef でラップし、ref をトリガーに渡せるようにする
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
      // Dialog コンポーネントでラップ
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        {/* DialogTrigger が ImageLibraryTrigger をラップ */}
        <DialogTrigger asChild>
          {/* ImageLibraryTrigger に ref を渡す */}
          <ImageLibraryTrigger ref={ref} />
        </DialogTrigger>
        {/* ダイアログの中身をレンダリング */}
        {/* isOpen が true の時だけレンダリングしても良いが、Radix UI が内部で管理してくれる */}
        <ImageLibraryDialogContent
          onInsertReference={onInsertReference}
          closeDialog={closeDialog} // 閉じる関数を渡す
        />
      </Dialog>
    );
  }
);

ImageLibrary.displayName = "ImageLibrary";
