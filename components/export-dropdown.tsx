"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { downloadFile } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { processMarkdownForRender } from "@/lib/markdown-processor";

interface ExportDropdownProps {
  markdown: string;
  documentTitle: string;
}

export const ExportDropdown = React.memo(({ markdown, documentTitle }: ExportDropdownProps) => {
  const { toast } = useToast();
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"html" | "markdown">("html");
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!markdown) {
      toast({
        title: "エラー",
        description: "エクスポートするコンテンツがありません",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      console.log("Processing markdown for export...");
      let processedMarkdown = await processMarkdownForRender(markdown);
      console.log("Markdown processed for export.");

      if (!processedMarkdown.includes("marp: true")) {
        processedMarkdown = `---\nmarp: true\n---\n\n${processedMarkdown}`;
      }

      if (exportFormat === "markdown") {
        downloadFile(processedMarkdown, `${documentTitle}.md`, "text/markdown");
        toast({ title: "成功", description: `MARKDOWNとしてエクスポートしました` });
        setIsExportDialogOpen(false);
        return;
      }

      if (exportFormat === "html") {
        const { Marp } = await import(/* webpackChunkName: "marp-core" */ "@marp-team/marp-core");
        const marp = new Marp({ html: true, math: true, minifyCSS: false });
        const { html, css } = marp.render(processedMarkdown);

        const interactiveCSS = `
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden; /* ページ全体のスクロールバーを隠す */
            background-color: #f0f0f0; /* 背景色 */
          }
          /* Marpが出力するコンテナ */
          .marpit {
            width: 100%;
            height: 100%;
            position: relative; /* 子要素の基準 */
          }
          /* 各スライドを含むSVG要素 */
          svg[data-marpit-svg] {
            display: none; /* 初期状態は非表示 */
            position: absolute; /* 重ねて配置 */
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            /* transition は display には効かないため、JS側で制御 */
          }
          /* アクティブなスライドのSVGを表示 */
          svg[data-marpit-svg].active-slide {
            display: block; /* 表示 */
            z-index: 1;
          }
          /* ページ番号表示 */
          .slide-number {
            position: fixed;
            bottom: 15px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 14px;
            font-family: sans-serif;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
          }
          body:not(:fullscreen) .slide-number,
          body.show-slide-number .slide-number {
             opacity: 1;
          }
          /* フルスクリーン時のヒント */
          .fullscreen-hint {
            position: fixed;
            top: 15px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 6px 12px;
            border-radius: 5px;
            font-size: 14px;
            font-family: sans-serif;
            z-index: 10;
            opacity: 0;
            transition: opacity 0.5s ease;
            pointer-events: none;
          }
          body:fullscreen .fullscreen-hint.show-hint {
             opacity: 1;
          }
        `;

        const interactiveJS = `
          document.addEventListener('DOMContentLoaded', () => {
            // 各スライドを含むSVG要素を取得
            const slideContainers = document.querySelectorAll('svg[data-marpit-svg]');
            const slideNumberElement = document.createElement('div');
            slideNumberElement.className = 'slide-number';
            document.body.appendChild(slideNumberElement);

            const hintElement = document.createElement('div');
            hintElement.className = 'fullscreen-hint';
            hintElement.textContent = 'Fキーでフルスクリーン解除 / ← →キーでページ送り';
            document.body.appendChild(hintElement);
            let hintTimeout;

            let currentSlide = 0;
            const totalSlides = slideContainers.length;

            function showSlide(index) {
              if (index < 0 || index >= totalSlides) return;

              slideContainers.forEach((container, i) => {
                // active-slide クラスで表示/非表示を切り替え
                if (i === index) {
                  container.classList.add('active-slide');
                } else {
                  container.classList.remove('active-slide');
                }
              });
              currentSlide = index;
              updateSlideNumber();
            }

            function updateSlideNumber() {
              if (totalSlides > 0) {
                slideNumberElement.textContent = \`\${currentSlide + 1} / \${totalSlides}\`;
              } else {
                slideNumberElement.textContent = '';
              }
            }

            function nextSlide() {
              showSlide(currentSlide + 1);
            }

            function prevSlide() {
              showSlide(currentSlide - 1);
            }

            function toggleFullScreen() {
              if (!document.fullscreenElement) {
                // body全体ではなくdocumentElementをフルスクリーンにする
                document.documentElement.requestFullscreen().catch(err => {
                  console.error(\`Error attempting to enable full-screen mode: \${err.message} (\${err.name})\`);
                });
              } else {
                if (document.exitFullscreen) {
                  document.exitFullscreen();
                }
              }
            }

            function showHint() {
                clearTimeout(hintTimeout);
                hintElement.classList.add('show-hint');
                hintTimeout = setTimeout(() => {
                    hintElement.classList.remove('show-hint');
                }, 2500);
            }

            document.addEventListener('keydown', (event) => {
              // テキスト入力中などはキー操作を無効にする（もし必要なら）
              // if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;

              switch (event.key) {
                case 'ArrowRight':
                case ' ':
                case 'PageDown':
                  event.preventDefault(); // デフォルトのスクロール等を防ぐ
                  nextSlide();
                  break;
                case 'ArrowLeft':
                case 'PageUp':
                  event.preventDefault();
                  prevSlide();
                  break;
                case 'f':
                case 'F':
                  event.preventDefault();
                  toggleFullScreen();
                  break;
                case 'Home':
                  event.preventDefault();
                  showSlide(0);
                  break;
                case 'End':
                  event.preventDefault();
                  showSlide(totalSlides - 1);
                  break;
              }
            });

            document.addEventListener('fullscreenchange', () => {
              if (document.fullscreenElement) {
                document.body.classList.add('show-slide-number');
                showHint();
              } else {
                document.body.classList.remove('show-slide-number');
              }
            });

            // 初期表示
            if (totalSlides > 0) {
              showSlide(0);
            } else {
              updateSlideNumber();
            }
          });
        `;

        const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${documentTitle}</title>
  <style>
    /* MarpのCSS */
    ${css}
    /* 追加CSS */
    ${interactiveCSS}
  </style>
</head>
<body>
  ${html} {/* Marpが生成した <div class="marpit">...</div> */}
  <script>
    ${interactiveJS}
  </script>
</body>
</html>`;

        downloadFile(fullHTML, `${documentTitle}.html`, "text/html");
      }

      toast({
        title: "成功",
        description: `${exportFormat.toUpperCase()}としてエクスポートしました`,
      });
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "エクスポート失敗",
        description: `エクスポート中にエラー: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [markdown, documentTitle, exportFormat, toast]);

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <DownloadIcon className="mr-1 h-4 w-4" />
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("html")}>
              HTMLとしてエクスポート
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("markdown")}>
              Markdownとしてエクスポート
            </DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exportFormat.toUpperCase()}としてエクスポート</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2 opacity-50">
            <Checkbox
              id="speaker-notes"
              checked={includeSpeakerNotes}
              onCheckedChange={(checked) => setIncludeSpeakerNotes(checked === true)}
              disabled
            />
            <Label htmlFor="speaker-notes" className="text-muted-foreground">
              スピーカーノートを含める (未対応)
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {exportFormat === "html"
              ? "インタラクティブ機能付きのスタンドアロンHTMLファイルを生成します。"
              : "現在のMarkdownコンテンツをファイルとしてダウンロードします。"}
          </p>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">キャンセル</Button>
          </DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {isExporting ? "エクスポート中..." : `${exportFormat.toUpperCase()}としてエクスポート`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ExportDropdown.displayName = "ExportDropdown";
