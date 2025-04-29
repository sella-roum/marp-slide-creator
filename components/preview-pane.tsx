"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { FileIcon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { processMarkdownForRender } from "@/lib/markdown-processor";

interface PreviewPaneProps {
  markdown: string;
}

export const PreviewPane = React.memo(({ markdown }: PreviewPaneProps) => {
  const [renderedHTML, setRenderedHTML] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [marpInstance, setMarpInstance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewScrollTopRef = useRef<number>(0);

  useEffect(() => {
    const initializeMarp = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { Marp } = await import(/* webpackChunkName: "marp-core" */ "@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        setMarpInstance(marp);
      } catch (err) {
        console.error("Failed to initialize Marp:", err);
        setError("Marpの初期化に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };
    initializeMarp();
  }, []);

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
        const processedMarkdown = await processMarkdownForRender(markdown);

        let finalMarkdown = processedMarkdown;
        if (!finalMarkdown.includes("marp: true")) {
          finalMarkdown = `---\nmarp: true\n---\n\n${finalMarkdown}`;
        }

        const { html, css } = marpInstance.render(finalMarkdown);

        const customCSS = `
                section:not(:last-of-type) { border-bottom: 2px dashed #ccc; margin-bottom: 1rem; padding-bottom: 1rem; }
                body { padding: 1rem; background-color: #f0f0f0; }
                section { box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
            `;

        const fullHTML = `<style>${css}${customCSS}</style>${html}`;
        setRenderedHTML(fullHTML);
      } catch (err) {
        console.error("Failed to process or render markdown:", err);
        setError(`プレビュー生成エラー: ${err instanceof Error ? err.message : String(err)}`);
        setRenderedHTML("");
      } finally {
        setIsProcessing(false);
      }
    };

    render();
  }, [markdown, marpInstance]);

  useLayoutEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      iframe.contentWindow?.scrollTo(0, previewScrollTopRef.current);
    };

    iframe.addEventListener("load", handleLoad);

    return () => {
      iframe.removeEventListener("load", handleLoad);
    };
  }, [renderedHTML]);

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
                srcDoc={renderedHTML}
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
