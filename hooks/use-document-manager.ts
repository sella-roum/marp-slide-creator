import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDb } from "@/lib/db-context";
import { getDocument, updateDocument } from "@/lib/db";
import type { DocumentType } from "@/lib/types";
import { SINGLE_DOCUMENT_ID } from "@/lib/constants";
import { debounce } from "@/lib/utils";

export function useDocumentManager() {
  const { toast } = useToast();
  const { isDbInitialized, dbError: dbInitError } = useDb();
  const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(isSaving);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  const loadOrCreateSingleDocument = useCallback(async () => {
    if (!isDbInitialized) {
      setError("データベースが初期化されていません。");
      setIsLoading(false);
      return;
    }

    if (isLoading || isSavingRef.current) {
      console.log("Skipping load/create document due to loading or saving state.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log(`Loading document with ID: ${SINGLE_DOCUMENT_ID}`);
      let doc = await getDocument(SINGLE_DOCUMENT_ID);

      if (!doc) {
        console.log("Document not found, creating a new one...");
        const newDocData: DocumentType = {
          id: SINGLE_DOCUMENT_ID,
          title: "My Presentation",
          content: "---\nmarp: true\ntheme: default\n---\n\n# Slide 1\n\n",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        await updateDocument(newDocData);
        doc = await getDocument(SINGLE_DOCUMENT_ID);
        if (doc) {
          toast({ title: "新しいプレゼンテーションを作成しました" });
        } else {
          throw new Error("Failed to create or retrieve the document after creation attempt.");
        }
      }

      if (doc) {
        setCurrentDocument((prevDoc) => {
          if (
            !prevDoc ||
            prevDoc.id !== doc.id ||
            (prevDoc.updatedAt < doc.updatedAt && markdownContent === prevDoc.content)
          ) {
            setMarkdownContent(doc.content);
            console.log("Document loaded/updated in state:", doc.title);
            return doc;
          }
          console.log("Keeping local markdown content:", doc.title);
          return prevDoc;
        });
      } else {
        throw new Error("Failed to load or create the document.");
      }
    } catch (err) {
      console.error("Failed to load or create single document:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`ドキュメントの読み込み/作成に失敗: ${message}`);
      if (
        !(
          err instanceof Error &&
          (err.message.includes("Database") || err.message.includes("IndexedDB"))
        )
      ) {
        toast({ title: "ドキュメントエラー", description: message, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isDbInitialized, toast, markdownContent, isLoading]);

  useEffect(() => {
    if (dbInitError) {
      const message = `データベースの初期化に失敗しました: ${dbInitError.message}`;
      setError(message);
      toast({ title: "データベースエラー", description: message, variant: "destructive" });
      setIsLoading(false);
    } else if (isDbInitialized) {
      loadOrCreateSingleDocument();
    }
  }, [dbInitError, isDbInitialized, toast]);

  const handleMarkdownChange = useCallback((content: string) => {
    setMarkdownContent(content);
  }, []);

  const debouncedSave = useRef(
    debounce(async (docToSave: DocumentType) => {
      if (!isDbInitialized) {
        console.warn("DB not initialized, skipping save.");
        return;
      }
      if (isSavingRef.current) {
        console.log("Already saving, skipping debounced save call.");
        return;
      }

      setIsSaving(true);
      try {
        await updateDocument(docToSave);
        setCurrentDocument(docToSave);
        console.log("Document saved:", docToSave.updatedAt);
      } catch (err) {
        console.error("Failed to save document:", err);
        toast({ title: "エラー", description: "ドキュメント保存失敗", variant: "destructive" });
      } finally {
        setIsSaving(false);
      }
    }, 1000)
  ).current;

  useEffect(() => {
    if (isDbInitialized && currentDocument && markdownContent !== currentDocument.content) {
      const docToSave: DocumentType = {
        ...currentDocument,
        content: markdownContent,
        updatedAt: new Date(),
      };
      debouncedSave(docToSave);
    }
  }, [markdownContent, currentDocument, debouncedSave, isDbInitialized]);

  return {
    currentDocument,
    markdownContent,
    handleMarkdownChange,
    isLoading,
    isSaving,
    error,
    dbInitError,
  };
}
