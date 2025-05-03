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
  content: string; // 応答文テキスト
  timestamp: Date;
  // markdownCode?: string | null; // ← 廃止またはコメントアウト
  slideMarkdown?: string | null; // スライド用Markdownコード (新規)
  cssCode?: string | null; // CSSコード (新規)
}

export interface ImageType {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: Date;
}

// AIへの依頼タスクタイプ
export type GeminiTaskType = "GenerateSlideContent" | "GenerateTheme" | "GeneralConsultation";

export interface GeminiRequestType {
  prompt: string;
  context: {
    currentMarkdown: string;
    selection?: string;
  };
  taskType?: GeminiTaskType; // 型を具体的にする
  history?: ChatMessageType[]; // 履歴データを追加
}

export interface GeminiResponseType {
  success: boolean;
  result?: {
    text: string; // 応答文テキスト (必須)
    slideMarkdown?: string | null; // スライド用Markdownコード (任意・新規)
    cssCode?: string | null; // CSSコード (任意・新規)
    // markdownCode?: string | null; // ← 廃止またはコメントアウト
  };
  error?: {
    message: string;
    code: string;
    details?: any; // エラー詳細を追加
  };
}
