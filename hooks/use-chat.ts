"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  DocumentType,
  GeminiRequestType,
  GeminiResponseType,
  ChatMessageType,
  GeminiTaskType,
} from "@/lib/types";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { v4 as uuidv4 } from "uuid";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { useToast } from "@/hooks/use-toast";

// 履歴に含める最大メッセージ数
const MAX_HISTORY_LENGTH = 10;

interface UseChatProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
  onApplyCustomCss: (css: string) => void;
}

export function useChat({ currentDocument, onApplyToEditor, onApplyCustomCss }: UseChatProps) {
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<GeminiTaskType>("GeneralConsultation");

  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
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
        console.log("useChat: DB not initialized, skipping history load.");
        setIsHistoryLoading(false);
        setMessages([]);
        return;
      }

      if (currentDocument?.id) {
        setIsHistoryLoading(true);
        setMessages([]);
        console.log(`Loading chat history for document: ${currentDocument.id}`);
        try {
          const history = await getChatMessages(currentDocument.id);
          setMessages(history);
          scrollToBottom("auto");
        } catch (error) {
          handleError({ error, context: "チャット履歴の読み込み" });
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
  }, [currentDocument?.id, scrollToBottom, isDbInitialized, handleError]);

  const saveMessage = useCallback(
    async (message: Omit<ChatMessageType, "id">) => {
      if (!isDbInitialized || !currentDocument?.id) return;
      try {
        await addChatMessage({
            ...message,
            documentId: currentDocument.id,
        });
      } catch (error) {
        handleError({ error, context: "チャットメッセージの保存" });
      }
    },
    [currentDocument?.id, isDbInitialized, handleError]
  );

  // メッセージ送信処理
  const handleSendMessage = useCallback(async () => {
    const prompt = inputValue.trim();
    if (!prompt || isLoading || !currentDocument?.id || !isDbInitialized) return;

    const userMessageContent = prompt;

    const newUserMessage: Omit<ChatMessageType, "id"> = {
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };

    const tempUserMessageId = uuidv4();
    const currentMessages = [...messages, { ...newUserMessage, id: tempUserMessageId }];
    setMessages(currentMessages);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage);

    const historyForApi = currentMessages
      .filter((msg) => msg.role === "user" || msg.role === "assistant")
      .slice(-MAX_HISTORY_LENGTH);

    let thinkingMessage = "AIが応答を生成中です...";
    if (selectedTaskType === "GenerateSlideContent") {
      thinkingMessage = "AIがスライドコンテンツを生成中です...";
    } else if (selectedTaskType === "GenerateTheme") {
      thinkingMessage = "AIがテーマCSSを生成中です...";
    }
    const thinkingMsg: Omit<ChatMessageType, "id"> = {
      role: "system",
      content: thinkingMessage,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };
    setMessages((prev) => [...prev, { ...thinkingMsg, id: uuidv4() }]);
    scrollToBottom();

    try {
      const requestBody: GeminiRequestType & { history?: ChatMessageType[] } = {
        prompt: prompt,
        context: { currentMarkdown: currentDocument.content || "" },
        taskType: selectedTaskType,
        history: historyForApi,
      };

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      setMessages((prev) => prev.filter((msg) => msg.content !== thinkingMessage || msg.role !== "system"));

      const data: GeminiResponseType = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "AIからの応答取得に失敗しました。");
      }

      if (data.result) {
        // ★ content フィールドの内容を決定する
        let displayContent = "";
        if (data.result.explanation) {
          displayContent = data.result.explanation; // explanation があればそれを表示内容とする
        } else if (data.result.slideMarkdown || data.result.cssCode) {
          // explanation がなく、コードがある場合はデフォルトメッセージ
          displayContent = selectedTaskType === "GenerateSlideContent"
            ? "スライドのMarkdownを生成しました。"
            : "テーマCSSを生成しました。";
        } else {
          // コードも explanation もない場合 (GeneralConsultation やエラーフォールバックなど)
          displayContent = data.result.text; // 生のテキストを表示
        }

        const newAssistantMessage: Omit<ChatMessageType, "id"> = {
          role: "assistant",
          content: displayContent, // ★ 表示用のテキストを設定
          slideMarkdown: data.result.slideMarkdown,
          cssCode: data.result.cssCode,
          explanation: data.result.explanation, // explanation は別途保持
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        const tempAssistantMessageId = uuidv4();
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: tempAssistantMessageId }]);
        await saveMessage(newAssistantMessage);

      } else {
        throw new Error("AIからの応答が空でした。");
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.content !== thinkingMessage || msg.role !== "system"));
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      handleError({ error, context: `AI ${selectedTaskType} 処理`, userMessage: errorContent });
      const errorMessage: Omit<ChatMessageType, "id"> = {
        role: "system",
        content: errorContent,
        timestamp: new Date(),
        documentId: currentDocument.id,
      };
      const tempErrorMessageId = uuidv4();
      setMessages((prev) => [...prev, { ...errorMessage, id: tempErrorMessageId }]);
      await saveMessage(errorMessage);
    } finally {
      setIsLoading(false);
      document.getElementById("chat-input")?.focus();
      scrollToBottom();
    }
  }, [
    inputValue,
    isLoading,
    currentDocument,
    isDbInitialized,
    saveMessage,
    scrollToBottom,
    handleError,
    selectedTaskType,
    messages,
  ]);

  // チャット履歴クリア処理
  const handleClearChat = useCallback(async () => {
     if (!isDbInitialized || !currentDocument?.id) return;
    try {
      await clearChatMessages(currentDocument.id);
      setMessages([]);
    } catch (error) {
      handleError({ error, context: "チャット履歴のクリア" });
    }
  }, [currentDocument?.id, isDbInitialized, handleError]);

  // コードコピーハンドラ
  const handleCopyMarkdown = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        setCopiedStates((prev) => ({ ...prev, [`md-${messageId}`]: true }));
        setTimeout(() => {
          setCopiedStates((prev) => ({ ...prev, [`md-${messageId}`]: false }));
        }, 2000);
      }).catch((err) => handleError({ error: err, context: "Markdownコードのコピー" }));
    },
    [handleError]
  );

  const handleCopyCss = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        setCopiedStates((prev) => ({ ...prev, [`css-${messageId}`]: true }));
        setTimeout(() => {
          setCopiedStates((prev) => ({ ...prev, [`css-${messageId}`]: false }));
        }, 2000);
      }).catch((err) => handleError({ error: err, context: "CSSコードのコピー" }));
    },
    [handleError]
  );

  // コード適用ハンドラ
  const handleApplyMarkdown = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        onApplyToEditor(codeToApply);
        toast({ title: "成功", description: "Markdownをエディタに適用しました。" });
      } else {
        console.warn("Attempted to apply Markdown, but no code was found.");
        toast({ title: "エラー", description: "適用するMarkdownコードが見つかりません。", variant: "destructive" });
      }
    },
    [onApplyToEditor, toast]
  );

  const handleApplyCss = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        try {
          onApplyCustomCss(codeToApply);
          toast({ title: "成功", description: "カスタムCSSを適用しました。" });
        } catch (error) {
           handleError({ error, context: "カスタムCSSの適用" });
        }
      } else {
        console.warn("Attempted to apply CSS, but no code was found.");
        toast({ title: "エラー", description: "適用するCSSコードが見つかりません。", variant: "destructive" });
      }
    },
    [onApplyCustomCss, toast, handleError]
  );

  // フックの戻り値
  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isHistoryLoading,
    copiedStates,
    handleSendMessage,
    handleClearChat,
    handleCopyMarkdown,
    handleCopyCss,
    handleApplyMarkdown,
    handleApplyCss,
    setViewportRef,
    selectedTaskType,
    setSelectedTaskType,
  };
}
