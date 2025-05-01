export const DB_NAME = "MarpSlideCreatorDB";
export const DB_VERSION = 4;
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