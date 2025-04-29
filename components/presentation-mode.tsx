"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { XIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface PresentationModeProps {
  markdown: string;
  onExit: () => void;
}

export function PresentationMode({ markdown, onExit }: PresentationModeProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);
  const [renderedHTML, setRenderedHTML] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAndRender = async () => {
      try {
        const { Marp } = await import("@marp-team/marp-core");
        const marp = new Marp({
          html: true,
          math: true,
          minifyCSS: false,
        });

        let processedMarkdown = markdown;
        if (!markdown.includes("marp: true")) {
          processedMarkdown = `---\nmarp: true\n---\n\n${markdown}`;
        }
        const { html, css } = marp.render(processedMarkdown);

        const slideCount = (html.match(/<section/g) || []).length;
        setTotalSlides(slideCount);

        const fullHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; overflow: hidden; }
                .marp-slides { height: 100vh; }
                ${css}
              </style>
            </head>
            <body>
              <div class="marp-slides">
                ${html}
              </div>
            </body>
          </html>
        `;

        setRenderedHTML(fullHTML);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to render presentation:", error);
        setIsLoading(false);
      }
    };

    initializeAndRender();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        goToNextSlide();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        goToPrevSlide();
      } else if (e.key === "Escape") {
        onExit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [markdown, onExit]);

  const goToNextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="absolute right-4 top-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={onExit}
          className="border-white/20 bg-black/50 text-white hover:bg-black/70"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 transform items-center space-x-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goToPrevSlide}
          disabled={currentSlide === 0}
          className="border-white/20 bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>

        <span className="rounded bg-black/50 px-3 py-1 text-sm text-white">
          {totalSlides > 0 ? `${currentSlide + 1}/${totalSlides}` : "0/0"}
        </span>

        <Button
          variant="outline"
          size="icon"
          onClick={goToNextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="border-white/20 bg-black/50 text-white hover:bg-black/70"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white"></div>
          </div>
        ) : (
          <iframe
            srcDoc={renderedHTML}
            className="h-full w-full border-0"
            style={{
              transform: `translateY(${-100 * currentSlide}vh)`,
            }}
            title="Presentation"
          />
        )}
      </div>
    </div>
  );
}
