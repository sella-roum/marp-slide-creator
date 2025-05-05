export const DB_NAME = "MarpSlideCreatorDB";
export const DB_VERSION = 5; // 必要に応じてバージョンを更新
export const DOC_STORE = "documents";
export const CHAT_STORE = "chatMessages";
export const IMAGE_STORE = "images";
export const SINGLE_DOCUMENT_ID = "main-document";

export type LayoutMode =
  | "default"
  | "horizontal"
  | "editor-focused"
  | "chat-right"
  | "editor-bottom";

// --- ▼ Undo/Redo履歴の最大サイズを追加 ▼ ---
export const MAX_HISTORY_SIZE = 50;
// --- ▲ Undo/Redo履歴の最大サイズを追加 ▲ ---
