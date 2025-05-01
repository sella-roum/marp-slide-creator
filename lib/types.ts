// lib/types.ts

export interface DocumentType {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  selectedTheme: string;
  customCss?: string;
}

export interface ChatMessageType {
  id: string;
  documentId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  markdownCode?: string | null;
}

export interface ImageType {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: Date;
}

// ★ AIへの依頼タスクタイプ
export type GeminiTaskType = "GenerateSlideContent" | "GenerateTheme" | "GeneralConsultation";

export interface GeminiRequestType {
  prompt: string;
  context: {
    currentMarkdown: string;
    selection?: string;
  };
  taskType?: GeminiTaskType; // ★ 型を具体的にする
}

export interface GeminiResponseType {
  success: boolean;
  result?: {
    text: string;
    markdownCode: string | null; // Markdown または CSS コード
  };
  error?: {
    message: string;
    code: string;
    details?: any; // エラー詳細を追加
  };
}
