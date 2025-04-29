"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  SendIcon,
  Trash2Icon,
  MessageSquareIcon,
  Loader2Icon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  DocumentType,
  GeminiRequestType,
  GeminiResponseType,
  ChatMessageType,
} from "@/lib/types";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context";
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
import { ChatMessageItem } from "./chat-message-item";

interface ChatPaneProps {
  currentDocument: DocumentType;
  onApplyToEditor: (content: string) => void;
}

export const ChatPane = React.memo(({ currentDocument, onApplyToEditor }: ChatPaneProps) => {
  const { toast } = useToast();
  const { isDbInitialized } = useDb();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>(
        "div[data-radix-scroll-area-viewport]"
      );
      if (viewportElement) {
        viewportRef.current = viewportElement;
      }
    }
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
      }
    }, 100);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!isDbInitialized) {
        console.log("ChatPane: DB not initialized, skipping history load.");
        setIsHistoryLoading(false);
        setMessages([]);
        return;
      }

      setIsHistoryLoading(true);
      setMessages([]);
      console.log(`Loading chat history for document: ${currentDocument.id}`);
      try {
        const history = await getChatMessages(currentDocument.id);
        setMessages(history);
        scrollToBottom("auto");
      } catch (error) {
        console.error("Failed to load chat history:", error);
        toast({
          title: "エラー",
          description: "チャット履歴の読み込みに失敗しました。",
          variant: "destructive",
        });
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
  }, [currentDocument.id, toast, scrollToBottom, isDbInitialized]);

  const saveMessage = useCallback(
    async (message: Omit<ChatMessageType, "id">) => {
      if (!isDbInitialized || !currentDocument?.id) return;
      try {
        await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
        console.error("Failed to save chat message:", error);
        toast({
          title: "エラー",
          description: "チャットメッセージの保存に失敗しました。",
          variant: "destructive",
        });
      }
    },
    [currentDocument?.id, toast, isDbInitialized]
  );

  const handleSendMessage = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading || !currentDocument?.id || !isDbInitialized) return;

    const newUserMessage: Omit<ChatMessageType, "id"> = {
      role: "user",
      content: prompt,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };

    setMessages((prev) => [...prev, { ...newUserMessage, id: crypto.randomUUID() }]);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage);

    try {
      const requestBody: GeminiRequestType = {
        prompt: prompt,
        context: { currentMarkdown: currentDocument.content || "" },
      };

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data: GeminiResponseType = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "AIからの応答取得に失敗しました。");
      }

      if (data.result) {
        const newAssistantMessage: Omit<ChatMessageType, "id"> = {
          role: "assistant",
          content: data.result.text,
          markdownCode: data.result.markdownCode,
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: crypto.randomUUID() }]);
        await saveMessage(newAssistantMessage);
      } else {
        throw new Error("AIからの応答が空でした。");
      }
    } catch (error) {
      console.error("API Error:", error);
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      toast({ title: "エラー", description: errorContent, variant: "destructive" });
      const errorMessage: Omit<ChatMessageType, "id"> = {
        role: "system",
        content: errorContent,
        timestamp: new Date(),
        documentId: currentDocument.id,
      };
      setMessages((prev) => [...prev, { ...errorMessage, id: crypto.randomUUID() }]);
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
      document.getElementById("chat-input")?.focus();
      scrollToBottom();
    }
  }, [inputValue, isLoading, currentDocument, isDbInitialized, toast, saveMessage, scrollToBottom]);

  const handleClearChat = useCallback(async () => {
    if (!isDbInitialized || !currentDocument?.id) return;
    try {
      await clearChatMessages(currentDocument.id);
      setMessages([]);
      toast({ title: "チャット履歴をクリアしました" });
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      toast({
        title: "エラー",
        description: "チャット履歴のクリアに失敗しました。",
        variant: "destructive",
      });
    }
  }, [currentDocument?.id, toast, isDbInitialized]);

  const handleCopyCode = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [messageId]: true }));
          toast({ title: "コードをコピーしました" });
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [messageId]: false }));
          }, 2000);
        })
        .catch((err) => {
          console.error("コピー失敗:", err);
          toast({ title: "コピーに失敗しました", variant: "destructive" });
        });
    },
    [toast]
  );

  const handleApplyCode = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        onApplyToEditor(codeToApply);
        toast({ title: "抽出されたコードをエディタに適用しました" });
      } else {
        toast({
          title: "適用失敗",
          description: "応答からMarpコードを抽出できませんでした。",
          variant: "destructive",
        });
      }
    },
    [onApplyToEditor, toast]
  );

  return (
    <div className="flex h-full flex-col bg-background">
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
              className="h-7 px-2"
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
                onClick={handleClearChat}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                クリアする
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isHistoryLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isHistoryLoading && messages.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {isDbInitialized ? "チャット履歴はありません。" : "データベース初期化中..."}
            </div>
          )}
          {!isHistoryLoading &&
            messages.map((message) => (
              <ChatMessageItem
                key={message.id}
                message={message}
                copiedStates={copiedStates}
                onCopyCode={handleCopyCode}
                onApplyCode={handleApplyCode}
              />
            ))}
          {isLoading && !isHistoryLoading && (
            <ChatMessageItem
              message={{
                id: "loading",
                documentId: currentDocument.id,
                role: "assistant",
                content: "",
                timestamp: new Date(),
              }}
              isBotLoading={true}
              copiedStates={{}}
              onCopyCode={() => {}}
              onApplyCode={() => {}}
            />
          )}
        </div>
      </ScrollArea>

      <div className="flex items-start gap-2 border-t p-4">
        <Textarea
          id="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            !isDbInitialized
              ? "データベース初期化中..."
              : !currentDocument
                ? "ドキュメント読み込み中..."
                : isHistoryLoading
                  ? "履歴を読み込み中..."
                  : "AIにメッセージを送信..."
          }
          className="max-h-[150px] min-h-[40px] flex-1 resize-none text-sm"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading || isHistoryLoading || !currentDocument || !isDbInitialized}
        />
        <Button
          onClick={handleSendMessage}
          size="icon"
          disabled={
            isLoading ||
            isHistoryLoading ||
            !inputValue.trim() ||
            !currentDocument ||
            !isDbInitialized
          }
        >
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ChatPane.displayName = "ChatPane";
