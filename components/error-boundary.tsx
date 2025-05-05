"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button"; // フォールバックUI用にボタンをインポート
import { AlertTriangleIcon } from "lucide-react"; // アイコンをインポート

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // オプションでカスタムフォールバックUIを受け取れるように
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  // エラーが発生した際にstateを更新してフォールバックUIを表示する
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // エラー情報（エラーオブジェクトとコンポーネントスタック）をログに出力する
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // ここでエラー報告サービス（Sentryなど）に送信することも可能
    // logErrorToMyService(error, errorInfo);
  }

  // リセット関数（例: ページリロード）
  private handleReset = () => {
    // stateをリセットして再レンダリングを試みるか、ページをリロードするか
    // this.setState({ hasError: false, error: null });
    window.location.reload(); // 簡単なリセット方法としてリロード
  };

  public render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが指定されていればそれを表示
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのフォールバックUI
      return (
        <div
          role="alert"
          className="flex h-screen flex-col items-center justify-center space-y-4 bg-destructive/10 p-8 text-center text-destructive"
        >
          <AlertTriangleIcon className="h-16 w-16" />
          <h2 className="text-2xl font-semibold">問題が発生しました</h2>
          <p className="text-lg">
            アプリケーションのレンダリング中に予期せぬエラーが発生しました。
          </p>
          {/* 開発モードでのみエラー詳細を表示する例 */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="w-full max-w-2xl rounded border border-destructive/50 bg-white/10 p-4 text-left text-xs">
              <summary className="cursor-pointer font-medium">エラー詳細</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap">
                {this.state.error.toString()}
                {"\n\n"}
                {/* コンポーネントスタックは componentDidCatch でログ出力済み */}
              </pre>
            </details>
          )}
          <Button
            variant="destructive"
            onClick={this.handleReset}
            className="mt-6 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            ページを再読み込み
          </Button>
        </div>
      );
    }

    // エラーがなければ子コンポーネントをそのままレンダリング
    return this.props.children;
  }
}

export default ErrorBoundary;
