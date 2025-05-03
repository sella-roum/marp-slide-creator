// components/preview-pane.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { FileIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { processMarkdownForRender } from "@/lib/markdown-processor";
import { useErrorHandler } from "@/hooks/use-error-handler";
import { updateMarkdownTheme } from "@/lib/utils";

interface PreviewPaneProps {
  markdown: string;
  selectedTheme: string;
  customCss: string;
}

export const PreviewPane = React.memo(({ markdown, selectedTheme, customCss }: PreviewPaneProps) => {
  const [renderedHTML, setRenderedHTML] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [marpInstance, setMarpInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { handleError } = useErrorHandler();
  const previewScrollTopRef = useRef<number>(0);
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());

  // キャッシュ更新関数
  const updateImageCache = useCallback((id: string, dataUrl: string | null) => {
    setImageCache((prevCache) => {
      if (prevCache.get(id) === dataUrl) {
        return prevCache;
      }
      const newCache = new Map(prevCache);
      newCache.set(id, dataUrl);
      return newCache;
    });
  }, []);

  // Initialize Marp
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
        handleError({ error: err, context: "Marp初期化" });
      } finally {
        setIsLoading(false);
      }
    };
    initializeMarp();
  }, [handleError]);

  // Render markdown with Marp
  useEffect(() => {
    if (!marpInstance) return;

    const render = async () => {
      if (!markdown) {
        setRenderedHTML("");
        setError(null);
        setIsProcessing(false);
        return;
      }

      setIsProcessing(true);
      setError(null);

      const currentIframe = iframeRef.current;
      if (currentIframe && currentIframe.contentWindow) {
        previewScrollTopRef.current = currentIframe.contentWindow.scrollY;
      }

      try {
        const processedMarkdownWithImages = await processMarkdownForRender(markdown, imageCache, updateImageCache);

        let finalMarkdown = processedMarkdownWithImages;
        const themeToApply = selectedTheme === 'custom' ? 'default' : selectedTheme;
        finalMarkdown = updateMarkdownTheme(processedMarkdownWithImages, themeToApply);

        const { html, css } = marpInstance.render(finalMarkdown);

        const previewSpecificCSS = `
                section:not(:last-of-type) { border-bottom: 2px dashed #ccc; margin-bottom: 1rem; padding-bottom: 1rem; }
                body { padding: 1rem; background-color: #f0f0f0; }
                section { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
            `;

        // --- ★ カスタムCSSを適用 ---
        let customThemeStyle = '';
        if (selectedTheme === 'custom' && customCss) {
          customThemeStyle = `<style data-custom-theme>${customCss}</style>`;
        }
        // --- カスタムCSS適用ここまで ---

        const fullHTML = `<style>${css}${previewSpecificCSS}</style>${customThemeStyle}${html}`; // ★ customThemeStyle を追加
        setRenderedHTML(fullHTML);
      } catch (err) {
        setError(`プレビュー生成エラー: ${err instanceof Error ? err.message : String(err)}`);
        handleError({ error: err, context: "プレビュー生成" });
        setRenderedHTML("");
      } finally {
        setIsProcessing(false);
      }
    };

    render();
  }, [markdown, marpInstance, handleError, imageCache, updateImageCache, selectedTheme, customCss]);

  // スクロール位置の復元
  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      iframe.contentWindow?.scrollTo(0, previewScrollTopRef.current);
    };
    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [renderedHTML]);

  // Render
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-2">
        <h3 className="text-sm font-medium">プレビュー</h3>
        {(isLoading || isProcessing) && (
          <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <div className="relative flex-1 overflow-auto bg-gray-200 dark:bg-gray-900">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && isProcessing && (
          <div className="absolute inset-0 z-10 flex h-full items-center justify-center bg-white/50 dark:bg-black/50">
            <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">プレビューを更新中...</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center text-destructive">
            <AlertCircleIcon className="mb-2 h-8 w-8" />
            <p>{error}</p>
          </div>
        )}
        {!isLoading && !error && (
          <div className={`h-full w-full p-4 ${isProcessing ? "opacity-50" : ""}`}>
            {renderedHTML ? (
              <iframe
                ref={iframeRef}
                srcDoc={renderedHTML} // ★ 更新された fullHTML が設定される
                className="h-full w-full rounded border-0 bg-white"
                title="Marp Preview"
                sandbox="allow-scripts allow-same-origin"
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

PreviewPane.displayName = "PreviewPane";
