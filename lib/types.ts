export interface DocumentType {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface GeminiRequestType {
  prompt: string;
  context: {
    currentMarkdown: string;
    selection?: string;
  };
  taskType?: string;
}

export interface GeminiResponseType {
  success: boolean;
  result?: {
    text: string;
    markdownCode: string | null;
  };
  error?: {
    message: string;
    code: string;
  };
}
