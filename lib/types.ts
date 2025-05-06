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
  content: string; // 応答文テキスト (JSON文字列の場合もある)
  timestamp: Date;
  slideMarkdown?: string | null; // スライド用Markdownコード
  cssCode?: string | null; // CSSコード
  explanation?: string | null; // ★ AIによる説明/思考プロセスを追加
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
    text: string; // 応答文テキスト (JSON文字列または通常のテキスト)
    slideMarkdown?: string | null; // スライド用Markdownコード
    cssCode?: string | null; // CSSコード
    explanation?: string | null; // ★ AIによる説明/思考プロセスを追加
  };
  error?: {
    message: string;
    code: string;
    details?: any; // エラー詳細を追加
  };
}
