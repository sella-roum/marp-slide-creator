"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'; // React をインポート
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendIcon, BotIcon, UserIcon, CopyIcon, CheckIcon, Loader2Icon, Trash2Icon, ClipboardPasteIcon, MessageSquareIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DocumentType, GeminiRequestType, GeminiResponseType, ChatMessageType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context"; // useDb フックをインポート
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

interface ChatPaneProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
}

// React.memo でラップ
export const ChatPane = React.memo(({ currentDocument, onApplyToEditor }: ChatPaneProps) => {
  const { toast } = useToast();
  const { isDbInitialized } = useDb(); // DB初期化状態を取得
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // ScrollArea の Viewport を取得 (変更なし)
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>('div[data-radix-scroll-area-viewport]');
      if (viewportElement) {
        viewportRef.current = viewportElement;
      }
    }
  }, []);

  // メッセージ追加時に一番下にスクロール (変更なし)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
        }
    }, 100);
  }, []);

  // ドキュメント変更時にチャット履歴を読み込む (DB初期化チェック追加)
  useEffect(() => {
    const loadHistory = async () => {
      // DBが初期化されていない場合は処理しない
      if (!isDbInitialized) {
          console.log("ChatPane: DB not initialized, skipping history load.");
          setIsHistoryLoading(false); // ローディング状態を解除
          setMessages([]); // メッセージをクリア
          return;
      }

      if (currentDocument?.id) {
        setIsHistoryLoading(true);
        setMessages([]);
        console.log(`Loading chat history for document: ${currentDocument.id}`);
        try {
          const history = await getChatMessages(currentDocument.id);
          setMessages(history);
          scrollToBottom('auto');
        } catch (error) {
          console.error("Failed to load chat history:", error);
          toast({ title: "エラー", description: "チャット履歴の読み込みに失敗しました。", variant: "destructive" });
        } finally {
          setIsHistoryLoading(false);
        }
      } else {
        setMessages([]);
        setIsHistoryLoading(false);
        console.log("No current document or document ID, clearing chat history.");
      }
    };
    loadHistory();
  // isDbInitialized を依存配列に追加
  }, [currentDocument?.id, toast, scrollToBottom, isDbInitialized]);

  // 新しいメッセージをDBに保存する関数 (DB初期化チェック追加)
  const saveMessage = useCallback(async (message: Omit<ChatMessageType, 'id'>) => {
      if (!isDbInitialized || !currentDocument?.id) return; // DB初期化チェック
      try {
          await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
          console.error("Failed to save chat message:", error);
          toast({ title: "エラー", description: "チャットメッセージの保存に失敗しました。", variant: "destructive" });
      }
  // isDbInitialized を依存配列に追加
  }, [currentDocument?.id, toast, isDbInitialized]);

  // メッセージ送信処理 (変更なし)
  const handleSendMessage = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading || !currentDocument?.id || !isDbInitialized) return; // DB初期化チェック追加

    const newUserMessage: Omit<ChatMessageType, 'id'> = {
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };

    setMessages((prev) => [...prev, { ...newUserMessage, id: crypto.randomUUID() }]);
    setInputValue('');
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage);

    try {
      const requestBody: GeminiRequestType = {
        prompt: prompt,
        context: { currentMarkdown: currentDocument.content || "" },
      };

      const response = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data: GeminiResponseType = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'AIからの応答取得に失敗しました。');
      }

      if (data.result) {
        const newAssistantMessage: Omit<ChatMessageType, 'id'> = {
          role: 'assistant',
          content: data.result.text,
          markdownCode: data.result.markdownCode,
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: crypto.randomUUID() }]);
        await saveMessage(newAssistantMessage);
      } else {
        throw new Error('AIからの応答が空でした。');
      }

    } catch (error) {
      console.error("API Error:", error);
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      toast({ title: "エラー", description: errorContent, variant: "destructive" });
      const errorMessage: Omit<ChatMessageType, 'id'> = {
        role: 'system',
        content: errorContent,
        timestamp: new Date(),
        documentId: currentDocument.id,
      };
      setMessages((prev) => [...prev, { ...errorMessage, id: crypto.randomUUID() }]);
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
      document.getElementById('chat-input')?.focus();
      scrollToBottom();
    }
  // 依存配列に必要な state と関数を追加
  }, [inputValue, isLoading, currentDocument, isDbInitialized, toast, saveMessage, scrollToBottom]);

  // チャット履歴クリア処理 (DB初期化チェック追加)
  const handleClearChat = useCallback(async () => {
      if (!isDbInitialized || !currentDocument?.id) return; // DB初期化チェック
      try {
          await clearChatMessages(currentDocument.id);
          setMessages([]);
          toast({ title: "チャット履歴をクリアしました" });
      } catch (error) {
          console.error("Failed to clear chat history:", error);
          toast({ title: "エラー", description: "チャット履歴のクリアに失敗しました。", variant: "destructive" });
      }
  // isDbInitialized を依存配列に追加
  }, [currentDocument?.id, toast, isDbInitialized]);

  // コードをクリップボードにコピー (変更なし)
  const handleCopyCode = useCallback((code: string | null | undefined, messageId: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiedStates((prev) => ({ ...prev, [messageId]: true }));
      toast({ title: "コードをコピーしました" });
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [messageId]: false }));
      }, 2000);
    }).catch(err => {
      console.error('コピー失敗:', err);
      toast({ title: "コピーに失敗しました", variant: "destructive" });
    });
  }, [toast]); // 依存配列に toast を追加

  // コードをエディタに適用 (変更なし)
  const handleApplyCode = useCallback((codeToApply: string | null | undefined) => {
    if (codeToApply) {
      onApplyToEditor(codeToApply);
      toast({ title: "抽出されたコードをエディタに適用しました" });
    } else {
        toast({ title: "適用失敗", description: "応答からMarpコードを抽出できませんでした。", variant: "destructive" });
    }
  }, [onApplyToEditor, toast]); // 依存配列に onApplyToEditor, toast を追加

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-2 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
            <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">AI Chat</h3>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2" disabled={!currentDocument || messages.length === 0 || isLoading || isHistoryLoading || !isDbInitialized}>
                    <Trash2Icon className="w-3 h-3 mr-1" />
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
                <AlertDialogAction onClick={handleClearChat} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    クリアする
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* メッセージ表示エリア */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isHistoryLoading && (
            <div className="flex justify-center items-center py-10">
                <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isHistoryLoading && messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">
                {isDbInitialized ? "チャット履歴はありません。" : "データベース初期化中..."}
            </div>
          )}
          {!isHistoryLoading && messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-6 h-6 self-start flex-shrink-0">
                  <AvatarFallback><BotIcon className="w-4 h-4" /></AvatarFallback>
                </Avatar>
              )}
              {message.role !== 'system' && (
                <div
                  className={`p-3 rounded-lg max-w-[85%] md:max-w-[75%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  } break-words whitespace-pre-wrap`}
                >
                  {message.content}
                  {message.role === 'assistant' && message.markdownCode && (
                    <div className="mt-2 pt-2 border-t border-muted-foreground/20 flex flex-wrap gap-2">
                       <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleCopyCode(message.markdownCode, message.id)}
                      >
                        {copiedStates[message.id] ? (
                          <CheckIcon className="w-3 h-3 mr-1" />
                        ) : (
                          <CopyIcon className="w-3 h-3 mr-1" />
                        )}
                        コードコピー
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleApplyCode(message.markdownCode)}
                        disabled={!message.markdownCode}
                      >
                        <ClipboardPasteIcon className="w-3 h-3 mr-1" />
                        エディタに適用
                      </Button>
                    </div>
                  )}
                </div>
              )}
               {message.role === 'system' && (
                 <div className="text-xs text-destructive italic px-2 py-1 bg-destructive/10 rounded w-full text-center my-2">
                    {message.content}
                 </div>
               )}
              {message.role === 'user' && (
                <Avatar className="w-6 h-6 flex-shrink-0">
                  <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && !isHistoryLoading && (
             <div className="flex items-end gap-2 justify-start">
                <Avatar className="w-6 h-6 self-start flex-shrink-0">
                  <AvatarFallback><BotIcon className="w-4 h-4" /></AvatarFallback>
                </Avatar>
                <div className="p-3 rounded-lg bg-muted max-w-[75%]">
                    <Skeleton className="h-4 w-16 flex items-center">
                        <Loader2Icon className="w-3 h-3 animate-spin"/>
                    </Skeleton>
                </div>
             </div>
          )}
        </div>
      </ScrollArea>

      {/* 入力エリア */}
      <div className="p-4 border-t flex items-start gap-2">
        <Textarea
          id="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={!isDbInitialized ? "データベース初期化中..." : !currentDocument ? "ドキュメント読み込み中..." : isHistoryLoading ? "履歴を読み込み中..." : "AIにメッセージを送信..."}
          className="flex-1 resize-none min-h-[40px] max-h-[150px] text-sm"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading || isHistoryLoading || !currentDocument || !isDbInitialized}
        />
        <Button onClick={handleSendMessage} size="icon" disabled={isLoading || isHistoryLoading || !inputValue.trim() || !currentDocument || !isDbInitialized}>
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

ChatPane.displayName = 'ChatPane'; // displayName を設定
