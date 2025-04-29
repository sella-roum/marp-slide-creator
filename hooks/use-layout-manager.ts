import { useState, useCallback } from "react";
import type { LayoutMode } from "@/lib/constants";

export function useLayoutManager(initialMode: LayoutMode = "horizontal") {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(initialMode);
  const [isChatVisible, setIsChatVisible] = useState(true);
  const [isEditorVisible, setIsEditorVisible] = useState(true);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  const togglePanel = useCallback((panel: "chat" | "editor" | "preview") => {
    switch (panel) {
      case "chat":
        setIsChatVisible((prev) => !prev);
        break;
      case "editor":
        setIsEditorVisible((prev) => !prev);
        break;
      case "preview":
        setIsPreviewVisible((prev) => !prev);
        break;
    }
  }, []);

  const visiblePanelsCount = [isChatVisible, isEditorVisible, isPreviewVisible].filter(
    Boolean
  ).length;

  return {
    layoutMode,
    setLayoutMode,
    isChatVisible,
    isEditorVisible,
    isPreviewVisible,
    togglePanel,
    visiblePanelsCount,
  };
}
