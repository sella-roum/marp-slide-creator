"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  DocumentType,
  GeminiRequestType,
  GeminiResponseType,
  ChatMessageType,
} from "@/lib/types";
import { addChatMessage, getChatMessages, clearChatMessages } from "@/lib/db";
import { useDb } from "@/lib/db-context";
import { v4 as uuidv4 } from "uuid";
import { useErrorHandler } from "@/hooks/use-error-handler";

interface UseChatProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
  onApplyCustomCss: (css: string) => void; // ★ 追加: CSS適用コールバック
}

export function useChat({ currentDocument, onApplyToEditor, onApplyCustomCss }: UseChatProps) { // ★ onApplyCustomCss を受け取る
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // ScrollArea の Viewport を取得するための Ref を設定する関数
  const setViewportRef = useCallback((element: HTMLDivElement | null) => {
    viewportRef.current = element;
  }, []);

  // メッセージ追加時に一番下にスクロール
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    setTimeout(() => {
      if (viewportRef.current) {
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior });
      }
    }, 100);
  }, []);

  // ドキュメント変更時にチャット履歴を読み込む
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

  // 新しいメッセージをDBに保存する関数
  const saveMessage = useCallback(
    async (message: Omit<ChatMessageType, "id">) => {
      if (!isDbInitialized || !currentDocument?.id) return;
      try {
        await addChatMessage({ ...message, documentId: currentDocument.id });
      } catch (error) {
        handleError({ error, context: "チャットメッセージの保存" });
      }
    },
    [currentDocument?.id, isDbInitialized, handleError]
  );

  // メッセージ送信処理
  const handleSendMessage = useCallback(async () => {
    const fullInput = inputValue.trim();
    if (!fullInput || isLoading || !currentDocument?.id || !isDbInitialized) return;

    let prompt = fullInput;
    let taskType: string | undefined = undefined;
    let userMessageContent = fullInput;
    let isThemeGeneration = false;

    // --- ★ /theme コマンドの判定 ---
    if (fullInput.startsWith("/theme ")) {
      prompt = fullInput.substring(7).trim();
      if (!prompt) {
        const errorMsg: Omit<ChatMessageType, "id"> = {
          role: "system",
          content: "エラー: /theme コマンドにはテーマの説明が必要です。(例: /theme 青系のクールなテーマ)",
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        setMessages((prev) => [...prev, { ...errorMsg, id: uuidv4() }]);
        scrollToBottom();
        return;
      }
      taskType = "GenerateTheme";
      userMessageContent = `AIにテーマ生成を依頼: "${prompt}"`;
      isThemeGeneration = true;
      console.log("Theme generation requested:", prompt);
    }
    // --- /theme コマンド判定ここまで ---

    const newUserMessage: Omit<ChatMessageType, "id"> = {
      role: "user",
      content: userMessageContent,
      timestamp: new Date(),
      documentId: currentDocument.id,
    };

    const tempUserMessageId = uuidv4();
    setMessages((prev) => [...prev, { ...newUserMessage, id: tempUserMessageId }]);
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage);

    // --- ★ AIへのリクエスト ---
    try {
      const requestBody: GeminiRequestType = {
        prompt: prompt,
        context: { currentMarkdown: currentDocument.content || "" },
        taskType: taskType, // ★ taskType を追加
      };

      // ★ AIへの依頼中メッセージ (テーマ生成の場合)
      if (isThemeGeneration) {
        const thinkingMsg: Omit<ChatMessageType, "id"> = {
          role: "system",
          content: "AIがテーマCSSを生成中です...",
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        setMessages((prev) => [...prev, { ...thinkingMsg, id: uuidv4() }]);
        scrollToBottom();
      }

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
          markdownCode: data.result.markdownCode, // ★ CSSコードまたはMarkdownコード
          timestamp: new Date(),
          documentId: currentDocument.id,
        };
        const tempAssistantMessageId = uuidv4();
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: tempAssistantMessageId }]);
        await saveMessage(newAssistantMessage);

        // --- ★ テーマ生成成功時の処理 ---
        if (isThemeGeneration && data.result.markdownCode) {
          try {
            onApplyCustomCss(data.result.markdownCode); // ★ CSS適用コールバックを呼び出す
            const successMsg: Omit<ChatMessageType, "id"> = {
              role: "system",
              content: "✅ AIが生成したテーマCSSを適用しました。",
              timestamp: new Date(),
              documentId: currentDocument.id,
            };
            setMessages((prev) => [...prev, { ...successMsg, id: uuidv4() }]);
          } catch (applyError) {
             handleError({ error: applyError, context: "生成されたCSSの適用" });
             const applyErrorMsg: Omit<ChatMessageType, "id"> = {
               role: "system",
               content: `⚠️ 生成されたCSSの適用中にエラーが発生しました: ${applyError instanceof Error ? applyError.message : '不明なエラー'}`,
               timestamp: new Date(),
               documentId: currentDocument.id,
             };
             setMessages((prev) => [...prev, { ...applyErrorMsg, id: uuidv4() }]);
             await saveMessage(applyErrorMsg);
          }
        } else if (isThemeGeneration && !data.result.markdownCode) {
           const noCssMsg: Omit<ChatMessageType, "id"> = {
             role: "system",
             content: "⚠️ AIは応答しましたが、有効なCSSコードが見つかりませんでした。",
             timestamp: new Date(),
             documentId: currentDocument.id,
           };
           setMessages((prev) => [...prev, { ...noCssMsg, id: uuidv4() }]);
           await saveMessage(noCssMsg);
        }
        // --- テーマ生成成功時の処理ここまで ---

      } else {
        throw new Error("AIからの応答が空でした。");
      }
    } catch (error) {
      const errorContent = `エラー: ${error instanceof Error ? error.message : "AIとの通信中にエラーが発生しました。"}`;
      handleError({ error, context: isThemeGeneration ? "AIテーマ生成" : "AI応答の取得", userMessage: errorContent });
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
    onApplyCustomCss, // ★ 依存配列に追加
    onApplyToEditor, // ★ onApplyToEditorも必要に応じて追加
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

  // コードをクリップボードにコピー
  const handleCopyCode = useCallback(
    (code: string | null | undefined, messageId: string) => {
      if (!code) return;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          setCopiedStates((prev) => ({ ...prev, [messageId]: true }));
          setTimeout(() => {
            setCopiedStates((prev) => ({ ...prev, [messageId]: false }));
          }, 2000);
        })
        .catch((err) => {
          handleError({ error: err, context: "コードのコピー" });
        });
    },
    [handleError]
  );

  // コードをエディタに適用
  const handleApplyCode = useCallback(
    (codeToApply: string | null | undefined) => {
      if (codeToApply) {
        onApplyToEditor(codeToApply);
      } else {
        console.warn("Attempted to apply code, but no markdown code was found in the message.");
      }
    },
    [onApplyToEditor]
  );

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isHistoryLoading,
    copiedStates,
    handleSendMessage,
    handleClearChat,
    handleCopyCode,
    handleApplyCode,
    setViewportRef,
  };
}
