import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

// --- ★ extractMarkdownCode 関数を修正 ---
/**
 * テキストから最初の Marp または Markdown コードブロック (```markdown ... ``` または ```marp ... ```) の中身を抽出します。
 * ラベル付きのコードブロックが見つからない場合は null を返します。
 * @param text 検索対象のテキスト
 * @returns 抽出された Markdown コード、または見つからない場合は null
 */
export function extractMarkdownCode(text: string): string | null {
  // 正規表現: ``` で始まり、markdown または marp ラベルが続き、任意の空白文字を挟んで、
  // 任意の文字（改行含む、非貪欲マッチ）が続き、``` で終わるパターン
  const markdownCodeBlockRegex = /```(?:markdown|marp)\s*([\s\S]*?)\s*```/;
  const match = text.match(markdownCodeBlockRegex);

  if (match && match[1]) {
    console.log("Extracted content from labeled Markdown/Marp code block.");
    // キャプチャグループ1（コードブロックの中身）をトリムして返す
    return match[1].trim();
  }

  console.log("No labeled Markdown/Marp code block found.");
  return null; // ラベル付きのブロックが見つからない場合は null を返す
}
// --- extractMarkdownCode 関数ここまで ---

// --- extractCssCode 関数 ---
/**
 * テキストから最初の CSS コードブロック (```css ... ```) の中身を抽出します。
 * @param text 検索対象のテキスト
 * @returns 抽出された CSS コード、または見つからない場合は null
 */
export function extractCssCode(text: string): string | null {
  const cssCodeBlockRegex = /```css\s*([\s\S]*?)\s*```/;
  const match = text.match(cssCodeBlockRegex);
  if (match && match[1]) {
    console.log("Extracted CSS code block.");
    return match[1].trim();
  }
  console.log("No CSS code block found.");
  return null;
}
// --- extractCssCode 関数ここまで ---


// Convert local image to Base64
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert image to Base64"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// Generate PDF from HTML content
export async function generatePDF(html: string, title: string): Promise<void> {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
          }
          .slide {
            page-break-after: always;
            height: 100vh;
            padding: 2rem;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);

  printWindow.document.close();

  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Download content as a file
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// updateMarkdownTheme 関数
export function updateMarkdownTheme(markdown: string, theme: string): string {
  const frontMatterRegex = /^---\s*([\s\S]*?)\s*---/;
  const match = markdown.match(frontMatterRegex);

  if (match) {
    let fmContent = match[1]; // キャプチャグループ1の内容を取得
    const themeRegex = /^(theme\s*:\s*)(.*)$/m;
    if (themeRegex.test(fmContent)) {
      fmContent = fmContent.replace(themeRegex, `$1${theme}`);
    } else {
      fmContent = fmContent.trim() + `\ntheme: ${theme}`;
    }
    if (!/^marp\s*:\s*true$/m.test(fmContent)) {
      fmContent = fmContent.trim() + `\nmarp: true`;
    }
    return markdown.replace(frontMatterRegex, `---\n${fmContent.trim()}\n---`);
  } else {
    return `---\nmarp: true\ntheme: ${theme}\n---\n\n${markdown}`;
  }
}
