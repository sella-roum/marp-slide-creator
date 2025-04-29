"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2Icon, MessageSquareIcon } from "lucide-react";
import type { DocumentType, ChatMessageType } from "@/lib/types";

interface ChatHeaderProps {
  currentDocument: DocumentType | null;
  messages: ChatMessageType[];
  isLoading: boolean;
  isHistoryLoading: boolean;
  isDbInitialized: boolean;
  onClearChat: () => void;
}

export const ChatHeader = React.memo(
  ({
    currentDocument,
    messages,
    isLoading,
    isHistoryLoading,
    isDbInitialized,
    onClearChat,
  }: ChatHeaderProps) => {
    return (
      <div className="flex flex-shrink-0 items-center justify-between border-b p-2">
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">AI Chat</h3>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-4 px-2"
              disabled={
                !currentDocument ||
                messages.length === 0 ||
                isLoading ||
                isHistoryLoading ||
                !isDbInitialized
              }
            >
              <Trash2Icon className="mr-1 h-3 w-3" />
              履歴クリア
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>チャット履歴のクリア</AlertDialogTitle>
              <AlertDialogDescription>
                現在のドキュメントのチャット履歴をすべて削除します。この操作は元に戻せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClearChat}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                クリアする
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }
);

ChatHeader.displayName = "ChatHeader";