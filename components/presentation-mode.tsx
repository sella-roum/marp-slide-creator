"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { initializeMermaid, renderMermaidInIframe } from "@/lib/mermaid-utils"

interface PresentationModeProps {
  markdown: string
  onExit: () => void
}

export function PresentationMode({ markdown, onExit }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [totalSlides, setTotalSlides] = useState(0)
  const [renderedHTML, setRenderedHTML] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Initialize Mermaid
  useEffect(() => {
    initializeMermaid()
  }, [])

  // Initialize Marp and render markdown
  useEffect(() => {
    const initializeAndRender = async () => {
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

        // Add Marp directives if not present
        let processedMarkdown = markdown
        if (!markdown.includes("marp: true")) {
          processedMarkdown = `---\nmarp: true\n---\n\n${markdown}`
        }

        // Render markdown to HTML
        const { html, css } = marp.render(processedMarkdown)

        // Count slides
        const slideCount = (html.match(/<section/g) || []).length
        setTotalSlides(slideCount)

        // Combine HTML and CSS
        const fullHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; overflow: hidden; background-color: black; }
                .marp-slides { height: 100vh; position: relative; }
                section { height: 100vh; width: 100vw; box-sizing: border-box; position: absolute; top: 0; left: 0; }
                section:not(:first-child) { display: none; }
                ${css}
              </style>
            </head>
            <body>
              <div class="marp-slides">
                ${html}
              </div>
            </body>
          </html>
        `

        setRenderedHTML(fullHTML)
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to render presentation:", error)
        setIsLoading(false)
      }
    }

    initializeAndRender()

    // Add keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        goToNextSlide()
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        goToPrevSlide()
      } else if (e.key === "Escape") {
        onExit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [markdown, onExit])

  // Render Mermaid diagrams after HTML is rendered
  useEffect(() => {
    if (!renderedHTML || !iframeRef.current) return

    // Wait for iframe content to load
    const handleIframeLoad = () => {
      if (iframeRef.current) {
        renderMermaidInIframe(iframeRef.current)
      }
    }

    // Add load event listener to iframe
    if (iframeRef.current) {
      iframeRef.current.addEventListener("load", handleIframeLoad)
    }

    return () => {
      if (iframeRef.current) {
        iframeRef.current.removeEventListener("load", handleIframeLoad)
      }
    }
  }, [renderedHTML])

  // Update slide visibility when current slide changes
  useEffect(() => {
    if (!iframeRef.current) return

    const iframe = iframeRef.current
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDocument) return

    // Wait for iframe content to load
    setTimeout(() => {
      const sections = iframeDocument.querySelectorAll("section")
      if (sections.length === 0) return

      // Hide all sections
      sections.forEach((section, index) => {
        if (index === currentSlide) {
          section.style.display = "flex"
        } else {
          section.style.display = "none"
        }
      })
    }, 100)
  }, [currentSlide, renderedHTML])

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

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" ref={containerRef}>
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={onExit}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevSlide}
          disabled={currentSlide === 0}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <span className="text-white bg-black/50 px-3 py-1 rounded text-sm">
          {totalSlides > 0 ? `${currentSlide + 1}/${totalSlides}` : "0/0"}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="bg-black/50 hover:bg-black/70 text-white border-white/20"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <iframe ref={iframeRef} srcDoc={renderedHTML} className="w-full h-full border-0" title="Presentation" />
        )}
      </div>
    </div>
  )
}
