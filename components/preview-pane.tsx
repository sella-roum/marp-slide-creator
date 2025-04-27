"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, FileIcon } from "lucide-react"

interface PreviewPaneProps {
  markdown: string
}

export function PreviewPane({ markdown }: PreviewPaneProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)
  const [renderedHTML, setRenderedHTML] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [marpInstance, setMarpInstance] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize Marp
  useEffect(() => {
    const initializeMarp = async () => {
      try {
        setIsLoading(true)
        // Import Marp dynamically
        const { Marp } = await import("@marp-team/marp-core")

        // Create Marp instance
        const marp = new Marp({
          html: true,
          math: true,
          minifyCSS: false,
        })

        setMarpInstance(marp)
        setError(null)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize Marp:", error)
        setError("Marpの初期化に失敗しました")
        setIsLoading(false)
      }
    }

    initializeMarp()
  }, [])

  // Render markdown with Marp
  useEffect(() => {
    if (!marpInstance || !markdown) {
      setRenderedHTML("")
      setTotalSlides(0)
      return
    }

    try {
      // Add Marp directives if not present
      let processedMarkdown = markdown
      if (!markdown.includes("marp: true")) {
        processedMarkdown = `---\nmarp: true\n---\n\n${markdown}`
      }

      // Render markdown to HTML
      const { html, css } = marpInstance.render(processedMarkdown)

      // Count slides
      const slideCount = (html.match(/<section/g) || []).length
      setTotalSlides(slideCount)

      // Ensure current slide is within bounds
      if (currentSlide >= slideCount) {
        setCurrentSlide(Math.max(0, slideCount - 1))
      }

      // Combine HTML and CSS
      const fullHTML = `
        <style>${css}</style>
        ${html}
      `

      setRenderedHTML(fullHTML)
      setError(null)
    } catch (error) {
      console.error("Failed to render markdown:", error)
      setError(`レンダリングエラー: ${error instanceof Error ? error.message : String(error)}`)
      setRenderedHTML("")
    }
  }, [markdown, marpInstance, currentSlide])

  // Navigate between slides
  const goToNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  if (!markdown) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
        <FileIcon className="h-12 w-12 mb-4 opacity-50" />
        <p>プレビューするコンテンツがありません</p>
        <p className="text-sm mt-2">エディタでMarkdownを入力してください</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="text-sm font-medium">プレビュー</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevSlide}
            disabled={currentSlide === 0 || totalSlides === 0}
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm">{totalSlides > 0 ? `${currentSlide + 1}/${totalSlides}` : "0/0"}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextSlide}
            disabled={currentSlide === totalSlides - 1 || totalSlides === 0}
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center text-destructive">
            <p>{error}</p>
          </div>
        ) : renderedHTML ? (
          <div
            className="w-full h-full"
            style={{
              overflow: "hidden",
              position: "relative",
            }}
          >
            <iframe
              srcDoc={renderedHTML}
              className="w-full h-full border-0"
              style={{
                transform: `translateY(${-100 * currentSlide}%)`,
                height: `${totalSlides * 100}%`,
              }}
              title="Marp Preview"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            プレビューするコンテンツがありません
          </div>
        )}
      </div>
    </div>
  )
}
