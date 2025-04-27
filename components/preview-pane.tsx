"use client"

import { useState, useEffect } from "react"
import { FileIcon, Loader2Icon, AlertCircleIcon } from "lucide-react" // AlertCircleIcon を追加
import { processMarkdownForRender } from "@/lib/markdown-processor"; // 作成した関数をインポート

interface PreviewPaneProps {
  markdown: string
}

export function PreviewPane({ markdown }: PreviewPaneProps) {
  const [renderedHTML, setRenderedHTML] = useState("")
  const [isLoading, setIsLoading] = useState(true) // Marp初期化用
  const [isProcessing, setIsProcessing] = useState(false); // Markdown処理中用
  const [marpInstance, setMarpInstance] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize Marp
  useEffect(() => {
    const initializeMarp = async () => {
      setIsLoading(true); // 初期化開始
      setError(null);
      try {
        const { Marp } = await import("@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        setMarpInstance(marp);
      } catch (err) {
        console.error("Failed to initialize Marp:", err);
        setError("Marpの初期化に失敗しました");
      } finally {
        setIsLoading(false); // 初期化完了
      }
    };
    initializeMarp();
  }, []);

  // Render markdown with Marp
  useEffect(() => {
    // Marp インスタンスがまだないか、処理中の場合は何もしない
    if (!marpInstance || isProcessing) return;

    const render = async () => {
        // Markdownが空の場合
        if (!markdown) {
            setRenderedHTML("");
            setError(null);
            setIsProcessing(false);
            return;
        }

        setIsProcessing(true);
        setError(null);
        // setRenderedHTML(""); // 処理中に前の表示を残すかクリアするかは好み

        try {
            console.log("Processing markdown for preview...");
            const processedMarkdown = await processMarkdownForRender(markdown);
            console.log("Markdown processed.");

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

    // debounce をかけると入力中のプレビュー更新が遅れるので、ここでは直接実行
    render();

  }, [markdown, marpInstance]); // isProcessing を依存配列から削除


  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">プレビュー</h3>
        {(isLoading || isProcessing) && <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex-1 overflow-auto relative bg-gray-200 dark:bg-gray-900">
        {/* 初期化中 */}
        {isLoading && (
             <div className="flex items-center justify-center h-full">
                <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
             </div>
        )}
        {/* 処理中 */}
        {!isLoading && isProcessing && (
             <div className="flex items-center justify-center h-full absolute inset-0 bg-white/50 dark:bg-black/50 z-10">
                <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-2 text-muted-foreground">プレビューを更新中...</p>
             </div>
        )}
        {/* エラー表示 */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-destructive">
            <AlertCircleIcon className="w-8 h-8 mb-2" />
            <p>{error}</p>
          </div>
        )}
        {/* コンテンツ表示エリア (処理中でも表示されるように) */}
        {!isLoading && !error && (
          <div className={`w-full h-full p-4 ${isProcessing ? 'opacity-50' : ''}`}> {/* 処理中は少し薄くする */}
            {renderedHTML ? (
                <iframe
                srcDoc={renderedHTML}
                className="w-full h-full border-0 rounded bg-white" // iframeに背景色指定
                title="Marp Preview"
                sandbox="allow-scripts allow-same-origin"
                />
            ) : (
                 markdown ? ( // Markdownはあるがレンダリング結果がない場合 (エラー後など)
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        プレビューを生成できませんでした。
                    </div>
                 ) : ( // Markdown自体がない場合
                    <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                        <FileIcon className="h-12 w-12 mb-4 opacity-50" />
                        <p>プレビューするコンテンツがありません</p>
                    </div>
                 )
            )}
          </div>
        )}
      </div>
    </div>
  )
}
