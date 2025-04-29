import { processMarkdownForRender } from "./markdown-processor";
import { downloadFile } from "./utils"; // downloadFile は既存の utils から利用

/**
 * Marp でレンダリングされた HTML と CSS を受け取り、
 * インタラクティブな機能（ページ送り、フルスクリーン）を持つ
 * 完全なスタンドアロン HTML 文字列を生成します。
 * @param html Marp が生成した HTML (<div class="marpit">...)
 * @param css Marp が生成した CSS
 * @param title HTML ドキュメントのタイトル
 * @returns インタラクティブ機能付きの完全な HTML 文字列
 */
export function generateInteractiveHtml(html: string, css: string, title: string): string {
  // --- ▼▼▼ export-dropdown.tsx から移動した CSS と JavaScript ▼▼▼ ---
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
  // --- ▲▲▲ export-dropdown.tsx から移動した CSS と JavaScript ▲▲▲ ---

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
</head>
<body>
  ${html} {/* Marpが生成した <div class="marpit">...</div> */}
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
 * - 必要に応じて Marp ディレクティブを追加します。
 * @param markdown 元の Markdown テキスト
 * @returns 処理済みの Markdown テキスト (Promise)
 */
export async function preprocessMarkdownForExport(markdown: string): Promise<string> {
  console.log("Processing markdown for export...");
  let processedMarkdown = await processMarkdownForRender(markdown); // 画像参照を解決
  console.log("Markdown processed for export.");

  // Marp ディレクティブがなければ追加
  if (!processedMarkdown.includes("marp: true")) {
    processedMarkdown = `---\nmarp: true\n---\n\n${processedMarkdown}`;
  }
  return processedMarkdown;
}
