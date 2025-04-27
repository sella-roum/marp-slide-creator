"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { downloadFile, generatePDF } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { DownloadIcon } from "lucide-react"

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
                <style>${css}</style>
              </head>
              <body>
                ${html}
              </body>
            </html>
          `

          downloadFile(fullHTML, `${documentTitle}.html`, "text/html")
          break

        case "pdf":
          // Render to HTML and generate PDF
          const pdfResult = marp.render(processedMarkdown)
          await generatePDF(pdfResult.html, documentTitle)
          break
      }

      toast({
        title: "Success",
        description: `Exported as ${exportFormat.toUpperCase()}`,
      })

      setIsExportDialogOpen(false)
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: "Export Failed",
        description: "An error occurred during export",
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
            Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("pdf")}>Export as PDF</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("html")}>Export as HTML</DropdownMenuItem>
          </DialogTrigger>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={() => setExportFormat("markdown")}>Export as Markdown</DropdownMenuItem>
          </DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export as {exportFormat.toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="speaker-notes"
              checked={includeSpeakerNotes}
              onCheckedChange={(checked) => setIncludeSpeakerNotes(checked === true)}
            />
            <Label htmlFor="speaker-notes">Include speaker notes</Label>
          </div>

          <p className="text-sm text-muted-foreground">
            {exportFormat === "pdf"
              ? "This will generate a PDF file from your presentation."
              : exportFormat === "html"
                ? "This will generate a standalone HTML file that can be viewed in any browser."
                : "This will download your presentation as a Markdown file."}
          </p>
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
