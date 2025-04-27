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

// Extract code blocks from Gemini response
export function extractMarkdownCode(text: string): string | null {
  const codeBlockRegex = /```(?:markdown|marp)?\s*([\s\S]*?)```/g
  const matches = [...text.matchAll(codeBlockRegex)]

  if (matches.length > 0) {
    return matches[0][1].trim()
  }

  return null
}

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
  // This is a simplified version. In a real app, you'd use a library like jsPDF
  // or html2pdf.js to generate a proper PDF.

  // For now, we'll just open a new window with the HTML content
  const printWindow = window.open("", "_blank")
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          section {
            page-break-after: always;
            height: 100vh;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem;
          }
          section:last-child {
            page-break-after: auto;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `)

  printWindow.document.close()

  // Trigger print dialog
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
