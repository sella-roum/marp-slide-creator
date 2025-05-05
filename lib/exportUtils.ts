import { processMarkdownForRender } from "./markdown-processor";
// ★ downloadFile と updateMarkdownTheme を lib/utils からインポート
import { downloadFile, updateMarkdownTheme } from "./utils";
import type { DocumentType } from "./types";

/**
 * Marp でレンダリングされた HTML と CSS を受け取り、
 * インタラクティブな機能（ページ送り、フルスクリーン）を持つ
 * 完全なスタンドアロン HTML 文字列を生成します。
 * カスタムCSSも埋め込みます。
 * @param html Marp が生成した HTML (<div class="marpit">...)
 * @param css Marp が生成した CSS
 * @param title HTML ドキュメントのタイトル
 * @param selectedTheme 選択されているテーマ名
 * @param customCss カスタムCSS文字列
 * @returns インタラクティブ機能付きの完全な HTML 文字列
 */
export function generateInteractiveHtml(
  html: string,
  css: string,
  title: string,
  selectedTheme: string,
  customCss?: string
): string {
  const interactiveCSS = `
    /* ... (インタラクティブCSS) ... */
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #f0f0f0; }
    .marpit { width: 100%; height: 100%; position: relative; }
    svg[data-marpit-svg] { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
    svg[data-marpit-svg].active-slide { display: block; z-index: 1; }
    .slide-number { position: fixed; bottom: 15px; right: 20px; background-color: rgba(0, 0, 0, 0.6); color: white; padding: 4px 10px; border-radius: 4px; font-size: 14px; font-family: sans-serif; z-index: 10; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
    body:not(:fullscreen) .slide-number, body.show-slide-number .slide-number { opacity: 1; }
    .fullscreen-hint { position: fixed; top: 15px; left: 50%; transform: translateX(-50%); background-color: rgba(0, 0, 0, 0.7); color: white; padding: 6px 12px; border-radius: 5px; font-size: 14px; font-family: sans-serif; z-index: 10; opacity: 0; transition: opacity 0.5s ease; pointer-events: none; }
    body:fullscreen .fullscreen-hint.show-hint { opacity: 1; }
  `;

  const interactiveJS = `
    /* ... (インタラクティブJS) ... */
    document.addEventListener('DOMContentLoaded', () => {
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
          container.classList.toggle('active-slide', i === index);
        });
        currentSlide = index;
        updateSlideNumber();
      }
      function updateSlideNumber() {
        slideNumberElement.textContent = totalSlides > 0 ? \`\${currentSlide + 1} / \${totalSlides}\` : '';
      }
      function nextSlide() { showSlide(currentSlide + 1); }
      function prevSlide() { showSlide(currentSlide - 1); }
      function toggleFullScreen() {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => console.error(\`Error: \${err.message} (\${err.name})\`));
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      function showHint() {
          clearTimeout(hintTimeout);
          hintElement.classList.add('show-hint');
          hintTimeout = setTimeout(() => hintElement.classList.remove('show-hint'), 2500);
      }
      document.addEventListener('keydown', (event) => {
         const keyMap = { ArrowRight: nextSlide, ' ': nextSlide, PageDown: nextSlide, ArrowLeft: prevSlide, PageUp: prevSlide, f: toggleFullScreen, F: toggleFullScreen, Home: () => showSlide(0), End: () => showSlide(totalSlides - 1) };
         if (keyMap[event.key]) { event.preventDefault(); keyMap[event.key](); }
      });
      document.addEventListener('fullscreenchange', () => {
        document.body.classList.toggle('show-slide-number', !!document.fullscreenElement);
        if (document.fullscreenElement) showHint();
      });
      if (totalSlides > 0) showSlide(0); else updateSlideNumber();
    });
  `;

  let customThemeStyle = '';
  if (selectedTheme === 'custom' && customCss) {
    customThemeStyle = `<style data-custom-theme>${customCss}</style>`;
  }

  const fullHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    /* MarpのCSS */
    ${css}
    /* 追加CSS */
    ${interactiveCSS}
  </style>
  ${customThemeStyle}
</head>
<body>
  ${html}
  <script>
    ${interactiveJS}
  </script>
</body>
</html>`;

  return fullHTML;
}

/**
 * Markdown をエクスポート用に前処理します。
 * - 画像参照を解決します。
 * - 選択されたテーマを `theme:` ディレクティブに反映します。
 * @param markdown 元の Markdown テキスト
 * @param selectedTheme 選択されているテーマ名
 * @returns 処理済みの Markdown テキスト (Promise)
 */
export async function preprocessMarkdownForExport(
  markdown: string,
  selectedTheme: string
): Promise<string> {
  console.log("Processing markdown for export...");
  const processedMarkdownImages = await processMarkdownForRender(markdown, new Map(), () => {});
  console.log("Image references processed for export.");

  const themeToSet = selectedTheme === 'custom' ? 'default' : selectedTheme;
  // ★ updateMarkdownTheme を使用
  const processedMarkdown = updateMarkdownTheme(processedMarkdownImages, themeToSet);

  console.log("Markdown processed for export with theme:", themeToSet);
  return processedMarkdown;
}
