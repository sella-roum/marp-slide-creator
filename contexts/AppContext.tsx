"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useDocumentManager } from "@/hooks/use-document-manager";
import { useLayoutManager } from "@/hooks/use-layout-manager";

interface DocumentManagerContextType extends ReturnType<typeof useDocumentManager> {}
interface LayoutManagerContextType extends ReturnType<typeof useLayoutManager> {}

interface AppContextType {
  documentManager: DocumentManagerContextType;
  layoutManager: LayoutManagerContextType;
}

const AppContext = createContext<AppContextType>({
  documentManager: {
    currentDocument: null,
    markdownContent: "",
    handleMarkdownChange: () => {},
    isLoading: true,
    isSaving: false,
    error: null,
    dbInitError: null,
  },
  layoutManager: {
    layoutMode: "horizontal",
    setLayoutMode: () => {},
    isChatVisible: true,
    isEditorVisible: true,
    isPreviewVisible: true,
    togglePanel: () => {},
    visiblePanelsCount: 3,
  },
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const documentManager = useDocumentManager();
  const layoutManager = useLayoutManager("horizontal");

  const contextValue: AppContextType = {
    documentManager,
    layoutManager,
  };

  const { isLoading: isDocLoading, error: docError, dbInitError } = documentManager;
  const { currentDocument } = documentManager;
  if (dbInitError) {
    return (
      <main className="flex h-screen flex-col items-center justify-center">
        <div className="text-destructive">データベースエラー: {dbInitError.message}</div>
      </main>
    );
  }
  if (isDocLoading || (docError && !currentDocument)) {
    return (
      <main className="flex h-screen flex-col items-center justify-center">
      </main>
    );
  }
  if (!isDocLoading && !currentDocument) {
    return (
      <main className="flex h-screen flex-col items-center justify-center">
      </main>
    );
  }

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
