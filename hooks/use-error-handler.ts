"use client";

import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface HandleErrorOptions {
  error: unknown; // エラーオブジェクト (any or unknown)
  context?: string; // エラー発生箇所を示す文字列 (例: 'ドキュメント保存')
  userMessage?: string; // ユーザーに表示するカスタムメッセージ
}

/**
 * アプリケーション全体のエラーハンドリングを一元化するカスタムフック。
 * エラーログの出力とユーザーへのトースト通知を行います。
 */
export function useErrorHandler() {
  const { toast } = useToast();

  /**
   * エラーを処理する関数。
   * @param options エラー情報とコンテキスト
   */
  const handleError = useCallback(
    ({ error, context, userMessage }: HandleErrorOptions): void => {
      // 開発者向けの詳細ログ
      const logContext = context ? `[${context}] ` : "";
      console.error(`${logContext}エラーが発生しました:`, error);
      // エラーオブジェクトのスタックトレースなども出力するとより詳細
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }

      // ユーザー向けのメッセージ生成
      let displayMessage = userMessage;
      if (!displayMessage) {
        if (context) {
          displayMessage = `${context}中にエラーが発生しました。`;
        } else {
          displayMessage = "不明なエラーが発生しました。";
        }
        // 可能であれば、エラーの種類に応じてメッセージを具体化
        if (error instanceof Error) {
          // 例: ネットワークエラーの判定 (ブラウザ依存の可能性あり)
          if (error.message.toLowerCase().includes("failed to fetch")) {
            displayMessage += " ネットワーク接続を確認してください。";
          }
          // 例: IndexedDBのエラー
          if (error.name === "QuotaExceededError") {
             displayMessage = "ブラウザの保存容量が不足しています。不要なデータを削除してください。";
          } else if (error.message.includes("Database") || error.message.includes("IndexedDB")) {
             displayMessage += " データベース操作に失敗しました。";
          }
        }
        displayMessage += " 問題が続く場合は、ページを再読み込みするか、開発者にお問い合わせください。";
      }


      // useToast を使ってユーザーに通知
      toast({
        title: "エラー",
        description: displayMessage,
        variant: "destructive",
      });
    },
    [toast] // toast 関数を依存配列に追加
  );

  return { handleError };
}
