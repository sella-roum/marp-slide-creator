"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog" // DialogClose をインポート
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { downloadFile, generatePDF } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { processMarkdownForRender } from "@/lib/markdown-processor"; // インポート

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
        toast({ title: "エラー", description: "エクスポートするコンテンツがありません", variant: "destructive" });
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
        setIsExporting(false);
        return;
      }

      const { Marp } = await import("@marp-team/marp-core");
      const marp = new Marp({ html: true, math: true, minifyCSS: false });
      const { html, css } = marp.render(processedMarkdown);

      if (exportFormat === "html") {
        const fullHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${documentTitle}</title><style>${css}</style></head><body>${html}</body></html>`;
        downloadFile(fullHTML, `${documentTitle}.html`, "text/html");
      } else if (exportFormat === "pdf") {
        // generatePDF は HTML を受け取る想定
        await generatePDF(html, documentTitle);
      }

      toast({ title: "成功", description: `${exportFormat.toUpperCase()}としてエクスポートしました` });
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
          <DialogTrigger asChild><DropdownMenuItem onSelect={() => setExportFormat("pdf")}>PDFとしてエクスポート</DropdownMenuItem></DialogTrigger>
          <DialogTrigger asChild><DropdownMenuItem onSelect={() => setExportFormat("html")}>HTMLとしてエクスポート</DropdownMenuItem></DialogTrigger>
          <DialogTrigger asChild><DropdownMenuItem onSelect={() => setExportFormat("markdown")}>Markdownとしてエクスポート</DropdownMenuItem></DialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{exportFormat.toUpperCase()}としてエクスポート</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="speaker-notes" checked={includeSpeakerNotes} onCheckedChange={(checked) => setIncludeSpeakerNotes(checked === true)} disabled />
            <Label htmlFor="speaker-notes" className="text-muted-foreground">スピーカーノートを含める (未対応)</Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {exportFormat === "pdf" ? "プレゼンテーションからPDFファイルを生成します。" :
             exportFormat === "html" ? "ブラウザで表示できるスタンドアロンHTMLファイルを生成します。" :
             "現在のMarkdownコンテンツをファイルとしてダウンロードします。"}
          </p>
        </div>
        <DialogFooter>
           <DialogClose asChild><Button variant="outline">キャンセル</Button></DialogClose>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {isExporting ? "エクスポート中..." : `${exportFormat.toUpperCase()}としてエクスポート`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
