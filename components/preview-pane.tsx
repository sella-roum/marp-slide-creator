"use client"

import { useState, useEffect } from "react"
// import { Button } from "@/components/ui/button" // Button は不要になる
// import { ChevronLeftIcon, ChevronRightIcon, FileIcon } from "lucide-react" // Chevron アイコンは不要
import { FileIcon } from "lucide-react" // FileIcon のみ残す

interface PreviewPaneProps {
  markdown: string
}

export function PreviewPane({ markdown }: PreviewPaneProps) {
  // const [currentSlide, setCurrentSlide] = useState(0) // 削除
  // const [totalSlides, setTotalSlides] = useState(0) // 削除
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
      // setTotalSlides(0) // 削除
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

      // Count slides (削除しても良いが、デバッグ等で役立つ可能性もあるのでコメントアウト)
      // const slideCount = (html.match(/<section/g) || []).length
      // setTotalSlides(slideCount)

      // Ensure current slide is within bounds (削除)
      // if (currentSlide >= slideCount) {
      //   setCurrentSlide(Math.max(0, slideCount - 1))
      // }

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
  // }, [markdown, marpInstance, currentSlide]) // currentSlide を依存配列から削除
  }, [markdown, marpInstance])

  // Navigate between slides (削除)
  // const goToNextSlide = () => {
  //   if (currentSlide < totalSlides - 1) {
  //     setCurrentSlide(currentSlide + 1)
  //   }
  // }
  //
  // const goToPrevSlide = () => {
  //   if (currentSlide > 0) {
  //     setCurrentSlide(currentSlide - 1)
  //   }
  // }

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
        {/* --- ページネーション UI 削除 ここから ---
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
        --- ページネーション UI 削除 ここまで --- */}
      </div>

      <div className="flex-1 overflow-auto relative bg-gray-100 dark:bg-gray-800 p-4"> {/* overflow-hidden から overflow-auto に変更し、背景色とパディングを追加 */}
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
            // style={{ // 削除
            //   overflow: "hidden",
            //   position: "relative",
            // }}
          >
            <iframe
              srcDoc={renderedHTML}
              className="w-full h-full border-0"
              // style={{ // 削除
              //   transform: `translateY(${-100 * currentSlide}%)`,
              //   height: `${totalSlides * 100}%`,
              // }}
              title="Marp Preview"
              // iframe の sandbox 属性を追加してセキュリティを高めることを検討
              // sandbox="allow-scripts allow-same-origin"
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
