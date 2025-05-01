// hooks/use-chat.ts
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

// --- 履歴に含める最大メッセージ数 ---
const MAX_HISTORY_LENGTH = 10;
// --- ここまで ---

interface UseChatProps {
  currentDocument: DocumentType | null;
  onApplyToEditor: (content: string) => void;
  onApplyCustomCss: (css: string) => void;
}

export function useChat({ currentDocument, onApplyToEditor, onApplyCustomCss }: UseChatProps) {
  const { isDbInitialized } = useDb();
  const { handleError } = useErrorHandler();
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
        await addChatMessage({ ...message, documentId: currentDocument.id });
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
    // --- ★ 履歴を含めてメッセージリストを更新 ---
    const currentMessages = [...messages, { ...newUserMessage, id: tempUserMessageId }];
    setMessages(currentMessages);
    // --- ここまで ---
    setInputValue("");
    setIsLoading(true);
    scrollToBottom();

    await saveMessage(newUserMessage);

    // --- ★ 履歴データを抽出 ---
    const historyForApi = currentMessages
      .filter((msg) => msg.role === "user" || msg.role === "assistant") // ユーザーとアシスタントのメッセージのみ
      .slice(-MAX_HISTORY_LENGTH); // 直近N件を取得
    // --- ここまで ---

    // --- ★ AIへの依頼中メッセージ ---
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
    // --- ★ 思考中メッセージを追加 ---
    setMessages((prev) => [...prev, { ...thinkingMsg, id: uuidv4() }]);
    scrollToBottom();
    // --- ここまで ---

    try {
      const requestBody: GeminiRequestType & { history?: ChatMessageType[] } = { // history を型に追加
        prompt: prompt, // 最新のプロンプトは別途送信
        context: { currentMarkdown: currentDocument.content || "" },
        taskType: selectedTaskType,
        // --- ★ 履歴データをリクエストに追加 ---
        history: historyForApi,
        // --- ここまで ---
      };

      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      // --- ★ 思考中メッセージを削除 ---
      setMessages((prev) => prev.filter((msg) => msg.content !== thinkingMessage || msg.role !== "system"));
      // --- ここまで ---

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
        const tempAssistantMessageId = uuidv4();
        setMessages((prev) => [...prev, { ...newAssistantMessage, id: tempAssistantMessageId }]);
        await saveMessage(newAssistantMessage);

        // --- テーマ生成成功時の処理 ---
        if (selectedTaskType === "GenerateTheme" && data.result.markdownCode) {
          try {
            onApplyCustomCss(data.result.markdownCode);
            const successMsg: Omit<ChatMessageType, "id"> = {
              role: "system",
              content: "✅ AIが生成したテーマCSSを適用しました。",
              timestamp: new Date(),
              documentId: currentDocument.id,
            };
            setMessages((prev) => [...prev, { ...successMsg, id: uuidv4() }]);
            await saveMessage(successMsg); // システムメッセージも保存
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
        } else if (selectedTaskType === "GenerateTheme" && !data.result.markdownCode) {
           const noCssMsg: Omit<ChatMessageType, "id"> = {
             role: "system",
             content: "⚠️ AIは応答しましたが、有効なCSSコードが見つかりませんでした。",
             timestamp: new Date(),
             documentId: currentDocument.id,
           };
           setMessages((prev) => [...prev, { ...noCssMsg, id: uuidv4() }]);
           await saveMessage(noCssMsg);
        }
        // --- ここまで ---

      } else {
        throw new Error("AIからの応答が空でした。");
      }
    } catch (error) {
      // --- ★ 思考中メッセージを削除 (エラー時も) ---
      setMessages((prev) => prev.filter((msg) => msg.content !== thinkingMessage || msg.role !== "system"));
      // --- ここまで ---
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
    onApplyCustomCss,
    onApplyToEditor, // onApplyToEditor も依存配列に残す
    selectedTaskType,
    messages, // ★ messages を依存配列に追加
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
    selectedTaskType,
    setSelectedTaskType,
  };
}
