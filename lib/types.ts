export interface DocumentType {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
  versions?: VersionType[]
}

export interface VersionType {
  id: string
  documentId: string
  content: string
  createdAt: Date
  description?: string
}

export interface TemplateType {
  id: string
  title: string
  content: string
  createdAt: Date
  isBuiltIn?: boolean
}

export interface ChatMessageType {
  id: string
  documentId: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  markdownCode?: string | null
}

// --- ▼▼▼ 画像タイプを追加 ▼▼▼ ---
export interface ImageType {
  id: string;          // 一意なID (UUID)
  name: string;        // ファイル名
  dataUrl: string;     // Base64データURL
  createdAt: Date;     // アップロード日時
  // documentId?: string; // オプション: ドキュメントに関連付ける場合
}
// --- ▲▲▲ 画像タイプを追加 ▲▲▲ ---

export interface GeminiRequestType {
  prompt: string
  context: {
    currentMarkdown: string
    selection?: string
  }
  taskType?: string
}

export interface GeminiResponseType {
  success: boolean
  result?: {
    text: string
    markdownCode: string | null
  }
  error?: {
    message: string
    code: string
  }
}
