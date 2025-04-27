import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)
  }
}

// --- extractMarkdownCode 関数を修正 ---
/**
 * テキストから Marp スライドとして有効そうな Markdown 部分を抽出します。
 * - 行頭の `---` または `#` から始まる最初の行を探し、そこからテキストの最後までを抽出します。
 * - 抽出した部分がコードブロックで囲まれていれば、その中身を返します。
 * - 上記で見つからない場合、従来の ```markdown ... ``` または ```marp ... ``` ブロックを探します。
 */
export function extractMarkdownCode(text: string): string | null {
  // 1. Marpの開始パターン (行頭の --- または #) を探す
  const marpStartRegex = /^(?:---|\s*#)/m;
  const startIndex = text.search(marpStartRegex);

  if (startIndex !== -1) {
    // 開始位置からテキストの最後までを抽出
    let extracted = text.substring(startIndex).trim();

    // 2. 抽出結果全体がコードブロックで囲まれていないか確認し、囲まれていれば中身を取り出す
    //    (例: Geminiが説明文なしでコードブロックだけを返す場合)
    //    コードブロックのラベルは任意 (markdown, marp, または無し)
    const fullCodeBlockMatch = extracted.match(/^```(?:markdown|marp)?\s*([\s\S]*?)\s*```$/);
    if (fullCodeBlockMatch && fullCodeBlockMatch[1]) {
        // コードブロックの中身を返す
        console.log("Extracted content from full code block.");
        return fullCodeBlockMatch[1].trim();
    }

    // 3. コードブロックで囲まれていない場合は、抽出したテキストをそのまま返す
    //    (ただし、末尾に不要な ``` が残る可能性を考慮して削除)
    extracted = extracted.replace(/\s*```$/, '').trim(); // 末尾の ``` を削除
    console.log("Extracted content from Marp start pattern.");
    return extracted;
  }

  // 4. Marp の開始パターンが見つからない場合、従来のコードブロック抽出を試す
  //    (特定のラベル付きコードブロックを探す)
  console.log("Marp start pattern not found, trying specific code block extraction...");
  const specificCodeBlockRegex = /```(?:markdown|marp)\s*([\s\S]*?)```/g; // ラベル指定あり
  const matches = [...text.matchAll(specificCodeBlockRegex)];
  if (matches.length > 0 && matches[0][1]) {
    console.log("Extracted content from specific labeled code block.");
    return matches[0][1].trim();
  }

  // 5. それでも見つからない場合、ラベルなしを含む最初のコードブロックの中身を試す
  console.log("Specific code block not found, trying any code block...");
  const anyCodeBlockRegex = /```([\s\S]*?)```/; // ラベル問わず最初のブロック
   const anyMatch = text.match(anyCodeBlockRegex);
   if (anyMatch && anyMatch[1]) {
     console.log("Extracted content from any code block.");
     return anyMatch[1].trim();
   }

  console.log("No Marp content or code block found.");
  return null; // 何も見つからなければ null
}
// --- extractMarkdownCode 修正ここまで ---

// Convert local image to Base64
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to convert image to Base64"))
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))

    reader.readAsDataURL(file)
  })
}

// Generate PDF from HTML content
export async function generatePDF(html: string, title: string): Promise<void> {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

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
  `)

  printWindow.document.close()

  setTimeout(() => {
    printWindow.print()
  }, 500)
}

// Download content as a file
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}
