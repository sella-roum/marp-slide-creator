"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react"; // useCallback をインポート
import { FileIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { processMarkdownForRender } from "@/lib/markdown-processor";
import { useErrorHandler } from "@/hooks/use-error-handler";

interface PreviewPaneProps {
  markdown: string;
}

// React.memo でラップ
export const PreviewPane = React.memo(({ markdown }: PreviewPaneProps) => {
  const [renderedHTML, setRenderedHTML] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Marp初期化用
  const [isProcessing, setIsProcessing] = useState(false); // Markdown処理中用
  const [marpInstance, setMarpInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null); // iframeへの参照
  const { handleError } = useErrorHandler(); // ★ エラーハンドラフックを使用
  const previewScrollTopRef = useRef<number>(0); // プレビューのスクロール位置を保持
  // --- ▼ 画像キャッシュ用のステートを追加 ▼ ---
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());
  // --- ▲ 画像キャッシュ用のステートを追加 ▲ ---

  // --- ▼ キャッシュ更新関数を追加 (useCallbackでメモ化) ▼ ---
  const updateImageCache = useCallback((id: string, dataUrl: string | null) => {
    setImageCache((prevCache) => {
      // Mapが変更されたかチェックし、変更があれば新しいMapを返す
      if (prevCache.get(id) === dataUrl) {
        return prevCache; // 変更がなければ既存のMapを返す
      }
      const newCache = new Map(prevCache);
      newCache.set(id, dataUrl);
      return newCache;
    });
  }, []); // 依存配列は空
  // --- ▲ キャッシュ更新関数を追加 ▲ ---

  // Initialize Marp (変更なし)
  useEffect(() => {
    const initializeMarp = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { Marp } = await import(/* webpackChunkName: "marp-core" */ "@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        setMarpInstance(marp);
      } catch (err) {
        setError("Marpの初期化に失敗しました");
        handleError({ error: err, context: "Marp初期化" }); // ★ 共通ハンドラを使用
      } finally {
        setIsLoading(false);
      }
    };
    initializeMarp();
  }, [handleError]); // ★ handleError を依存配列に追加

  // Render markdown with Marp
  useEffect(() => {
    if (!marpInstance) return;

    const render = async () => {
      // Markdownが空の場合の処理
      if (!markdown) {
        setRenderedHTML("");
        setError(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setError(null);

      // スクロール位置の保存 (変更なし)
      const currentIframe = iframeRef.current;
      if (currentIframe && currentIframe.contentWindow) {
        previewScrollTopRef.current = currentIframe.contentWindow.scrollY;
      }

      try {
        // console.log("Processing markdown for preview...");
        // --- ▼ processMarkdownForRender にキャッシュと更新関数を渡す ▼ ---
        const processedMarkdown = await processMarkdownForRender(markdown, imageCache, updateImageCache);
        // --- ▲ processMarkdownForRender にキャッシュと更新関数を渡す ▲ ---
        // console.log("Markdown processed.");

        let finalMarkdown = processedMarkdown;
        // Marpディレクティブの追加 (変更なし)
        if (!finalMarkdown.includes("marp: true")) {
          finalMarkdown = `---\nmarp: true\n---\n\n${finalMarkdown}`;
        }

        // Marpレンダリング (変更なし)
        const { html, css } = marpInstance.render(finalMarkdown);

        // カスタムCSS (変更なし)
        const customCSS = `
                section:not(:last-of-type) { border-bottom: 2px dashed #ccc; margin-bottom: 1rem; padding-bottom: 1rem; }
                body { padding: 1rem; background-color: #f0f0f0; }
                section { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
            `;

        const fullHTML = `<style>${css}${customCSS}</style>${html}`;
        setRenderedHTML(fullHTML);
      } catch (err) {
        setError(`プレビュー生成エラー: ${err instanceof Error ? err.message : String(err)}`);
        handleError({ error: err, context: "プレビュー生成" }); // ★ 共通ハンドラを使用
        setRenderedHTML("");
      } finally {
        setIsProcessing(false);
      }
    };

    render();
    // --- ▼ 依存配列に imageCache と updateImageCache を追加 ▼ ---
    // updateImageCache は useCallback でメモ化されているため、通常は再生成されない
  }, [markdown, marpInstance, handleError, imageCache, updateImageCache]);
  // --- ▲ 依存配列に imageCache と updateImageCache を追加 ▲ ---

  // スクロール位置の復元 (変更なし)
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      // console.log("Restoring preview scroll position to:", previewScrollTopRef.current);
      iframe.contentWindow?.scrollTo(0, previewScrollTopRef.current);
    };

    iframe.addEventListener('load', handleLoad);

    // クリーンアップ関数
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
    // renderedHTML が変わるたびに load イベントリスナーを再設定
  }, [renderedHTML]);

  // Render (変更なし)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <h3 className="text-sm font-medium">プレビュー</h3>
        {(isLoading || isProcessing) && (
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="relative flex-1 overflow-auto bg-gray-200 dark:bg-gray-900">
        {/* 初期化中 */}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {/* 処理中 */}
        {!isLoading && isProcessing && (
          <div className="absolute inset-0 z-10 flex h-full items-center justify-center bg-white/50 dark:bg-black/50">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">プレビューを更新中...</p>
          </div>
        )}
        {/* エラー表示 */}
        {!isLoading && error && (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-destructive">
            <AlertCircleIcon className="mb-2 h-8 w-8" />
            <p>{error}</p>
          </div>
        )}
        {/* コンテンツ表示エリア */}
        {!isLoading && !error && (
          <div className={`h-full w-full p-4 ${isProcessing ? "opacity-50" : ""}`}>
            {renderedHTML ? (
              <iframe
                ref={iframeRef} // iframe への参照を設定
                srcDoc={renderedHTML}
                className="h-full w-full rounded border-0 bg-white"
                title="Marp Preview"
                sandbox="allow-scripts allow-same-origin"
                // onLoad は useLayoutEffect 内で処理するため削除
              />
            ) : markdown ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                プレビューを生成できませんでした。
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted-foreground">
                <FileIcon className="mb-4 h-12 w-12 opacity-50" />
                <p>プレビューするコンテンツがありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PreviewPane.displayName = "PreviewPane"; // displayName を設定
