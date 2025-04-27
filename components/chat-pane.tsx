"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"; // AvatarImage を削除 (今回は使わないため)
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SendIcon, BotIcon, UserIcon, CopyIcon, CheckIcon, Loader2Icon, Trash2Icon } from "lucide-react"; // Trash2Icon を追加
import { useToast } from "@/hooks/use-toast";
import type { DocumentType, GeminiRequestType, GeminiResponseType, ChatMessageType } from "@/lib/types"; // ChatMessageType をインポート
import { Skeleton } from "@/components/ui/skeleton";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db"; // DB関数をインポート
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
} from "@/components/ui/alert-dialog" // 確認ダイアログ用

// ChatMessage 型は lib/types.ts からインポート

interface ChatPaneProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
}

export function ChatPane({ currentDocument, onApplyToEditor }: ChatPaneProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false); // AI応答待ち
  const [isHistoryLoading, setIsHistoryLoading] = useState(false); // 履歴読み込み中
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // ScrollArea の Viewport を取得
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewportElement = scrollAreaRef.current.querySelector<HTMLDivElement>('div[data-radix-scroll-area-viewport]');
      if (viewportElement) {
        viewportRef.current = viewportElement;
      }
    }
  }, []);

  // メッセージ追加時に一番下にスクロール
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // 履歴読み込み直後は即時スクロール、通常はスムーズスクロール
    setTimeout(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
        }
    }, 100); // 少し遅延させてレンダリング完了を待つ
  }, []);

  // ドキュメント変更時にチャット履歴を読み込む
  useEffect(() => {
    const loadHistory = async () => {
      if (currentDocument) {
        setIsHistoryLoading(true);
        setMessages([]); // 読み込み前にクリア
        try {
          const history = await getChatMessages(currentDocument.id);
          setMessages(history);
          // 履歴読み込み完了後に一番下にスクロール (即時)
          scrollToBottom('auto');
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
      } else {
        setMessages([]); // ドキュメントがない場合はクリア
      }
    };
    loadHistory();
  }, [currentDocument, toast, scrollToBottom]); // scrollToBottom を依存配列に追加

  // 新しいメッセージをDBに保存する関数
  const saveMessage = async (message: Omit<ChatMessageType, 'id'>) => {
      if (!currentDocument) return;
      try {
          // documentId を付与して保存
          await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
          console.error("Failed to save chat message:", error);
          // 保存失敗時のエラーハンドリング (必要であれば)
          toast({
              title: "エラー",
              description: "チャットメッセージの保存に失敗しました。",
              variant: "destructive",
          });
      }
  };

  // メッセージ送信処理
  const handleSendMessage = async () => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading || !currentDocument) return;

    const newUserMessage: Omit<ChatMessageType, 'id'> = { // id を除外
      role: 'user',
      content: prompt,
      timestamp: new Date(),
      documentId: currentDocument.id, // documentId を含める
    };

    // UIに即時反映
    setMessages((prev) => [...prev, { ...newUserMessage, id: crypto.randomUUID() }]); // UI用には仮IDを付与
    setInputValue('');
    setIsLoading(true);
    scrollToBottom(); // 送信時にもスクロール

    // DBに保存
    await saveMessage(newUserMessage);

    try {
      const requestBody: GeminiRequestType = {
        prompt: prompt,
        context: {
          currentMarkdown: currentDocument.content || "",
        },
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
        const newAssistantMessage: Omit<ChatMessageType, 'id'> = { // id を除外
          role: 'assistant',
          content: data.result.text,
          markdownCode: data.result.markdownCode,
          timestamp: new Date(),
          documentId: currentDocument.id, // documentId を含める
        };
        // UIに反映
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: crypto.randomUUID() }]);
        // DBに保存
        await saveMessage(newAssistantMessage);
      } else {
        throw new Error('AIからの応答が空でした。');
      }

    } catch (error) {
      console.error("API Error:", error);
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      toast({
        title: "エラー",
        description: errorContent,
        variant: "destructive",
      });
      const errorMessage: Omit<ChatMessageType, 'id'> = { // id を除外
        role: 'system',
        content: errorContent,
        timestamp: new Date(),
        documentId: currentDocument.id, // documentId を含める
      };
      // UIに反映
      setMessages((prev) => [...prev, { ...errorMessage, id: crypto.randomUUID() }]);
      // DBに保存 (エラーメッセージも保存する場合)
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
      document.getElementById('chat-input')?.focus();
      scrollToBottom(); // 応答後にもスクロール
    }
  };

  // チャット履歴クリア処理
  const handleClearChat = async () => {
      if (!currentDocument) return;
      try {
          await clearChatMessages(currentDocument.id);
          setMessages([]); // UIをクリア
          toast({ title: "チャット履歴をクリアしました" });
      } catch (error) {
          console.error("Failed to clear chat history:", error);
          toast({
              title: "エラー",
              description: "チャット履歴のクリアに失敗しました。",
              variant: "destructive",
          });
      }
  };


  // コードをクリップボードにコピー
  const handleCopyCode = (code: string | null | undefined, messageId: string) => {
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
  };

  // コードをエディタに適用
  const handleApplyCode = (code: string | null | undefined) => {
    if (code) {
      onApplyToEditor(code);
      toast({ title: "コードをエディタに適用しました" });
    } else {
        toast({ title: "適用できるコードがありません", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* --- クリアボタンを追加 --- */}
      <div className="p-2 border-b flex justify-end">
         <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!currentDocument || messages.length === 0 || isLoading || isHistoryLoading}>
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
      {/* --- クリアボタンここまで --- */}

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {isHistoryLoading && ( // 履歴読み込み中の表示
            <div className="flex justify-center items-center h-full">
                <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!isHistoryLoading && messages.length === 0 && ( // 履歴がない場合の表示
            <div className="text-center text-muted-foreground text-sm py-10">
                チャット履歴はありません。
            </div>
          )}
          {!isHistoryLoading && messages.map((message) => (
            <div
              key={message.id} // DBから読み込んだID or 仮ID
              className={`flex items-end gap-2 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="w-6 h-6 self-start flex-shrink-0"> {/* flex-shrink-0 を追加 */}
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
                    <div className="mt-2 pt-2 border-t border-muted-foreground/20 flex flex-wrap gap-2"> {/* flex-wrap を追加 */}
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
                        コピー
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-2"
                        onClick={() => handleApplyCode(message.markdownCode)}
                      >
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
                <Avatar className="w-6 h-6 flex-shrink-0"> {/* flex-shrink-0 を追加 */}
                  <AvatarFallback><UserIcon className="w-4 h-4" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && !isHistoryLoading && ( // AI応答待ちの表示 (履歴読み込み中ではない場合のみ)
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

      <div className="p-4 border-t flex items-start gap-2">
        <Textarea
          id="chat-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={!currentDocument ? "ドキュメントを選択してください" : isHistoryLoading ? "履歴を読み込み中..." : "AIにメッセージを送信..."}
          className="flex-1 resize-none min-h-[40px] max-h-[150px] text-sm"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          disabled={isLoading || isHistoryLoading || !currentDocument}
        />
        <Button onClick={handleSendMessage} size="icon" disabled={isLoading || isHistoryLoading || !inputValue.trim() || !currentDocument}>
          <SendIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
