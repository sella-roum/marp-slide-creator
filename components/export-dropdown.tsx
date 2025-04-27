"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { downloadFile } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { DownloadIcon } from "lucide-react"
import { initializeMermaid } from "@/lib/mermaid-utils"

interface ExportDropdownProps {
  markdown: string
  documentTitle: string
}

export function ExportDropdown({ markdown, documentTitle }: ExportDropdownProps) {
  const { toast } = useToast()
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<"pdf" | "html" | "markdown">("pdf")
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Handle export
  const handleExport = async () => {
    if (!markdown) {
      toast({
        title: "エラー",
        description: "エクスポートするコンテンツがありません",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      // Initialize Mermaid
      initializeMermaid()

      // Process markdown for export
      let processedMarkdown = markdown
      if (!markdown.includes("marp: true")) {
        processedMarkdown = `---\nmarp: true\n---\n\n${markdown}`
      }

      // Import Marp dynamically
      const { Marp } = await import("@marp-team/marp-core")

      // Create Marp instance
      const marp = new Marp({
        html: true,
        math: true,
        minifyCSS: false,
      })

      // Handle different export formats
      switch (exportFormat) {
        case "markdown":
          // Download as Markdown
          downloadFile(processedMarkdown, `${documentTitle}.md`, "text/markdown")
          break

        case "html":
          // Render to HTML and download
          const { html, css } = marp.render(processedMarkdown)

          const fullHTML = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${documentTitle}</title>
                <style>
                  body { margin: 0; padding: 0; }
                  .marp-container { width: 100%; }
                  section { 
                    width: 100%;
                    height: 100vh;
                    box-sizing: border-box;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    padding: 1rem;
                  }
                  @media print {
                    section { page-break-after: always; break-inside: avoid; }
                  }
                  ${css}
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
                <script>
                  document.addEventListener('DOMContentLoaded', function() {
                    mermaid.initialize({
                      startOnLoad: true,
                      theme: 'default',
                      securityLevel: 'loose',
                      fontFamily: 'sans-serif'
                    });
                  });
                </script>
              </head>
              <body>
                <div class="marp-container">
                  ${html}
                </div>
              </body>
            </html>
          `

          downloadFile(fullHTML, `${documentTitle}.html`, "text/html")
          break

        case "pdf":
          // Render to HTML and generate PDF
          const pdfResult = marp.render(processedMarkdown)

          // Create a hidden iframe to render the PDF
          const iframe = document.createElement("iframe")
          iframe.style.position = "fixed"
          iframe.style.right = "0"
          iframe.style.bottom = "0"
          iframe.style.width = "0"
          iframe.style.height = "0"
          iframe.style.border = "0"
          document.body.appendChild(iframe)

          // Create the HTML content with proper page breaks
          const pdfHTML = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>${documentTitle}</title>
                <style>
                  body { margin: 0; padding: 0; }
                  section { 
                    height: 100vh;
                    page-break-after: always;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                  }
                  @media print {
                    @page { size: landscape; margin: 0; }
                    body { margin: 0; }
                    section { page-break-after: always; break-inside: avoid; }
                  }
                  ${pdfResult.css}
                </style>
                <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
                <script>
                  mermaid.initialize({
                    startOnLoad: true,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'sans-serif'
                  });
                  
                  window.onload = function() {
                    // Wait for Mermaid diagrams to render
                    setTimeout(() => {
                      window.print();
                    }, 1500);
                  };
                </script>
              </head>
              <body>
                ${pdfResult.html}
              </body>
            </html>
          `

          // Set the iframe content and trigger print
          if (iframe.contentWindow) {
            iframe.contentWindow.document.open()
            iframe.contentWindow.document.write(pdfHTML)
            iframe.contentWindow.document.close()
          }

          // Clean up the iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe)
          }, 5000)

          break
      }

      toast({
        title: "エクスポート成功",
        description: `${exportFormat.toUpperCase()}形式でエクスポートしました`,
      })

      setIsExportDialogOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "エクスポート失敗",
        description: "エクスポート中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <DownloadIcon className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("pdf")}>PDFとしてエクスポート</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("html")}>HTMLとしてエクスポート</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("markdown")}>Markdownとしてエクスポート</DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exportFormat.toUpperCase()}としてエクスポート</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="speaker-notes"
              checked={includeSpeakerNotes}
              onCheckedChange={(checked) => setIncludeSpeakerNotes(checked === true)}
            />
            <Label htmlFor="speaker-notes">スピーカーノートを含める</Label>
          </div>

          <p className="text-sm text-muted-foreground">
            {exportFormat === "pdf"
              ? "プレゼンテーションからPDFファイルを生成します。"
              : exportFormat === "html"
                ? "任意のブラウザで表示できるスタンドアロンのHTMLファイルを生成します。"
                : "プレゼンテーションをMarkdownファイルとしてダウンロードします。"}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "エクスポート中..." : `${exportFormat.toUpperCase()}としてエクスポート`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
